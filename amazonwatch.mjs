// amazonwatch.mjs - READ-ONLY. Watches the 5 Amazon.in PlayStation gift card pages (1000-5000)
// and sends Telegram alerts per amount. Never logs in, never buys.
// Run:  node --env-file=.env amazonwatch.mjs
import fs from "node:fs";

const ASIN = { 1000: "B07K6RYVHR", 2000: "B093QF35KZ", 3000: "B07K6PVR8B", 4000: "B07K6RYVJ5", 5000: "B0B3DDW7TB" };
const AMOUNTS = Object.keys(ASIN).map(Number);
const link = (a) => `https://www.amazon.in/dp/${ASIN[a]}`;
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const EVERY_MS = 90 * 1000;               // one full round about every 90 seconds
const JITTER_MS = 20 * 1000;              // plus 0-20 seconds random
const GAP_MS = 4000;                      // pause between the 5 pages, with up to 3s random extra
const REMIND_MS = 20 * 60 * 1000;         // while still in stock, remind every 20 minutes
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;  // "I'm alive" every 6 hours
const WARN_AFTER = 5;                     // warn after this many unreadable rounds in a row
const STATE_FILE = new URL("./amazon-state.json", import.meta.url).pathname;

// in = a buy button exists; out = "Currently unavailable" and no buy button; unknown = anything else (robot check, odd page)
export function readStock(html) {
  if (/enter the characters you see|api-services-support@amazon|not a robot/i.test(html)) return { s: "unknown", why: "robot-check" };
  const hasBuy = /id="add-to-cart-button"|id="buy-now-button"|name="submit\.add-to-cart"/i.test(html);
  if (hasBuy) {
    const price = (html.match(/class="a-price-whole">\s*([\d,]+)/) || [])[1];
    return { s: "in", price: price ? "₹" + price : "" };
  }
  if (/currently unavailable/i.test(html)) return { s: "out" };
  return { s: "unknown", why: "no-signal" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (!BOT_TOKEN || !CHAT_ID) { console.log("BOT_TOKEN / CHAT_ID not found. Run with: node --env-file=.env amazonwatch.mjs"); process.exit(1); }
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
  const fetchStock = async (a) => {
    try {
      const res = await fetch(link(a), { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
      if (!res.ok) return { s: "unknown", why: "http-" + res.status };
      return readStock(await res.text());
    } catch { return { s: "unknown", why: "network" }; }
  };

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
  state.pages ??= {}; state.lastBeat ??= 0;
  const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

  const round = async (first) => {
    const now = Date.now();
    const summary = [];
    for (const a of AMOUNTS) {
      const p = (state.pages[a] ??= { s: "out", bad: 0, lastAlert: 0, warned: false });
      const r = await fetchStock(a);
      summary.push(`${a}:${r.s}${r.why ? "(" + r.why + ")" : ""}`);
      if (r.s === "unknown") {
        p.bad++;
        if (p.bad >= WARN_AFTER && !p.warned) { p.warned = true; await send(`⚠️ Amazon ₹${a}: could not read the page ${p.bad} times in a row (${r.why}).`); }
      } else {
        p.bad = 0; p.warned = false;
        if (r.s === "in" && (p.s !== "in" || now - p.lastAlert > REMIND_MS)) {
          await send(`🟢 Amazon: PlayStation ₹${a} looks IN STOCK ${r.price || ""}\n${link(a)}`);
          p.lastAlert = now;
        } else if (r.s === "out" && p.s === "in") {
          await send(`🔴 Amazon ₹${a}: unavailable again`);
        }
        p.s = r.s;
      }
      await sleep(GAP_MS + Math.random() * 3000);
    }
    log(summary.join("  "));
    if (first || now - state.lastBeat > HEARTBEAT_MS) {
      await send(`✅ Amazon watcher ${first ? "started" : "is running"}. ` + summary.join("  "));
      state.lastBeat = now;
    }
    save();
  };

  let first = true;
  for (;;) {
    try { await round(first); } catch (e) { log("round error", e.message); }
    first = false;
    await sleep(EVERY_MS + Math.random() * JITTER_MS);
  }
}
