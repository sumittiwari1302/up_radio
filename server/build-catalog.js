/**
 * Build a complete Uttar Pradesh radio catalog.
 *
 * Sources merged:
 *   1. asiawaves.net  — full UP broadcast directory: every FM/MW station per
 *                       city, with frequencies and owners (107 entries).
 *   2. codito/akashvani — Akashvani / All India Radio UP stream URLs.
 *   3. onlineradiofm.in — free online streams for UP community / web stations.
 *
 * Output: channels.json (committed to the repo, served by the app).
 * Run with:  npm run build:catalog
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'channels.json');

const UA = 'Mozilla/5.0 (compatible; up-radio-catalog/1.0)';
const ASIAWAVES = 'https://www.asiawaves.net/india/uttar-pradesh-radio.htm';
const AKASHVANI =
  'https://raw.githubusercontent.com/codito/akashvani/master/stations.json';
const ONLINERADIOFM = 'https://onlineradiofm.in/uttar-pradesh';
const ONLINERADIOFM_BASE = 'https://onlineradiofm.in/stations/';

async function get(url, timeout = 25000) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Hindi names for Akashvani stations, keyed by city.
// ---------------------------------------------------------------------------

const AIR_HI = {
  lucknow: 'आकाशवाणी लखनऊ',
  kanpur: 'आकाशवाणी कानपुर',
  prayagraj: 'आकाशवाणी प्रयागराज',
  allahabad: 'आकाशवाणी प्रयागराज',
  varanasi: 'आकाशवाणी वाराणसी',
  agra: 'आकाशवाणी आगरा',
  gorakhpur: 'आकाशवाणी गोरखपुर',
  ayodhya: 'आकाशवाणी अयोध्या',
  faizabad: 'आकाशवाणी अयोध्या',
  bareilly: 'आकाशवाणी बरेली',
  jhansi: 'आकाशवाणी झांसी',
  mathura: 'आकाशवाणी मथुरा',
  rampur: 'आकाशवाणी रामपुर',
  najibabad: 'आकाशवाणी नजीबाबाद',
  obra: 'आकाशवाणी ओबरा',
  aligarh: 'आकाशवाणी अलीगढ़',
  meerut: 'आकाशवाणी मेरठ',
  'rainbow-lucknow': 'एफएम रेनबो लखनऊ',
  'rainbow-kanpur': 'एफएम रेनबो कानपुर',
};

// ---------------------------------------------------------------------------
// Bhojpuri names for stations, keyed by city.
// ---------------------------------------------------------------------------

const AIR_BHO = {
  lucknow: 'आकाशवाणी लखनऊ',
  kanpur: 'आकाशवाणी कानपुर',
  prayagraj: 'आकाशवाणी प्रयागराज',
  allahabad: 'आकाशवाणी प्रयागराज',
  varanasi: 'आकाशवाणी वाराणसी',
  agra: 'आकाशवाणी आगरा',
  gorakhpur: 'आकाशवाणी गोरखपुर',
  ayodhya: 'आकाशवाणी अयोध्या',
  faizabad: 'आकाशवाणी अयोध्या',
  bareilly: 'आकाशवाणी बरेली',
  jhansi: 'आकाशवाणी झांसी',
  mathura: 'आकाशवाणी मथुरा',
  rampur: 'आकाशवाणी रामपुर',
  najibabad: 'आकाशवाणी नजीबाबाद',
  obra: 'आकाशवाणी ओबरा',
  aligarh: 'आकाशवाणी अलीगढ़',
  meerut: 'आकाशवाणी मेरठ',
  'rainbow-lucknow': 'एफएम रेनबो लखनऊ',
  'rainbow-kanpur': 'एफएम रेनबो कानपुर',
};

// ---------------------------------------------------------------------------
// Stream maps (free public streams)
// ---------------------------------------------------------------------------

// Akashvani UP, keyed by a city token found in the AsiaWaves station name.
const AIR_STREAMS = {
  lucknow: {
    url: 'https://radio.wavespb.com/live/75c01e54cb46ad29/75c01e54cb46ad29.m3u8',
    extra: 'FM Rainbow Lucknow 100.7 MHz',
  },
  kanpur: {
    url: 'https://radio.wavespb.com/live/278ca8613f27411e/278ca8613f27411e.m3u8',
    extra: 'FM Rainbow Kanpur 103.7 MHz',
  },
  prayagraj: {
    url: 'https://radio.wavespb.com/live/7427fdb9d3f69c5d/7427fdb9d3f69c5d.m3u8',
  },
  varanasi: {
    url: 'https://radio.wavespb.com/live/43290b0b741fd08f/43290b0b741fd08f.m3u8',
  },
  agra: { url: 'https://radio.wavespb.com/live/94e6de05aa9b04b0/94e6de05aa9b04b0.m3u8' },
  gorakhpur: {
    url: 'https://radio.wavespb.com/live/90f2250fec262bde/90f2250fec262bde.m3u8',
  },
  ayodhya: {
    url: 'https://radio.wavespb.com/live/750c49044bde8cfe/750c49044bde8cfe.m3u8',
  },
  faizabad: {
    url: 'https://radio.wavespb.com/live/750c49044bde8cfe/750c49044bde8cfe.m3u8',
  },
  bareilly: {
    url: 'https://radio.wavespb.com/live/e323812d96d7881d/e323812d96d7881d.m3u8',
  },
  jhansi: { url: 'https://radio.wavespb.com/live/f8f027390a964141/f8f027390a964141.m3u8' },
  mathura: {
    url: 'https://radio.wavespb.com/live/5e42265becd8a816/5e42265becd8a816.m3u8',
  },
  rampur: {
    url: 'https://radio.wavespb.com/live/bc3b1ad27f1e2fda/bc3b1ad27f1e2fda.m3u8',
  },
  najibabad: {
    url: 'https://radio.wavespb.com/live/4aaa85cab056e9c1/4aaa85cab056e9c1.m3u8',
  },
  obra: {
    url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio235/playlist.m3u8',
  },
};

// FM Rainbow stations carry their own Akashvani streams.
const RAINBOW = [
  {
    id: 'rainbow-lucknow',
    name_en: 'FM Rainbow Lucknow',
    city: 'Lucknow',
    frequency: 'FM 100.7 MHz',
    freq: 1007,
    url: 'https://radio.wavespb.com/live/81c465a355a1ea65/81c465a355a1ea65.m3u8',
  },
  {
    id: 'rainbow-kanpur',
    name_en: 'FM Rainbow Kanpur',
    city: 'Kanpur',
    frequency: 'FM 103.7 MHz',
    freq: 1037,
    url: 'https://radio.wavespb.com/live/c0df5324304ad39e/c0df5324304ad39e.m3u8',
  },
];

// National Akashvani services that Uttar Pradesh actually carries (via AIR
// relays) — included because "if UP has it, include it". FM Gold is Delhi-only
// with no UP service, so it stays out.
const NATIONAL_AIR = [
  {
    id: 'vividh-bharati',
    name_en: 'Vividh Bharati',
    name_hi: 'विविध भारती',
    city: 'Uttar Pradesh',
    frequency: 'MW relays (UP)',
    freq: null,
    band: 'MW',
    tags: ['national'],
    url: 'https://radio.wavespb.com/live/146ed6ec6dea5a24/146ed6ec6dea5a24.m3u8',
  },
];

// Free online / community streams, matched to the AsiaWaves directory by
// the exact station title.
const EXTRA_STREAMS = [
  {
    titleMatch: 'Aap ki Awaaz',
    category: 'community',
    name_en: 'Aap ki Awaaz',
    city: 'Agra',
    frequency: 'FM 90.8 MHz',
    freq: 908,
    url: 'https://vobook.ru/http://162.244.80.106:11332/stream',
  },
  {
    titleMatch: 'Radio Pragya',
    category: 'community',
    name_en: 'Radio Pragya 90.4 FM',
    city: 'Padrauna',
    frequency: 'FM 90.4 MHz',
    freq: 904,
    url: 'https://stream-151.zeno.fm/g42tzhe29f8uv?zs=jJjykDclQgCqVR0AIbLNMg',
  },
  {
    titleMatch: 'Radio Noida',
    category: 'community',
    name_en: 'Radio Noida 107.4',
    city: 'Noida',
    frequency: 'FM 107.4 MHz',
    freq: 1074,
    url: 'https://stream.zeno.fm/xbz9wlgsygyuv',
  },
];

// Free online feeds for commercial FM networks that broadcast in UP. These are
// network-wide Hindi feeds, so every UP city carrying the network can play it.
const NETWORK_STREAMS = [
  { match: /\bbig\b|92\.7/i, url: 'https://stream.zeno.fm/dbstwo3dvhhtv' },
  { match: /radio city|city 91/i, url: 'https://radios.crabdance.com:8002/5' },
  { match: /mirchi love/i, url: 'https://drive.uber.radio/uber/bollywoodlove/icecast.audio' },
  { match: /radio mirchi|mirchi 98/i, url: 'https://stream.zeno.fm/wgaznsmt92quv' },
  { match: /red fm|red 93/i, url: 'https://stream.zeno.fm/9phrkb1e3v8uv' },
  { match: /fever/i, url: 'https://radio.canstream.co.uk:8115/live.mp3' },
  { match: /radio mantra|mantra fm/i, url: 'https://streamlky.alsolnet.com:443/mantrafm' },
];

// Web-only UP stations (no terrestrial frequency).
const ONLINE_STATIONS = [
  {
    id: 'aashiqanaa',
    name_en: 'Radio Aashiqanaa',
    city: 'Kanpur',
    frequency: 'ONLINE',
    freq: null,
    url: 'https://mars.streamerr.co/8154/stream',
    tags: ['bollywood', 'hindi'],
  },
  {
    id: 'madhur-sangeet',
    name_en: 'Madhur Sangeet Radio',
    city: 'Noida',
    frequency: 'ONLINE',
    freq: null,
    url: 'https://stream.zenolive.com/yv2k0dp18vzuv.aac',
    tags: ['classic', 'hindi'],
  },
];

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAsiawaves(html) {
  const sections = html.split(/<tr class="subhead">\s*<td colspan="4">/);
  const rows = [];
  for (let i = 1; i < sections.length; i++) {
    const open = sections[i];
    const cityHtml = open.slice(0, open.indexOf('</tr>'));
    const city = stripTags(cityHtml.replace(/\{[^}]*\}/g, '')).trim();
    const body = sections[i].slice(open.indexOf('</tr>'));
    const entries = body.match(/<tr class="entry"[\s\S]*?<\/tr>/g) || [];
    for (const e of entries) {
      const freqCells = e.match(/<div class="freq">[\s\S]*?<\/div>/g) || [];
      const freqs = freqCells.map((f) => stripTags(f)).filter(Boolean);
      const nameM = e.match(/class="station"[^>]*>\s*<div class="data-value">([\s\S]*?)<\/div>/);
      const name = nameM ? stripTags(nameM[1]) : '';
      if (name) rows.push({ city, freqs, name });
    }
  }
  return rows;
}

function parseFreqs(freqs) {
  const out = [];
  for (const f of freqs) {
    const m = f.match(/(\d+(?:\.\d+)?)\s*(kHz|MHz)/i);
    if (m) out.push({ value: Number(m[1]), unit: m[2].toLowerCase() === 'mhz' ? 'FM' : 'MW' });
  }
  return out;
}

function classify(name) {
  const n = name.toLowerCase();
  if (n.includes('gyan vani')) return 'gyanvani';
  if (n.includes('all india radio') || n.includes('akashvani')) return 'air';
  if (n.includes('community')) return 'community';
  // Licensed commercial FM networks.
  if (
    /(big\s*92\.7|big fm|red fm|fever fm|radio city|radio mirchi|mirchi love|tadka fm|current fm|city fm|radio mantra|my fm|hint fm)/i.test(
      n
    )
  ) {
    return 'private';
  }
  return 'community';
}

function ownerOf(name) {
  const m = name.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : '';
}

function titleOf(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function freqString(freqs) {
  if (!freqs.length) return '—';
  return freqs.map((f) => `${f.unit === 'FM' ? 'FM' : 'MW'} ${f.value} ${f.unit === 'FM' ? 'MHz' : 'kHz'}`).join(' / ');
}

function primaryFreq(freqs) {
  if (!freqs.length) return { freq: null, band: 'ONLINE' };
  const f = freqs[0];
  return { freq: f.unit === 'FM' ? Math.round(f.value * 10) : f.value, band: f.unit };
}

function audioType(url) {
  if (!url) return null;
  if (/\.m3u8/i.test(url)) return 'hls';
  if (/\.aac/i.test(url)) return 'aac';
  if (/\.mp3/i.test(url)) return 'mp3';
  return 'stream';
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function scrapeOnlineradiofm() {
  const index = await get(ONLINERADIOFM);
  const slugs = [...new Set([...index.matchAll(/href="stations\/([a-z0-9.\-]+)"/g)].map((m) => m[1]))];
  const streams = {};
  await Promise.all(
    slugs.map(async (s) => {
      try {
        const html = await get(ONLINERADIOFM_BASE + s);
        const m = html.match(/var FILE\s*=\s*"([^"]+)"/);
        if (m && m[1]) streams[s] = m[1];
      } catch {
        /* ignore */
      }
    })
  );
  return { slugs, streams };
}

