# PS Voucher Tracker: handoff for a new chat

Attach this file (and the zip, if you have it) in the new chat and say: "Continue the PS voucher tracker project from this handoff." Everything below is what was decided and built up to 20 Oct 2026.

---

## 1. The project in one paragraph

Jitu Senapati buys PlayStation gift vouchers (India, INR) from many shops and apps. Some add fees or tax over face value. He sells them to an admin of a WhatsApp channel whose payout rate changes daily, for a profit. He wants a small website, usable by him and two friends (Chinmay and Prabhat Bhai), that shows for each shop and each voucher amount whether it is in stock, with a link to buy it, plus an investor "cash book". Later it should track stock automatically and send instant Telegram alerts. Everything must be free. The site never pays or auto-buys; people pay themselves on the shop's own page.

## 2. How to work with Jitu (important)

- He asked for **one step at a time**, short answers, no overwhelming lists. Give a single step, wait for his reply, then give the next.
- He alternates between an Android phone (Termux) and a laptop (GitHub, Cloudflare). Say which device a step is for.
- He sends photos of the phone screen. Photos of terminal text are hard to read, so the trick that works is: have the phone script send its output to his Telegram bot and he screenshots that message.
- He prefers decisions made for him with a short reason; ask at most one question at a time.
- Do not make him re-explain things listed here.

## 3. Hard rules and decisions

- Amounts that matter: **1000, 2000, 3000, 4000, 5000 only**. Ignore 7000, 9000 and anything above 5000.
- **Alert only. The bot must never tap Pay, confirm, or place an order.**
- **Free only** (free GitHub, Cloudflare, Telegram).
- Prices are mostly hard-coded in `data.js`; some will later be filled by a bot. There is **no edit screen**.
- Build order: get the website live and usable first, then the tracker and alerts, then the WhatsApp rate list.
- The price-trend button and the power button at the top right are **placeholders** (they show "Coming soon"). The rate list behind the trend button returns later with real rates.
- The page is hidden from search engines but not private; anyone with the address can open it. The investor book API needs a passcode.

## 4. People and accounts

- User: Jitu Senapati (Telegram @Jitu_Senapati), Telegram chat ID 5573173531
- Friends who pressed Start on the bot: Chinmay (chat ID 6316533826), Prabhat Bhai (chat ID 8954749392)
- Telegram bot: **PS_Stock_Baddie_bot** ("PS Stock Baddie")
- GitHub: user **Jitu-Senapati**, repository **PS-Tracker** (public), branch main
- Cloudflare Workers: project **ps-tracker**, live at **https://ps-tracker.jitusenapati2004.workers.dev**
- **The bot token was shown in screenshots, so it is exposed. Jitu said he will rotate it (BotFather /revoke) after everything works. Remind him before launch.** The token is only stored on the phone in `~/ps-tracker/.env` (BOT_TOKEN and CHAT_ID lines). Never ask him to paste the token into chat.

## 5. The website (live)

Hosted as a Cloudflare Worker with static assets plus one Durable Object (SQLite) for the shared investor book. Deployed automatically from GitHub on every commit. Cloudflare's **Deploy command was changed to `npx wrangler deploy`** (it reads `wrangler.jsonc`).

Files in the GitHub repo root (latest versions are in the zip):

