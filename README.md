# pullingthreads.com.au

The Pulling Threads podcast website. Static site built with Astro, hosted free on GitHub Pages.

**It updates itself.** Every morning (~6:30am AEST) it re-reads the podcast RSS feed and rebuilds, so new episodes appear on the site automatically the day after they go live. No one needs to do anything.

## Troy: how to edit the site

You can change the words on the About page or Store page from your browser, no coding:

1. Open the file on GitHub:
   - About page: [`src/content/about.md`](src/content/about.md)
   - Store page: [`src/content/store.md`](src/content/store.md)
2. Click the **pencil icon** (top right of the file).
3. Edit the text. It's plain writing with `#` for headings and `**bold**`.
4. Click **Commit changes** (green button), then **Commit changes** again.
5. Wait about 2 minutes. The live site updates itself.

That's it. If you break something, the old version is saved forever in the history — nothing is ever lost.

## If the site looks stale or broken

- Go to the [Actions tab](../../actions), click **Build and deploy**, then **Run workflow**. That forces a fresh rebuild.
- Still broken? Ping Alex.

## For whoever maintains this later

- `scripts/fetch-episodes.mjs` pulls the RSS feed into `src/data/episodes.json` at build time (falls back to the committed copy if the feed is down). Feed HTML is sanitised before rendering.
- `src/data/youtube-map.json` maps episode numbers to YouTube video IDs for thumbnails; new uploads are matched by title and persisted by the daily workflow.
- Store email form posts to a Google Apps Script (see `docs/email-capture-setup.md`); the endpoint is injected at build time from the `STORE_ENDPOINT` repo variable — never hardcode it.
- `npm test` runs the data-transform tests. CI runs them plus a leaked-secret scan of the built output on every deploy.
