// stanprobe.mjs - READ-ONLY. Looks at how Stan Shop marks each amount sold out. Never logs in, never buys.
// Run:  node --env-file=.env stanprobe.mjs
import crypto from "node:crypto";
const URLS = {
  1000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-1000-inr",
  2000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-2000-inr",
  3000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-3000-inr",
  4000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-4000-inr",
};
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const out = ["STAN PROBE"];
const pages = {};
for (const [a, u] of Object.entries(URLS)) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9" }, signal: AbortSignal.timeout(20000) });
    const h = await r.text();
    pages[a] = h;
    out.push(`${a}: ${r.status} ${h.length} chars hash=${crypto.createHash("md5").update(h).digest("hex").slice(0, 6)}`);
  } catch (e) { out.push(`${a}: ERR ${e.message}`); }
}
const h = Object.values(pages)[0] || "";
const ld = [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].replace(/\s+/g, " ").slice(0, 260));
out.push("JSON-LD blocks: " + ld.length);
ld.slice(0, 2).forEach((x) => out.push("  " + x));
out.push("next-data=" + /__NEXT_DATA__/.test(h) + " nuxt=" + /__NUXT__/.test(h));
const keys = [...h.matchAll(/.{0,50}"(?:[a-zA-Z_]*(?:sold_?out|soldOut|in_?stock|inStock|out_?of_?stock|outOfStock|available|inventory|stock)[a-zA-Z_]*)"\s*:\s*[^,}]{0,30}/gi)].map((m) => m[0].replace(/\s+/g, " "));
out.push("stock-like fields: " + keys.length);
[...new Set(keys)].slice(0, 10).forEach((k) => out.push("  " + k));
const text = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
const so = [...text.matchAll(/.{0,60}sold out.{0,30}/gi)].map((m) => m[0]);
out.push("visible 'sold out' texts: " + so.length);
so.slice(0, 4).forEach((x) => out.push("  " + x));
const msg = out.join("\n");
console.log(msg);
const { BOT_TOKEN, CHAT_ID } = process.env;
if (BOT_TOKEN && CHAT_ID) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
  console.log("telegram:", r.status);
}
