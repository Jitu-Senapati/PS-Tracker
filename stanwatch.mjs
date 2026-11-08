// stanwatch.mjs (v3) - READ-ONLY. Watches the Stan Shop PlayStation page (one page, 4 amount cards).
// Never logs in, never buys. Run:  node --env-file=.env stanwatch.mjs
import fs from "node:fs";

const PLATFORM = "Stan Shop";
const AMOUNTS = [1000, 2000, 3000, 4000];
const link = (a) => `https://www.stanshop.co/playstation-psn-gift-card-in-india-${a}-inr`;
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const EVERY_MS = 60 * 1000;               // one check about every minute
const JITTER_MS = 15 * 1000;              // plus 0-15 seconds random
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;  // "I'm alive" every 6 hours
const WARN_AFTER = 5;                     // warn after this many unreadable rounds in a row
const RESET_AFTER = 2;                    // window closes after 2 checks in a row with no stock
const STATE_FILE = new URL("./stan-state.json", import.meta.url).pathname;

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

// Each card looks like:  [SOLD OUT] ₹ 1,000 Coupon Worth ₹1000
// A card with the SOLD OUT ribbon is "out". A card without it is "in". A card not found is "unknown".
export function readCards(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#8377;|&#x20b9;/gi, "₹")
    .replace(/\s+/g, " ");
  const res = {};
  for (const m of text.matchAll(/(sold out\s*)?₹\s*([\d,]+)\s*Coupon Worth/gi)) {
    const amt = Number(m[2].replace(/,/g, ""));
    if (AMOUNTS.includes(amt) && !(amt in res)) res[amt] = m[1] ? "out" : "in";
  }
  for (const a of AMOUNTS) res[a] ??= "unknown";
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (!BOT_TOKEN || !CHAT_ID) { console.log("BOT_TOKEN / CHAT_ID not found. Run with: node --env-file=.env stanwatch.mjs"); process.exit(1); }
  const log = (...a) => console.log(new Date().toLocaleTimeString("en-IN"), ...a);
  const send = async (text) => {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: text.slice(0, 4000) }),
      });
      if (!r.ok) log("telegram error", r.status);
    } catch (e) { log("telegram failed", e.message); }
  };
  const fetchCards = async () => {
    try {
      const res = await fetch(link(1000), { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
      if (!res.ok) return null;
      return readCards(await res.text());
    } catch { return null; }
  };

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
  state.lastBeat ??= 0; state.bad ??= 0; state.warned ??= false;
  const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

  const round = async (first) => {
    const now = Date.now();
    const cards = await fetchCards();
    const summary = AMOUNTS.map((a) => `${a}:${cards ? cards[a] : "unknown"}`);
    const unreadable = !cards || AMOUNTS.every((a) => cards[a] === "unknown");
    if (unreadable) {
      state.bad++;
      if (state.bad >= WARN_AFTER && !state.warned) { state.warned = true; await send(`⚠️ ${PLATFORM}: could not read the page ${state.bad} times in a row.`); }
    } else { state.bad = 0; state.warned = false; }

    if (!unreadable) {
      const avail = AMOUNTS.filter((a) => cards[a] === "in");
      const anyUnknown = AMOUNTS.some((a) => cards[a] === "unknown");
      if (decide(state, avail, anyUnknown, now, RESET_AFTER)) {
        await send(`🟢 ${PLATFORM}: in stock now\n${availLine(avail)}\n${link(avail[0])}`);
      }
    }
    log(summary.join("  "));
    if (first || now - state.lastBeat > HEARTBEAT_MS) {
      await send(`✅ Stan watcher ${first ? "started" : "is running"}. ` + summary.join("  "));
      state.lastBeat = now;
    }
    save();
  };

  let first = true;
  for (;;) {
    try { await round(first); } catch (e) { log("round error", e.message); }
    first = false;
    await new Promise((r) => setTimeout(r, EVERY_MS + Math.random() * JITTER_MS));
  }
}
