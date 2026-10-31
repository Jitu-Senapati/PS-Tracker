# PS Code Tracker: handoff for a new chat (v3, 30 Oct 2026)

Attach this file in the new chat, together with the current project files (see section 14). **This file replaces `PS-Tracker-handoff-v2.md` and the older `PS-Tracker-handoff.md` wherever they disagree.** It contains everything decided and built so far, including the big "Price trend" overlay added in the last chat.

**Suggested first message in the new chat:**
"Continue the PS Code Tracker project from the attached handoff. Read it fully, then tell me in 3 lines where we are and what the next step is."

---

## 1. Who and what

- **User:** Jitu Senapati (Telegram: Jitu_Senapati), India (Odisha). Not a developer. He uploads files to GitHub himself from a laptop. He often writes in short, casual English and sometimes dictates by voice, so read intent, not wording. He sends phone screenshots (sometimes browser dev-tools inspector shots) to show problems or point at elements.
- **Business idea:** buy cheaper PlayStation vouchers in India from many shops/apps, sell them through a third party (a buyer who posts daily rates in a **WhatsApp channel**) to costlier regions for a commission/profit. The site (a) tracks stock and links of PlayStation voucher amounts across Indian platforms, (b) has a shared **investor book** (who invested what), and (c) now has a **Price trend overlay** with the buyer's daily rates, graphs and an availability log.
- **People using the site:** Jitu, Chinmay (Chinu), Prabhat Bhai (Goat). A friend uses a smaller phone: everything must work on every screen size.
- **How he likes to work (keep doing this):**
  - Short plain replies. Lead with the answer. A numbered **"Upload steps"** list (GitHub repo, Add file, Upload files, commit) at the end of each delivery, one numbered line per file.
  - **Give files individually, never as a zip.** Only list the files that changed.
  - **Say what you assumed. Ask at most one question at a time**, and when an instruction is ambiguous, do the clear parts and ask about the unclear one.
  - Be honest about what was tested. No real browser exists in the sandbox, so say "tested in a simulated browser, not on your phone/live site".
  - He prefers to be asked before big structural choices, but when a request is clear he wants it done.
  - The Claude Project memory ("PS Redeem code tracker") holds an area file with the decisions; check it too.
- **Source of prices is WhatsApp, not Telegram.** The original plan was a Telegram bot reading the channel automatically (or him forwarding to a bot). He chose the **paste box** instead and said to leave it that way ("current way is better").

## 2. Hosting and stack

- **Live site:** https://ps-tracker.jitusenapati2004.workers.dev
- **Cloudflare Workers project** `ps-tracker`, auto-deploys from GitHub repo **Jitu-Senapati/PS-Tracker**, branch `main`. He uploads via the GitHub web UI; the site rebuilds in about a minute. After deploy he must reload twice (service worker/cache).
- `wrangler.jsonc` serves the repo root. `.assetsignore` hides `worker.js`, `wrangler.jsonc`, `.assetsignore`, `README.md`. New files in the root are served automatically.
- **No build step.** Plain HTML, CSS, JS.
- **Backend:** `worker.js`, Durable Object `BookDO` with SQLite. Tables: `entries (id, data JSON)`, `people (name, pos, capital)`, **`prices (id TEXT PK, ts INTEGER, data TEXT)`**, **`stock (id TEXT PK, ts INTEGER, data TEXT)`** (the last two were added in the last chat; created with `CREATE TABLE IF NOT EXISTS`). Entry JSON limit about 2000 bytes; price record limit 3000 characters.

### API (all under `/api/book`, passcode header required)
| Call | Purpose |
|---|---|
| `GET /api/book` | `{people:[names], capital:{name:number}, entries:[...]}` |
| `PUT /api/book/entry`, `DELETE /api/book/entry/<id>` | create/update/delete one book entry |
| `PUT /api/book/people` | replaces the whole roster `{people:[{name,capital},...]}`; max 50, unique case-insensitive, name <= 60 chars |
| `POST /api/book/people` | legacy add-one |
| `GET /api/book/prices` | `{prices:[record,...]}` ordered by `ts` |
| `PUT /api/book/prices` | upsert one price record (validated: id <= 60 chars, `date` YYYY-MM-DD, finite `ts`, `rates` object (1 to 12 amounts, each `p1`/`p5` numbers) ) |
| `DELETE /api/book/prices/<id>` | delete one price record |
| `GET /api/book/stock`, `PUT /api/book/stock`, `DELETE /api/book/stock/<id>` | availability log; record `{id,date,ts,platform,denom,status:'in'|'out'}` |

