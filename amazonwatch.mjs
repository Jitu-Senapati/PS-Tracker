// amazonwatch.mjs (v3, gentle) - READ-ONLY. Watches Amazon.in PlayStation gift cards 1000-5000.
// Uses ONE search page (covers 2000-5000) + the 1000 product page, every 5 minutes,
// and backs off for a long time if Amazon shows a robot check. Never logs in, never buys.
// Run:  node --env-file=.env amazonwatch.mjs
import fs from "node:fs";

const PLATFORM = "Amazon";
const SEARCH = "https://www.amazon.in/s?k=Sony+PlayStation+Store+Gift+Card&i=videogames&rh=n%3A976460031%2Cp_n_availability%3A1318485031%2Cp_123%3A10806812&dc&ds=v1%3AOULhepWC0Z8i%2BOQIPyiH%2F3iAlg4mgH49lstMYHBGVIA&crid=2TQ370Q31W3KV&qid=1793281741&rnid=215263484031&sprefix=sony+playstation+store+gift+card%2Cvideogames%2C327&ref=sr_nr_p_country_of_origin-bin_1";
const ASIN = { 1000: "B07K6RYVHR", 2000: "B093QF35KZ", 3000: "B07K6PVR8B", 4000: "B07K6RYVJ5", 5000: "B0B3DDW7TB" };
const AMOUNTS = [1000, 2000, 3000, 4000, 5000];
const link = (a) => `https://www.amazon.in/dp/${ASIN[a]}`;
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const EVERY_MS = 5 * 60 * 1000;           // one round every 5 minutes
const JITTER_MS = 30 * 1000;              // plus 0-30 seconds random
const GAP_MS = 6000;                      // pause between requests
const BACKOFF_MS = [30, 60, 120].map((m) => m * 60 * 1000); // robot check: wait 30, then 60, then 120 minutes
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;  // "I'm alive" every 6 hours
const RESET_AFTER = 1;                    // window closes after 1 round with no stock
const STATE_FILE = new URL("./amazon-state.json", import.meta.url).pathname;
const ROBOT = /enter the characters you see|api-services-support@amazon|not a robot|automated access/i;

// ---- Notification rules (same in every watcher) ----
// One "window" per platform. It opens on the first stock, alerts at once, then:
//  - a NEW amount appearing inside the window alerts at once (the 20-minute timer is NOT reset),
//  - otherwise a reminder goes out every 20 minutes counted from the window's first alert,
//  - the window closes after the platform has had no stock for `resetAfter` checks in a row.
const REMIND_MS = 20 * 60 * 1000;
function decide(st, avail, anyUnknown, now, resetAfter) {
  st.win ??= 0; st.known ??= []; st.next ??= 0; st.empty ??= 0;
  if (avail.length === 0) {
    if (!anyUnknown) { st.empty++; if (st.empty >= resetAfter) { st.win = 0; st.known = []; st.next = 0; } }
    return false;
  }
  st.empty = 0;
  if (!st.win) { st.win = now; st.next = now + REMIND_MS; st.known = [...avail]; return true; }
  let notify = false;
  if (avail.some((a) => !st.known.includes(a))) { notify = true; st.known = [...new Set([...st.known, ...avail])]; }
  if (now >= st.next) { notify = true; while (st.next <= now) st.next += REMIND_MS; }
  return notify;
}
const amtText = (a) => (a === 0 ? "check the page" : "₹" + a);
const availLine = (avail) => "Available: " + [...avail].sort((x, y) => x - y).map(amtText).join(" ");
// ---- end of notification rules ----

const textOf = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&#8377;|&#x20b9;/gi, "₹").replace(/\s+/g, " ").trim();

// Search page: one result card per amount. out = "Currently unavailable"; in = a price and no "unavailable"; else unknown.
export function readSearch(html) {
  if (ROBOT.test(html) && !html.includes('data-component-type="s-search-result"')) return { robot: true };
  const marker = 'data-component-type="s-search-result"';
  const idxs = []; let i = -1;
  while ((i = html.indexOf(marker, i + 1)) !== -1) idxs.push(i);
  const res = {};
  idxs.forEach((pos, n) => {
    const start = html.lastIndexOf("<div", pos);
    const text = textOf(html.slice(start, idxs[n + 1] ?? html.length));
    const amt = Number(((text.match(/Rs\.?\s*([\d,]+)/i) || [])[1] || "0").replace(/,/g, ""));
    if (!AMOUNTS.includes(amt) || amt in res) return;
    const price = (text.match(/₹\s*([\d,]+)/) || [])[1];
    if (/currently unavailable/i.test(text)) res[amt] = { s: "out" };
    else if (price) res[amt] = { s: "in", price: "₹" + price };
    else res[amt] = { s: "unknown" };
  });
  return { cards: res };
}

