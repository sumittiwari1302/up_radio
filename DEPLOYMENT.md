# Cloudflare Deployment Guide for UP Radio

## Architecture
- **Cloudflare Pages** → Static frontend (React app) at `https://upradio.pages.dev`
- **Cloudflare Workers** → API backend at `https://up-radio-api.<subdomain>.workers.dev`

---

## Prerequisites
1. Cloudflare account
2. Wrangler CLI: `npm install -g wrangler`
3. GitHub repo connected to Cloudflare

---

## Step 1: Create KV Namespaces (Cloudflare Dashboard)

Go to **Workers & Pages → KV** → Create 6 namespaces:

| Namespace Name | Binding | Purpose |
|----------------|---------|---------|
| `up-radio-rate-limit` | `RATE_LIMIT` | Contact form rate limiting |
| `up-radio-analytics` | `ANALYTICS` | Page view / play analytics |
| `up-radio-errors` | `ERRORS` | Client error monitoring |
| `up-radio-contacts` | `CONTACTS` | Contact form submissions |
| `up-radio-status` | `STATUS` | Stream health checks |
| `up-radio-catalog` | `CATALOG` | Catalog caching (optional) |

Copy each namespace ID.

---

## Step 2: Update wrangler.toml with Real IDs

```toml
name = "up-radio-api"
main = "worker/index.js"
compatibility_date = "2024-10-12"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "client/dist"
binding = "ASSETS"

[[durable_objects.bindings]]
name = "PRESENCE"
class_name = "PresenceDO"

[exports.PresenceDO]
type = "durable-object"
storage = "sqlite"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "YOUR_RATE_LIMIT_ID_HERE"

[[kv_namespaces]]
binding = "ANALYTICS"
id = "YOUR_ANALYTICS_ID_HERE"

[[kv_namespaces]]
binding = "ERRORS"
id = "YOUR_ERRORS_ID_HERE"

[[kv_namespaces]]
binding = "CONTACTS"
id = "YOUR_CONTACTS_ID_HERE"

[[kv_namespaces]]
binding = "STATUS"
id = "YOUR_STATUS_ID_HERE"

[[kv_namespaces]]
binding = "CATALOG"
id = "YOUR_CATALOG_ID_HERE"

[triggers]
crons = ["*/2 * * * *"]
```

---

## Step 3: Deploy Worker

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Deploy Worker
npx wrangler deploy

# 3. Note the Worker URL: https://up-radio-api.<your-subdomain>.workers.dev
```

---

## Step 4: Update Client to Use Worker API

In `client/src/App.jsx`, update the API base URL:

```jsx
// Top of App.jsx, after imports
const API_BASE = import.meta.env.PROD 
  ? 'https://up-radio-api.<your-subdomain>.workers.dev' 
  : ''; // Local dev uses Vite proxy

// Update all fetch calls:
// fetch('/api/channels') → fetch(`${API_BASE}/api/channels`)
// fetch('/api/contact', ...) → fetch(`${API_BASE}/api/contact`, ...)
// fetch('/api/analytics/event', ...) → fetch(`${API_BASE}/api/analytics/event`, ...)
// fetch('/api/errors', ...) → fetch(`${API_BASE}/api/errors`, ...)
```

Update `client/src/hooks/useRadio.js` WebSocket URL:
```js
const WS_URL = import.meta.env.PROD
  ? `wss://up-radio-api.<your-subdomain>.workers.dev/ws`
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
```

---

## Step 5: Build Client

```bash
cd client && npm ci && npm run build
# Output: client/dist/
```

---

## Step 6: Deploy to Cloudflare Pages

### Option A: Via Dashboard (Recommended)
1. Go to **Cloudflare Pages** → **Create a project** → **Connect to Git**
2. Select your repo: `sumittiwari1302/up_radio`
3. Configure:
   - **Build command**: `cd client && npm ci && npm run build`
   - **Build output directory**: `client/dist`
   - **Root directory**: `/`
4. Add environment variable:
   - `NODE_VERSION` = `20`
5. Deploy

### Option B: Via Wrangler (if configured)
```bash
npx wrangler pages deploy client/dist --project-name=upradio
```

---

## Step 6: Add Custom Domain (Optional)

**For Pages (frontend):**
- Pages → upradio → Custom domains → Add `upradio.in` (or your domain)
- DNS: CNAME `upradio.in` → `upradio.pages.dev`

**For Workers (API):**
- Workers → up-radio-api → Triggers → Custom domains → Add `api.upradio.in`
- DNS: CNAME `api.upradio.in` → `up-radio-api.<subdomain>.workers.dev`

---

## Step 7: Verify Deployment

Test these endpoints:
```
✅ https://upradio.pages.dev/                    # Homepage
✅ https://upradio.pages.dev/channels            # Channel directory
✅ https://upradio.pages.dev/faq                 # FAQ
✅ https://upradio.pages.dev/sources             # Sources
✅ https://upradio.pages.dev/privacy             # Privacy
✅ https://upradio.pages.dev/terms               # Terms

✅ https://up-radio-api.<subdomain>.workers.dev/api/health
✅ https://up-radio-api.<subdomain>.workers.dev/api/channels
✅ https://up-radio-api.<subdomain>.workers.dev/api/status
✅ https://up-radio-api.<subdomain>.workers.dev/robots.txt
✅ https://up-radio-api.<subdomain>.workers.dev/sitemap.xml
```

---

## Environment Variables Reference

| Variable | Worker | Pages | Description |
|----------|--------|-------|-------------|
| `NODE_VERSION` | - | ✅ | Node 20 for build |
| `FORCE_HTTPS` | ✅ | - | Set to `1` for HTTPS redirect |

---

## Local Development

```bash
# Terminal 1: Worker API
npx wrangler dev --local --port 8787

# Terminal 2: Client (Vite)
cd client && npm run dev
# Vite proxies /api and /ws to http://localhost:8787
```

---

## File Structure
```
up-radio/
├── wrangler.toml              # Worker config
├── worker/
│   ├── index.js               # Worker entry point
│   ├── PresenceDO.js          # Durable Object (WebSocket)
│   └── catalog.js             # Catalog loader
├── client/
│   ├── dist/                  # Build output (Pages)
│   ├── src/
│   │   ├── App.jsx            # Main app (update API_BASE)
│   │   └── hooks/useRadio.js  # WebSocket URL
│   └── vite.config.js         # Proxy to Worker in dev
├── server/                    # Old Node.js server (keep for reference)
│   ├── index.js
│   ├── catalog.js
│   └── build-catalog.js
└── public/
    └── channels.json          # Static catalog (embedded in Worker)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `catalog_unavailable` | Verify `channels.json` in `client/dist/`, check KV bindings |
| WebSocket fails | Check Durable Object binding, Worker URL uses `wss://` |
| Rate limited | Check `RATE_LIMIT` KV namespace exists |
| Build fails | Ensure `client/dist` exists, check `outDir: 'dist'` in vite.config.js |
| CORS errors | Worker handles CORS, check `handleApi` OPTIONS response |

---

## Commands Summary

```bash
# Build catalog
npm run build:catalog

# Build client
cd client && npm run build

# Deploy Worker
npx wrangler deploy

# Deploy Pages (auto via Git push)
git push origin main

# View Worker logs
npx wrangler tail
```