- Passcode: asked once per device, kept in `localStorage` key `pst.book.key` (header name: see `api()` in `book.js`/`trend.js` and the check at the top of `worker.js`).
- The worker seeds Chinu, Jitu, Goat only when the people table is first created.
- Server schema/limits were tested with a mocked SQLite earlier; the new `prices`/`stock` routes were only checked with `node --check` and a mocked fetch.

## 3. Repo files (site root)

`index.html`, `style.css`, `app.js` (home page), `data.js` (platform list and stock flags), **`links.js`** (new, all vendor links), `book.js`, `book.css` (investor book), **`trend.js`**, **`trend.css`** (Price trend overlay + a few home-page link styles), `worker.js`, `wrangler.jsonc`, `.assetsignore`, `manifest.webmanifest`, `sw.js`, `icons/`. Optional test page: **`apptest.html`**.

- Script order in `index.html`: `data.js`, `links.js`, `app.js`, `book.js`, `trend.js`. CSS: `style.css`, `book.css`, `trend.css`.
- `sw.js`: cache name **`pst-v2`**; SHELL list includes `trend.css`, `links.js`, `trend.js`. Network-first for same-origin files, never touches `/api/`.
- `trend.js` loads after `app.js` and **overrides** `#trendBtn.onclick` and `#powerBtn.onclick` (app.js still has an old unused demo rate-list overlay code `#overlay` / `genRates`, now orphaned).
- `data.js` is edited by Jitu by hand (stock flags `s`, `LAST_UPDATED`). **Never overwrite his `data.js` with an old copy.** Links live in `links.js` precisely to avoid touching it.

## 4. Home page: current state

