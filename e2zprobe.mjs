// e2zprobe.mjs - READ-ONLY. Tries a few polite, browser-like ways to read ONE E2Z page. Never logs in, never buys.
const URL1 = "https://e2zstore.com/product/rs-1000-playstation-network-wallet-top-up/";
const FEED = "https://e2zstore.com/wp-json/wc/store/v1/products?search=playstation&per_page=30";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const HEADERS = {
  "user-agent": UA,
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-IN,en;q=0.9",
  "upgrade-insecure-requests": "1",
};
async function tryOne(label, url, headers) {
  try {
    const t = Date.now();
    const r = await fetch(url, { headers, redirect: "follow" });
    const body = await r.text();
    const title = (body.match(/<title>([^<]*)<\/title>/i) || [])[1] || "-";
    const low = body.toLowerCase();
    const flags = ["add to cart", "buy now", "out of stock", "instock", "outofstock", "just a moment"].filter(k => low.includes(k));
    return `${label}: ${r.status} ${Math.round(body.length / 1024)}KB | title=${title.slice(0, 40)} | found=${flags.join(",") || "none"} | ${Date.now() - t}ms`;
  } catch (e) { return `${label}: ERROR ${e.message}`; }
}
const out = ["E2Z PROBE"];
out.push(await tryOne("A page + browser headers", URL1, HEADERS));
out.push(await tryOne("B page + headers + referer", URL1, { ...HEADERS, referer: "https://e2zstore.com/" }));
out.push(await tryOne("C feed + headers", FEED, { ...HEADERS, accept: "application/json" }));
out.push(await tryOne("D homepage + headers", "https://e2zstore.com/", HEADERS));
const text = out.join("\n");
console.log(text);
const T = process.env.BOT_TOKEN, C = process.env.CHAT_ID;
if (T && C) {
  const r = await fetch(`https://api.telegram.org/bot${T}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: C, text }) });
  console.log("telegram:", r.status);
}
