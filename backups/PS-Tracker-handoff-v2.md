# PS Code Tracker: handoff for a new chat (v2, 22 Oct 2026)

Attach this file in the new chat, together with the project files (see section 12). This file replaces the older `PS-Tracker-handoff.md` wherever they disagree. Everything below was built and decided in the previous chat.

**Suggested first message in the new chat:**
"Continue the PS Code Tracker project from the attached handoff. Read it fully, then tell me in 3 lines where we are and what the next step is."

---

## 1. Who and what

- **User:** Jitu Senapati (Telegram: Jitu_Senapati), India (Odisha). Not a developer: wants plain steps, one step at a time, and he uploads files to GitHub himself from a laptop.
- **Business idea:** buy cheaper PlayStation vouchers in India from third-party sites and sell them through a third party to costlier regions for a commission. The site tracks stock of PlayStation voucher amounts across Indian platforms, and has a shared **investor book** to record who invested what.
- **How he likes to work:**
  - Short plain replies, with a numbered "Step N (laptop)" upload instruction at the end of each delivery.
  - Say what you assumed. Ask at most one question at a time.
  - **Give files individually, never as a zip** (he said so explicitly).
  - He sends screenshots from his phone (browser dev tools sometimes) to show problems.
  - A friend with a smaller phone also uses the site. Everything must work on every screen size.
  - The Claude Project memory ("PS Redeem code tracker") holds an area file with the decisions below. Check it too.

## 2. Hosting and stack

- **Live site:** https://ps-tracker.jitusenapati2004.workers.dev
- **Cloudflare Workers project:** `ps-tracker`, auto-deploys from the GitHub repo **Jitu-Senapati/PS-Tracker**, branch `main`. He uploads files with GitHub web UI: Add file, Upload files, commit. The site rebuilds in a minute or so.
- **Static assets:** `wrangler.jsonc` serves the repo root (`./`). `.assetsignore` hides `worker.js`, `wrangler.jsonc`, `.assetsignore` and `README.md`. New files placed in the root are served automatically.
- **No build step.** Plain HTML, CSS and JS.
- **Backend:** `worker.js`, a Durable Object `BookDO` with SQLite. Tables: `entries (id, data JSON)` and `people (name, pos, capital)`. Entry JSON is limited to about 2000 bytes.

### API (all under `/api/book`, passcode required)
| Call | Purpose |
|---|---|
| `GET /api/book` | returns `{people:[names], capital:{name:number}, entries:[...]}` |
| `PUT /api/book/entry` | create or update one entry (JSON with `id`) |
| `DELETE /api/book/entry/<id>` | delete an entry |
| `PUT /api/book/people` | **replaces the whole roster**: `{people:[{name,capital}, ...]}` in order. Validates: max 50, unique case-insensitively, name up to 60 characters, capital number ≥ 0 |
| `POST /api/book/people` | legacy add-one (kept for old clients) |

- The passcode is asked once per device and kept in `localStorage` key `pst.book.key`. See `api()` in `book.js` and the check at the top of `worker.js` for the exact header.
- The worker seeds Chinu, Jitu and Goat **only the first time** the people table is created (deleting everyone never brings them back). It adds the `capital` column with a guarded `ALTER TABLE`.
- Tested against a real SQLite with Node's `node:sqlite` (mocked `ctx.storage.sql`).

## 3. Repo files (site root)

`index.html`, `style.css`, `app.js` (home page), `data.js` (platform list), `book.js` and `book.css` (investor book popup), `worker.js`, `wrangler.jsonc`, `.assetsignore`, `manifest.webmanifest`, `sw.js`, `icons/` (`favicon.svg`, `favicon-48.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`).

Script order in `index.html`: `data.js`, `app.js`, `book.js`. `book.js` is an IIFE but uses the globals `PLATFORMS` (data.js) and `logoOf` (app.js).

## 4. Home page: current state