- Header: PlayStation logo mark (`.mark.ps`), title "PS Code Tracker", subtitle "Last updated <LAST_UPDATED>" (constant in `data.js`, last known 20 Oct 2026). Buttons: investor book (`#bookBtn`), **Trend** (`#trendBtn`), **power button** (`#powerBtn`, see section 7.8).
- **Platform cards** `article.card[data-name]`: logo, name, amount chips. Card padding 8px and `.chip .v` padding 4px, in the base rules **and** the phone media query (edit both).
- **Logo + name are now a link** (`a.chl`, styled in `trend.css`) to the platform's `home` URL when it has one. Press-and-hold still lifts a card for reordering; clicks right after a drag are suppressed.
- **Drag to reorder:** hold ~0.42 s, then drag; order saved per device in `localStorage` `pst.order`. A shared server-side order was offered, not built, undecided.
- Chip link = item `u` (own link) else platform `go` else `home`.
- **Platforms (15, in `data.js` order + Blinkit added by `links.js` at the end):** Amazon, Flipkart, Jio Store, Stan Shop, E2Z Store, Paytm, PhonePe, Gyftr, Hubble, Rooter, Games The Shop, Simply Gaming, Kstore Global, Gift Up, **Blinkit**. (Fampay was removed earlier at his request.) Shape: `{name, logo?, domain?, home, items:[{v, s, u?}]}`; `s:1` = in stock.
- **Logos (`app.js`):** `LOGOS` has inline marks for amazon, flipkart, phonepe, paytm, jiogames. `logoOf(p)` = inline logo or letter badge, **plus** a Google favicon `<img>` overlay when `p.domain` is set. **Never guess a domain** (a wrong one shows another company's logo). Jio Store's logo was invisible because the favicon covered the inline SVG, so `links.js` sets `domain:null` for it. Hubble uses `domain:'myhubble.money'` only to fetch its logo.

## 5. PWA

`manifest.webmanifest` (name "PS Code Tracker", standalone, portrait, theme/background `#030705`), icons (PlayStation logo on blue tile), `sw.js` as above (also caches Google favicon images). Not verified by him on a real phone: install prompt (Android) / Add to Home Screen (iPhone); no custom "Install" button built.

## 6. Investor book (`book.js` + `book.css`)

Popup from the header; shared data on Cloudflare; re-fetches every 8 s but redraws only on real change.

- **Tabs:** each user, **All**, and **+** (add user drawer: Name required max 40 unique, "All" reserved; Total capital optional). Hold a user tab for Edit/Delete (rename updates entries; delete confirmation lists entry count). Drag tabs sideways to reorder (saved via `PUT /people`).
- **Overview (4 cards now):** **Invested** | **Returned** | **Holding** (new) | **Net profit**.
  - *Invested* = sum of invested amounts of entries that are **not settled**. *Settled* means status Completed, **or a Refund that has been received** (`settled(e)` helper).
  - *Returned* = sum of Returning amounts of closed (has `sell`) entries that are not settled (in practice Sold).
  - **Holding** = sum of invested amounts where status is **Purchased** only (new request; sits between Returned and Net profit; grid is 4 columns with slightly smaller text).
  - *Net profit* = profit of all closed entries minus *Profit out*.
- **Balance line:** Capital | Profit out | Available. *Profit out* = profit of settled entries (Completed **and received refunds**; a partial refund shows as a negative profit). *Available* = Capital − Invested (red when negative, "—" if no capital set). Tooltips were updated to mention refunds.
- **Entry cards** `article.bk-row`: `invested → returning`, platform, tax, code counts, profit with label; dates with relative labels; status pill. Hold a card for Edit/Delete (delete via confirmation window `bk-cf`); keep holding and drag to reorder (global field `o`).
- **Profit = Returning − Invested** (tax not subtracted; Invested includes tax).
- **Statuses (4):** Purchased, Sold, Completed, **Refund** (new).
  - *Refund* = money was debited but no voucher was bought/sold; the refund comes back after some days.
  - **Refund pending** = no refund date. Counts as invested. Card shows blue pill "Refund pending" and "Awaiting refund"; date line "Debited <date>".
  - **Refunded** = refund received date set. Capital is freed; refund amount defaults to the invested amount if left blank; profit = refund − invested ("Refunded in full" when 0, "Loss" when negative). Pill "Refunded" (solid blue). Date line "Debited <date> → Refunded <date>".
  - In the form, for Refund: the Send date and the codes boxes are disabled ("Not needed"), purchased-date label becomes **Debited date**, the received-date label becomes **Refund received date (optional)**, the Returning field becomes "Refund amount", and a refund amount without a refund date is rejected. Refund date cannot be before the debited date. Stored with `buyAt:null` and zero code counts.
  - Status segment now has 4 buttons (`.bk-seg` grid 4 columns, smaller text). Pill CSS: `.s-refund`, `.s-refunded`.
- **Entry form (`#enX` ids):** Investor (datalist), dates (Purchased date mandatory; Send date optional; Received date optional, mandatory for Sold/Completed; no auto-fill; no times), Invested (inc tax) / Returning, Taxes, Platform dropdown (logos, opens upward, "No platform"), codes sent counters 1k to 5k, Status. Picking a received date while Purchased switches to Sold. Date picker is Google-Calendar style. Form fits the screen without scrolling (em units, `fitForm()` safety net; inputs stay 16px for iOS).
- **Data model:** `{ id, who, plat, purAt, buyAt, sellAt, buy, sell, tax, d:[n1k..n5k], status, o }`. Status "Earned" is migrated to "Completed" on load by `fixStatus` (now a hoisted **function declaration**; before it was a `const` declared after `load()` used it, which made the book open **empty when the server was unreachable**; fixed in the last chat).

## 7. Price trend overlay (`trend.js` + `trend.css`)

Opened by the **Trend** button. Self-contained IIFE; builds its own DOM; uses the book passcode and `/api/book/prices` and `/api/book/stock`. Caches in `localStorage`: `pst.prices.v1`, `pst.stock.v1`. Test hook: `window.__trend = {parseAll, show}`.

### 7.1 Window
- Title "Price trend" with a **"+ Add data"** pill button beside it, a note line (status such as "saved 3", "offline - showing last saved copy"), and a close button.
- **Padding:** overlay `#tOverlay` 14px, `.modal` 14px (he asked for 16 to 14 and 20 to 14).
- **Same height on every tab:** `height:min(640px,88dvh)`; header and tabs stay fixed, only `#tBody` scrolls.
- **Fullscreen:** only the Database tab has an icon-only expand button (⤢ / ⤡) in its controls row; leaving the tab or closing the overlay collapses it.
- Tabs (4): **Today | Graph | Database | Availability**.
- Separate popup windows (all with the same look as the book's windows): **Add data** (`#tAdd`), **Add availability** (`#tStock`), and the **delete confirmation** which reuses the Book's classes (`overlay bk bk-cf`, `bk-cfm`, trash icon, Cancel/Delete). Escape closes the top-most one.
- Naming caution: **home page CSS has generic class names** (`.ch`, `.card`, `.chip`, `.logo`, `.tag`, `.up`, `.down`...). A calendar weekday class `.ch` once broke the home cards (platform names centered, extra padding); it is now `.cdw`. Keep new classes prefixed/scoped.

### 7.2 Data model and how messages are read (`parseAll`)
Source: the buyer's daily WhatsApp "Price Update" messages, pasted into **Add data**. Only **PlayStation** rates are kept (Robux, Overwatch, Minecoins, LoL, USDT, Amazon/Flipkart charges are ignored; he has not asked to track them).
- Record: `{id, date:'YYYY-MM-DD', ts, session, valid, rates:{'1000':{p1:1370,p5:1380},...}, offer?:true, drop?:true}`. `ts` is computed in **IST** from the "Valid" or window time. Rates are in ₹ (the $ shown in the message is ignored).
- **Four message kinds:**
  1. **Format 1** (long, many products): header "Price Update `18 Oct` Valid `11:59 PM` (Night )"; PlayStation 1000 has two lines (01pcs and 05pcs minimum), **2000 to 5000 have a single rate line with no minimum line, treated as the 1 pc rate (`p1`)**. (He was asked if single-line means 1 pc only; no answer, assumption stands.)
  2. **Format 2** (PlayStation only): every amount has 01pcs and 05pcs lines.
  3. **Special offer** message: starts with a line containing only `offer`; strikethrough (`~...~`) PlayStation rates (higher than regular); time window like `(04:24PM To 09:45PM)`. Saved as `offer:true`, id `date|offer-HHMM`, session "Offer", `valid` = "04:24PM - 09:45PM".
  4. **Price drop** message: "PRICE Down Time:- `4:10 PM to 11:59 PM`" with lower PlayStation rates (1000 has 1pc/5pcs lines, 2000 to 5000 single). Saved as `drop:true`, id `date|drop-HHMM`, session "Price drop". Text like "Price Down Now Due to More Stock" and notes are ignored.
- **Multi-message paste** works (oldest first), so a month can be loaded at once. Regular id = `date|session` (re-pasting replaces). The year is not in the message: current year, or last year if that would be in the future. **Offers and drops have no date**: they inherit the date of the nearest preceding "Price Update" in the paste; if there is none, a **date box** appears (default today).
- Preview line before saving, e.g. "31 updates + 6 offers + 2 price drops · 5 amounts · 18 Sep to 22 Oct · 3 will replace saved · skipped: ...". Saves in chunks of 5 `PUT`s.
- Implementation notes: text is cleaned of `* \` _ ~`; `psRates(lines)` reads `₹<face> Playstation ... ₹<rate>` and looks at the **next line** for "(NNpcs Minimum)" unless that line is another Playstation line; only 1 and 5 pcs are kept. Header regex `HEAD`, `OFFER_LINE`, `DROPLINE`, `DROPWIN`, `WINDOW`.

### 7.3 Today tab
- Date header with ‹ › (move between days that have a regular update) and a **calendar icon** beside the date. The icon opens a month calendar **in place of the price table** (pick a day to return to the table for that day; icon again to close). Calendar shows each day's 1000 / 1 pc rate (green/red = up/down vs previous day), orange dot = special offer, red dot = price drop, today underlined, selected outlined. (The old separate Calendar tab was removed.)
- Table (fits the screen, no horizontal scroll, fixed column widths 18/23/18/23/18%): **Amount | 1 pc min (rate + change vs previous day, profit %) | 5 pcs min (same)**. Header row only "Amount | 1 pc min | 5 pcs min" (the sub-header row was removed at his request).
- **Profit % = (rate − face value) ÷ face value** (e.g. ₹1370 on ₹1000 = +37.0%). This is **not** his real profit because his buying cost is not in the site. **Open question to him:** use his real buying cost instead (typed fee % or cheapest platform price)?
- Day-over-day change compares with the last update of the previous day that has that amount. A day's rate = the **last regular update of that day**; offers and drops never replace it.
- Below the table: a **Special offer** table (orange outline) and/or **Price drop** table (red outline) for that date, same columns; the change line compares with that day's regular rate ("▲ +150", "▼ −170").

### 7.4 Graph tab
- **Denomination switches** (1,000 to 5,000): each has its own colour and **glows when on**, several can be on (no dots inside the buttons); the last one on cannot be switched off.
- **1 pc / 5 pcs switches**: both can be on (solid line = 1 pc, dashed = 5 pcs). **% switch**: default view is ₹; % shows profit % over face value. Range: 7d / 30d / All.
- One line selected: big latest value + change, tooltip, and cards **Highest / Average / Lowest**. Several lines: a table **Line | Low | Avg | High** (Latest and Change columns were removed at his request), and touching the graph shows a tooltip with every line's value for that day.
- **Special offers / price drops** appear as dots (orange = offer, red = drop) on the graph. Under the graph a titled section (title is "Special offers", "Price drops" or "Special offers & price drops" depending on what is in view) with a **toggle switch at the right of the title** (only shown when such records are in view; on = dots and list shown, off = both hidden, title and switch stay; default on).
- Renamed "Limited offer(s)" to **"Special offer(s)"** everywhere in the overlay.
- **Unresolved from him:** "remove horizontal graph in % switch" (his item 2 in one message). Possible meanings offered: A) horizontal grid lines, B) the small coloured line samples beside names in the table, C) something on the % button itself. He did not answer; nothing was changed for it.

