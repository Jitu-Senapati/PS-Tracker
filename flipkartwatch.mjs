// flipkartwatch.mjs - READ-ONLY. Watches the Flipkart search page for PlayStation gift cards 1000-5000.
// Step 1 (every 5 min): read the search page data; listings not marked "Coming Soon" / "Currently unavailable" are candidates.
// Step 2: open each candidate's own page; it counts as IN STOCK only if it shows Add to cart or Buy now.
// Never logs in, never buys. Run:  node --env-file=.env flipkartwatch.mjs
import fs from "node:fs";

const PLATFORM = "Flipkart";
const SEARCH = "https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo";
const AMOUNTS = [1000, 2000, 3000, 4000, 5000];
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const EVERY_MS = 5 * 60 * 1000;           // one round every 5 minutes
const JITTER_MS = 30 * 1000;              // plus 0-30 seconds random
const GAP_MS = 5000;                      // pause between requests
const SLOW_MS = 15 * 60 * 1000;           // after 3 unreadable rounds in a row, wait 15 minutes between tries
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;  // "I'm alive" every 6 hours
const RESET_AFTER = 1;                    // window closes after 1 round with no stock
const MAX_CANDIDATES = 8;                 // never open more than this many listing pages per round
const LINKS_PER_AMOUNT = 2;               // at most this many links per amount in an alert
const STATE_FILE = new URL("./flipkart-state.json", import.meta.url).pathname;
const SORTED = SEARCH + "&sort=price_asc";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const NOT_AVAILABLE = /coming soon|currently unavailable|unavailable|sold out|out of stock|notify/i;

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

export function extractState(html) {
  const i = html.indexOf("__INITIAL_STATE__");
  if (i < 0) return null;
  const start = html.indexOf("{", i);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let k = start; k < html.length; k++) {
    const c = html[k];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return html.slice(start, k + 1); }
  }
  return null;
}

