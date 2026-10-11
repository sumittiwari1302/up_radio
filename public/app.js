/**
 * Uttar Pradesh Radio — frontend.
 *
 * Data flow (all in parallel, none blocks playback):
 *   GET /api/channels   -> channel catalog (fetched once, runtime)
 *   GET /api/status     -> one-shot stream reachability (fast fallback)
 *   WS  /ws             -> live presence (listeners) + stream status feed
 *   HLS.js / <audio>    -> playback, tuned for the lowest start latency
 */

const $ = (id) => document.getElementById(id);

const els = {
  connState: $('connState'),
  connLabel: $('connLabel'),
  istClock: $('istClock'),

  heroBadge: $('heroBadge'),
  listenBadge: $('listenBadge'),
  heroHi: $('heroHi'),
  heroEn: $('heroEn'),
  heroCity: $('heroCity'),
  heroFreq: $('heroFreq'),
  heroOnline: $('heroOnline'),

  btnPlay: $('btnPlay'),
  playIcon: $('playIcon'),
  playLabel: $('playLabel'),
  btnPrev: $('btnPrev'),
  btnNext: $('btnNext'),
  volume: $('volume'),
  volVal: $('volVal'),
  volIcon: $('volIcon'),

  grid: $('grid'),
  emptyNote: $('emptyNote'),
  filters: document.querySelectorAll('.filter'),
  audio: $('radioAudio'),
};

// Low-delay live configuration: a short buffer starts audio quickly and still
// gives hls.js enough slack to keep the stream glued to the live edge.
const HLS_CONFIG = {
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 0,
  maxBufferLength: 4,
  maxMaxBufferLength: 10,
  liveSyncDurationCount: 1,
  liveMaxLatencyDurationCount: 3,
  maxLiveSyncPlaybackRate: 1.5,
  liveDurationInfinity: true,
  startFragPrefetch: true,
  manifestLoadingTimeOut: 8000,
  manifestLoadingMaxRetry: 3,
  manifestLoadingRetryDelay: 500,
  levelLoadingMaxRetry: 4,
  fragLoadingTimeOut: 15000,
  fragLoadingMaxRetry: 6,
};

const state = {
  channels: [],
  byId: Object.create(null),
  cardEls: new Map(), // stationId -> card element (for incremental live updates)
  active: null,
  filter: 'playable',
  phase: 'idle', // idle | tuning | playing | paused
  hls: null,
  streamToken: 0, // guards callbacks from a previous channel
  volume: 100,
  statuses: Object.create(null), // stationId -> { online, checkedAt, latencyMs }
  nowPlaying: Object.create(null), // stationId -> listeners
  listeners: 0,
  ws: null,
  wsRetry: 0,
  lastMessage: 0,
};

const CAT_LABEL = {
  air: 'AKASHVANI',
  community: 'COMMUNITY',
  online: 'ONLINE',
  private: 'PRIVATE FM',
  gyanvani: 'GYAN VANI',
};

function filteredChannels() {
  if (state.filter === 'all') return state.channels;
  if (state.filter === 'playable') return state.channels.filter((c) => c.hasStream);
  if (state.filter === 'community')
    return state.channels.filter((c) => c.category === 'community' || c.category === 'gyanvani');
  return state.channels.filter((c) => c.category === state.filter);
}

