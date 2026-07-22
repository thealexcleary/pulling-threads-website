# Pulling Threads Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and launch pullingthreads.com.au — an Astro static site in a new GitHub repo (`thealexcleary/pulling-threads-website`) that lists every podcast episode from the RSS feed, rebuilds itself daily via GitHub Actions, and deploys to GitHub Pages.

**Architecture:** A build-time script fetches the Spotify (anchor.fm) RSS feed and writes `src/data/episodes.json` (committed copy = fallback cache). Astro renders one static page per episode plus home/episodes/about/store from that JSON. GitHub Actions runs the fetch + build on a daily cron and on push, deploying to GitHub Pages. The store form POSTs to a Google Apps Script web app that appends rows to a Google Sheet.

**Tech Stack:** Astro 5 (static output), Node 20, vitest (unit tests for data transforms), fast-xml-parser, @astrojs/sitemap, GitHub Actions + Pages, Google Apps Script.

## Global Constraints

- Site URL: `https://pullingthreads.com.au` (set as `site` in astro.config.mjs; CNAME file required)
- RSS feed: `https://anchor.fm/s/f504ca18/podcast/rss`
- Spotify show: `https://open.spotify.com/show/1et4gYjb2968Hfcfm0TQdW`
- Instagram: `@pullingthreads` (`https://instagram.com/pullingthreads`); Alex personal: `@thealexcleary`
- Tagline everywhere: `Mostly talking shit, occasionally to great people...` — NEVER "shit talking"
- Fonts: Anton (headings, uppercase) + Barlow 400/600/700 (body), self-hosted woff2 — never Bebas Neue, no other fonts
- Colours: `#000`, `#111`, white, greys (`#A6A6A6`/`#6E6E6E`/`#262626`/`#3A3A3A`), red `#E53E3E` (hover `#C53030`, deep `#63171B`) — red sparingly
- No emoji, no hashtags anywhere in site copy; profanity stays
- Never the labels "The Catalyst"/"The Everyman"
- Hero: `hero-empty-studio` image, headline `PULLING THREADS` only + one subline + 2 CTAs (no kicker, no tagline in hero)
- Mobile: hero fills `100svh` minus ticker (47px) so the ticker rides the fold; nav collapses to badge + Listen button
- Design source of truth: `website-mockup/index2.template.html` and `website-mockup/assets/` in the pipeline repo (`/Users/alexcleary/Documents/pulling-threads`) — port its CSS verbatim into `src/styles/global.css`, converting `{{TOKEN}}` data-URIs to real file references
- All commits in the NEW repo; never commit `node_modules` or `dist`

---

### Task 1: Scaffold Astro project + GitHub repo

**Files:**
- Create: `~/Documents/pulling-threads-website/` (new repo root; all later paths relative to it)
- Create: `package.json`, `astro.config.mjs`, `.gitignore`, `.nvmrc`
- Create: `public/fonts/*.woff2`, `public/images/*` (copied from mockup assets)

**Interfaces:**
- Produces: repo `thealexcleary/pulling-threads-website` on GitHub, `npm run build` succeeds, assets available at `/fonts/...` and `/images/...`

- [ ] **Step 1: Scaffold project**

```bash
cd ~/Documents
npm create astro@latest pulling-threads-website -- --template minimal --no-install --no-git --typescript strict --yes
cd pulling-threads-website
npm install
npm install fast-xml-parser @astrojs/sitemap
npm install -D vitest
echo "20" > .nvmrc
```

