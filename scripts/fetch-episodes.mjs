import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { buildEpisodes, toHtml } from './lib/episodes.mjs';
import { matchUploads } from './lib/thumbnails.mjs';

const CHANNEL_ID = 'UCDqSBnaFFUb9iviQff33AGw';
const youtubeMap = JSON.parse(readFileSync('src/data/youtube-map.json', 'utf8'));

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
  for (const ep of data.episodes) ep.youtubeId = youtubeMap[String(ep.number)] ?? null;
  try {
    const upXml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`)).text();
    const up = new XMLParser({ ignoreAttributes: false }).parse(upXml);
    const uploads = [].concat(up.feed?.entry ?? []).map(e => ({
      title: String(e.title), videoId: String(e['yt:videoId']),
    }));
    matchUploads(data.episodes, uploads);
    // persist newly matched ids so they survive after videos age out of the uploads feed
    let mapChanged = false;
    for (const ep of data.episodes) {
      if (ep.youtubeId && youtubeMap[String(ep.number)] !== ep.youtubeId) {
        youtubeMap[String(ep.number)] = ep.youtubeId;
        mapChanged = true;
      }
    }
    if (mapChanged) {
      writeFileSync('src/data/youtube-map.json', JSON.stringify(youtubeMap, null, 1));
      console.log('youtube-map.json updated with new matches');
    }
  } catch { /* uploads feed is enhancement only */ }

  applyOverrides(data);
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


function applyOverrides(data) {
  const overrides = existsSync('overrides/descriptions.json')
    ? JSON.parse(readFileSync('overrides/descriptions.json', 'utf8')) : {};
  let described = 0, localThumbs = 0;
  for (const ep of data.episodes) {
    const o = overrides[String(ep.number)];
    if (o) {
      ep.descriptionHtml = toHtml(o);
      ep.excerpt = String(o).split(/\n/)[0].slice(0, 220);
      described++;
    }
    if (existsSync(`public/images/episodes/${ep.number}.jpg`)) {
      ep.thumbnailUrl = `/images/episodes/${ep.number}.jpg`;
      localThumbs++;
    } else if (ep.youtubeId) {
      ep.thumbnailUrl = `https://i.ytimg.com/vi/${ep.youtubeId}/hqdefault.jpg`;
    } else {
      ep.thumbnailUrl = data.showImage;
    }
  }
  console.log(`overrides: ${described} descriptions, ${localThumbs} local thumbnails`);
}
