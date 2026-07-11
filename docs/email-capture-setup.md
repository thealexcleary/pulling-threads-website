# Store email capture — one-time setup (Alex, ~3 minutes)

Signups go to the Google Sheet **"Pulling Threads — Merch list"** already in your Drive:
https://docs.google.com/spreadsheets/d/1gbLYp3WNgqRUE9XbCeoufE61UzzaxjzghTqEcQ6o_sE/edit

The site posts to a tiny Google Apps Script that appends rows to that sheet. The script includes spam protection: honeypot check, email validation, a cap of 30 signups per hour, and a 24-hour duplicate-email block. The Sheet ID lives only inside the script — nothing sensitive is in the website code.

## Steps

1. Open https://script.google.com and click **New project** (sign in as the account that owns the Sheet).
2. Delete the placeholder code and paste ALL of this:

```js
const SHEET_ID = '1gbLYp3WNgqRUE9XbCeoufE61UzzaxjzghTqEcQ6o_sE';
const HOURLY_CAP = 30;

function doPost(e) {
  const out = ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
  try {
    const p = (e && e.parameter) || {};
    const email = String(p.email || '').trim().slice(0, 200).toLowerCase();

    // honeypot filled => bot; silently accept and drop
    if (p.website) return out;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out;

    const cache = CacheService.getScriptCache();

    // duplicate email within 24h => drop
    if (cache.get('e:' + email)) return out;

    // global rate limit
    const count = Number(cache.get('count') || 0);
    if (count >= HOURLY_CAP) return out;
    cache.put('count', String(count + 1), 3600);
    cache.put('e:' + email, '1', 86400);

    SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow([new Date(), email]);
  } catch (err) { /* never leak errors to the client */ }
  return out;
}
```

3. Click the **Deploy** button (top right) → **New deployment** → gear icon → **Web app**.
   - Description: `pt store signups`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the permissions prompt (it only asks for Sheets access), and **copy the Web app URL** (ends in `/exec`).
5. Send that URL to Claude, or run this yourself in the site repo:

```bash
gh variable set STORE_ENDPOINT --repo thealexcleary/pulling-threads-website --body "PASTE_THE_EXEC_URL_HERE"
gh workflow run deploy.yml --repo thealexcleary/pulling-threads-website
```

Done. The store form goes live on the next deploy. Until then it politely tells people the list isn't open yet.

## Why this design

- The website is 100% static — there is no server to hack and no database to leak.
- The `/exec` URL is public by design; the only thing it can do is append `(timestamp, email)` to the sheet, capped at 30 rows/hour.
- The Sheet ID and your account never appear anywhere in the website source or the built pages (CI has an automated scan that fails the build if anything secret-looking lands in the output).