async function build(outFile = OUT) {
  console.log('[build] fetching sources ...');
  const [asiaHtml, akashvaniRaw, onrfm] = await Promise.all([
    get(ASIAWAVES),
    get(AKASHVANI),
    scrapeOnlineradiofm().catch((e) => {
      console.warn('[build] onlineradiofm failed:', e.message);
      return { slugs: [], streams: {} };
    }),
  ]);

  const akashvani = JSON.parse(akashvaniRaw);
  const airByName = {};
  for (const s of akashvani) {
    if (String(s.state || '').toUpperCase().trim() === 'UTTAR PRADESH') airByName[s.name] = s;
  }

  const rows = parseAsiawaves(asiaHtml);
  console.log(`[build] asiawaves UP entries: ${rows.length}`);
  console.log(`[build] akashvani UP stations: ${Object.keys(airByName).length}`);
  console.log(`[build] onlineradiofm streams: ${Object.keys(onrfm.streams).length}`);

  const groups = { air: [], community: [], private: [], online: [] };
  const seen = new Set();

  for (const r of rows) {
    const freqs = parseFreqs(r.freqs);
    const cat = classify(r.name);
    const title = titleOf(r.name);
    const owner = ownerOf(r.name);
    const cityToken = r.city.toLowerCase().replace(/\s*\[.*$/, '').trim();

    const { freq, band } = primaryFreq(freqs);
    let streamUrl = null;

    if (cat === 'air') {
      const s = AIR_STREAMS[cityToken];
      if (s) streamUrl = s.url;
      // Fall back to akashvani upstream by matching city in the name.
      if (!streamUrl) {
        for (const [name, rec] of Object.entries(airByName)) {
          if (name.toLowerCase().includes(cityToken)) {
            streamUrl = rec.stream_url;
            break;
          }
        }
      }
    }

    // Community stream matching.
    if (!streamUrl) {
      const extra = EXTRA_STREAMS.find((x) => title === x.titleMatch);
      if (extra) streamUrl = extra.url;
    }

    // Commercial FM networks publish free online feeds — attach to their UP entries.
    if (!streamUrl && cat === 'private') {
      const net = NETWORK_STREAMS.find((n) => n.match.test(title) || n.match.test(r.name));
      if (net) streamUrl = net.url;
    }

    const bucket = cat === 'gyanvani' ? 'community' : cat;
    const id = slug(`${title} ${r.city}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const channel = {
      id,
      ch: '',
      name_en: title,
      name_hi: cat === 'air' ? AIR_HI[cityToken] || '' : '',
      name_bho: cat === 'air' ? AIR_BHO[cityToken] || '' : '',
      city: r.city.replace(/\s*\[.*$/, '').trim(),
      frequency: freqString(freqs),
      freq,
      band,
      category: cat,
      owner,
      language: cat === 'air' ? 'Hindi' : 'Hindi',
      tags: [],
      cat_label: '',
      badge_tag: `${title.toUpperCase()} • ${freqString(freqs)}`,
      stream_url: streamUrl,
      audio_type: audioType(streamUrl),
      has_stream: Boolean(streamUrl),
      source: 'asiawaves',
    };
    groups[bucket].push(channel);
  }

  // FM Rainbow stations (Akashvani FM) — add if not already present.
  for (const rb of RAINBOW) {
    const id = slug(`${rb.name_en} ${rb.city}`);
    if (seen.has(id)) continue;
    seen.add(id);
    groups.air.push({
      id: rb.id,
      ch: '',
      name_en: rb.name_en,
      name_hi: AIR_HI[rb.id] || '',
      name_bho: AIR_BHO[rb.id] || '',
      city: rb.city,
      frequency: rb.frequency,
      freq: rb.freq,
      band: 'FM',
      category: 'air',
      owner: 'Prasar Bharati (Akashvani)',
      language: 'Hindi, Urdu',
      tags: ['rainbow'],
      cat_label: '',
      badge_tag: `${rb.name_en.toUpperCase()} • ${rb.frequency}`,
      stream_url: rb.url,
      audio_type: 'hls',
      has_stream: true,
      source: 'akashvani',
    });
  }

  // National Akashvani services that UP carries.
  for (const na of NATIONAL_AIR) {
    groups.air.push({
      id: na.id,
      ch: '',
      name_en: na.name_en,
      name_hi: na.name_hi,
      name_bho: na.name_hi,
      city: na.city,
      frequency: na.frequency,
      freq: na.freq,
      band: na.band,
      category: 'air',
      owner: 'Prasar Bharati (Akashvani)',
      language: 'Hindi',
      tags: na.tags || [],
      cat_label: '',
      badge_tag: `${na.name_en.toUpperCase()} • ${na.frequency}`,
      stream_url: na.url,
      audio_type: audioType(na.url),
      has_stream: true,
      source: 'akashvani',
    });
  }

  // Web-only stations.
  for (const o of ONLINE_STATIONS) {
    groups.online.push({
      id: o.id,
      ch: '',
      name_en: o.name_en,
      name_hi: '',
      name_bho: '',
      city: o.city,
      frequency: o.frequency,
      freq: o.freq,
      band: 'ONLINE',
      category: 'online',
      owner: '',
      language: 'Hindi',
      tags: o.tags || [],
      cat_label: '',
      badge_tag: `${o.name_en.toUpperCase()} • ONLINE`,
      stream_url: o.url,
      audio_type: audioType(o.url),
      has_stream: true,
      source: 'onlineradiofm',
    });
  }

  // Assign channel numbers: playable channels first, then directory.
  const order = ['air', 'community', 'online', 'private'];
  const label = {
    air: 'PUBLIC / AKASHVANI',
    community: 'COMMUNITY / CAMPUS RADIO',
    online: 'ONLINE / WEB RADIO',
    private: 'PRIVATE / COMMERCIAL FM',
  };

  const sortedGroups = order.map((key) => {
    // Playable (has_stream) first, then FM before MW, then alphabetical city.
    groups[key].sort((a, b) => {
      if (a.has_stream !== b.has_stream) return a.has_stream ? -1 : 1;
      if (a.city !== b.city) return a.city.localeCompare(b.city);
      return a.name_en.localeCompare(b.name_en);
    });
    groups[key].forEach((c) => {
      c.cat_label = label[key];
    });
    return { group_name: label[key], channels: groups[key] };
  });

  // Global channel numbering across playable channels first.
  let n = 0;
  const playable = sortedGroups.flatMap((g) => g.channels).filter((c) => c.has_stream);
  playable.forEach((c) => {
    c.ch = `CH ${String(++n).padStart(3, '0')}`;
  });
  sortedGroups.flatMap((g) => g.channels).forEach((c) => {
    if (!c.ch) c.ch = 'DIR';
  });

  const doc = {
    state: 'UTTAR PRADESH',
    updated_at: new Date().toISOString(),
    sources: {
      frequencies: ASIAWAVES,
      akashvani_streams: AKASHVANI,
      online_streams: ONLINERADIOFM,
    },
    counts: {
      total: sortedGroups.reduce((a, g) => a + g.channels.length, 0),
      playable: playable.length,
    },
    station_dashboard: {
      groups: sortedGroups,
    },
  };

  fs.writeFileSync(outFile, JSON.stringify(doc, null, 2) + '\n');
  console.log(
    `[build] wrote ${outFile} — ${doc.counts.total} stations (${doc.counts.playable} playable)`
  );
  for (const g of sortedGroups) {
    const p = g.channels.filter((c) => c.has_stream).length;
    console.log(`   ${g.group_name.padEnd(26)} ${g.channels.length} stations, ${p} playable`);
  }
  return doc;
}

export async function buildCatalog(outFile = OUT) {
  return build(outFile);
}

// Run when invoked directly (npm run build:catalog).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  build().catch((err) => {
    console.error('[build] failed:', err);
    process.exit(1);
  });
}
