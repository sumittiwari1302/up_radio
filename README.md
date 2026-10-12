# UP Radio — Uttar Pradesh Live Radio Directory

A live directory of 100+ radio stations across Uttar Pradesh — Akashvani / All India Radio, community & campus radio, online streams, and commercial FM. Built with React, Cloudflare Workers, and Durable Objects.

**Live:** [upradio.pages.dev](https://upradio.pages.dev) | **API:** [up-radio-api.sumittiwari0307.workers.dev](https://up-radio-api.sumittiwari0307.workers.dev)

---

## Features

- **112+ Stations** — Akashvani, community/campus, online, commercial FM
- **Real-time streaming** — HLS, MP3, AAC via hls.js
- **Live status** — Stream health checks every 10 min via cron
- **WebSocket presence** — Live listener counts via Durable Objects
- **Contact form** — Spam-protected with webhook notifications (ntfy.sh)
- **Privacy-first** — No tracking without consent, localStorage only
- **Bilingual** — Hindi (Devanagari) + English UI
- **Dark/Light theme** — Persisted in localStorage
- **PWA ready** — Installable, offline-capable

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router, hls.js |
| Backend | Cloudflare Workers (ES Modules) |
| Real-time | Durable Objects (WebSocket) |
| Storage | Cloudflare KV (rate limiting, analytics, contacts) |
| Scheduling | Cron Triggers (stream health every 10 min) |
| Hosting | Cloudflare Pages (static) + Workers (API) |

---

## Project Structure

```
up-radio/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks (useRadio, useTheme, useUTM)
│   │   ├── lib/            # Analytics, error reporting
│   │   ├── pages/          # Sources page
│   │   ├── App.jsx         # Main app with routing
│   │   └── main.jsx        # Entry point
│   ├── public/             # Static files (terms, privacy, 404, icons)
│   └── vite.config.js      # Vite config with SPA redirect
├── worker/                 # Cloudflare Worker backend
│   ├── index.js            # Worker entry point (API + WS)
│   ├── PresenceDO.js       # Durable Object for WebSocket
│   ├── catalog.js          # Embedded catalog loader
│   └── channels.json       # Static catalog (112 stations)
├── server/                 # Legacy Node.js server (reference)
│   ├── index.js            # Express + WS server
│   ├── build-catalog.js    # Catalog builder from sources
│   └── catalog.js          # Catalog loader
├── public/                 # Static assets (favicons, og-image, etc.)
├── wrangler.toml           # Worker configuration
└── package.json            # Root scripts
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

### Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start Worker (API + WS)
npm run worker:dev
# Runs on http://localhost:8787

# Start frontend (separate terminal)
cd client && npm run dev
# Runs on http://localhost:5173 (proxies /api, /ws to worker)
```

### Build Catalog (optional - runs on worker deploy)

```bash
npm run build:catalog
# Fetches from AsiaWaves, Akashvani GitHub, OnlineRadioFM
# Outputs to worker/channels.json
```

### Deploy

```bash
# 1. Deploy Worker
npx wrangler deploy
# Sets CONTACT_WEBHOOK_URL secret for contact form notifications

# 2. Deploy Pages (auto on git push to main)
# Build: cd client && npm ci && npm run build
# Output: client/dist
# SPA fallback via _redirects: /* /index.html 200
```

---

## Configuration

### Worker Secrets (set via `wrangler secret put`)

| Secret | Description |
|--------|-------------|
| `CONTACT_WEBHOOK_URL` | ntfy.sh topic URL (e.g., `https://ntfy.sh/your-topic`) |

### KV Namespaces (create in Cloudflare Dashboard)

| Binding | Purpose |
|---------|---------|
| `RATE_LIMIT` | Contact form rate limiting (6/min/IP) |
| `ANALYTICS` | Page views, play events (consent-gated) |
| `ERRORS` | Client-side error reports |
| `CONTACTS` | Contact form submissions (30-day TTL) |
| `STATUS` | Stream health checks (5-min TTL) |
| `CATALOG` | Catalog caching (7-day TTL) |

### Durable Object
- `PRESENCE` — WebSocket connections, live listener counts

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + station count |
| GET | `/api/channels` | Full station catalog (112 stations) |
| GET | `/api/status` | Stream health statuses |
| POST | `/api/contact` | Contact form (spam-protected) |
| POST | `/api/analytics/event` | Consent-gated analytics |
| POST | `/api/errors` | Client error reports |
| GET | `/api/analytics` | Analytics totals (admin) |
| GET | `/robots.txt` | Robots.txt |
| GET | `/sitemap.xml` | Sitemap |
| WS | `/ws` | Live presence WebSocket |

---

## Contact Form Notifications

Set `CONTACT_WEBHOOK_URL` to receive real-time notifications:

**ntfy.sh (free, no auth):**
```bash
wrangler secret put CONTACT_WEBHOOK_URL <<< "https://ntfy.sh/your-topic-name"
```
Then visit `https://ntfy.sh/your-topic-name` or install ntfy app.

**Discord/Slack webhook:**
```bash
wrangler secret put CONTACT_WEBHOOK_URL <<< "https://discord.com/api/webhooks/..."
```

Payload format:
```json
{
  "text": "📬 New contact from UP Radio\n**Name:** John\n**Email:** john@example.com\n**Message:** Hello...",
  "title": "New Contact Form Submission",
  "tags": ["email", "contact"]
}
```

---

## Static Pages

Static HTML files in `client/public/` copied to build:
- `/terms` — Terms & Conditions
- `/privacy` — Privacy Policy
- `/404` — Custom 404 page
- `/sources` — Sources & credits (React page)

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Credits

- **Station data:** [asiawaves.net](https://www.asiawaves.net/india/uttar-pradesh-radio.htm)
- **Akashvani streams:** [codito/akashvani](https://github.com/codito/akashvani)
- **Online streams:** [onlineradiofm.in](https://onlineradiofm.in/uttar-pradesh)
- **Fonts:** Inter, Noto Sans Devanagari, JetBrains Mono
- **Icons:** Lucide React
- **Streaming:** hls.js

---

## Author

**Sumit Tiwari** — [GitHub](https://github.com/sumittiwari1302) • [Email](mailto:sumittiwari1302@gmail.com)