function playlist() {
  return state.channels.filter((c) => c.hasStream);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(raw) {
  return {
    id: raw.id,
    ch: raw.ch,
    nameEn: raw.name_en,
    nameHi: raw.name_hi || raw.name_en,
    city: raw.city || '',
    frequency: raw.frequency || '—',
    freq: raw.freq || null,
    band: raw.band || '',
    category: raw.category || 'air',
    owner: raw.owner || '',
    tags: raw.tags || [],
    badgeTag: raw.badge_tag || raw.name_en,
    url: raw.stream_url || null,
    type: raw.audio_type || 'hls',
    hasStream: Boolean(raw.has_stream && raw.stream_url),
  };
}

function parseCatalog(doc) {
  const groups = doc?.station_dashboard?.groups || [];
  return groups.flatMap((g) => g.channels || []).map(normalize);
}

const setText = (el, text) => {
  if (el) el.textContent = text;
};

// ---------------------------------------------------------------------------
// Clock / connection
// ---------------------------------------------------------------------------

function tickClock() {
  const t = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
  setText(els.istClock, `${t} IST`);
}
setInterval(tickClock, 1000);
tickClock();

function setConn(stateName, label) {
  if (els.connState) els.connState.dataset.state = stateName;
  setText(els.connLabel, label);
}

// ---------------------------------------------------------------------------
// Rendering — full grid (structural) vs incremental live updates (cheap)
// ---------------------------------------------------------------------------

function statusView(ch, online) {
  if (!ch.hasStream) return { cls: 'none', text: 'NO STREAM' };
  if (online === false) return { cls: 'off', text: 'OFFLINE' };
  if (online === true) return { cls: 'on', text: 'LIVE' };
  return { cls: 'unknown', text: '…' };
}

function renderGrid() {
  if (!els.grid) return;
  const list = filteredChannels();

  els.grid.innerHTML = '';
  state.cardEls.clear();
  els.emptyNote.hidden = list.length > 0;

  const frag = document.createDocumentFragment();

  for (const ch of list) {
    const isActive = state.active && ch.id === state.active.id;
    const online = ch.hasStream ? state.statuses[ch.id]?.online : undefined;
    const listeners = state.nowPlaying[ch.id] || 0;
    const sv = statusView(ch, online);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `card${isActive ? ' active' : ''}${ch.hasStream ? '' : ' no-stream'}`;
    card.dataset.id = ch.id;
    if (!ch.hasStream) card.disabled = true;

    card.innerHTML = `
      <div class="card-top">
        <span class="card-ch mono">${ch.ch}</span>
        <span class="card-cat">${CAT_LABEL[ch.category] || ''}</span>
        <span class="card-status ${sv.cls}">${sv.text}</span>
      </div>
      <div class="card-name">
        ${ch.nameHi && ch.nameHi !== ch.nameEn ? `<span class="card-hi">${ch.nameHi}</span>` : ''}
        <span class="card-en">${ch.nameEn}</span>
      </div>
      <div class="card-bottom">
        <span class="card-freq mono">${ch.frequency}${ch.city ? ' • ' + ch.city : ''}</span>
        <span class="card-listeners mono">${listeners > 0 ? '◉ ' + listeners : ''}</span>
      </div>
      <span class="card-action">${!ch.hasStream ? 'ON AIR • NO WEB STREAM' : isActive ? phaseAction() : 'TUNE IN'}</span>
    `;

    if (ch.hasStream) {
      card.addEventListener('click', () => selectChannel(ch, true));
      state.cardEls.set(ch.id, card);
    }
    frag.appendChild(card);
  }

  els.grid.appendChild(frag);
}

function phaseAction() {
  if (state.phase === 'tuning') return 'TUNING…';
  if (state.phase === 'playing') return 'RECEIVING';
  if (state.phase === 'paused') return 'PAUSED';
  return 'TAP TO PLAY';
}

/**
 * Update only the volatile bits (status, listeners, hero) in place — far
 * cheaper than rebuilding the whole grid on every presence/status frame.
 */
function applyLive() {
  if (!els.grid) return;

  for (const [id, card] of state.cardEls) {
    const ch = state.byId[id];
    if (!ch) continue;

    const online = state.statuses[id]?.online;
    const sv = statusView(ch, online);
    const st = card.querySelector('.card-status');
    if (st && (st.textContent !== sv.text || !st.classList.contains(sv.cls))) {
      st.className = `card-status ${sv.cls}`;
      st.textContent = sv.text;
    }

    const ln = card.querySelector('.card-listeners');
    if (ln) {
      const n = state.nowPlaying[id] || 0;
      const txt = n > 0 ? '◉ ' + n : '';
      if (ln.textContent !== txt) ln.textContent = txt;
    }
  }

  renderPresence();
  if (state.active) renderHero();
}

let liveScheduled = false;
function scheduleLive() {
  if (liveScheduled) return;
  liveScheduled = true;
  requestAnimationFrame(() => {
    liveScheduled = false;
    applyLive();
  });
}

function renderHero() {
  const ch = state.active;
  if (!ch) return;

  setText(els.heroBadge, `NOW TRANSMITTING • ${ch.ch} • ${ch.frequency}`);
  setText(els.heroHi, ch.nameHi);
  setText(els.heroEn, ch.nameEn.toUpperCase());
  setText(els.heroCity, ch.city || 'Uttar Pradesh');
  setText(els.heroFreq, ch.frequency);

  const online = ch.hasStream ? state.statuses[ch.id]?.online : undefined;
  const text =
    !ch.hasStream
      ? 'NO WEB STREAM'
      : online === false
        ? 'STREAM OFFLINE'
        : online === true
          ? 'STREAM LIVE'
          : state.phase === 'playing'
            ? 'PLAYING'
            : 'CHECKING…';
  setText(els.heroOnline, text);
  els.heroOnline.className = `online-tag ${
    online === false ? 'off' : online === true ? 'on' : 'unknown'
  }`;
}

function renderPlayButton() {
  const labels = { idle: 'PLAY', tuning: 'TUNING…', playing: 'STOP', paused: 'RESUME' };
  if (els.playIcon) els.playIcon.textContent = state.phase === 'playing' ? '■' : '▶';
  setText(els.playLabel, labels[state.phase] || 'PLAY');
  els.btnPlay?.classList.toggle('live', state.phase === 'playing' || state.phase === 'tuning');
  els.btnPlay?.classList.toggle('busy', state.phase === 'tuning');
}

function renderPresence() {
  setText(els.listenBadge, `${state.listeners} LISTENING`);
}

function renderVolume() {
  setText(els.volVal, `${state.volume}%`);
  if (els.volume) els.volume.value = String(state.volume);
  if (els.volIcon) els.volIcon.textContent = state.volume === 0 ? '🔇' : state.volume < 50 ? '🔉' : '🔊';
  if (els.audio) els.audio.volume = state.volume / 100;
}

function setPhase(phase) {
  if (state.phase === phase) return;
  state.phase = phase;
  renderPlayButton();
  // Repaint the active card's action label.
  const card = state.active && state.cardEls.get(state.active.id);
  const action = card?.querySelector('.card-action');
  if (action) action.textContent = phaseAction();
}

// ---------------------------------------------------------------------------
// Audio playback
// ---------------------------------------------------------------------------

function teardownStream() {
  state.streamToken++; // invalidate any in-flight callbacks
  if (state.hls) {
    try {
      state.hls.stopLoad();
      state.hls.detachMedia();
      state.hls.destroy();
    } catch {
      /* ignore */
    }
    state.hls = null;
  }
  if (els.audio) {
    try {
      els.audio.pause();
      els.audio.removeAttribute('src');
      els.audio.load();
    } catch {
      /* ignore */
    }
  }
}

function play() {
  if (!els.audio) return;
  const p = els.audio.play();
  if (p && p.catch) p.catch((err) => console.warn('[play]', err.message));
}

function loadStream(channel) {
  teardownStream();
  if (!channel || !channel.url || !els.audio) return;

  const token = state.streamToken;
  const url = channel.url; // clean URL — no cache-buster, so CDNs can cache the playlist
  const isHls = channel.type === 'hls' || /\.m3u8(\?|$)/i.test(url);
  const stale = () => token !== state.streamToken;

  if (isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
    const hls = new Hls(HLS_CONFIG);
    state.hls = hls;
    hls.attachMedia(els.audio);
    hls.loadSource(url);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (stale()) return;
      // Start at the live edge immediately.
      try {
        if (hls.liveSyncPosition) els.audio.currentTime = hls.liveSyncPosition;
      } catch {
        /* ignore */
      }
      play();
    });

    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (stale() || !data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        setTimeout(() => {
          if (!stale() && state.phase !== 'idle') loadStream(state.active);
        }, 1500);
      }
    });
  } else {
    // Native HLS (Safari) or a plain icecast/mp3/aac stream.
    els.audio.src = url;
    els.audio.load();
    play();
  }
}

