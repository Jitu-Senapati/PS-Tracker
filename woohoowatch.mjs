// woohoowatch.mjs (v2) - READ-ONLY. Watches Woohoo PlayStation E-Gift Card stock through the same
// "inventories" list the Woohoo page itself asks for. Never logs in, never buys.
// Run:  node --env-file=.env woohoowatch.mjs
import fs from "node:fs";

const PLATFORM = "Woohoo";
const PAGE = "https://www.woohoo.in/playstation-e-gift-instant-voucher";
const API = "https://www.woohoo.in/proxy/locale/en-in/product/inventories?searchCriteria[filter_groups][0][filters][0][field]=universalProductCodes.entityId&searchCriteria[filter_groups][0][filters][0][condition_type]=eq&searchCriteria[filter_groups][0][filters][0][value]=7864&searchCriteria[limit]=2000&searchCriteria[offset]=0";
const WANT = [1000, 2000, 3000, 4000, 5000];
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const EVERY_MS = 5 * 60 * 1000;           // one check every 5 minutes
const JITTER_MS = 30 * 1000;              // plus 0-30 seconds random
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;  // "I'm alive" every 6 hours
const RESET_AFTER = 1;                    // window closes after 1 check with no stock
const WARN_AFTER = 5;                     // warn after this many unreadable checks in a row
const STATE_FILE = new URL("./woohoo-state.json", import.meta.url).pathname;

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

// The inventories list holds one entry per amount that is available. Returns the amounts, or null if unreadable.
export function readInventory(text) {
  let j; try { j = JSON.parse(text); } catch { return null; }
  if (!j || !Array.isArray(j.inventories)) return null;
  return [...new Set(j.inventories.map((x) => Number(x && x.denomination)).filter((n) => n > 0))].sort((a, b) => a - b);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (!BOT_TOKEN || !CHAT_ID) { console.log("BOT_TOKEN / CHAT_ID not found. Run with: node --env-file=.env woohoowatch.mjs"); process.exit(1); }
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
  const get = async () => {
    try {
      const res = await fetch(API, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "application/json, text/plain, */*", Referer: PAGE, Origin: "https://www.woohoo.in" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
      return { status: res.status, text: await res.text() };
    } catch { return { status: 0, text: "" }; }
  };

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
  state.lastBeat ??= 0; state.bad ??= 0; state.warned ??= false;
  const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

  const round = async (first) => {
    const now = Date.now();
    const g = await get();
    const inv = g.status === 200 ? readInventory(g.text) : null;
    let summary; let avail = null;
    if (inv) { avail = inv.filter((a) => WANT.includes(a)); summary = "available: " + (inv.join(" ") || "none"); }
    else summary = `unreadable (http ${g.status}) ${g.text.slice(0, 60).replace(/\s+/g, " ")}`;

    if (avail === null) {
      state.bad++;
      if (state.bad >= WARN_AFTER && !state.warned) { state.warned = true; await send(`⚠️ ${PLATFORM}: could not read the stock list ${state.bad} times in a row (http ${g.status}).`); }
    } else {
      state.bad = 0; state.warned = false;
      if (decide(state, avail, false, now, RESET_AFTER)) await send(`🟢 ${PLATFORM}: in stock now\n${availLine(avail)}\n${PAGE}`);
    }
    log(summary);
    if (first || now - state.lastBeat > HEARTBEAT_MS) {
      await send(`✅ ${PLATFORM} watcher ${first ? "started" : "is running"}. ${summary}`);
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
