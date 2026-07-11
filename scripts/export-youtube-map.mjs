// Run once against the pipeline repo to export known episode->youtube video IDs
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
const ROOT = '/Users/alexcleary/Documents/pulling-threads/outputs/content';
const map = {};
for (const dir of readdirSync(ROOT)) {
  const m = dir.match(/^E(\d+)-/);
  const idFile = `${ROOT}/${dir}/youtube_video_id.txt`;
  if (m && existsSync(idFile)) {
    const id = readFileSync(idFile, 'utf8').trim();
    if (id) map[Number(m[1])] = id;
  }
}
writeFileSync('src/data/youtube-map.json', JSON.stringify(map, null, 1));
console.log('mapped', Object.keys(map).length, 'episodes');
