// flipkartprobe5.mjs - READ-ONLY. Tries 3 ways of getting MORE Flipkart listings in one request. Never logs in, never buys.
// Run:  node --env-file=.env flipkartprobe5.mjs
import { extractState } from "./flipkartprobe2.mjs";
import { listingItems } from "./flipkartprobe4.mjs";
const BASE = "https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo";
const MOBILE = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const VARIANTS = [
  { name: "A desktop browser", url: BASE, ua: DESKTOP },
  { name: "B price low-to-high", url: BASE + "&sort=price_asc", ua: MOBILE },
  { name: "C search '2000'", url: "https://www.flipkart.com/search?q=playstation+gift+card+2000&sid=mcd%2Czyx%2Czzo", ua: MOBILE },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const findStr = (o, re, d = 0) => { if (d > 12 || o == null) return null; if (typeof o === "string") return re.test(o) ? o : null; if (typeof o !== "object") return null; for (const k in o) { const r = findStr(o[k], re, d + 1); if (r) return r; } return null; };

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = ["FLIPKART PROBE 5"];
  for (const v of VARIANTS) {
    try {
      const r = await fetch(v.url, { headers: { "User-Agent": v.ua, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.flipkart.com/" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
      const h = await r.text();
      const htmlPids = new Set([...h.matchAll(/\/p\/itm[a-z0-9]+[^"]*?[?&]pid=([A-Z0-9]{16})/g)].map((m) => m[1]));
      let items = [];
      const raw = extractState(h);
      if (raw) { try { const u = new Map(); listingItems(JSON.parse(raw)).forEach((x) => u.set(x.pid, x)); items = [...u.values()]; } catch {} }
      const brief = items.map((x) => {
        const t = (x.o.value && x.o.value.titles && x.o.value.titles.title) || findStr(x.o, /rs\.?\s*\d|\d\s*inr|gift card/i) || "";
        const a = (t.match(/Rs\.?\s*([\d,]+)/i) || t.match(/([\d,]+)\s*INR/i) || [])[1] || "?";
        const m = (x.o.value && x.o.value.buyability && x.o.value.buyability.message) || "";
        return a.replace(",", "") + (/coming/i.test(m) ? "CS" : /unavail/i.test(m) ? "CU" : m ? "!" : "-");
      }).join(" ");
      out.push(`${v.name}: http ${r.status} | ${Math.round(h.length / 1024)}KB | json listings ${items.length} | html ids ${htmlPids.size}`);
      if (brief) out.push("   " + brief);
    } catch (e) { out.push(`${v.name}: ERROR ${e.message}`); }
    await sleep(8000);
  }
  out.push("(CS = Coming Soon, CU = Currently unavailable, - = no label)");
  const msg = out.join("\n");
  console.log(msg);
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (BOT_TOKEN && CHAT_ID) {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
    console.log("telegram:", r.status);
  }
}