- **Header:** brand mark is the **PlayStation logo** (Simple Icons path, white on a blue gradient tile, class `.mark.ps`). Title "PS Code Tracker". Subtitle is only **"Last updated <LAST_UPDATED>"** (the "Prices across platforms" text was removed). `LAST_UPDATED` is a constant in `data.js` (currently 20 Oct 2026).
- **Platform cards:** `article.card[data-name]`, one per platform, with logo, name and amount chips (`.chip`, value in `span.v`).
  - `article.card` padding is **8px** and `.chip .v` padding is **4px**, in the base rules **and** in the phone media query near the end of `style.css`. The phone rules were overriding the base ones, so check both places for any spacing change.
  - Chips link to the vendor page. Out of stock chips show an "OUT OF STOCK" style.
- **Drag to reorder:** press and hold a card about 0.42 s (it lifts and vibrates), then drag anywhere. The grid can have several columns, so it uses 2D slot logic. The page autoscrolls near the top and bottom. Order is saved **per device** in `localStorage` key `pst.order` (array of platform names). Platforms missing from the saved order fall back to `data.js` order. Clicks and the context menu are suppressed for a short window after a drag. Links have `draggable="false"`.
  - Offered but **not built:** one shared order for everyone via the server. He has not decided.

### Platforms (`data.js`, 14 platforms, site order)
Amazon, Flipkart, Jio Store, Stan Shop, E2Z Store, Paytm, PhonePe, Gyftr, Hubble, Rooter, Games The Shop, Simply Gaming, Kstore Global, Gift Up. (Fampay and Blinkit were removed at his request.)