- [ ] **Step 2: Configure astro.config.mjs**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pullingthreads.com.au',
  output: 'static',
  integrations: [sitemap()],
});
```

- [ ] **Step 3: Add test script to package.json** — in `"scripts"`, add `"test": "vitest run"` and `"fetch-episodes": "node scripts/fetch-episodes.mjs"`.

- [ ] **Step 4: Copy brand assets from the pipeline repo**

```bash
mkdir -p public/fonts public/images
cp /Users/alexcleary/Documents/pulling-threads/website-mockup/assets/{Anton-400,Barlow-400,Barlow-600,Barlow-700}.woff2 public/fonts/
cp /Users/alexcleary/Documents/pulling-threads/website-mockup/assets/badge.png public/images/badge.png
cp /Users/alexcleary/Documents/pulling-threads/website-mockup/assets/gen-hero-clean.jpg public/images/hero.jpg
cp /Users/alexcleary/Documents/pulling-threads/website-mockup/assets/port-alex.jpg public/images/alex.jpg
cp /Users/alexcleary/Documents/pulling-threads/website-mockup/assets/port-troy.jpg public/images/troy.jpg
cp /Users/alexcleary/Documents/pulling-threads/website-mockup/assets/noise.png public/images/noise.png
cp /Users/alexcleary/Documents/pulling-threads/assets/website/hero-empty-studio.png public/images/hero-full.png
```

- [ ] **Step 5: Verify build** — Run `npm run build`. Expected: `Complete!` with dist/ created.

- [ ] **Step 6: Init git, create GitHub repo, push**

```bash
git init -b main
printf "node_modules/\ndist/\n.astro/\n.env\n" > .gitignore
git add -A && git commit -m "chore: scaffold Astro site with brand assets"
gh repo create thealexcleary/pulling-threads-website --public --source=. --push
```

Expected: repo visible at github.com/thealexcleary/pulling-threads-website.

---

### Task 2: Episode data — RSS fetch script with transforms + tests

**Files:**
- Create: `scripts/lib/episodes.mjs` (pure transforms), `scripts/fetch-episodes.mjs` (CLI), `tests/episodes.test.mjs`, `tests/fixtures/feed-sample.xml`, `src/data/episodes.json`

**Interfaces:**
- Produces: `src/data/episodes.json` = `{ fetchedAt: string, showImage: string, episodes: Episode[] }` where `Episode = { number: number, slug: string, title: string, descriptionHtml: string, excerpt: string, pubDate: string(ISO), duration: string("1 hr 38 min"), audioUrl: string, youtubeId: string|null }`, newest first. Transforms exported from `scripts/lib/episodes.mjs`: `slugify(title)`, `formatDuration(hhmmss)`, `excerptFrom(html, max=220)`, `buildEpisodes(parsedFeedItems)`.

- [ ] **Step 1: Save a real feed sample as fixture**

```bash
mkdir -p tests/fixtures scripts/lib src/data
curl -s "https://anchor.fm/s/f504ca18/podcast/rss" | head -c 20000 > tests/fixtures/feed-sample.xml
```

Then hand-trim the fixture to valid XML containing the channel header + first 2 complete `<item>` blocks (close `</channel></rss>`).

- [ ] **Step 2: Write failing tests**

```js
// tests/episodes.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { slugify, formatDuration, excerptFrom, buildEpisodes } from '../scripts/lib/episodes.mjs';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The Renovation That Broke Me')).toBe('the-renovation-that-broke-me');
  });
  it('strips punctuation and collapses dashes', () => {
    expect(slugify("Tim Kacprzak: The Sport Nobody Knows How To Get Paid For"))
      .toBe('tim-kacprzak-the-sport-nobody-knows-how-to-get-paid-for');
  });
});

describe('formatDuration', () => {
  it('formats HH:MM:SS', () => expect(formatDuration('01:38:14')).toBe('1 hr 38 min'));
  it('formats sub-hour', () => expect(formatDuration('00:59:02')).toBe('59 min'));
  it('formats bare seconds', () => expect(formatDuration('3725')).toBe('1 hr 2 min'));
});

describe('excerptFrom', () => {
  it('strips tags and truncates', () => {
    const html = '<p>Alex spent an <b>entire week</b> off work.</p>';
    expect(excerptFrom(html, 30)).toBe('Alex spent an entire week off…');
  });
});