| File | What it does |
|---|---|
| index.html | Page shell (from the friend's design), loads data.js, app.js, book.js; has noindex meta; trend and power buttons visible as placeholders |
| style.css | Friend's dark design + mobile fixes (3 chips per row on phones), out-of-stock chips shown dimmed (not blurred) and still clickable, toast, logo badges |
| app.js | Renders platform cards from `PLATFORMS` in data.js. Chips are links (`u`, else platform `home`, else not clickable). `logoOf()` uses built-in SVGs (`logo`), else a Google favicon of `domain`, else a coloured letter badge. Shows "N denominations + custom" |
| data.js | **All content**: `LAST_UPDATED` and `PLATFORMS` (name, logo/domain, home, items with `v` amount, `s` stock 0/1, `u` link, `p` price, `d` difference, `label` for the Custom chip) |
| book.js, book.css | Friend's "investor book" (cash book). Now syncs to the server (see below) |
| worker.js | Cloudflare Worker + Durable Object `BookDO`; API under `/api/book` (GET list, PUT /entry, DELETE /entry/:id, POST /people), protected by header `x-book-key` = secret `BOOK_KEY` |
| wrangler.jsonc | Config: assets directory `./`, run worker first for `/api/*`, Durable Object binding `BOOK`, migration `new_sqlite_classes: [BookDO]` |
| .assetsignore | Keeps worker.js, wrangler.jsonc etc. from being served publicly. **On GitHub it was uploaded as `assetsignore` without the dot; Jitu was told to rename it to `.assetsignore` (not confirmed done).** |

### Investor book
- Originally saved in each browser only (localStorage), so entries did not show on other devices. Fixed by moving the real copy to the Durable Object; each device keeps a cache and polls every 8 seconds while the book is open.
- People default to Chinu, Jitu, Goat. The friend's sample entry was removed, so the shared book starts empty. Old local-only entries are overwritten by the server copy on first load.
- The book asks for a passcode once per device (stored in that browser). **Jitu briefly said he did not want a passcode, then accepted "enter once per device".** The secret `BOOK_KEY` has to be added in Cloudflare (Workers & Pages → ps-tracker → Settings → Variables and Secrets, type Secret, Production). He had the "Add environment variable" box open; **I never confirmed it was saved.** First thing to check: open the book on the live site and see whether the passcode works.
- The worker logic was tested locally with a stand-in database (three simulated devices stayed in sync). **It has not yet been verified on real Cloudflare.**

### Platforms on the site now (order)
Amazon, PhonePe, Flipkart, Gyftr, Jio Store, Hubble, Paytm, Rooter, Games The Shop, Simply Gaming, E2Z Store, Stan Shop, Kstore Global, Gift Up (14). Fampay and Blinkit were removed at Jitu's request. The friend's design also had Gaming Venture; it is not in the list.

- Real favicons (via domain): PhonePe, Gyftr, Jio Store (jiogames.com), Paytm, Rooter (rooter.gg), Games The Shop (gamestheshop.com)
- Friend's drawn SVG logos: Amazon, Flipkart, E2Z Store
- Letter badge for now (domain unknown): Hubble, Simply Gaming, Stan Shop, Kstore Global, Gift Up. A wrong domain would show another company's logo, so ask Jitu for each store's link first.
- All items are currently marked out of stock (`s:0`), because that is what was known.

### Links already in data.js
- **Amazon** (each amount is its own product page; chips use these ASINs): 1000 B07K6RYVHR, 2000 B093QF35KZ, 3000 B07K6PVR8B, 4000 B07K6RYVJ5, 5000 B0B3DDW7TB, plus a **Custom** chip to B0C1GYD3KN (open-amount page). URL form: `https://www.amazon.in/dp/<ASIN>`
- **Flipkart** (chip links, form `https://www.flipkart.com/<slug>/p/<itm id>`; the slug is cosmetic, I believe Flipkart redirects): 1000 itm3d59225ae5e13, 2000 itmd41e56cc4ca04, 3000 itma3cec289dd512 (slug is a generic guess, **Jitu was asked to tap it to check**), 4000 itm5cb36d77285f5, 5000 itmb079e5a22622c. Platform link = the search page `https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo`
- **Jio Store**: only the platform link `https://store.jiogames.com/products/?brand=playstation` (the ₹2000 card has `p:2000`)
- PhonePe, Gyftr, Paytm, Rooter, Games The Shop: platform home pages only
- Hubble, Simply Gaming, E2Z Store, Stan Shop, Kstore Global, Gift Up: **no link at all yet** (chips not clickable)

### Whether the latest files are uploaded
Jitu uploaded: the first site files, the mobile CSS, the placeholder buttons, the investor book (index.html, book.js, book.css), and the shared-book files (book.js, worker.js, wrangler.jsonc, assetsignore). **I never got confirmation that he uploaded these later changes: the 16→14 platform list with logos (data.js, app.js, style.css), the Amazon per-amount links and Custom chip, and the Flipkart 1000–5000 update (data.js).** The zip has all of them; re-upload data.js, app.js and style.css to GitHub (Add file → Upload files → Commit changes) if the live site doesn't show them.

## 6. Tracking research (what works per shop)

**Phone setup (spare Android 13, always plugged in on home Wi-Fi, inverter backup, no SIM):** Termux (F-Droid) with Node v26.4.0 and `android-tools` installed. Working folder `~/ps-tracker/` holds `.env`. Test scripts in the home folder (`~`) are run as `node --env-file=ps-tracker/.env probeN.mjs`. Telegram sending from the phone works. The spare phone has Jio Games store and Paytm installed and logged in.

**Amazon: works from the phone.** Page loads (200, about 1.4 MB, no block). The reliable stock signal is the presence of the `add-to-cart-button` / `buy-now-button` markers (out-of-stock voucher: both false; in-stock sample product: both true). Ignore the text "currently unavailable" (it appears on in-stock pages too) and ignore "robot" (false alarm). Only one in-stock page was tested, and it was a perfume, so **confirm the rule on a real in-stock voucher when one appears.** Amazon blocks my own fetch tool, but the phone is fine.

**Flipkart:**
- Individual product pages are **unreliable**: they always say InStock (schema.org) and have Add to cart / Buy Now, but tapping Buy Now gives "network error". Jitu has never completed a Flipkart purchase.
- The **search page works logged out** from the phone (200, 614 KB) and shows honest labels in plain text above each card: "Currently unavailable" and "Coming Soon". A parser (`probe12.mjs`) reads each card's status and product ID. Six cards parse: 1000, 2000, 4000 and a Sony Europe 5000 are Currently unavailable; 3000 and a Sony Interactive 5000 are Coming Soon.
- Four more listings appear only in a hidden schema.org list on the page (no status label found): playstation Rs.4000 (itm0ceacc74a0363), Rs.7000, Rs.9000, and Sony Europe Rs.5000 digital voucher (itmcf54504b6dee2). So **4000 has two listings and 5000 has three**; a tracker should treat an amount as available if any listing is. A card with no label might mean available. Not confirmed until one actually comes into stock.
- Out-of-stock cards show in the app search only when logged in with the include-out-of-stock filter, but the logged-out page from the phone already included labelled ones.

**Jio Store (store.jiogames.com):** built on **Fynd**. The product list loads from a hidden API; the page HTML contains a public `application_id` (65c2f61961f2709a8b32ca93) and a short public `token`. Calling `https://store.jiogames.com/api/service/application/catalog/v1.0/products/?f=brand%3Aplaystation&page_size=20` with header `Authorization: Bearer base64(application_id:token)` works and returns the PlayStation products (only the ₹2000 card appeared). Its `sellable` is true, `is_available` true and quantity 339974 (placeholder-looking) **even though the app shows out of stock at checkout**, so the catalog is unreliable like Flipkart. The real stock check happens at checkout. Probe scripts used `jio.html` (saved page) to read the id and token.

**Paytm, PhonePe, Gyftr, Rooter, others:** not tested. For Paytm, Jitu's idea: search "PlayStation" in the app; if a result shows, it is available.

**Ideas floated for unreliable shops (Jio, Flipkart, Paytm):**
1. Alert on any change in the fields (availability flag, quantity, price, listing count) and say "changed, go check", and mark those shops "unverified" until one real purchase succeeds. Then compare the saved "broken" snapshot with a working one to find a trustworthy field.
2. An app-tapping bot on the spare phone using Android's debugging tools (adb) or Shizuku: open the app, tap Buy Now, see whether the checkout screen appears, never tap Pay. Jitu liked it. **Setup was paused at pairing**: Android wireless debugging was enabled, adb installed in Termux, but the pairing-code box never appeared (no split-screen on this phone, Termux:Float did not work). Next try was Shizuku (installed, "not running"), pairing via its notification. Risks I gave: 15–30 s per check, breaks on app updates, terms-of-service and account-flag risk (use a spare account), phone must stay logged in.

## 7. WhatsApp rates (not built)
The admin posts the daily rate as **text**. Plan: no safe way to read a channel automatically, so Jitu forwards the message to the Telegram bot, which parses it and updates the site's rate list (with history). The friend's design has a rate-list popup with a 7-day mini chart, behind the trend button (currently a placeholder). Whether the site should show the WhatsApp sell price anywhere beyond that was left open.

## 8. Open items, in suggested order

1. Check the live site: does it show the 14 platforms and the Flipkart/Amazon links? If not, re-upload `data.js`, `app.js`, `style.css`.
2. Rename `assetsignore` to `.assetsignore` on GitHub; confirm the Cloudflare build succeeds; add the `BOOK_KEY` secret; test the shared investor book from two devices.
3. **Vendor links, one vendor at a time (₹1000–₹5000, one link per amount where the page address changes; one link if it's a single page):** next is **Jio Store**, then Paytm, PhonePe, Gyftr, Rooter, Games The Shop, Hubble, Simply Gaming, E2Z Store, Stan Shop, Kstore Global, Gift Up. For the five letter-badge shops, get the store link so the real logo can be added. Fampay/Blinkit removed.
4. Build the real tracker on the phone: Amazon (button check), Flipkart (search-page parser), Jio (change alerts), with Telegram alerts to all three chat IDs and a "tracker offline" warning. Decide how it feeds the site (for example write results to a small store the site reads, instead of hand-edited `data.js`).
5. WhatsApp rate forwarding to the bot and the rate-list popup.
6. Possibly protect the whole site with Cloudflare Access (free for a few email logins) instead of an open address.
7. Resume the app-tapping bot (Shizuku pairing) if the page-based signals stay unreliable.
8. Rotate the Telegram bot token and update `~/ps-tracker/.env` on the phone.

## 9. Gotchas learned

- In Termux, `!` inside double quotes breaks (`event not found`); use single quotes around URLs.
- The `~` character is hard to type on the phone keyboard; Termux already starts in the home folder.
- A pasted command that loses its last part saved the chat ID in the token slot once (fixed). Keep `.env` as two lines: `BOT_TOKEN=...` and `CHAT_ID=5573173531`.
- GitHub web upload hides or renames dot-files (`.assetsignore`).
- My own web fetch is blocked by Amazon, Flipkart and similar sites; tests must run on the phone. Termux npm installs worked only on the phone, not in my sandbox.
- Cloudflare's setup screen opened the newer Workers flow, not Pages. The deploy command had to be edited in Settings.
- Keep a changing preview honest: all stock flags in `data.js` are hand-set; nothing updates automatically yet.

## 10. A good first message for the new chat

"Continue the PS voucher tracker project from the attached handoff. First I want to check the live site and finish the Jio Store links. Give me one step at a time."
