/**
 * Uttar Pradesh Radio — application server.
 *
 *   REST  GET  /api/health              liveness probe
 *   REST  GET  /api/channels            full UP channel catalog (snake_case, runtime-fetched)
 *   REST  POST /api/channels/refresh    re-fetch the catalog from upstream
 *   REST  GET  /api/status              current stream reachability
 *   WS    /ws                           live presence + stream-status feed
 *
 * The WebSocket feed is the "live" layer: it reports how many listeners are
 * connected, which station each listener is tuned to, and whether each
 * upstream stream is currently reachable.
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import {
  ROOT,
  getCatalog,
  refresh,
  flatten,
  UPSTREAM_URL,
} from './catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const STATUS_INTERVAL_MS = Number(process.env.STATUS_INTERVAL_MS) || 120000;
const STATUS_TIMEOUT_MS = Number(process.env.STATUS_TIMEOUT_MS) || 8000;

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory live state
// ---------------------------------------------------------------------------

/** ws -> { id, stationId } */
const clients = new Map();
/** stationId -> connected-listener count */
const nowPlaying = new Map();
/** stationId -> { online, checkedAt, latencyMs, fails } */
const statuses = new Map();

let clientSeq = 0;

function presenceSnapshot() {
  const playing = [...nowPlaying.entries()]
    .filter(([, n]) => n > 0)
    .map(([stationId, listeners]) => ({ stationId, listeners }));
  return {
    listeners: clients.size,
    nowPlaying: playing,
  };
}

function statusSnapshot() {
  const out = {};
  for (const [id, s] of statuses) {
    out[id] = {
      online: s.online,
      checkedAt: s.checkedAt,
      latencyMs: s.latencyMs,
    };
  }
  return out;
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(payload, except) {
  const data = JSON.stringify(payload);
  for (const ws of clients.keys()) {
    if (ws === except) continue;
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

function broadcastPresence() {
  broadcast({ type: 'presence', ...presenceSnapshot(), serverTime: Date.now() });
}

function setPlaying(ws, stationId) {
  const state = clients.get(ws);
  if (!state) return;
  if (state.stationId === stationId) return;
  if (state.stationId) {
    const n = (nowPlaying.get(state.stationId) || 1) - 1;
    if (n <= 0) nowPlaying.delete(state.stationId);
    else nowPlaying.set(state.stationId, n);
  }
  state.stationId = stationId || null;
  if (state.stationId) {
    nowPlaying.set(state.stationId, (nowPlaying.get(state.stationId) || 0) + 1);
  }
  broadcastPresence();
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    listeners: clients.size,
    stations: flatten(loadCachedCatalog()).filter((c) => c.has_stream).length,
    ts: Date.now(),
  });
});

let cachedCatalog = null;
function loadCachedCatalog() {
  return cachedCatalog || { station_dashboard: { groups: [] } };
}

app.get('/api/channels', async (_req, res) => {
  try {
    const doc = await getCatalog();
    cachedCatalog = doc;
    res.set('Cache-Control', 'no-store');
    res.json(doc);
  } catch (err) {
    res.status(502).json({ error: 'catalog_unavailable', message: String(err.message || err) });
  }
});

app.post('/api/channels/refresh', async (_req, res) => {
  try {
    const doc = await refresh();
    cachedCatalog = doc;
    await checkAllStreams();
    broadcast({ type: 'status', statuses: statusSnapshot(), serverTime: Date.now() });
    res.json({ ok: true, count: flatten(doc).length, updated_at: doc.updated_at });
  } catch (err) {
    res.status(502).json({ error: 'refresh_failed', message: String(err.message || err) });
  }
});

app.get('/api/status', (_req, res) => {
  res.json({ statuses: statusSnapshot(), ts: Date.now() });
});

// Static frontend.
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

// ---------------------------------------------------------------------------
// Stream reachability checker
// ---------------------------------------------------------------------------

async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        range: 'bytes=0-2048',
      },
    });
    // Drain a little so the socket can be reused / closed cleanly.
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    return { ok: res.ok || res.status === 206, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, latencyMs: Date.now() - started };
  }
}

async function checkAllStreams() {
  const channels = flatten(cachedCatalog).filter((ch) => ch.has_stream && ch.stream_url);
  await Promise.all(
    channels.map(async (ch) => {
      const prev = statuses.get(ch.id) || { fails: 0 };
      const { ok, latencyMs } = await probe(ch.stream_url);
      // Require two consecutive failures before declaring a stream offline so
      // a single transient network blip doesn't flap the UI.
      const fails = ok ? 0 : (prev.fails || 0) + 1;
      statuses.set(ch.id, {
        online: fails < 2 ? true : false,
        latencyMs,
        checkedAt: Date.now(),
        fails,
      });
    })
  );
}

function startStatusLoop() {
  checkAllStreams()
    .then(() => broadcast({ type: 'status', statuses: statusSnapshot(), serverTime: Date.now() }))
    .catch(() => {});
  const timer = setInterval(() => {
    checkAllStreams()
      .then(() => broadcast({ type: 'status', statuses: statusSnapshot(), serverTime: Date.now() }))
      .catch(() => {});
  }, STATUS_INTERVAL_MS);
  timer.unref?.();
}

// ---------------------------------------------------------------------------
// WebSocket layer
// ---------------------------------------------------------------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  clients.set(ws, { id: `c${++clientSeq}`, stationId: null });

  send(ws, {
    type: 'welcome',
    clientId: `c${clientSeq}`,
    source: UPSTREAM_URL,
    ...presenceSnapshot(),
    statuses: statusSnapshot(),
    serverTime: Date.now(),
  });
  broadcastPresence();

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return;
    }
    switch (msg?.type) {
      case 'now-playing':
        setPlaying(ws, typeof msg.stationId === 'string' ? msg.stationId : null);
        break;
      case 'stopped':
        setPlaying(ws, null);
        break;
      case 'ping':
        send(ws, { type: 'pong', serverTime: Date.now() });
        break;
      case 'request-status':
        send(ws, { type: 'status', statuses: statusSnapshot(), serverTime: Date.now() });
        break;
      default:
        break;
    }
  });

  const drop = () => {
    const state = clients.get(ws);
    if (!state) return;
    if (state.stationId) {
      const n = (nowPlaying.get(state.stationId) || 1) - 1;
      if (n <= 0) nowPlaying.delete(state.stationId);
      else nowPlaying.set(state.stationId, n);
    }
    clients.delete(ws);
    broadcastPresence();
  };
  ws.on('close', drop);
  ws.on('error', drop);
});

const heartbeat = setInterval(() => {
  for (const ws of clients.keys()) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* ignore */
    }
  }
}, 30000);
heartbeat.unref?.();

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main() {
  try {
    cachedCatalog = await getCatalog();
    const all = flatten(cachedCatalog);
    const playable = all.filter((c) => c.has_stream).length;
    console.log(`[up-radio] catalog ready: ${all.length} Uttar Pradesh stations (${playable} playable)`);
  } catch (err) {
    console.error('[up-radio] could not build catalog:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`[up-radio] http://localhost:${PORT}`);
    console.log(`[up-radio] websocket ws://localhost:${PORT}/ws`);
  });

  startStatusLoop();
}

main();