- Shape: `{name, logo?, domain?, home, items:[{v:amount, s:in-stock flag, ...}]}`. Check `data.js` for the exact optional fields.
- Amazon has 6 items, Flipkart 5, Jio Store 5 (1k to 5k, all on one shared page: https://store.jiogames.com/products/?brand=playstation). All other platforms still have only 1000, 2000 and 5000 and will be fixed one by one as he sends links.
- **Open item:** collect each vendor's links and amounts, one platform at a time. Jio Store is done. Next was **Paytm**, then the rest.

### Logos (`app.js`)
- `LOGOS` has: `amazon`, `flipkart` (hand-drawn fallbacks), and accurate brand marks for `phonepe`, `paytm`, `jiogames` (Simple Icons paths on brand-coloured tiles).
- `logoOf(p) = (LOGOS[p.logo] || letter badge) + Google favicon overlay` when `p.domain` is set (`https://www.google.com/s2/favicons?domain=<domain>&sz=128`; the image removes itself on error).
- Domains set: amazon.in, flipkart.com, jiogames.com, paytm.com, phonepe.com, plus the existing ones for Gyftr, Rooter and Games The Shop.
- **No domain, so a letter badge:** Stan Shop, E2Z Store, Hubble, Simply Gaming, Kstore Global, Gift Up. I could not find their sites reliably. **Never guess a domain** (a wrong one shows another company's logo). Ask him for each store's website link, then set `domain`.
- The PlayStation logo is a Sony trademark; mention this if he ever shares the app publicly.

## 5. PWA (installable app)

- `manifest.webmanifest`: name "PS Code Tracker", short name "PS Tracker", standalone, portrait, theme and background `#030705`, icons 192, 512 and a maskable 512.
- Icons are the PlayStation logo on a blue tile (generated from Simple Icons with `sharp`).
- `sw.js`: network-first for same-origin files (a new deploy shows straight away; cache is the offline fallback), **never touches `/api/`**, caches the Google favicon images (stale-while-revalidate), cache names `pst-v1` and `pst-img-v1`.
- `index.html` has the manifest link, icons, apple meta tags and the service worker registration.
- **Not yet verified on a real phone:** install prompt on Android Chrome, Add to Home Screen on iPhone. A custom "Install" button was not built.

## 6. Investor book: current behaviour (popup, `book.js` + `book.css`)

Opens from the header button (`#bookBtn`), as a popup. Data is on Cloudflare, shared. The book re-fetches every 8 s but only redraws when the data really changed (`sig()` comparison); it also skips refresh while a hold menu, a drag or a form is open.

### Users and tabs
- Tabs: each user, then **All**, then a **+** button.
- **+** opens a drawer: **Name** (required, max 40, unique case-insensitively, "All" is reserved) and **Total capital** (optional, ₹).
- **Hold a user tab** (420 ms): page blurs, the tab lifts, **Edit** and **Delete** appear. Edit opens the same drawer; renaming updates all that user's entries. Delete opens a confirmation window that also says how many entries go with the user.
- **Drag user tabs sideways** to reorder (hold, then slide). Saved server-side via `PUT /people`.

### Overview (top boxes)
- **Invested** = sum of invested amount of entries with status **Purchased or Sold** (Completed excluded).
- **Returned** = sum of Returning amounts of entries with status **Purchased or Sold**, which in practice means Sold entries (Completed excluded). Changed on the last turn.
- **Net profit** = (profit of all Sold + Completed entries) minus **Profit out**, which in effect is the profit of Sold entries not yet completed.
- The numbers count up when the book opens or the tab changes.

### Balance line (just above "Add new entry")
Three columns: **Capital** (the user's capital; All tab = sum of everyone's), **Profit out** (sum of profit of **Completed** entries), **Available** = **Capital − Invested**. Available is red when negative and shows "—" if no capital is set.

### Entry cards (`article.bk-row`)
- Rounded, lightly shaded like the overview boxes, padding 8px 14px, no buttons on the card.
- Line 1: `invested → returning`, with the platform name, tax and code counts shown inline beside the returning amount. Right side: profit with a label.
- **Profit = Returning − Invested.** Tax is not subtracted because Invested includes tax.
- Dates: shown with relative labels (Today, Tomorrow, 3 days ago). If a **send date** exists, the "Purchased …" line is hidden; otherwise the card shows "Purchased <date>".
- Status pill: Purchased, Sold or Completed.
- **Hold a card** (420 ms): blur, lifted copy of the card with **Edit** and **Delete** next to it. Delete opens a confirmation window (Cancel and Delete, both rounded). Escape closes only the top window.
- **Keep holding and drag** to reorder (vertical, autoscroll). The order is a global field `o` on each entry. Entries without `o` (new ones) appear on top. Reordering inside one person's tab keeps others' relative positions in the All tab.

### Entry form (`#enX` ids)
- Investor (datalist of existing names).
- **Dates, no auto-fill, placeholders only:** row with **Purchased date** and **Send date**, then **Received date (optional)**. Purchased date is the **only mandatory date**.
  - Status defaults to **Purchased**.
  - Choosing **Sold** or **Completed** makes the received date mandatory (the placeholder loses "(optional)") and the Returning amount required.
  - Picking a received date while the status is Purchased switches the status to **Sold** automatically.
  - Order checks: send date not before purchased date; received date not before purchased or send date.
- **Amount:** Invested (placeholder "Invested" with a small thin "(inc tax)" hint) and Returning (disabled while Purchased); then Taxes (optional) and the **Platform** dropdown side by side.
- **Platform dropdown:** custom, lists all platforms from `PLATFORMS` with their logos plus a "No platform" option; opens **upward**.
- **Codes sent:** five counters for 1k, 2k, 3k, 4k, 5k.
- **Status:** Purchased, Sold, Completed. The old name "Earned" is migrated automatically on load, and the migrated entries are pushed to the server.
- **Date picker:** Google Calendar style, date only, with Today and Clear buttons.
- **Fits without scrolling:** all sizes in the form are in `em`, with the base size derived from the screen height (`min(15px, (100dvh − 8px)/46)`), plus a JS safety net `fitForm()` that shrinks the form slightly if it still scrolls. The old rule that stacked fields below 380px width was removed (that was the cause of the tall form on small phones). Two-column layout is kept on all widths.
- Old entries have no purchased date, so the user must pick one when editing them.

### Entry data model
```
{ id, who, plat, purAt, buyAt, sellAt, buy, sell, tax, d:[n1k,n2k,n3k,n4k,n5k], status, o }
```
`purAt` = purchased date (mandatory), `buyAt` = **send date** (optional), `sellAt` = received date, `buy` = invested (inc tax), `sell` = returning (null until Sold or Completed), `status` = Purchased, Sold or Completed, `o` = manual order. Dates are saved as `YYYY-MM-DDT00:00` (older entries may carry a time).

## 7. Decisions and rules he gave (do not undo)

1. The book stays a popup, on Cloudflare, passcode once per device.
2. No times anywhere, only dates. Dates are never auto-filled.
3. Profit = Returning − Invested (earlier it was minus tax; he changed it).
4. Statuses are Purchased, Sold, Completed (not Earned).
5. Delete always goes through a confirmation window.
6. Files are delivered one by one, **no zip**.
7. Spacing requests (card 8px, chip value 4px) apply on every screen size.
8. Available = Capital − Invested (profit is "taken out", not added back).

## 8. Gotchas learned (save time)

- **Phone media query in `style.css` overrides base rules** (`.card`, `.chip .v`). Always edit both.
- **CSS animation `rise ... forwards` overrides inline `transform`**, which broke dragging. Drag classes set `animation:none; opacity:1`.
- A **NUL character in a `data-` attribute** gets rewritten by the HTML parser and broke the All tab. The key is now `'__all__'`.
- After a hold, clicks are suppressed for about 700 ms, so tests (and fast taps) right after a hold can look like "nothing happened".
- `const` declared in `data.js` and `app.js` is visible to later scripts, but not on `window`.
- The container shell is `sh`: no `{a,b}` brace expansion in commands.
- Fixed the earlier "page refreshes every few seconds" bug (the 8 s poll redrew everything).
- Input text must stay 16px or iOS zooms on focus, so only heights and spacing scale.

## 9. Testing notes

- No real browser could be installed in the sandbox (conda, playwright and puppeteer downloads are blocked), so layout and touch behaviour were **never seen on a real screen**. Logic was tested with jsdom plus stubbed layout (`offsetTop`, `getBoundingClientRect`). Ask him for screenshots after each upload.
- `sharp` and `simple-icons` were installed from npm for icons and logo paths. `node --check` is used for syntax.

## 10. What he has and has not confirmed

- Confirmed working on his phone: home page, Jio Store card, the book basics, hold menus and the earlier entry form (screenshots at ~351 px width showed the tall stacked form, which was then fixed).
- **Unknown whether uploaded yet:** deliveries from Steps 13 to 16 (PWA and icons, PlayStation header, logos, compact form, drag-to-reorder cards, net profit, padding fixes, Returned change). Check the repo before building on top (section 12).
- He asked why `article.card` still showed 14px padding and why `.chip .v` showed `12px 4px`: that was the phone media query, fixed in the latest `style.css`. He has not confirmed it.

## 11. Open items and ideas (in priority order)

1. Check that the latest files are really live (section 12).
2. **Vendor links:** continue platform by platform. Paytm is next; the others still have only 1k, 2k and 5k.
3. Ask him for the **website links** of Stan Shop, E2Z Store, Hubble, Simply Gaming, Kstore Global and Gift Up to get real logos.
4. Check on real phones: PWA install, entry form fits without scrolling on a small phone, card and tab drag, hold menus.
5. Ideas offered, not decided: a shared card order for everyone (server side), a custom "Install app" button, showing capital in more places.

## 12. How to start the new chat safely

1. Ask him to attach **this file** and the **current repo files**. Easiest: on GitHub open `Jitu-Senapati/PS-Tracker`, choose Code, then Download ZIP, and attach that zip. Also attach the older `PS-Tracker-handoff.md` if he still has it (it holds the original vendor-link details).
2. Verify the repo is current by looking for these markers:
   - `style.css`: `.card{padding:8px` (near line 100, inside the phone media query) and `.chip .v{padding:4px` (also in the media query).
   - `book.js`: `returned=closed.filter(e=>e.status!=='Completed')` and `net=closed.reduce((s,e)=>s+profitOf(e),0)-pout`.
   - `app.js`: `orderedPlatforms` and `PS-Tracker` drag code (`startDrag`, `dsuppress`).
   - `index.html`: `class="mark ps"` and `rel="manifest"`.
   - `worker.js`: `PUT` handler for `people` and the `capital` column.
   - Files `manifest.webmanifest`, `sw.js` and the `icons/` folder exist.
3. If something is missing, tell him exactly which file to upload and give a numbered laptop step.
4. Then continue with the open items in section 11.