function start() {
  if (!state.active || !state.active.hasStream) return;
  if (els.audio) els.audio.muted = false;
  setPhase('tuning');
  renderGrid();
  loadStream(state.active);
  wsSend({ type: 'now-playing', stationId: state.active.id });
}

function stop() {
  teardownStream();
  setPhase('idle');
  renderGrid();
  wsSend({ type: 'stopped' });
}

function selectChannel(channel, autoplay) {
  if (!channel || !channel.hasStream) return;
  const changed = !state.active || state.active.id !== channel.id;
  state.active = channel;
  renderHero();
  renderGrid();
  if (autoplay) {
    start();
  } else if (changed) {
    setPhase('idle');
  }
}

els.btnPlay?.addEventListener('click', () => {
  if (state.phase === 'playing' || state.phase === 'tuning') stop();
  else start();
});

els.btnPrev?.addEventListener('click', () => step(-1));
els.btnNext?.addEventListener('click', () => step(1));

function step(dir) {
  const list = playlist();
  if (!list.length) return;
  const idx = state.active ? list.findIndex((c) => c.id === state.active.id) : -1;
  const next = (idx + dir + list.length) % list.length;
  selectChannel(list[next], true);
}

els.volume?.addEventListener('input', (e) => {
  state.volume = Number(e.target.value);
  renderVolume();
  try {
    localStorage.setItem('up_radio_volume', String(state.volume));
  } catch {
    /* ignore */
  }
});

