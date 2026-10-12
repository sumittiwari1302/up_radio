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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
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
const FORCE_HTTPS = process.env.FORCE_HTTPS === '1' || process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.join(ROOT, 'public');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(compression());

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('X-DNS-Prefetch-Control', 'on');
  res.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), interest-cohort=()'
  );
  next();
});

// Force HTTPS in production (or when FORCE_HTTPS=1). Safe behind a proxy that
// already sets X-Forwarded-Proto.
if (FORCE_HTTPS) {
  app.use((req, res, next) => {
    const proto = req.protocol || (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    if (proto === 'http' && !req.headers['x-forwarded-proto']?.includes('https')) {
      const host = req.get('host') || req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl || req.url}`);
    }
    next();
  });
}

// Small in-memory spam/bot protection for the public contact form.
const rateBuckets = new Map();
function rateLimited(req) {
  const now = Date.now();
  const bucket = Math.floor(now / 60000);
  const key = `${req.ip}:${bucket}`;
  const count = rateBuckets.get(key) || 0;
  rateBuckets.set(key, count + 1);
  if (rateBuckets.size > 1000) {
    // Drop stale buckets once a minute.
    for (const k of rateBuckets.keys()) {
      if (!k.startsWith(req.ip)) rateBuckets.delete(k);
    }
  }
  return count >= 6;
}

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

// ---------------------------------------------------------------------------
// Contact form (spam + bot protected)
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const contactQueue = [];

app.post('/api/contact', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 4000);
  const honeypot = String(body.website || body.company || '').trim();

  // Rate limit per IP (~6/min).
  if (rateLimited(req)) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  // Honeypot: bots fill hidden fields. Pretend success so they learn nothing.
  if (honeypot) {
    return res.json({ ok: true, queued: true });
  }

  const errors = {};
  if (!name) errors.name = 'Please enter your name.';
  if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email.';
  if (message.length < 10) errors.message = 'Message must be at least 10 characters.';
  if (Object.keys(errors).length) {
    return res.status(422).json({ ok: false, errors });
  }

  // How fast did the human fill it? Sub-3s submissions are almost always bots.
  const startedAt = Number(body.formOpenedAt);
  if (startedAt && Number.isFinite(startedAt) && Date.now() - startedAt < 3000) {
    return res.json({ ok: true, queued: true });
  }

  const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  contactQueue.push({ id, name, email, message, ip: req.ip, ts: Date.now() });

  // Also appends to a rotating JSONL file when CONTACT_LOG is set.
  if (process.env.CONTACT_LOG) {
    try {
      fs.appendFileSync(
        process.env.CONTACT_LOG,
        `${JSON.stringify({ id, name, email, message, ip: req.ip, ts: new Date().toISOString() })}\n`
      );
    } catch {
      /* logging is best-effort */
    }
  }

  res.json({ ok: true, queued: true });
});

// ---------------------------------------------------------------------------
// Privacy-friendly analytics (consent-gated by the client)
// ---------------------------------------------------------------------------

const analyticsTotals = {};

app.post('/api/analytics/event', (req, res) => {
  const body = req.body || {};
  const type = String(body.type || 'unknown').slice(0, 64);
  if (!type) return res.status(400).json({ ok: false });
  const key = type;
  analyticsTotals[key] = (analyticsTotals[key] || 0) + 1;
  if (typeof body.stationId === 'string' && body.stationId) {
    const skey = `station:${body.stationId}`;
    analyticsTotals[skey] = (analyticsTotals[skey] || 0) + 1;
  }
  res.json({ ok: true });
});

app.get('/api/analytics', (_req, res) => {
  res.json({ totals: analyticsTotals, ts: Date.now() });
});

// ---------------------------------------------------------------------------
// Error monitoring (client-side runtime errors, consent-independent)
// ---------------------------------------------------------------------------

const errorLog = [];

app.post('/api/errors', (req, res) => {
  const body = req.body || {};
  const entry = {
    ts: Date.now(),
    url: String(body.url || '').slice(0, 500),
    message: String(body.message || '').slice(0, 500),
    stack: String(body.stack || '').slice(0, 4000),
    source: String(body.source || 'client').slice(0, 20),
  };
  errorLog.push(entry);
  if (errorLog.length > 200) errorLog.shift();
  if (process.env.LOG_ERRORS === '1') {
    console.error('[client-error]', entry.message, entry.url);
  }
  res.json({ ok: true });
});

app.get('/api/errors', (_req, res) => {
  res.json({ errors: errorLog.slice(-100), ts: Date.now() });
});

// ---------------------------------------------------------------------------
// /robots.txt and /sitemap.xml (host-aware so they are correct everywhere)
// ---------------------------------------------------------------------------

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      '',
      'Sitemap: /sitemap.xml',
      '',
    ].join('\n')
  );
});

app.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const pages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/terms', changefreq: 'monthly', priority: '0.5' },
    { path: '/privacy', changefreq: 'monthly', priority: '0.5' },
  ];
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>${origin}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    )
    .join('\n');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
});

// ---------------------------------------------------------------------------
// Static frontend (cached aggressively for hashed build assets)
// ---------------------------------------------------------------------------

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    maxAge: 0,
    setHeaders(res, filePath) {
      if (filePath.includes('/assets/')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.set('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

// Custom 404 for everything that is not an API route.
// For client-side routes (/, /channels, /faq, /sources), serve index.html so React Router can handle them.
const clientRoutes = ['/', '/channels', '/faq', '/sources']
app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) {
    return res.status(404).json({ error: 'not_found' })
  }
  if (clientRoutes.includes(req.path)) {
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'))
})

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
