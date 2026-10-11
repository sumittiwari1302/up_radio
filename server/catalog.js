/**
 * Catalog loader for the app.
 *
 * `channels.json` is the committed artifact produced by `npm run build:catalog`
 * (see build-catalog.js), which merges the asiawaves UP directory, Akashvani
 * streams and onlineradiofm online streams. At runtime we simply read that
 * file; `getCatalog()` fetches from upstream only when it is missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from './build-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const CACHE_FILE = path.join(ROOT, 'channels.json');

export const UPSTREAM_URL = 'https://www.asiawaves.net/india/uttar-pradesh-radio.htm';

/** Read channels.json. Returns null when missing or unreadable. */
export function loadCatalog() {
  try {
    const doc = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    return flatten(doc).length ? doc : null;
  } catch {
    return null;
  }
}

/** Flatten a catalog document into a channel array. */
export function flatten(doc) {
  const groups = doc?.station_dashboard?.groups || [];
  return groups.flatMap((g) => g.channels || []);
}

/** Return the catalog, rebuilding it from upstream when the file is absent. */
export async function getCatalog() {
  const cached = loadCatalog();
  if (cached) return cached;
  await buildCatalog(CACHE_FILE);
  const built = loadCatalog();
  if (!built) throw new Error('catalog could not be built');
  return built;
}

/** Rebuild the catalog from all upstream sources and return it. */
export async function refresh() {
  await buildCatalog(CACHE_FILE);
  const built = loadCatalog();
  if (!built) throw new Error('catalog could not be built');
  return built;
}
