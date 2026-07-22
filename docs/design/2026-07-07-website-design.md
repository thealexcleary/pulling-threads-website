# Pulling Threads Website — Design Spec

Date: 2026-07-07 · Approved by Alex (via mockup iterations, artifact `2c6d30fc`)

## Goal

A fast, SEO-strong public website at **pullingthreads.com.au** listing every episode, with an about page, a coming-soon store that captures emails to Google Drive, and links to Spotify / Apple Podcasts / Instagram. Lives in its own GitHub repo so Troy can edit content pages in the browser. Updates itself weekly with zero effort.

## Stack & hosting

- **Astro** static site, own GitHub repo (`pulling-threads-website`) under Alex's GitHub account
- **GitHub Pages** hosting (free), deployed by GitHub Actions
- **Daily scheduled rebuild** (Actions cron) + manual "Run workflow" button: build fetches the RSS feed and regenerates episode pages
- **DNS**: pullingthreads.com.au is registered at Squarespace → add A/AAAA + CNAME records pointing to GitHub Pages; enforce HTTPS

## Data sources

- **Episodes**: RSS feed `https://anchor.fm/s/f504ca18/podcast/rss` (83+ items; titles, HTML show notes with timestamps, pubDate, duration, audio URL)
- **Thumbnails**: YouTube channel — resolve each episode to its YouTube video and use `i.ytimg.com` thumbnail URLs (fallback: show cover art). Newer episodes (E74+) also have `outputs/content/<ep>/thumbnail.png` and `youtube_video_id.txt` in the pipeline repo; the site build should map RSS items to YouTube videos by title match on the channel's uploads.
- **Store signups**: form POST → Google Apps Script web app → appends `(timestamp, email)` rows to a Google Sheet in Alex's Drive. No backend server. Honeypot field for spam.

## Pages

1. **Home** — approved mockup layout (source of truth: `website-mockup/` in the pipeline repo): nav (circular badge logo, Episodes/About/Store, Listen on Spotify); full-bleed hero using the **empty-studio image** (`assets/website/hero-empty-studio.png` — two mics facing off, bare desk, warm lamp, NO people, NO red thread) with ONLY `PULLING THREADS` in Anton + one subline + two CTAs (no kicker line, no tagline in the hero); scrolling ticker strip (must sit at the bottom edge of the first mobile viewport — hero is `100svh` minus ticker height on mobile); latest episode (thumbnail + play + show-notes link); episode grid (6 recent, client-side search); about teaser (tilted portraits — Alex = bucket-hat thumbs-up photo `website-mockup/assets/port-alex.jpg`, Troy = `assets/headshots/troy/troy-1.png`); store teaser + email form; footer.
2. **/episodes/** — all episodes, thumbnail cards, client-side search/filter (static JSON index).
3. **/episodes/\<slug\>/** — one page per episode (the SEO engine): full show notes + timestamps as real text, Spotify embed player, YouTube link, prev/next links.
4. **/about/** — Alex & Troy story in show voice. No "Catalyst/Everyman" labels.
5. **/store/** — coming soon + "Get first dibs" email form (→ Google Sheet).

## Brand

- Fonts: **Anton** (headings — deliberate override of Bebas Neue in visual-identity.md, per Alex), **Barlow** (body), self-hosted woff2
- Colours: brand tokens (black `#000`/`#111`, white, greys, red `#E53E3E` sparingly)
- Film grain overlay + per-section gradients/glows — never flat black
- No emoji, no hashtags, profanity kept
- Tagline order is "Mostly **talking shit**..." — the Spotify description and brand doc say "shit talking" and are wrong
- Instagram: **@pullingthreads**

## SEO

- Per-page `<title>`/meta description; canonical URLs on pullingthreads.com.au
- JSON-LD: `PodcastSeries` on home, `PodcastEpisode` per episode page
- Open Graph + Twitter cards (episode thumbnail as og:image)
- `sitemap.xml` + `robots.txt`; submit to Google Search Console (Alex gets access)
- Static output, optimised/responsive images, self-hosted fonts — fast LCP

## Troy editing workflow

About/store/home copy live as markdown/content files; editing them on github.com triggers auto-redeploy. README documents the 3-step edit flow in plain English.

## Error handling

- RSS fetch failure at build time → keep last-good episode data (cache committed as JSON artifact), build still succeeds
- Apps Script endpoint failure → form shows inline "That didn't work — try again or DM us on Instagram" message
- Missing YouTube thumbnail → show cover art fallback

## Testing / verification

- Build succeeds from clean clone in CI; episode count matches feed
- Lighthouse (performance + SEO) ≥ 95 on home and an episode page
- Validate JSON-LD with Google Rich Results test
- Form submission lands a row in the Sheet (manual test before launch)

## Out of scope (later)

- Real store/checkout; podcast search beyond client-side; comments; analytics beyond a lightweight option (e.g. GoatCounter/Plausible — decide at build time); fixing the Spotify show description wording (flagged to Alex)