### 7.5 Database tab
Controls: 1 pc / 5 pcs switch, month filter, **CSV** download (columns Date, Session, Valid, Type regular/offer/drop, then `<amount> 1pc` / `<amount> 5pcs` for each amount), expand icon. Table of every saved record, newest first (orange rows = offers, red rows = drops), `×` per row opens the delete confirmation popup. A "+ Add data" button sits under the table.

### 7.6 Add data popup
Textarea (many messages allowed), date box (only when an offer/drop has no date), live preview, Save. After saving it closes and the overlay refreshes.

### 7.7 Availability tab (manual log, not parsed from messages)
- **Important history:** an earlier version wrongly parsed the buyer's "Available:- Paytm, Phonepay, ..." line. He clarified he wants **his own log of which card was available on which platform** (e.g. "today the 2000 card was available at E2Z store"). The parsed version was removed.
- **+ Add availability** popup: (a) tap builder: platform dropdown (from `PLATFORMS`), amount chips for that platform (All option), Available / Sold out switch, **Add line** (writes a line into the box); (b) typed/pasted lines, one platform per line, e.g. `E2Z Store 2000 5000`, `Amazon 1000 out`, `Flipkart all` (platform names matched loosely, "2k" style amounts accepted, "out / sold out / unavailable / oos / na" mark sold out, "all" = every amount that platform has); (c) a date box (default today). Preview lists what will be saved and what was skipped.
- Records: one per date + platform + amount, id `date|platformkey|denom`, status `in` or `out`, saved to `/api/book/stock`.
- Display: "In stock now (latest log)" card; amount filter (All / 1,000 ...); 14 / 30 day view; a card per platform with In stock / Sold out pill, amount chips (green in stock, red out), "last available" date, "in stock on X of the last N days", and a strip of days (green = in stock, red = sold out, grey = not logged); "Recent entries" list with `×` delete (confirmation popup).
- Ideas offered, not decided: tap a strip cell to see that day, log time of day as well as date.

