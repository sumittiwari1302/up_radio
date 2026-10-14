import { PresenceDO } from './PresenceDO.js';
import { getCatalog, refresh, flatten, UPSTREAM_URL } from './catalog.js';

const UA = 'Mozilla/5.0 (compatible; up-radio/1.0)';
const STATUS_TIMEOUT_MS = 8000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function handleWebSocketUpgrade(request, env) {
  const doId = env.PRESENCE.idFromName('global');
  const stub = env.PRESENCE.get(doId);

  // Handle WebSocket upgrade directly in Worker - pass to Durable Object via Handoff
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  // Accept the server WebSocket
  server.accept();

  // Handoff to Durable Object
  await stub.fetch('https://internal/websocket-connect', {
    method: 'POST',
    body: server,
    headers: { 'Content-Type': 'application/websocket' },
  });

  return new Response(null, { status: 101, webSocket: server });
}

const ALLOWED_ORIGINS = [
  'https://upradio.pages.dev',
  'https://upradio.in',
  'https://www.upradio.in',
  'http://localhost:5173',
];

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'X-DNS-Prefetch-Control': 'on',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), interest-cohort=(), attribution-reporting=(), private-aggregation=(), join-ad-interest-group=(), run-ad-auction=(), browsing-topics=()',
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    ...securityHeaders,
  };
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

function rateLimited(kv, ip) {
  const now = Date.now();
  const bucket = Math.floor(now / 60000);
  const key = `ratelimit:${ip}:${bucket}`;
  return kv.get(key).then((count) => {
    const n = (count ? parseInt(count) : 0) + 1;
    kv.put(key, String(n), { expirationTtl: 120 });
    return n > 6;
  });
}

async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      headers: { 'user-agent': UA, range: 'bytes=0-2048' },
    });
    try { await res.body?.cancel(); } catch {}
    return { ok: res.ok || res.status === 206, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, latencyMs: Date.now() - started };
  }
}

async function checkAllStreams(env, catalog) {
  const channels = flatten(catalog).filter((ch) => ch.has_stream && ch.stream_url);
  const results = await Promise.all(
    channels.map(async (ch) => {
      const prev = await env.STATUS.get(`status:${ch.id}`, { type: 'json' }) || { fails: 0 };
      const { ok, latencyMs } = await probe(ch.stream_url);
      const fails = ok ? 0 : (prev.fails || 0) + 1;
      const status = { online: fails < 2, latencyMs, checkedAt: Date.now(), fails };
      await env.STATUS.put(`status:${ch.id}`, JSON.stringify(status), { expirationTtl: 300 });
      return [ch.id, status];
    })
  );
  return Object.fromEntries(results);
}

async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...securityHeaders,
      },
    });
  }

  // GET /api/health
  if (path === '/api/health' && (request.method === 'GET' || request.method === 'HEAD')) {
    const catalog = await getCatalog(env);
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: corsHeaders(request) });
    }
    return json({
      ok: true,
      uptime: Math.round(Date.now() / 1000),
      listeners: 0,
      stations: catalog ? flatten(catalog).filter((c) => c.has_stream).length : 0,
      ts: Date.now(),
    }, 200, request);
  }

  // GET /api/channels
  if (path === '/api/channels' && (request.method === 'GET' || request.method === 'HEAD')) {
    const catalog = await getCatalog(env);
    if (!catalog) return json({ error: 'catalog_unavailable' }, 502, request);
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: corsHeaders(request) });
    }
    return json(catalog, 200, request);
  }

  // POST /api/channels/refresh
  if (path === '/api/channels/refresh' && request.method === 'POST') {
    const catalog = await refresh(env);
    const statuses = await checkAllStreams(env, catalog);
    const doId = env.PRESENCE.idFromName('global');
    const stub = env.PRESENCE.get(doId);
    await stub.fetch('https://internal/update-statuses', {
      method: 'POST',
      body: JSON.stringify(statuses),
    });
    return json({ ok: true, count: flatten(catalog).length, updated_at: catalog.updated_at }, 200, request);
  }

  // GET /api/status
  if (path === '/api/status' && (request.method === 'GET' || request.method === 'HEAD')) {
    const catalog = await getCatalog(env);
    if (!catalog) return json({ statuses: {}, ts: Date.now() }, 200, request);
    const statuses = {};
    for (const ch of flatten(catalog).filter((c) => c.has_stream)) {
      const s = await env.STATUS.get(`status:${ch.id}`, { type: 'json' });
      if (s) statuses[ch.id] = s;
    }
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: corsHeaders(request) });
    }
    return json({ statuses, ts: Date.now() }, 200, request);
  }

  // GET /api/test-email (test endpoint)
  if (path === '/api/test-email' && (request.method === 'GET' || request.method === 'HEAD')) {
    const resendApiKey = env.RESEND_API_KEY;
    const ownerEmail = env.OWNER_EMAIL || 'sumittiwari0307@gmail.com';
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: corsHeaders(request) });
    }
    return json({ ok: true, hasApiKey: !!resendApiKey, ownerEmail }, 200, request);
  }

  // POST /api/contact
  if (path === '/api/contact' && request.method === 'POST') {
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await rateLimited(env.RATE_LIMIT, ip)) {
        return json({ ok: false, error: 'rate_limited' }, 429, request);
      }

      const body = await request.json().catch(() => ({}));
      const name = String(body.name || '').trim().slice(0, 120);
      const email = String(body.email || '').trim().slice(0, 200);
      const message = String(body.message || '').trim().slice(0, 4000);
      const honeypot = String(body.website || body.company || '').trim();

      if (honeypot) return json({ ok: true, queued: true }, 200, request);

      const errors = {};
      if (!name) errors.name = 'Please enter your name.';
      if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email.';
      if (message.length < 10) errors.message = 'Message must be at least 10 characters.';
      if (Object.keys(errors).length) return json({ ok: false, errors }, 422, request);

      const startedAt = Number(body.formOpenedAt);
      if (startedAt && Date.now() - startedAt < 3000) return json({ ok: true, queued: true }, 200, request);

      const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      // Try to store, but don't fail if KV limit exceeded
      try {
        await env.CONTACTS.put(`contact:${id}`, JSON.stringify({ id, name, email, message, ip, ts: Date.now() }), { expirationTtl: 86400 * 30 });
      } catch (kvErr) {
        console.warn('KV put failed (limit exceeded):', kvErr);
      }