describe('buildEpisodes', () => {
  const xml = readFileSync('tests/fixtures/feed-sample.xml', 'utf8');
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const items = [].concat(parsed.rss.channel.item);
  it('numbers newest-first from total count', () => {
    const eps = buildEpisodes(items, 83);
    expect(eps[0].number).toBe(83);
    expect(eps[1].number).toBe(82);
  });
  it('produces unique slugs and ISO dates', () => {
    const eps = buildEpisodes(items, 83);
    expect(new Set(eps.map(e => e.slug)).size).toBe(eps.length);
    expect(eps[0].pubDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail** — `npm test`. Expected: FAIL, cannot find module `scripts/lib/episodes.mjs`.

- [ ] **Step 4: Implement transforms**

```js
// scripts/lib/episodes.mjs
export function slugify(title) {
  return title.toLowerCase().replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function formatDuration(raw) {
  let secs;
  if (/^\d+$/.test(raw)) secs = Number(raw);
  else {
    const parts = raw.split(':').map(Number);
    secs = parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${m} min`;
}

export function excerptFrom(html, max = 220) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function buildEpisodes(items, totalCount) {
  const seen = new Map();
  return items.map((item, i) => {
    let slug = slugify(item.title);
    const n = (seen.get(slug) || 0) + 1;
    seen.set(slug, n);
    if (n > 1) slug = `${slug}-${n}`;
    const descriptionHtml = item['content:encoded'] || item.description || '';
    return {
      number: totalCount - i,
      slug,
      title: String(item.title),
      descriptionHtml,
      excerpt: excerptFrom(descriptionHtml),
      pubDate: new Date(item.pubDate).toISOString(),
      duration: formatDuration(String(item['itunes:duration'] ?? '0')),
      audioUrl: item.enclosure?.['@_url'] ?? null,
      youtubeId: null,
    };
  });
}
```

- [ ] **Step 5: Run tests, verify pass** — `npm test`. Expected: all PASS. (If CDATA wrapping makes `item.title` an object, add `cdataPropName: false` handling by coercing with `String()` — tests define the contract.)

- [ ] **Step 6: Write the CLI fetcher**

```js
// scripts/fetch-episodes.mjs
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
```

- [ ] **Step 7: Run it for real** — `npm run fetch-episodes`. Expected: `wrote 83 episodes` (or current count) and `src/data/episodes.json` exists. Spot-check episode 83 slug is `the-renovation-that-broke-me`.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: RSS episode fetcher with cached fallback"`

---

### Task 3: YouTube thumbnail mapping

**Files:**
- Create: `scripts/export-youtube-map.mjs` (run ONCE against the pipeline repo), `src/data/youtube-map.json`, `scripts/lib/thumbnails.mjs`, `tests/thumbnails.test.mjs`
- Modify: `scripts/fetch-episodes.mjs` (apply map + uploads-feed matching)

**Interfaces:**
- Consumes: `Episode` objects from Task 2.
- Produces: `thumbnailUrl(episode, showImage)` from `scripts/lib/thumbnails.mjs` → `https://i.ytimg.com/vi/<id>/hqdefault.jpg` when `youtubeId` set, else `showImage`. `src/data/youtube-map.json` = `{ "<episodeNumber>": "<videoId>" }`. Also `matchUploads(episodes, uploads)` filling `youtubeId` by normalized-title match.

- [ ] **Step 1: Export known video IDs from the pipeline repo**

```js
// scripts/export-youtube-map.mjs — run once: node scripts/export-youtube-map.mjs
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
const ROOT = '/Users/alexcleary/Documents/pulling-threads/outputs/content';
const map = {};
for (const dir of readdirSync(ROOT)) {
  const m = dir.match(/^E(\d+)-/); // e.g. E83-S3E26
  const idFile = `${ROOT}/${dir}/youtube_video_id.txt`;
  if (m && existsSync(idFile)) map[m[1]] = readFileSync(idFile, 'utf8').trim();
}
writeFileSync('src/data/youtube-map.json', JSON.stringify(map, null, 1));
console.log('mapped', Object.keys(map).length, 'episodes');
```

Run it; expected `mapped 10` (roughly — E74..E83). Commit the JSON.

- [ ] **Step 2: Resolve the channel ID once** — take any video ID from the map and run:

```bash
VID=$(python3 -c "import json;print(list(json.load(open('src/data/youtube-map.json')).values())[0])")
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$VID&format=json" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['author_url'])"
```

Open the author_url, view source, and extract `"channelId":"UC..."`; or `curl -s <author_url> | grep -o 'channel_id=UC[^"&]*' | head -1`. Record the `UC...` id as `CHANNEL_ID` const in `scripts/fetch-episodes.mjs`.

- [ ] **Step 3: Write failing tests**

```js
// tests/thumbnails.test.mjs
import { describe, it, expect } from 'vitest';
import { thumbnailUrl, matchUploads, normTitle } from '../scripts/lib/thumbnails.mjs';

describe('thumbnailUrl', () => {
  it('uses youtube id when present', () => {
    expect(thumbnailUrl({ youtubeId: 'abc123' }, 'https://cover.jpg'))
      .toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
  });
  it('falls back to show cover', () => {
    expect(thumbnailUrl({ youtubeId: null }, 'https://cover.jpg')).toBe('https://cover.jpg');
  });
});

describe('matchUploads', () => {
  it('fills youtubeId by normalized title', () => {
    const eps = [{ title: 'The Renovation That Broke Me!', youtubeId: null }];
    const uploads = [{ title: 'the renovation that broke me', videoId: 'zzz' }];
    matchUploads(eps, uploads);
    expect(eps[0].youtubeId).toBe('zzz');
  });
  it('never overwrites an existing id', () => {
    const eps = [{ title: 'X', youtubeId: 'keep' }];
    matchUploads(eps, [{ title: 'x', videoId: 'new' }]);
    expect(eps[0].youtubeId).toBe('keep');
  });
});
```

- [ ] **Step 4: Run tests, verify fail** — `npm test`. Expected: FAIL, module not found.

- [ ] **Step 5: Implement**

```js
// scripts/lib/thumbnails.mjs
export const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function thumbnailUrl(episode, showImage) {
  return episode.youtubeId
    ? `https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg`
    : showImage;
}

export function matchUploads(episodes, uploads) {
  const byTitle = new Map(uploads.map(u => [normTitle(u.title), u.videoId]));
  for (const ep of episodes) {
    if (!ep.youtubeId) ep.youtubeId = byTitle.get(normTitle(ep.title)) ?? null;
  }
}
```

- [ ] **Step 6: Run tests, verify pass** — `npm test`.

- [ ] **Step 7: Wire into fetch-episodes.mjs** — after `buildEpisodes(...)`, add:

```js
import youtubeMap from '../src/data/youtube-map.json' with { type: 'json' };
import { matchUploads } from './lib/thumbnails.mjs';

const CHANNEL_ID = 'UC________'; // from Step 2

for (const ep of data.episodes) ep.youtubeId = youtubeMap[String(ep.number)] ?? null;
try {
  const upXml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`)).text();
  const up = new XMLParser({ ignoreAttributes: false }).parse(upXml);
  const uploads = [].concat(up.feed?.entry ?? []).map(e => ({
    title: String(e.title), videoId: String(e['yt:videoId']),
  }));
  matchUploads(data.episodes, uploads);
} catch { /* uploads feed is enhancement only */ }
```

- [ ] **Step 8: Re-run fetch + verify** — `npm run fetch-episodes && python3 -c "import json;d=json.load(open('src/data/episodes.json'));print([ (e['number'], e['youtubeId']) for e in d['episodes'][:12] ])"`. Expected: recent episodes carry video IDs.

- [ ] **Step 9: Commit** — `git add -A && git commit -m "feat: youtube thumbnail mapping with uploads-feed matching"`

---

### Task 4: Global styles + base layout + shared components

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/Ticker.astro`, `src/components/EpisodeCard.astro`, `src/components/Seo.astro`

**Interfaces:**
- Produces: `Base.astro` props `{ title: string, description: string, image?: string, jsonLd?: object }`; `EpisodeCard.astro` props `{ episode, showImage }` rendering thumbnail card (uses `thumbnailUrl` logic inline: youtubeId ? i.ytimg.com : showImage); Nav/Footer/Ticker parameterless.

- [ ] **Step 1: Port the mockup CSS** — copy the entire `<style>` block from `/Users/alexcleary/Documents/pulling-threads/website-mockup/index2.template.html` into `src/styles/global.css` with these mechanical changes: `url({{ANTON}})` → `url(/fonts/Anton-400.woff2)` (same for the 3 Barlow faces); `url({{NOISE}})` → `url(/images/noise.png)`; `url({{HERO}})` → `url(/images/hero.jpg)`; delete nothing else. The mockup CSS is the approved design — do not restyle.

- [ ] **Step 2: Seo.astro**

```astro
---
// src/components/Seo.astro
const { title, description, image = '/images/hero.jpg', jsonLd } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
const img = new URL(image, Astro.site);
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={img} />
<meta name="twitter:card" content="summary_large_image" />
{jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
```

- [ ] **Step 3: Base.astro**

```astro
---
// src/layouts/Base.astro
import '../styles/global.css';
import Seo from '../components/Seo.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
const { title, description, image, jsonLd, heroNav = false } = Astro.props;
---
<html lang="en-au">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/images/badge.png" />
    <Seo {title} {description} {image} {jsonLd} />
  </head>
  <body>
    {!heroNav && <Nav />}
    <slot />
    <Footer />
  </body>
</html>
```

(`heroNav` lets the home page render Nav inside its hero, as in the mockup; on other pages Nav needs `position:static`-friendly styling — add a `.nav--solid { position:sticky; background:rgba(0,0,0,.85); backdrop-filter:blur(12px); border-bottom:1px solid var(--border); }` variant class in global.css and pass a `solid` prop to Nav.)

- [ ] **Step 4: Nav/Footer/Ticker/EpisodeCard** — port markup verbatim from the mockup body (`nav`, `footer`, `.ticker`, `.ep-card` blocks), replacing base64 `src` attributes with `/images/badge.png` etc. `EpisodeCard.astro`:

```astro
---
const { episode, showImage } = Astro.props;
const thumb = episode.youtubeId
  ? `https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg` : showImage;
const date = new Date(episode.pubDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
---
<a class="ep-card" href={`/episodes/${episode.slug}/`}>
  <span class="ep-thumb"><img src={thumb} alt={`${episode.title} thumbnail`} loading="lazy" /></span>
  <span class="ep-info">
    <span class="ep-top"><span class="ep-num">EP {episode.number}</span><span class="ep-date">{date}</span><span class="ep-date">{episode.duration}</span></span>
    <h4>{episode.title}</h4>
  </span>
</a>
```

- [ ] **Step 5: Verify build** — `npm run build`. Expected: success (components compile even though no page uses them all yet).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: global styles, base layout, shared components"`

---

### Task 5: Home page

**Files:**
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: `src/data/episodes.json`, `EpisodeCard`, `Ticker`, `Base`.

- [ ] **Step 1: Build index.astro** — port the mockup body sections in order (hero w/ nav inside, ticker, latest, 6-card grid, about teaser, store teaser). Data wiring:

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Ticker from '../components/Ticker.astro';
import EpisodeCard from '../components/EpisodeCard.astro';
import data from '../data/episodes.json';
const [latest, ...rest] = data.episodes;
const grid = rest.slice(0, 6);
const jsonLd = {
  '@context': 'https://schema.org', '@type': 'PodcastSeries',
  name: 'Pulling Threads', url: 'https://pullingthreads.com.au',
  description: 'Mostly talking shit, occasionally to great people...',
  image: new URL('/images/hero.jpg', Astro.site).href,
  webFeed: 'https://anchor.fm/s/f504ca18/podcast/rss',
};
---
<Base heroNav title="Pulling Threads — Australian podcast by Alex and Troy Cleary"
  description="Mostly talking shit, occasionally to great people... A weekly Australian podcast from brothers Alex and Troy Cleary on life, training, money, mates and modern manhood." {jsonLd}>
  <!-- hero (mockup markup; h1 PULLING THREADS, subline, 2 CTAs; Nav inside) -->
  <!-- Ticker; latest episode section using {latest}; grid of {grid.map(ep => <EpisodeCard ... />)} -->
  <!-- about teaser + store teaser per mockup, links to /about/ /store/ /episodes/ -->
</Base>
```

The comment placeholders above mean "verbatim mockup markup with these bindings" — copy from `website-mockup/index2.template.html`, replacing: latest-episode hardcoded copy with `{latest.title}`, `{latest.excerpt}`, thumbnail from `latest.youtubeId`, `Play episode` → link to `/episodes/${latest.slug}/`; "83" strings with `{data.episodes.length}`.

- [ ] **Step 2: Verify in dev** — `npm run dev`, open http://localhost:4321. Expected: page matches the approved artifact visually (hero, ticker, latest = current EP, grid thumbnails load from i.ytimg.com).

- [ ] **Step 3: Build + commit** — `npm run build && git add -A && git commit -m "feat: home page"`

---

### Task 6: Episodes index with client-side search

**Files:**
- Create: `src/pages/episodes/index.astro`

- [ ] **Step 1: Page with all episodes + search** — render heading `Every episode`, search input, and ALL episodes as `EpisodeCard`s inside `<div class="ep-grid" id="grid">`. Add each card's wrapper a `data-search` attribute (lowercased `title + ' ep' + number`) — do this by wrapping EpisodeCard: `<div class="ep-cell" data-search={`${ep.title.toLowerCase()} ep${ep.number} ep ${ep.number}`}><EpisodeCard .../></div>`. Inline script:

```html
<script>
  const q = document.getElementById('q');
  const cells = [...document.querySelectorAll('.ep-cell')];
  q.addEventListener('input', () => {
    const needle = q.value.toLowerCase().trim();
    for (const c of cells) c.style.display = !needle || c.dataset.search.includes(needle) ? '' : 'none';
  });
</script>
```

- [ ] **Step 2: Verify in dev** — search "deck": renovation episode remains; search "tim": Kacprzak episodes remain.
- [ ] **Step 3: Build + commit** — `git add -A && git commit -m "feat: episodes index with search"`

---

### Task 7: Episode detail pages (the SEO engine)

**Files:**
- Create: `src/pages/episodes/[slug].astro`

**Interfaces:**
- Consumes: `episodes.json`; URL shape `/episodes/<slug>/` (must match `EpisodeCard` hrefs).

- [ ] **Step 1: Implement getStaticPaths + page**

```astro
---
import Base from '../../layouts/Base.astro';
import data from '../../data/episodes.json';

export function getStaticPaths() {
  return data.episodes.map((ep, i) => ({
    params: { slug: ep.slug },
    props: { ep, prev: data.episodes[i + 1] ?? null, next: data.episodes[i - 1] ?? null },
  }));
}
const { ep, prev, next } = Astro.props;
const thumb = ep.youtubeId ? `https://i.ytimg.com/vi/${ep.youtubeId}/hqdefault.jpg` : data.showImage;
const date = new Date(ep.pubDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
const jsonLd = {
  '@context': 'https://schema.org', '@type': 'PodcastEpisode',
  name: ep.title, url: new URL(`/episodes/${ep.slug}/`, Astro.site).href,
  episodeNumber: ep.number, datePublished: ep.pubDate,
  timeRequired: ep.duration, description: ep.excerpt,
  associatedMedia: { '@type': 'MediaObject', contentUrl: ep.audioUrl },
  partOfSeries: { '@type': 'PodcastSeries', name: 'Pulling Threads', url: 'https://pullingthreads.com.au' },
  image: thumb,
};
---
<Base title={`${ep.title} — Pulling Threads EP ${ep.number}`} description={ep.excerpt} image={thumb} {jsonLd}>
  <article class="wrap episode">
    <p class="ep-top"><span class="ep-num">EP {ep.number}</span><span class="ep-date">{date}</span><span class="ep-date">{ep.duration}</span></p>
    <h1>{ep.title}</h1>
    <iframe title="Spotify player" style="border-radius:12px" src={`https://open.spotify.com/embed/show/1et4gYjb2968Hfcfm0TQdW`} width="100%" height="152" frameborder="0" loading="lazy" allow="encrypted-media"></iframe>
    {ep.youtubeId && <p><a class="btn btn-ghost btn-sm" href={`https://www.youtube.com/watch?v=${ep.youtubeId}`}>Watch on YouTube</a></p>}
    <div class="notes" set:html={ep.descriptionHtml} />
    <nav class="prevnext">
      {prev && <a href={`/episodes/${prev.slug}/`}>&larr; EP {prev.number}: {prev.title}</a>}
      {next && <a href={`/episodes/${next.slug}/`}>EP {next.number}: {next.title} &rarr;</a>}
    </nav>
  </article>
</Base>
```

Add `.episode` styles to global.css: `.episode { padding:140px 0 80px; max-width:760px; } .episode h1 { font:400 clamp(34px,5vw,54px)/1.05 var(--heading); text-transform:uppercase; letter-spacing:.02em; } .episode .notes { color:var(--text-2); } .episode .notes p { margin:0 0 16px; } .prevnext { display:flex; justify-content:space-between; gap:24px; margin-top:48px; font:600 13px/1.4 var(--body); text-transform:uppercase; letter-spacing:.05em; }`

Note: the show-notes HTML comes from Alex's own feed (trusted source) — `set:html` is acceptable; do not inject third-party content.

- [ ] **Step 2: Build and verify page count** — `npm run build && ls dist/episodes | wc -l`. Expected: episode count + 1 (index).
- [ ] **Step 3: Spot-check SEO text** — `grep -l "PodcastEpisode" dist/episodes/the-renovation-that-broke-me/index.html`. Expected: match; open the page and confirm show notes render with timestamps.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: per-episode pages with JSON-LD"`

---

### Task 8: About + Store pages (Troy-editable content)

**Files:**
- Create: `src/content/about.md`, `src/content/store.md`, `src/pages/about.astro`, `src/pages/store.astro`

- [ ] **Step 1: Markdown content files** — plain markdown Troy can edit on github.com. `about.md` carries the full story (expand the approved teaser copy: Mount Isa, sparky in African mines, booze-to-Antarctica arc, Troy the everyman + 50K win, the show's premise, in show voice, no self-help preaching). `store.md` carries the coming-soon copy ("No products yet. We're working on it. Or at least talking about working on it, which is basically the same thing.").

- [ ] **Step 2: about.astro** — `Base` + tilted `duo` figures (`/images/alex.jpg`, `/images/troy.jpg`, captions Alex/Troy) + rendered markdown:

```astro
---
import Base from '../layouts/Base.astro';
import { Content as About } from '../content/about.md';
---
<Base title="About — Pulling Threads" description="Two brothers from Mount Isa. Who Alex and Troy Cleary are and why the podcast exists.">
  <section class="about-sec"><div class="wrap about">
    <div class="duo">
      <figure><img src="/images/alex.jpg" alt="Alex Cleary" /><figcaption>Alex</figcaption></figure>
      <figure><img src="/images/troy.jpg" alt="Troy Cleary" /><figcaption>Troy</figcaption></figure>
    </div>
    <div class="about-copy"><About /></div>
  </div></section>
</Base>
```

- [ ] **Step 3: store.astro** — `Base` + store section from mockup incl. the email form (`action` wired in Task 10; for now `data-endpoint=""`), honeypot field `<input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">`, and inline submit handler:

```html
<script>
  const form = document.querySelector('.store-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    try {
      btn.disabled = true; btn.textContent = 'Sending…';
      const res = await fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form) });
      if (!res.ok) throw new Error();
      form.outerHTML = '<p class="store-fine" role="status">Done. You\'ll hear from us when it drops.</p>';
    } catch {
      btn.disabled = false; btn.textContent = 'Get first dibs';
      document.getElementById('store-err').textContent = "That didn't work — try again or DM us on Instagram.";
    }
  });
</script>
```

(Include `<p id="store-err" class="store-fine" role="alert"></p>` under the form.)

- [ ] **Step 4: Verify + commit** — `npm run build`; open /about/ and /store/ in dev. `git add -A && git commit -m "feat: about and store pages with editable markdown"`

---

### Task 9: robots.txt, 404, CI/CD to GitHub Pages

**Files:**
- Create: `public/robots.txt`, `public/CNAME`, `src/pages/404.astro`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Static SEO files**

```
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://pullingthreads.com.au/sitemap-index.xml
```

`public/CNAME` contains exactly: `pullingthreads.com.au`

- [ ] **Step 2: 404.astro** — Base layout, `h1` "PULLED THE WRONG THREAD", link home. Keep it one screen.

- [ ] **Step 3: Workflow**

```yaml
# .github/workflows/deploy.yml
name: Build and deploy
on:
  push: { branches: [main] }
  schedule: [{ cron: "30 20 * * *" }]  # daily 06:30 AEST
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run fetch-episodes
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Enable Pages for Actions deploys**

```bash
gh api -X POST repos/thealexcleary/pulling-threads-website/pages -f build_type=workflow 2>/dev/null || gh api -X PUT repos/thealexcleary/pulling-threads-website/pages -f build_type=workflow
```

- [ ] **Step 5: Push and watch** — `git add -A && git commit -m "ci: build, test, daily RSS refresh, deploy to Pages" && git push`, then `gh run watch`. Expected: green run, site live at the *.github.io URL (domain comes in Task 11).

---

### Task 10: Store email capture → Google Sheet

**Files:**
- Create: Google Sheet `Pulling Threads — Merch list` + bound Apps Script (via google-workspace MCP tools or script.google.com)
- Modify: `src/pages/store.astro` (set `data-endpoint`)

- [ ] **Step 1: Create the Sheet** and note its ID.
- [ ] **Step 2: Apps Script web app**

```js
const SHEET_ID = '<sheet id>';
function doPost(e) {
  const p = (e && e.parameter) || {};
  if (!p.website && p.email && /.+@.+\..+/.test(p.email)) {
    SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow([new Date(), String(p.email).slice(0, 200)]);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy as Web app: execute as **Me**, access **Anyone**. Record the `/exec` URL.

- [ ] **Step 3: Wire endpoint** — set `data-endpoint="<exec url>"` on the store form. Note: Apps Script redirects POSTs (302) — `fetch` follows it; treat any non-network-error response as success, so simplify the handler: success unless fetch throws.
- [ ] **Step 4: End-to-end test** — submit a test email on the deployed site; verify a row lands in the Sheet. Delete the test row.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: merch email capture to Google Sheet" && git push`

---

### Task 11: Domain + launch checklist

- [ ] **Step 1: Squarespace DNS** (Alex or assisted via Playwright) — in Squarespace domain settings for pullingthreads.com.au add: four A records `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; CNAME `www` → `thealexcleary.github.io`.
- [ ] **Step 2: Set custom domain on the repo** — `gh api -X PUT repos/thealexcleary/pulling-threads-website/pages -f build_type=workflow -f "cname=pullingthreads.com.au"`; wait for DNS check; enable **Enforce HTTPS** in repo Settings → Pages once the cert issues.
- [ ] **Step 3: Verify live** — `curl -sI https://pullingthreads.com.au | head -3` → `200`; spot-check an episode URL.
- [ ] **Step 4: Google Search Console** — add property `pullingthreads.com.au` (DNS TXT verification at Squarespace), submit `sitemap-index.xml`. (Alex's Google account; assisted.)
- [ ] **Step 5: Lighthouse** — `npx lighthouse https://pullingthreads.com.au --only-categories=performance,seo --quiet` → both ≥ 95; fix regressions if under.

---

### Task 12: README for Troy

- [ ] **Step 1: Write README.md** in the site repo, plain English: what the site is, "How to edit the About or Store page in your browser" (open file on github.com → pencil icon → edit → Commit changes → site updates itself in ~2 minutes), how the daily episode refresh works, and "if something breaks, run the Actions workflow manually or ping Alex".
- [ ] **Step 2: Commit + push** — `git add README.md && git commit -m "docs: plain-English editing guide" && git push`

---

## Self-Review

- Spec coverage: repo/hosting (T1, T9), RSS data + fallback cache (T2), thumbnails + fallback (T3), all five page types (T5-T8), brand/fonts/design port (T4), SEO meta + JSON-LD + sitemap/robots (T4, T7, T9), store→Sheet with honeypot + failure message (T8, T10), Troy workflow (T8, T12), DNS/HTTPS/Search Console/Lighthouse (T11). Analytics: explicitly out of scope per spec.
- Placeholders: `CHANNEL_ID`/Sheet ID/exec URL are resolved by concrete steps within their tasks, not left open.
- Type consistency: `Episode` fields defined in T2 are the ones consumed in T3-T7 (`number, slug, title, descriptionHtml, excerpt, pubDate, duration, audioUrl, youtubeId`); URL shape `/episodes/<slug>/` consistent between card and detail pages.
