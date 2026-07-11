import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { buildEpisodes } from './lib/episodes.mjs';

const FEED = 'https://anchor.fm/s/f504ca18/podcast/rss';
const OUT = 'src/data/episodes.json';

try {
  const res = await fetch(FEED);
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  const xml = await res.text();
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const channel = parsed.rss.channel;
  const items = [].concat(channel.item);
  const data = {
    fetchedAt: new Date().toISOString(),
    showImage: channel['itunes:image']?.['@_href'] ?? '',
    episodes: buildEpisodes(items, items.length),
  };
  writeFileSync(OUT, JSON.stringify(data, null, 1));
  console.log(`wrote ${data.episodes.length} episodes`);
} catch (err) {
  if (existsSync(OUT)) {
    const cached = JSON.parse(readFileSync(OUT, 'utf8'));
    console.warn(`feed fetch failed (${err.message}); keeping cached ${cached.episodes.length} episodes`);
    process.exit(0); // build continues on last-good data
  }
  throw err;
}