### 7.8 Power button (`#powerBtn`)
Now shows **server connection state**: **green static** (connected), **grey with spinning ring** (a request is in progress, shown at least 0.7 s), **red static** (server unreachable or phone offline). It wraps `window.fetch` for `/api/` calls (401 counts as reachable). Tap = re-check (loads prices/stock). Tooltips: "Connected - tap to re-check", "Connecting…", "Offline - tap to retry". It replaced the old "Live updates (coming soon)" meaning.

## 8. Platform links (`links.js`) and opening apps

`links.js` is applied after `data.js` and merges into `PLATFORMS` by name (creates a missing platform). Fields: `home`, `domain` (null = built-in logo only), `dens` (exact amounts: keeps existing stock flags, adds new ones as out of stock `s:0`, removes other numeric amounts), `urls` (per amount), `go` (link for chips without their own link), `viaApp` (Android: hand the link to the installed app/PWA, else open the website), `appUrl` (link given to the app), `appHeader:false` (logo/name always open `home` in the browser), plus the older `app` (custom scheme) path in `app.js`.

| Platform | Setup |
|---|---|
| Amazon | `home` = his search URL (exact, with tracking params) |
| Flipkart | `home` = search URL (trimmed of tracking params) |
| Jio Store | `home` = store.jiogames.com playstation page; `domain:null`; one link for all amounts |
| Stan Shop | amounts 1000 to 4000 only; `/playstation-psn-gift-card-in-india-<amount>-inr`; (his message had the 1000 link three times; the correct 2000/3000/4000 pattern was **verified by fetching the Stan page**); `viaApp:true` (he has the PWA installed); `domain:'stanshop.co'` |
| E2Z Store | category page + 5 product links (`rs-<amount>-playstation-network-wallet-top-up`), `domain:'e2zstore.com'` |
| Paytm | amounts 1000, 2000, 5000; `viaApp:true`, home `https://paytm.com/` |
| PhonePe | 5 amounts; `viaApp:true`, home `https://www.phonepe.com/` |
| Gyftr | one link `https://www.gyftr.com/sony-playstation`, 5 amounts |
| Hubble | logo/name open the Gyftr page; card buttons (`go`) open `https://www.myhubble.money/gift-cards/playstation` via the app first (`viaApp`, `appHeader:false`); `domain:'myhubble.money'` only for the logo. Amounts still 1000, 2000, 5000 (he did not say it has 5) |
| Rooter | 5 amounts; home `https://shop.rooter.gg/product/playstation-gift-cards`; `viaApp:true` with `appUrl:'https://rooter.app.link/8AtvnFV0u6b'` |
| Games The Shop | search link + 5 product/variant links |
| Simply Gaming | collection link + 5 product links, `domain:'simplygaming.in'` |
| Kstore Global | one link, 5 amounts, `domain:'kstore.global'` |
| Gift Up | `https://giftup.in/gift-cards?q=psn`, 5 amounts, `domain:'giftup.in'` |
| Blinkit | 5 amounts with separate `prid` links (698590, 698593, 698594, 699135, 698592); `home` = a **search page `https://blinkit.com/s/?q=sony%20playstation%20instant%20voucher`, unverified** (Blinkit blocks automated fetch; he asked for a page without an option selected, none confirmed); `domain:'blinkit.com'` |

