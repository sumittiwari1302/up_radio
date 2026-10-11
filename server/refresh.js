/**
 * One-shot catalog refresh:  npm run refresh
 * Fetches the latest Akashvani station list, filters Uttar Pradesh, and
 * rewrites channels.json.
 */

import { refresh, flatten } from './catalog.js';

try {
  console.log('[up-radio] rebuilding catalog from asiawaves + akashvani + onlineradiofm ...');
  const doc = await refresh();
  const channels = flatten(doc);
  const playable = channels.filter((c) => c.has_stream);
  console.log(`[up-radio] channels.json: ${channels.length} stations, ${playable.length} playable`);
  for (const ch of playable) {
    console.log(`  ${ch.ch}  ${ch.name_en.padEnd(26)} ${(ch.frequency || '').padEnd(22)} ${ch.city}`);
  }
} catch (err) {
  console.error('[up-radio] refresh failed:', err.message);
  process.exit(1);
}