// Audio element lifecycle -> phase machine. We drive "paused/idle" explicitly
// in stop()/start() so a programmatic pause during teardown never flickers the
// UI back to PAUSED.
function bindAudio() {
  const a = els.audio;
  if (!a) return;
  a.addEventListener('playing', () => setPhase('playing'));
  a.addEventListener('waiting', () => {
    if (state.phase === 'playing') setPhase('tuning');
  });
  a.addEventListener('error', () => {
    if (state.phase !== 'idle') setPhase('tuning');
  });
}

// ---------------------------------------------------------------------------
// WebSocket live layer
// ---------------------------------------------------------------------------

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

function wsSend(msg) {
  const ws = state.ws;
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function applyStatuses(statuses) {
  if (!statuses) return;
  state.statuses = statuses;
}

function handleMessage(msg) {
  state.lastMessage = Date.now();
  switch (msg.type) {
    case 'welcome':
    case 'presence': {
      state.listeners = msg.listeners || 0;
      if (Array.isArray(msg.nowPlaying)) {
        state.nowPlaying = Object.fromEntries(msg.nowPlaying.map((p) => [p.stationId, p.listeners]));
      }
      applyStatuses(msg.statuses);
      scheduleLive();
      break;
    }
    case 'status': {
      applyStatuses(msg.statuses);
      scheduleLive();
      break;
    }
    case 'pong':
      break;
    default:
      break;
  }
}

function connectWs() {
  let ws;
  try {
    ws = new WebSocket(wsUrl());
  } catch {
    scheduleWsRetry();
    return;
  }
  state.ws = ws;
  setConn('connecting', 'CONNECTING');

  ws.addEventListener('open', () => {
    state.wsRetry = 0;
    state.lastMessage = Date.now();
    setConn('open', 'LIVE');
    wsSend({ type: 'request-status' });
    if (state.phase === 'playing' || state.phase === 'tuning') {
      wsSend({ type: 'now-playing', stationId: state.active?.id });
    }
  });

  ws.addEventListener('message', (evt) => {
    try {
      handleMessage(JSON.parse(evt.data));
    } catch {
      /* ignore malformed frames */
    }
  });

  ws.addEventListener('close', () => {
    if (state.ws === ws) state.ws = null;
    setConn('closed', 'OFFLINE');
    scheduleWsRetry();
  });

  ws.addEventListener('error', () => {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  });
}

function scheduleWsRetry() {
  state.wsRetry = Math.min(state.wsRetry + 1, 6);
  const base = Math.min(1000 * 2 ** (state.wsRetry - 1), 15000);
  const delay = base * (0.75 + Math.random() * 0.5); // jitter avoids thundering herd
  setTimeout(connectWs, delay);
}

// Heartbeat: ping every 25s; force a reconnect if the server goes quiet.
setInterval(() => {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  if (Date.now() - state.lastMessage > 70000) {
    try {
      state.ws.close();
    } catch {
      /* ignore */
    }
    return;
  }
  wsSend({ type: 'ping' });
}, 25000);

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadCatalog() {
  try {
    const res = await fetch('/api/channels', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.channels = parseCatalog(await res.json());
    state.byId = Object.fromEntries(state.channels.map((c) => [c.id, c]));
    state.active = playlist()[0] || state.channels[0] || null;
    renderGrid();
    renderHero();
    renderPlayButton();
  } catch (err) {
    els.grid.innerHTML = `<p class="error">Could not load channels: ${err.message}</p>`;
  }
}

async function preloadStatus() {
  // Fast one-shot so status shows even before the WebSocket handshake lands.
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (!res.ok) return;
    applyStatuses((await res.json()).statuses);
    scheduleLive();
  } catch {
    /* ignore — the WS feed will fill this in */
  }
}

// ---------------------------------------------------------------------------
// Boot — everything kicks off in parallel; nothing blocks playback.
// ---------------------------------------------------------------------------

function restoreVolume() {
  try {
    const saved = Number(localStorage.getItem('up_radio_volume'));
    if (Number.isFinite(saved) && saved >= 0 && saved <= 100) state.volume = saved;
  } catch {
    /* ignore */
  }
  renderVolume();
}

els.filters.forEach((f) => {
  f.addEventListener('click', () => {
    els.filters.forEach((x) => x.classList.remove('active'));
    f.classList.add('active');
    state.filter = f.dataset.filter;
    renderGrid();
  });
});

restoreVolume();
bindAudio();
renderPlayButton();
connectWs(); // non-blocking
preloadStatus(); // non-blocking fallback
loadCatalog(); // non-blocking