- **How app opening works (`app.js`):** anchors carry `data-app-url`; on **Android** a click is turned into an `intent://host/path#Intent;scheme=https;S.browser_fallback_url=<web link>;end` link, so Chrome launches an installed app/PWA that handles that URL, otherwise opens the website. On **iPhone** the old `data-app` custom-scheme path (`openApp`, 1.4 s fallback) exists but no platform uses a scheme now. Desktop = plain link.
- **Status: nothing app-opening has been verified on a real phone.** Earlier attempts: `paytmmp://` opened Paytm but showed an error; `phonepe://` fell back to the website; Stan's link opened the website instead of the installed PWA; Hubble and Rooter opened websites.
- **`apptest.html`** (upload to repo root, open in Android Chrome at `<site>/apptest.html`): buttons **P1 to P5** (Paytm: `paytmmp://`, `paytmmp://home`, https intent, scheme intent with package `net.one97.paytm`, launcher intent), **H1 to H5** (PhonePe: same patterns, package `com.phonepe.app`), **B1/B2** (Hubble), **R1/R2** (Rooter), **S1/S2** (Stan). **He has not yet reported which buttons work.** Next step: ask which P/H numbers open the app home with no error, then set those in `links.js` / `app.js`. Package names `net.one97.paytm` and `com.phonepe.app` were confirmed from sources; Hubble/Rooter package names are unknown.
- Limits to remember: a website cannot force an installed PWA or app to open; Chrome Custom Tab/standalone-PWA behaviour varies, and a launcher intent is blocked by Chrome (needs a BROWSABLE filter), so the working link must come from testing.

