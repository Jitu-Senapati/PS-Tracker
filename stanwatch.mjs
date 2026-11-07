// stanwatch.mjs (v2) - READ-ONLY. Watches the Stan Shop PlayStation page (one page, 4 amount cards)
// and sends Telegram alerts per amount. Never logs in, never buys.
// Run:  node --env-file=.env stanwatch.mjs
import fs from "node:fs";

const AMOUNTS = [1000, 2000, 3000, 4000];
const link = (a) => `https://www.stanshop.co/playstation-psn-gift-card-in-india-${a}-inr`;
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const EVERY_MS = 60 * 1000;               // one check about every minute
const JITTER_MS = 15 * 1000;              // plus 0-15 seconds random
const REMIND_MS = 20 * 60 * 1000;         // while still in stock, remind every 20 minutes
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;  // "I'm alive" every 6 hours
const WARN_AFTER = 5;                     // warn after this many unreadable rounds in a row
const STATE_FILE = new URL("./stan-state.json", import.meta.url).pathname;

// Reads the page text. Each card looks like:  [SOLD OUT] ₹ 1,000 Coupon Worth ₹1000
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
  state.pages ??= {}; state.lastBeat ??= 0;
  const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

  const round = async (first) => {
    const now = Date.now();
    const cards = await fetchCards();
    const summary = [];
    for (const a of AMOUNTS) {
      const p = (state.pages[a] ??= { s: "out", bad: 0, lastAlert: 0, warned: false });
      const s = cards ? cards[a] : "unknown";
      summary.push(`${a}:${s}`);
      if (s === "unknown") {
        p.bad++;
        if (p.bad >= WARN_AFTER && !p.warned) { p.warned = true; await send(`⚠️ Stan Shop ₹${a}: could not read this card ${p.bad} times in a row.`); }
        continue;
      }
      p.bad = 0; p.warned = false;
      if (s === "in" && (p.s !== "in" || now - p.lastAlert > REMIND_MS)) {
        await send(`🟢 Stan Shop: PlayStation ₹${a} looks IN STOCK\n${link(a)}`);
        p.lastAlert = now;
      } else if (s === "out" && p.s === "in") {
        await send(`🔴 Stan Shop ₹${a}: sold out again`);
      }
      p.s = s;
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
