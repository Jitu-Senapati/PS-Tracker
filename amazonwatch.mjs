// amazonwatch.mjs (v2, gentle) - READ-ONLY. Watches Amazon.in PlayStation gift cards 1000-5000.
// Uses ONE search page (covers 2000-5000) + the 1000 product page, every ~4 minutes,
// and backs off for a long time if Amazon shows a robot check. Never logs in, never buys.
// Run:  node --env-file=.env amazonwatch.mjs
import fs from "node:fs";

const SEARCH = "https://www.amazon.in/s?k=Sony+PlayStation+Store+Gift+Card&i=videogames&rh=n%3A976460031%2Cp_n_availability%3A1318485031%2Cp_123%3A10806812&dc&ds=v1%3AOULhepWC0Z8i%2BOQIPyiH%2F3iAlg4mgH49lstMYHBGVIA&crid=2TQ370Q31W3KV&qid=1793281741&rnid=215263484031&sprefix=sony+playstation+store+gift+card%2Cvideogames%2C327&ref=sr_nr_p_country_of_origin-bin_1";
const ASIN = { 1000: "B07K6RYVHR", 2000: "B093QF35KZ", 3000: "B07K6PVR8B", 4000: "B07K6RYVJ5", 5000: "B0B3DDW7TB" };
const AMOUNTS = [1000, 2000, 3000, 4000, 5000];
const link = (a) => `https://www.amazon.in/dp/${ASIN[a]}`;
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const EVERY_MS = 5 * 60 * 1000;           // one round every 5 minutes
const JITTER_MS = 30 * 1000;              // plus 0-30 seconds random
const GAP_MS = 6000;                      // pause between the two requests of a round
const BACKOFF_MS = [30, 60, 120].map((m) => m * 60 * 1000); // robot check: wait 30, then 60, then 120 minutes
const REMIND_MS = 20 * 60 * 1000;         // while still in stock, remind every 20 minutes
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;  // "I'm alive" every 6 hours
const STATE_FILE = new URL("./amazon-state.json", import.meta.url).pathname;
const ROBOT = /enter the characters you see|api-services-support@amazon|not a robot|automated access/i;

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
  const get = async (url) => {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.amazon.in/", "Upgrade-Insecure-Requests": "1" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
      return { status: res.status, html: await res.text() };
    } catch { return { status: 0, html: "" }; }
  };

  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
  state.pages ??= {}; state.lastBeat ??= 0; state.blocks ??= 0; state.warnedBlock ??= false;
  const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch {} };

  // Returns true if Amazon showed a robot check this round.
  const round = async (first) => {
    const now = Date.now();
    const found = {}; let robot = false; let bad = 0;

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
      if (!state.warnedBlock) { state.warnedBlock = true; await send(`⚠️ Amazon is showing a robot check. Pausing Amazon checks for ${wait / 60000} minutes, then trying again slowly.`); }
      log("robot check, pausing", wait / 60000, "min");
      save();
      return wait;
    }
    state.blocks = 0;
    if (state.warnedBlock) { state.warnedBlock = false; await send("✅ Amazon checks are working again."); }

    const summary = [];
    for (const a of AMOUNTS) {
      const p = (state.pages[a] ??= { s: "out", bad: 0, lastAlert: 0, warned: false });
      let r = found[a] || { s: "unknown" };
      summary.push(`${a}:${r.s}`);
      if (r.s === "unknown") {
        p.bad++;
        if (p.bad >= 5 && !p.warned) { p.warned = true; await send(`⚠️ Amazon ₹${a}: could not read this card ${p.bad} times in a row.`); }
        continue;
      }
      p.bad = 0; p.warned = false;
      if (r.s === "in" && (p.s !== "in" || now - p.lastAlert > REMIND_MS)) {
        let note = "";
        if (a !== 1000) { // double-check on the product page before alerting
          await sleep(GAP_MS);
          const c = await get(link(a));
          const cr = c.status === 200 ? readProduct(c.html) : { s: "unknown" };
          if (cr.s === "out") { summary[summary.length - 1] = `${a}:out(recheck)`; p.s = "out"; continue; }
          if (cr.s === "unknown") note = " (search shows a price; product page not confirmed)";
          if (cr.price) r = { ...r, price: cr.price };
        }
        await send(`🟢 Amazon: PlayStation ₹${a} looks IN STOCK ${r.price || ""}${note}\n${link(a)}`);
        p.lastAlert = now;
      } else if (r.s === "out" && p.s === "in") {
        await send(`🔴 Amazon ₹${a}: unavailable again`);
      }
      p.s = r.s;
    }
    log(summary.join("  "));
    if (first || now - state.lastBeat > HEARTBEAT_MS) {
      await send(`✅ Amazon watcher ${first ? "started" : "is running"}. ` + summary.join("  "));
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