## 9. Decisions and rules he gave (do not undo)

1. Book stays a popup, on Cloudflare, passcode once per device.
2. No times in the book, only dates; dates never auto-filled.
3. Profit = Returning − Invested.
4. Book statuses: Purchased, Sold, Completed, Refund (not "Earned").
5. Delete always goes through a confirmation window (same look in the book and in the Price trend overlay).
6. Files delivered one by one, no zip.
7. Spacing: card padding 8px, chip value padding 4px, every screen size.
8. Available = Capital − Invested.
9. Price data is pasted from the **WhatsApp** channel (paste box). Do not switch to a bot unless he asks.
10. Price trend tabs: Today, Graph, Database, Availability (no Calendar tab; the calendar lives behind the icon in Today).
11. Profit % in the overlay is over face value until he says otherwise.
12. Use the name **"Special offers"** (not "Limited offers").
13. Overlay paddings 14px; same height on all tabs; expand (icon only) only on Database.
14. Availability is his own manual log of card availability per platform and amount.
15. Platform links live in `links.js`; `data.js` stays his (stock flags, last updated).

## 10. Gotchas learned (save time)

- Phone media query in `style.css` overrides base rules (`.card`, `.chip .v`): edit both.
- CSS animation `rise ... forwards` overrides inline `transform` (broke dragging): drag classes set `animation:none; opacity:1`.
- A NUL character in a `data-` attribute broke the All tab: key is `'__all__'`.
- After a hold, clicks are suppressed ~700 ms.
- `const` in `data.js`/`links.js`/`app.js` is visible to later scripts but not on `window`; in jsdom tests evaluate all scripts in **one** `eval` (separate evals do not share `const`).
- The container shell is `sh`: no `{a,b}` brace expansion.
- Generic CSS class names collide with the home page (see 7.1). Overlay IDs/classes are prefixed `t`/`s`/`av`.
- Tool output shows backslashes doubled; check real file content with `node -e` before "fixing" an escape.
- jsdom needs `matchMedia` stubbed to render the book/cards; keep `process.exit()` in tests (rAF loops keep node alive).
- Input text must stay 16px (iOS zoom).

## 11. Testing notes

- No real browser in the sandbox; layout/touch never seen on a real screen. Logic was tested with **jsdom** (stubbed `fetch`, `matchMedia`, layout). Everything in the overlay, links and the book changes passed in jsdom; **no change was tested on his live site or phone by me**. Ask for screenshots after each upload.
- The three real WhatsApp message kinds (format 1, format 2, special offer) and the price-drop message were all pasted into the parser in tests and produced the expected records. Stan Shop's page was fetched to confirm link patterns; Blinkit blocks fetching.

## 12. What he has and has not confirmed

- He has clearly used the Price trend overlay (screenshots of the Today header, the delete popup, the data window, the Change column), so the overlay files up to roughly the Availability tab are live. He confirmed the Availability "how do I add" explanation ("ok i got it").
- **Not yet confirmed:** the latest delivery (`links.js`, `app.js`, `apptest.html`: Jio logo fix, Stan PWA, Paytm, PhonePe, Hubble, Rooter), the Blinkit entry, the platform header links, the Refund status and Holding card in the book (he asked for them, assumed uploaded), and whether `worker.js` with the `stock` table is deployed (needed for Availability).
- Earlier-chat deliveries (PWA, icons, compact form, drag reorder, padding fixes) were also never explicitly confirmed.

## 13. Open items and ideas (priority order)

1. **Verify the repo/live site is current** (section 14).
2. **App opening:** get his `apptest.html` results (P1 to P5, H1 to H5, B, R, S), then fix Paytm (open app home, no error), PhonePe, Hubble, Rooter and Stan PWA.
3. **Blinkit home link:** confirm the search page works (or switch `home` to the 1000 link).
4. **Hubble amounts:** does it have 3000/4000 (currently only 1000, 2000, 5000)? Same for Paytm (he said 1000, 2000, 5000 only, so fine).
5. Ask him for **PhonePe**, **Paytm** extras: a deep link that opens the app **search for PlayStation** (not found; only app home is attempted).
6. **Profit % basis:** real buying cost instead of face value? (unanswered)
7. His unanswered item: what "horizontal graph in % switch" meant (section 7.4).
8. Home page subtitle "Last updated" could use the latest price-update date (offered, unanswered).
9. Old prices saved by early versions only had 1000 or lacked 5 pcs; re-paste old messages to fix (pasting the same date/session replaces).
10. Ideas offered: clickable availability strip, time of day in availability, shared card order for everyone, custom "Install app" button, tracking other products (Robux, Overwatch...) from the messages.
11. Check on real phones: PWA install, entry form fit on small phones, drags, hold menus, overlay layouts (Today table width, Graph switches, fullscreen Database).

