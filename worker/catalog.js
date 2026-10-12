/**
 * Catalog loader for Cloudflare Workers.
 * Reads channels.json from KV or embedded JSON.
 */

import catalogData from '../client/dist/channels.json' with { type: 'json' };

export const UPSTREAM_URL = 'https://www.asiawaves.net/india/uttar-pradesh-radio.htm';

/** Flatten a catalog document into a channel array. */
export function flatten(doc) {
  const groups = doc?.station_dashboard?.groups || [];
  return groups.flatMap((g) => g.channels || []);
}

/** Load catalog from KV or embedded. */
export async function getCatalog(env) {
  // Try KV first (updated by refresh)
  const kv = await env.STATUS.get('catalog:latest', { type: 'json' });
  if (kv) return kv;

  // Fallback to embedded JSON
  return catalogData;
}

/** Refresh catalog from upstream and store in KV. */
export async function refresh(env) {
  // For now, just return the embedded version
  // In production, you'd run buildCatalog here and store in KV
  await env.STATUS.put('catalog:latest', JSON.stringify(catalogData), { expirationTtl: 86400 * 7 });
  return catalogData;
}