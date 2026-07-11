# Store email capture — one-time setup (Alex, ~3 minutes)

The site's store form posts to a tiny Google Apps Script. On first run the script **creates its own Google Sheet** ("Pulling Threads — Merch list") in the Drive of whoever runs it — so do all of this logged in as **alex@alexcleary.com** and the sheet lands on the right account, formatted, automatically.

Spam protection is built in: honeypot check, email validation, a cap of 30 signups per hour, and a 24-hour duplicate-email block. Nothing sensitive appears in the website code — the sheet ID lives only inside the script's private storage.

## Steps

1. Open https://script.google.com logged in as **alex@alexcleary.com** and click **New project**.
2. Delete the placeholder code and paste ALL of this:

```js
const HOURLY_CAP = 30;

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id).getSheets()[0];

  const ss = SpreadsheetApp.create('Pulling Threads — Merch list');
  props.setProperty('SHEET_ID', ss.getId());
  const sh = ss.getSheets()[0];
  sh.setName('Signups');
  sh.getRange('A1:B1').setValues([['Signed up', 'Email']])
    .setFontWeight('bold').setBackground('#000000').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 190);
  sh.setColumnWidth(2, 300);
  sh.getRange('A:A').setNumberFormat('ddd d mmm yyyy, h:mm am/pm');
  return sh;
}

// Run this once from the toolbar to create the sheet and approve permissions.
function setup() {
  const sh = getSheet_();
  Logger.log('Sheet ready: ' + sh.getParent().getUrl());
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

3. In the toolbar, select the function **setup** in the dropdown and press **Run**. Approve the permissions prompt. Check the log (View → Logs) — it prints the URL of your new, formatted sheet.
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

Housekeeping: an earlier draft created a blank sheet named "Pulling Threads — Merch list" on the outlook account — bin it, it's not connected to anything.

## Why this design

- The website is 100% static — there is no server to hack and no database to leak.
- The `/exec` URL is public by design; the only thing it can do is append `(timestamp, email)` to the sheet, capped at 30 rows/hour.
- The sheet is created by and owned by alex@alexcleary.com; its ID never appears in the website source or built pages (CI scans the output for anything secret-looking on every deploy).
