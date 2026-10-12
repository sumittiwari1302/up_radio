/**
 * Durable Object: PresenceDO
 * Manages WebSocket connections for live listener presence and stream status.
 */

export class PresenceDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Map(); // ws -> { id, stationId }
    this.nowPlaying = new Map(); // stationId -> count
    this.statuses = new Map(); // stationId -> { online, checkedAt, latencyMs, fails }
    this.clientSeq = 0;

    // Restore from storage
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get('statuses');
      if (stored) this.statuses = new Map(Object.entries(stored));
    });

    // Periodic status broadcast
    this.broadcastInterval = setInterval(() => this.broadcastStatus(), 5000);
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    await this.handleWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async handleWebSocket(ws) {
    ws.accept();
    this.clientSeq++;
    const clientId = `c${this.clientSeq}`;
    this.clients.set(ws, { id: clientId, stationId: null });

    // Send welcome
    ws.send(JSON.stringify({
      type: 'welcome',
      clientId,
      source: UPSTREAM_URL,
      ...this.presenceSnapshot(),
      statuses: this.statusSnapshot(),
      serverTime: Date.now(),
    }));
    this.broadcastPresence();

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(ws, msg);
      } catch {
        // ignore malformed
      }
    });

    ws.addEventListener('close', () => this.handleClose(ws));
    ws.addEventListener('error', () => this.handleClose(ws));
  }

  handleMessage(ws, msg) {
    const state = this.clients.get(ws);
    if (!state) return;

    switch (msg.type) {
      case 'now-playing':
        this.setPlaying(ws, msg.stationId || null);
        break;
      case 'stopped':
        this.setPlaying(ws, null);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', serverTime: Date.now() }));
        break;
      case 'request-status':
        ws.send(JSON.stringify({ type: 'status', statuses: this.statusSnapshot(), serverTime: Date.now() }));
        break;
    }
  }

  handleClose(ws) {
    const state = this.clients.get(ws);
    if (!state) return;

    if (state.stationId) {
      const n = (this.nowPlaying.get(state.stationId) || 1) - 1;
      if (n <= 0) this.nowPlaying.delete(state.stationId);
      else this.nowPlaying.set(state.stationId, n);
    }
    this.clients.delete(ws);
    this.broadcastPresence();
  }

  setPlaying(ws, stationId) {
    const state = this.clients.get(ws);
    if (!state || state.stationId === stationId) return;

    if (state.stationId) {
      const n = (this.nowPlaying.get(state.stationId) || 1) - 1;
      if (n <= 0) this.nowPlaying.delete(state.stationId);
      else this.nowPlaying.set(state.stationId, n);
    }
    state.stationId = stationId;
    if (stationId) {
      this.nowPlaying.set(stationId, (this.nowPlaying.get(stationId) || 0) + 1);
    }
    this.broadcastPresence();
  }

  presenceSnapshot() {
    const playing = [...this.nowPlaying.entries()]
      .filter(([, n]) => n > 0)
      .map(([stationId, listeners]) => ({ stationId, listeners }));
    return {
      listeners: this.clients.size,
      nowPlaying: playing,
    };
  }

  statusSnapshot() {
    const out = {};
    for (const [id, s] of this.statuses) {
      out[id] = { online: s.online, checkedAt: s.checkedAt, latencyMs: s.latencyMs };
    }
    return out;
  }

  broadcastPresence() {
    const payload = JSON.stringify({ type: 'presence', ...this.presenceSnapshot(), serverTime: Date.now() });
    for (const ws of this.clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  broadcastStatus() {
    const payload = JSON.stringify({ type: 'status', statuses: this.statusSnapshot(), serverTime: Date.now() });
    for (const ws of this.clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  async updateStatuses(newStatuses) {
    for (const [id, s] of Object.entries(newStatuses)) {
      this.statuses.set(id, s);
    }
    await this.state.storage.put('statuses', Object.fromEntries(this.statuses));
    this.broadcastStatus();
  }
}