// Send notification via email (Resend API)
      const resendApiKey = env.RESEND_API_KEY;
      const ownerEmail = env.OWNER_EMAIL || 'sumittiwari0307@gmail.com';
      if (resendApiKey) {
        try {
          const emailHtml = `
            <h2>📬 New Contact from UP Radio</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent from UP Radio contact form</p>
          `;
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'UP Radio <onboarding@resend.dev>',
              to: ownerEmail,
              subject: 'New Contact Form Submission - UP Radio',
              html: emailHtml,
            }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Resend API error:', response.status, errorText);
            throw new Error(`Resend API error: ${response.status} ${errorText}`);
          }
        } catch (emailErr) {
          console.error('Email notification failed:', emailErr);
        }
      } else {
        console.warn('RESEND_API_KEY not found in env');
      }

      return json({ ok: true, queued: true }, 200, request);
    } catch (err) {
      console.error('Contact form error:', err);
      return json({ ok: false, error: 'Internal server error', detail: String(err) }, 500, request);
    }
  }

  // POST /api/analytics/event
  if (path === '/api/analytics/event' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const type = String(body.type || 'unknown').slice(0, 64);
      if (!type) return json({ ok: false }, 400, request);
      const key = `analytics:${type}`;
      const current = await env.ANALYTICS.get(key, { type: 'json' }) || 0;
      try {
        await env.ANALYTICS.put(key, JSON.stringify(current + 1), { expirationTtl: 86400 * 90 });
      } catch {}
      if (typeof body.stationId === 'string' && body.stationId) {
        const skey = `analytics:station:${body.stationId}`;
        const scurrent = await env.ANALYTICS.get(skey, { type: 'json' }) || 0;
        try {
          await env.ANALYTICS.put(skey, JSON.stringify(scurrent + 1), { expirationTtl: 86400 * 90 });
        } catch {}
      }
      return json({ ok: true }, 200, request);
    } catch (err) {
      console.error('Analytics error:', err);
      return json({ ok: false, error: 'Internal server error', detail: String(err) }, 500, request);
    }
  }

  // GET /api/analytics
  if (path === '/api/analytics' && request.method === 'GET') {
    return json({ totals: {}, ts: Date.now() }, 200, request);
  }

  // POST /api/errors
  if (path === '/api/errors' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const entry = {
      ts: Date.now(),
      url: String(body.url || '').slice(0, 500),
      message: String(body.message || '').slice(0, 500),
      stack: String(body.stack || '').slice(0, 4000),
      source: String(body.source || 'client').slice(0, 20),
    };
    const key = `error:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await env.ERRORS.put(key, JSON.stringify(entry), { expirationTtl: 86400 * 7 });
    return json({ ok: true }, 200, request);
  }

  // GET /api/errors
  if (path === '/api/errors' && request.method === 'GET') {
    return json({ errors: [], ts: Date.now() }, 200, request);
  }

  // GET /robots.txt
  if (path === '/robots.txt' && request.method === 'GET') {
    const origin = url.origin;
    return new Response(
      `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`,
      { headers: { 'Content-Type': 'text/plain', ...corsHeaders(request) } }
    );
  }

  // GET /sitemap.xml
  if (path === '/sitemap.xml' && request.method === 'GET') {
    const origin = url.origin;
    const pages = [
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/channels', changefreq: 'daily', priority: '0.8' },
      { path: '/faq', changefreq: 'monthly', priority: '0.5' },
      { path: '/sources', changefreq: 'monthly', priority: '0.5' },
      { path: '/terms', changefreq: 'monthly', priority: '0.5' },
      { path: '/privacy', changefreq: 'monthly', priority: '0.5' },
    ];
    const urls = pages.map(p =>
      `  <url>\n    <loc>${origin}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    ).join('\n');
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      { headers: { 'Content-Type': 'application/xml', ...corsHeaders(request) } }
    );
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API routes
    const apiResp = await handleApi(request, env, ctx);
    if (apiResp) return apiResp;

    // WebSocket upgrade - handle in Worker to preserve Upgrade header
    if (url.pathname === '/ws') {
      return handleWebSocketUpgrade(request, env);
    }

    // Static assets (served by Cloudflare Pages via ASSETS binding)
    return env.ASSETS.fetch(request);
  },

  // Cron trigger for stream checks
  async scheduled(controller, env, ctx) {
    if (controller.cron === '*/2 * * * *') {
      const catalog = await getCatalog(env);
      if (catalog) {
        const statuses = await checkAllStreams(env, catalog);
        const doId = env.PRESENCE.idFromName('global');
        const stub = env.PRESENCE.get(doId);
        await stub.fetch('https://internal/update-statuses', {
          method: 'POST',
          body: JSON.stringify(statuses),
        });
      }
    }
  },
};

export { PresenceDO };