// stanwatch.mjs - READ-ONLY. Watches the Stan Shop PlayStation pages and sends Telegram alerts.
// Never logs in, never buys. Run:  node --env-file=.env stanwatch.mjs
import fs from "node:fs";

const PAGES = {
  1000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-1000-inr",
  2000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-2000-inr",
  3000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-3000-inr",
  4000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-4000-inr",
};
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const EVERY_MS = 60 * 1000;          // one round about every minute
const JITTER_MS = 15 * 1000;         // plus 0-15 seconds random
const REMIND_MS = 20 * 60 * 1000;    // while still in stock, remind every 20 minutes
const HEARTBEAT_MS = 6 * 60 * 60 * 1000; // "I'm alive" every 6 hours
const WARN_AFTER = 5;                // warn after this many unreadable rounds in a row
const STATE_FILE = new URL("./stan-state.json", import.meta.url).pathname;

const { BOT_TOKEN, CHAT_ID } = process.env;
if (!BOT_TOKEN || !CHAT_ID) { console.log("BOT_TOKEN / CHAT_ID not found. Run with: node --env-file=.env stanwatch.mjs"); process.exit(1); }

// Read the stock signal from the page's hidden data ("availability").
export function readStock(html) {
  const vals = [...html.matchAll(/"availability"\s*:\s*"([^"]+)"/g)].map((m) => m[1].split("/").pop());
  if (!vals.length) return "unknown";
  if (vals.some((v) => /^(InStock|LimitedAvailability|PreOrder|OnlineOnly)$/i.test(v))) return "in";
  if (vals.every((v) => /^(OutOfStock|SoldOut|Discontinued)$/i.test(v))) return "out";
  return "unknown";
}

const log = (...a) => console.log(new Date().toLocaleTimeString("en-IN"), ...a);
async function send(text) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text.slice(0, 4000) }),
    });
    if (!r.ok) log("telegram error", r.status);
  } catch (e) { log("telegram failed", e.message); }
}
async function check(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (!res.ok) return "unknown";
    return readStock(await res.text());
  } catch { return "unknown"; }
}

let state = {};
try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
state.pages ??= {}; state.lastBeat ??= 0;
const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

async function round(first) {
  const now = Date.now();
  const summary = [];
  for (const [amt, url] of Object.entries(PAGES)) {
    const p = (state.pages[amt] ??= { s: "out", bad: 0, lastAlert: 0, warned: false });
    const s = await check(url);
    summary.push(`${amt}:${s}`);
    if (s === "unknown") {
      p.bad++;
      if (p.bad >= WARN_AFTER && !p.warned) { p.warned = true; await send(`⚠️ Stan Shop ₹${amt}: could not read the page ${p.bad} times in a row.`); }
    } else {
      p.bad = 0; p.warned = false;
      if (s === "in" && (p.s !== "in" || now - p.lastAlert > REMIND_MS)) {
        await send(`🟢 Stan Shop: PlayStation ₹${amt} looks IN STOCK\n${url}`);
        p.lastAlert = now;
      } else if (s === "out" && p.s === "in") {
        await send(`🔴 Stan Shop ₹${amt}: sold out again`);
      }
      p.s = s;
    }
  }
  log(summary.join("  "));
  if (first || now - state.lastBeat > HEARTBEAT_MS) {
    await send(`✅ Stan watcher ${first ? "started" : "is running"}. ` + summary.join("  "));
    state.lastBeat = now;
  }
  save();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let first = true;
  for (;;) {
    try { await round(first); } catch (e) { log("round error", e.message); }
    first = false;
    await new Promise((r) => setTimeout(r, EVERY_MS + Math.random() * JITTER_MS));
  }
}
