// flipkartprobe3.mjs - READ-ONLY. Finds where Flipkart keeps each listing's "Currently unavailable / Coming Soon" label.
// Never logs in, never buys.  Run:  node --env-file=.env flipkartprobe3.mjs
import { extractState } from "./flipkartprobe2.mjs";
const URL_ = "https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const WORDS = /currently unavailable|coming soon|sold out|out of stock|add to cart|buy now/i;
const short = (v, n) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > n ? s.slice(0, n) + "…" : s; };

// Visit every value; remember the chain of parents so we can look a few levels up from a matching text.
export function findTexts(root) {
  const hits = []; const listings = [];
  const rec = (v, path, chain, depth) => {
    if (depth > 40) return;
    if (typeof v === "string") { if (WORDS.test(v) && v.length < 120) hits.push({ path, v, chain }); return; }
    if (v === null || typeof v !== "object") return;
    if (!Array.isArray(v) && ("productId" in v || "itemId" in v || "listingId" in v)) listings.push({ path, v });
    const next = [...chain, v];
    if (Array.isArray(v)) v.forEach((x, i) => rec(x, path + "[" + i + "]", next, depth + 1));
    else for (const k in v) rec(v[k], path + "." + k, next, depth + 1);
  };
  rec(root, "$", [], 0);
  return { hits, listings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = ["FLIPKART PROBE 3"];
  try {
    const r = await fetch(URL_, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.flipkart.com/" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
    const h = await r.text();
    const cnt = (s, re) => (s.match(re) || []).length;
    out.push(`status ${r.status} | html ${h.length}`);
    const raw = extractState(h);
    out.push(`'Currently unavailable' in whole html: ${cnt(h, /currently unavailable/gi)} | inside state json: ${raw ? cnt(raw, /currently unavailable/gi) : "-"}`);
    out.push(`'Coming Soon' in whole html: ${cnt(h, /coming soon/gi)} | inside state json: ${raw ? cnt(raw, /coming soon/gi) : "-"}`);
    out.push(`'/p/itm' links in html: ${cnt(h, /\/p\/itm/g)} | 'itm' ids in state json: ${raw ? cnt(raw, /itm[a-z0-9]{12}/g) : "-"}`);
    if (raw) {
      const { hits, listings } = findTexts(JSON.parse(raw));
      out.push(`label texts in json: ${hits.length} | objects with productId/itemId/listingId: ${listings.length}`);
      hits.slice(0, 2).forEach((x, i) => {
        out.push(`label ${i + 1}: "${x.v}" at ${x.path.slice(-110)}`);
        const up = x.chain[x.chain.length - 3] || x.chain[0];
        out.push("  context: " + short(up, 420));
      });
      listings.slice(0, 2).forEach((x, i) => out.push(`listing ${i + 1} at ${x.path.slice(-90)}: ` + short(x.v, 380)));
    }
  } catch (e) { out.push("ERROR " + e.message); }
  const msg = out.join("\n");
  console.log(msg);
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (BOT_TOKEN && CHAT_ID) {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
    console.log("telegram:", r.status);
  }
}