// Product page: in = a buy button exists; out = "Currently unavailable" and no buy button.
export function readProduct(html) {
  if (ROBOT.test(html)) return { robot: true };
  if (/id="add-to-cart-button"|id="buy-now-button"|name="submit\.add-to-cart"/i.test(html)) {
    const price = (html.match(/class="a-price-whole">\s*([\d,]+)/) || [])[1];
    return { s: "in", price: price ? "₹" + price : "" };
  }
  if (/currently unavailable/i.test(html)) return { s: "out" };
  return { s: "unknown" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BOT_TOKEN, CHAT_ID } = process.env;
  const CHATS = (process.env.CHAT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const OWNER = CHAT_ID || CHATS[0];                    // you: gets everything (alerts, started, running, warnings)
  const ALERT_CHATS = [...new Set([OWNER, ...CHATS])];  // you + friends: get only the "in stock" alerts
  if (!BOT_TOKEN || !OWNER) { console.log("BOT_TOKEN / CHAT_ID not found. Run with: node --env-file=.env amazonwatch.mjs"); process.exit(1); }
  const log = (...a) => console.log(new Date().toLocaleTimeString("en-IN"), ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Stock alerts (they start with the green circle) go to you and everyone in CHAT_IDS; status messages go to you only.
  const send = async (text) => {
    const targets = text.startsWith("🟢") ? ALERT_CHATS : [OWNER];
    for (const chat of targets) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000) }),
        });
        if (!r.ok) log("telegram error", chat, r.status);
      } catch (e) { log("telegram failed", chat, e.message); }
    }
  };
  const get = async (url) => {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.amazon.in/", "Upgrade-Insecure-Requests": "1" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
      return { status: res.status, html: await res.text() };
    } catch { return { status: 0, html: "" }; }
  };

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
  state.lastBeat ??= 0; state.blocks ??= 0; state.warnedBlock ??= false; state.bad ??= {}; state.warned ??= {};
  const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

  // Returns the number of ms to wait if Amazon showed a robot check, else 0.
  const round = async (first) => {
    const now = Date.now();
    const found = {}; let robot = false;

    const s = await get(SEARCH);
    const sr = s.status === 200 ? readSearch(s.html) : { cards: {} };
    if (sr.robot || s.status === 503) robot = true; else Object.assign(found, sr.cards);
    await sleep(GAP_MS + Math.random() * 3000);
    if (!robot) {
      const p = await get(link(1000));
      const pr = p.status === 200 ? readProduct(p.html) : { s: "unknown" };
      if (pr.robot || p.status === 503) robot = true; else found[1000] = pr;
    }
    if (robot) {
      state.blocks++;
      const wait = BACKOFF_MS[Math.min(state.blocks - 1, BACKOFF_MS.length - 1)];
      if (!state.warnedBlock) { state.warnedBlock = true; await send(`⚠️ ${PLATFORM} is showing a robot check. Pausing ${PLATFORM} checks for ${wait / 60000} minutes, then trying again slowly.`); }
      log("robot check, pausing", wait / 60000, "min");
      save();
      return wait;
    }
    state.blocks = 0;
    if (state.warnedBlock) { state.warnedBlock = false; await send(`✅ ${PLATFORM} checks are working again.`); }

    const summary = []; const avail = []; let anyUnknown = false; const prices = {};
    for (const a of AMOUNTS) {
      let r = found[a] || { s: "unknown" };
      let label = null;
      // The search page says "in": confirm on the product page before counting it (only for amounts not already alerted).
      if (r.s === "in" && a !== 1000 && !(state.known || []).includes(a)) {
        await sleep(GAP_MS);
        const c = await get(link(a));
        const cr = c.status === 200 ? readProduct(c.html) : { s: "unknown" };
        if (cr.robot) r = { s: "unknown" };
        else if (cr.s === "out") { r = { s: "out" }; label = "out(recheck)"; }
        else if (cr.price) r = { ...r, price: cr.price };
      }
      if (r.s === "unknown" && !label) label = a === 1000 ? "unknown(product page)" : `unknown(search http ${s.status}, ${Object.keys(sr.cards || {}).length} cards read)`;
      summary.push(`${a}:${label || r.s}`);
      if (r.s === "in") { avail.push(a); prices[a] = r.price || ""; }
      if (r.s === "unknown") {
        anyUnknown = true;
        state.bad[a] = (state.bad[a] || 0) + 1;
        if (state.bad[a] >= 5 && !state.warned[a]) { state.warned[a] = true; await send(`⚠️ ${PLATFORM} ₹${a}: could not read this card ${state.bad[a]} times in a row.`); }
      } else { state.bad[a] = 0; state.warned[a] = false; }
    }
    if (decide(state, avail, anyUnknown, now, RESET_AFTER)) {
      await send(`🟢 ${PLATFORM}: in stock now\n${availLine(avail)}\n` + avail.map((a) => `₹${a} ${prices[a] || ""} ${link(a)}`.replace(/\s+/g, " ")).join("\n"));
    }
    log(summary.join("  "));
    if (first || now - state.lastBeat > HEARTBEAT_MS) {
      await send(`✅ ${PLATFORM} watcher ${first ? "started" : "is running"}. ` + summary.join("  "));
      state.lastBeat = now;
    }
    save();
    return 0;
  };

  let first = true;
  for (;;) {
    let wait = 0;
    try { wait = await round(first); } catch (e) { log("round error", e.message); }
    first = false;
    await sleep(wait || EVERY_MS + Math.random() * JITTER_MS);
  }
}