## 14. How to start the new chat safely

1. Ask him to attach **this file** and the **current repo files** (GitHub repo `Jitu-Senapati/PS-Tracker`: Code, Download ZIP, attach the zip; the zip can be read, but still **deliver files individually**). If he cannot, ask for just the files you must change (`worker.js`, `app.js`, `index.html`, `links.js`, `trend.js`, `trend.css`, `book.js`, `book.css`, `sw.js`) from GitHub, one by one.
2. Verify the repo is current by these markers:
   - `index.html`: `<script src="links.js">` after `data.js`, `<script src="trend.js">` last, `<link ... trend.css>`; `class="mark ps"`; `rel="manifest"`.
   - `sw.js`: `pst-v2` and `links.js`, `trend.js`, `trend.css` in SHELL.
   - `worker.js`: routes for `prices` **and** `stock`, `CREATE TABLE IF NOT EXISTS prices` and `stock`, `PUT` handler for `people`, `capital` column.
   - `trend.js`: tabs `today/graph/data/avail`, `parseAll`, `parseStock`, `DROPLINE`, `openStock`, power button code (`pwpulse` classes in CSS).
   - `trend.css`: `.cdw` (not `.ch`), `#tOverlay{padding:14px}`, `.tsw`, `.avstrip`.
   - `book.js`: `settled=`, `refundStatus`, `Holding`, `function fixStatus`; `book.css`: `.s-refund`, `.s-refunded`, 4-column `.bk-seg`/`.bk-sum`.
   - `app.js`: `a.chl`, `intentUrl`, `data-app-url`; `links.js` exists and ends with the `applyLinks` merge.
   - `style.css`: `.card{padding:8px` and `.chip .v{padding:4px` in the phone media query.
3. If something is missing, tell him exactly which file to upload, as a numbered laptop step.
4. Then continue with section 13.

## 15. Reference: shape of the WhatsApp messages (condensed)

**Format 1** (several products; only PlayStation is read):
```
*⚕️Price Update `18 Oct` Valid `11:59 PM` (Night ) Today🙌*
...Usdt / Robux / Overwatch / Minecoins / LoL / Amazon / Flipkart lines (ignored)...
➡️₹1000 Playstation: *₹1270 (12.7$)*
`(01pcs Minimum)`
➡️₹1000 Playstation: *₹1280 (12.8$)*
`(05pcs Minimum)`
➡️₹2000 Playstation: *₹2520 (25.2$)*      <- single line = 1 pc rate
➡️₹3000 ... ₹4000 ... ₹5000 ... (single lines)
```
**Format 2** (PlayStation only; `Available:- Paytm, Phonepay, ...` line is ignored): each of ₹1000 to ₹5000 has `(01pcs Minimum)` and `(05pcs Minimum)` lines.

**Special offer** (no date):
```
🔛 `offer` ⛓️‍💥
~➡️1000 Coins Overwatch : *₹750 (7.5$)*~ ...(ignored)
~➡️₹2000 Playstation: *₹2680 (26.8$)*~
~➡️₹3000 Playstation: *₹4020 (40.2$)*~
*⛓️‍💥Limited Only |||🏃‍♀️* `(04:24PM To 09:45PM) Today's`
```
**Price drop** (no date):
```
➟ PRICE Down Time:- `4:10 PM to 11:59 PM`
➡️₹1000 Playstation: *₹1100 (11.0$)*  `(01pcs Minimum)`  / ₹1110 `(05pcs Minimum)`
➡️₹2000 Playstation: *₹2200* ... ₹3000 ₹3500, ₹4000 ₹4500, ₹5000 ₹5600 (single lines)
⛓️‍💥`Price Down Now` *Due to More Stock*  (notes ignored)
```