// first string inside obj that matches re
function findStr(o, re, depth = 0) {
  if (depth > 12 || o == null) return null;
  if (typeof o === "string") return re.test(o) ? o : null;
  if (typeof o !== "object") return null;
  for (const k in o) { const r = findStr(o[k], re, depth + 1); if (r) return r; }
  return null;
}
// every array in the data whose items look like listings (they carry a "buyability" block)
function listingArrays(o, out = [], depth = 0) {
  if (depth > 30 || o == null || typeof o !== "object") return out;
  if (Array.isArray(o) && o.some((e) => e && e.value && e.value.buyability)) out.push(o);
  for (const k in o) listingArrays(o[k], out, depth + 1);
  return out;
}
const amountOf = (title, price) => {
  const m = (title || "").match(/Rs\.?\s*([\d,]+)/i) || (title || "").match(/([\d,]+)\s*INR/i) || (price || "").match(/₹\s*([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : 0;
};

// Returns null if the page data could not be read, else { total, listings: [{pid, title, amt, price, msg, candidate, url}] }.
export function parseSearch(html) {
  const raw = extractState(html);
  if (!raw) return null;
  let st; try { st = JSON.parse(raw); } catch { return null; }
  const seen = new Set(); const listings = [];
  for (const arr of listingArrays(st)) for (const e of arr) {
    const v = e && e.value; if (!v || !v.buyability) continue;
    const params = (e.action && e.action.params) || {};
    const pid = params.productId || findStr(e, /^[A-Z0-9]{16}$/) || "";
    if (pid && seen.has(pid)) continue; if (pid) seen.add(pid);
    const t = v.titles || {};
    const title = (typeof t.title === "string" && t.title) || (typeof t.newTitle === "string" && t.newTitle) || findStr(t, /\S/) || "";
    const price = findStr(v, /^₹\s?[\d,]+(\.\d+)?$/) || "";
    const b = v.buyability;
    const msg = typeof b.message === "string" ? b.message : "";
    const flagFalse = Object.keys(b).some((k) => /buyable/i.test(k) && b[k] === false);
    const rel = findStr(e, /^\/[^?\s]*\/p\/itm[a-z0-9]+/i);
    const url = rel ? "https://www.flipkart.com" + rel : pid ? `https://www.flipkart.com/product/p/itme?pid=${pid}${params.listingId ? "&lid=" + params.listingId : ""}` : "";
    listings.push({ pid, title, amt: amountOf(title, price), price, msg, candidate: !NOT_AVAILABLE.test(msg) && !flagFalse, url });
  }
  return { total: listings.length, listings };
}

// A listing page counts as in stock only if it shows Add to cart or Buy now.
export function hasBuyButton(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  return /\b(add to cart|buy now)\b/i.test(text);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (!BOT_TOKEN || !CHAT_ID) { console.log("BOT_TOKEN / CHAT_ID not found. Run with: node --env-file=.env flipkartwatch.mjs"); process.exit(1); }
  const log = (...a) => console.log(new Date().toLocaleTimeString("en-IN"), ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const send = async (text) => {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: text.slice(0, 4000) }),
      });
      if (!r.ok) log("telegram error", r.status);
    } catch (e) { log("telegram failed", e.message); }
  };
  const get = async (url, ua = UA) => {
    try {
      const res = await fetch(url, { headers: { "User-Agent": ua, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.flipkart.com/" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
      return { status: res.status, html: await res.text() };
    } catch { return { status: 0, html: "" }; }
  };

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
  state.lastBeat ??= 0; state.bad ??= 0; state.warned ??= false;
  const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

  // Returns ms to wait before the next round, or 0 for the normal pace.
  const round = async (first) => {
    const now = Date.now();
    // Read the search page sorted cheapest first (the 10 listings Flipkart sends include every 1000-5000 card).
    // If the last of those 10 is still within range, more in-range listings may be hidden, so also read the desktop page.
    const all = new Map(); const counts = []; let status = 0;
    const sources = [{ name: "s1", url: SORTED, ua: UA }];
    for (let i = 0; i < sources.length; i++) {
      if (i > 0) await sleep(GAP_MS + Math.random() * 3000);
      const src = sources[i];
      const s = await get(src.url, src.ua); status = s.status;
      const parsed = s.status === 200 ? parseSearch(s.html) : null;
      if (!parsed || parsed.total === 0) { counts.push(`${src.name}:x`); continue; }
      for (const l of parsed.listings) { const key = l.pid || l.url || l.title; if (!all.has(key)) all.set(key, l); }
      counts.push(`${src.name}:${parsed.total}`);
      if (i === 0 && Math.max(...parsed.listings.map((l) => l.amt)) <= 5000) sources.push({ name: "s2", url: SEARCH, ua: DESKTOP });
    }
    if (all.size === 0) {
      state.bad++;
      log(`could not read search page (http ${status}, ${state.bad} in a row)`);
      if (state.bad >= 5 && !state.warned) { state.warned = true; await send(`⚠️ ${PLATFORM}: could not read the search page ${state.bad} times in a row (http ${status}).`); }
      save();
      return state.bad >= 3 ? SLOW_MS : 0;
    }
    const parsed = { total: all.size, listings: [...all.values()] };
    state.bad = 0; state.warned = false;

    const inRange = parsed.listings.filter((l) => AMOUNTS.includes(l.amt));
    const candidates = inRange.filter((l) => l.candidate).slice(0, MAX_CANDIDATES);
    const confirmed = []; let anyUnknown = false;
    for (const c of candidates) {
      await sleep(GAP_MS + Math.random() * 3000);
      const p = c.url ? await get(c.url) : { status: 0, html: "" };
      if (p.status !== 200) { anyUnknown = true; log(`candidate ₹${c.amt} page unreadable (http ${p.status})`); continue; }
      if (hasBuyButton(p.html)) confirmed.push(c);
    }
    const avail = [...new Set(confirmed.map((c) => c.amt))].sort((x, y) => x - y);
    if (decide(state, avail, anyUnknown, now, RESET_AFTER)) {
      const lines = [];
      for (const a of avail) confirmed.filter((c) => c.amt === a).slice(0, LINKS_PER_AMOUNT).forEach((c) => lines.push(`₹${a} ${c.price} ${c.url}`.replace(/\s+/g, " ")));
      await send(`🟢 ${PLATFORM}: in stock now\n${availLine(avail)}\n${lines.join("\n")}`);
    }
    const summary = `${counts.join(" ")} listings:${parsed.total} in-range:${inRange.length} candidates:${candidates.length} in-stock:${confirmed.length}`;
    log(summary);
    if (first || now - state.lastBeat > HEARTBEAT_MS) {
      await send(`✅ ${PLATFORM} watcher ${first ? "started" : "is running"}. ${summary}`);
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
