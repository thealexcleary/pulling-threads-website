# Store email capture — one-time setup (Alex, ~3 minutes)

The site's store form posts to a tiny Google Apps Script that appends rows to the Google Sheet **"Pulling Threads — Merch list"**, already created and formatted in alex@alexcleary.com's Drive:
https://docs.google.com/spreadsheets/d/1yMZrN3Q5LouYh8VR9RlhoN7NSG9VIL8j369yjU578TM/edit

Do all of this logged in as **alex@alexcleary.com**.

Spam protection is built in: honeypot check, email validation, a cap of 30 signups per hour, and a 24-hour duplicate-email block. Nothing sensitive appears in the website code — the sheet ID lives only inside the script's private storage.

## Steps

1. Open https://script.google.com logged in as **alex@alexcleary.com** and click **New project**.
2. Delete the placeholder code and paste ALL of this:

```js
const SHEET_ID = '1yMZrN3Q5LouYh8VR9RlhoN7NSG9VIL8j369yjU578TM';
const HOURLY_CAP = 30;

function getSheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName('Signups');
}

// Run this once from the toolbar to approve permissions.
function setup() {
  Logger.log('Sheet ready: ' + getSheet_().getParent().getUrl());
}

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

    getSheet_().appendRow([new Date(), email]);
  } catch (err) { /* never leak errors to the client */ }
  return out;
}
```

3. In the toolbar, select the function **setup** in the dropdown and press **Run**. Approve the permissions prompt (it only asks for Sheets access).
4. Click **Deploy** (top right) → **New deployment** → gear icon → **Web app**.
   - Description: `pt store signups`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** and **copy the Web app URL** (ends in `/exec`).
6. Send that URL to Claude, or run this yourself in the site repo:

```bash
gh variable set STORE_ENDPOINT --repo thealexcleary/pulling-threads-website --body "PASTE_THE_EXEC_URL_HERE"
gh workflow run deploy.yml --repo thealexcleary/pulling-threads-website
```

Done. The store form goes live on the next deploy. Until then it politely tells people the list isn't open yet.

Housekeeping: an earlier blank sheet with the same name exists on the outlook account — bin it, it's not connected to anything.

## Why this design

- The website is 100% static — there is no server to hack and no database to leak.
- The `/exec` URL is public by design; the only thing it can do is append `(timestamp, email)` to the sheet, capped at 30 rows/hour.
- The sheet is owned by alex@alexcleary.com; its ID lives only in the script, never in the website source or built pages (CI scans the output for anything secret-looking on every deploy).
