// probe1.mjs - READ-ONLY look at E2Z Store and Stan Shop pages. Only downloads pages. Never logs in, never buys.
// Run on the phone:  node --env-file=ps-tracker/.env probe1.mjs
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const E2Z = {
  1000: "https://e2zstore.com/product/rs-1000-playstation-network-wallet-top-up/",
  2000: "https://e2zstore.com/product/rs-2000-playstation-network-wallet-top-up/",
  3000: "https://e2zstore.com/product/rs-3000-playstation-network-wallet-top-up/",
  4000: "https://e2zstore.com/product/rs-4000-playstation-network-wallet-top-up/",
  5000: "https://e2zstore.com/product/rs-5000-playstation-network-wallet-top-up/",
};
const STAN = {
  1000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-1000-inr",
  2000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-2000-inr",
  3000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-3000-inr",
  4000: "https://www.stanshop.co/playstation-psn-gift-card-in-india-4000-inr",
};
const WOO_API = "https://e2zstore.com/wp-json/wc/store/v1/products?search=playstation&per_page=30";

const count = (h, re) => (h.match(re) || []).length;
export function analyse(html) {
  const jsonld = [...new Set([...html.matchAll(/"availability"\s*:\s*"([^"]+)"/g)].map(m => m[1].split("/").pop()))];
  const wooClass = [...new Set([...html.matchAll(/class="[^"]*\b(instock|outofstock|onbackorder)\b/g)].map(m => m[1]))];
  const words = {
    addcart: count(html, /add to cart/gi),
    buynow: count(html, /buy now/gi),
    oos: count(html, /out of stock/gi),
    soldout: count(html, /sold out/gi),
    notify: count(html, /notify me/gi),
    unavail: count(html, /currently unavailable/gi),
  };
  const title = (html.match(/<title[^>]*>([^<]*)/i) || [, ""])[1].trim().slice(0, 70);
  const next = /__NEXT_DATA__/.test(html), nuxt = /__NUXT__/.test(html);
  return { jsonld, wooClass, words, title, next, nuxt };
}
function line(label, r) {
  const w = Object.entries(r.words).filter(([, n]) => n).map(([k, n]) => `${k}=${n}`).join(" ") || "no keywords";
  return `${label}: ${r.status} ${r.kb}KB | ld=${r.jsonld.join("/") || "-"} | cls=${r.wooClass.join("/") || "-"} | ${w}${r.next ? " | next-data" : ""}${r.nuxt ? " | nuxt" : ""}`;
}
async function get(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    return { ok: true, status: res.status, kb: Math.round(html.length / 1024), ms: Date.now() - t0, html, ...analyse(html) };
  } catch (e) {
    return { ok: false, status: "ERR " + (e.cause?.code || e.message), kb: 0, ms: Date.now() - t0, jsonld: [], wooClass: [], words: {}, next: false, nuxt: false };
  }
}
async function main() {
  const out = ["PROBE 1 (E2Z + Stan)"];
  out.push("-- E2Z product pages");
  for (const [d, u] of Object.entries(E2Z)) { const r = await get(u); out.push(line(d, r) + ` | ${r.ms}ms`); }
  out.push("-- E2Z shop data feed (WooCommerce)");
  try {
    const res = await fetch(WOO_API, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const txt = await res.text();
    try {
      const list = JSON.parse(txt);
      out.push(`feed ${res.status}: ${list.length} products`);
      for (const p of list.slice(0, 12)) out.push(`${(p.name || "?").slice(0, 38)} | in_stock=${p.is_in_stock} | buyable=${p.is_purchasable}`);
    } catch { out.push(`feed ${res.status}: not JSON (${txt.length} chars) ${txt.slice(0, 60).replace(/\s+/g, " ")}`); }
  } catch (e) { out.push("feed ERR " + (e.cause?.code || e.message)); }
  out.push("-- Stan Shop pages");
  let sample = null;
  for (const [d, u] of Object.entries(STAN)) { const r = await get(u); out.push(line(d, r) + ` | ${r.ms}ms`); if (r.ok && !sample) sample = r; }
  if (sample) {
    out.push("Stan title: " + sample.title);
    const m = sample.html.match(/.{0,80}(sold out|out of stock|add to cart|buy now).{0,80}/i);
    if (m) out.push("Stan context: " + m[0].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
  }
  const text = out.join("\n");
  console.log(text);
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (BOT_TOKEN && CHAT_ID) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: text.slice(0, 4000) }) });
      console.log("telegram:", r.status);
    } catch (e) { console.log("telegram failed:", e.message); }
  } else console.log("no BOT_TOKEN/CHAT_ID found in .env");
}
if (process.argv[1] && process.argv[1].endsWith("probe1.mjs")) main().then(() => process.exit());
