// amazonprobe.mjs - READ-ONLY. Looks at the Amazon.in PlayStation search page. Never logs in, never buys.
// Run:  node --env-file=.env amazonprobe.mjs
import crypto from "node:crypto";
const URL_ = "https://www.amazon.in/s?k=Sony+PlayStation+Store+Gift+Card&i=videogames&rh=n%3A976460031%2Cp_n_availability%3A1318485031%2Cp_123%3A10806812&dc&ds=v1%3AOULhepWC0Z8i%2BOQIPyiH%2F3iAlg4mgH49lstMYHBGVIA&crid=2TQ370Q31W3KV&qid=1793281741&rnid=215263484031&sprefix=sony+playstation+store+gift+card%2Cvideogames%2C327&ref=sr_nr_p_country_of_origin-bin_1";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const WANT = [1000, 2000, 3000, 4000, 5000];

export function readCards(html) {
  const marker = 'data-component-type="s-search-result"';
  const idxs = []; let i = -1;
  while ((i = html.indexOf(marker, i + 1)) !== -1) idxs.push(i);
  const cards = [];
  idxs.forEach((pos, n) => {
    const start = html.lastIndexOf("<div", pos);
    const tagEnd = html.indexOf(">", pos);
    const tag = html.slice(start, tagEnd + 1);
    const asin = (tag.match(/data-asin="([A-Z0-9]{10})"/) || [])[1] || "?";
    const chunk = html.slice(start, idxs[n + 1] ?? html.length);
    const text = chunk.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&#8377;|&#x20b9;/gi, "₹").replace(/\s+/g, " ").trim();
    const amt = Number(((text.match(/Rs\.?\s*([\d,]+)/i) || [])[1] || "0").replace(/,/g, ""));
    const price = (text.match(/₹\s*([\d,]+)/) || [])[1] || "-";
    cards.push({ asin, amt, unavailable: /currently unavailable/i.test(text), price, text });
  });
  return cards;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = ["AMAZON PROBE"];
  try {
    const r = await fetch(URL_, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
    const h = await r.text();
    out.push(`status ${r.status} | ${h.length} chars | hash ${crypto.createHash("md5").update(h).digest("hex").slice(0, 6)}`);
    const captcha = /enter the characters you see|api-services-support@amazon|not a robot|captcha/i.test(h);
    out.push("captcha/robot page: " + captcha);
    const cards = readCards(h);
    out.push("result cards found: " + cards.length);
    for (const c of cards.filter((c) => WANT.includes(c.amt))) out.push(`${c.amt}: ${c.asin} | ${c.unavailable ? "UNAVAILABLE" : "no 'unavailable' text"} | price ${c.price}`);
    const other = cards.filter((c) => !WANT.includes(c.amt)).length;
    out.push("other cards (ignored): " + other);
    const first = cards.find((c) => WANT.includes(c.amt));
    if (first) out.push("sample: " + first.text.slice(0, 220));
  } catch (e) { out.push("ERROR " + e.message); }
  const msg = out.join("\n");
  console.log(msg);
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (BOT_TOKEN && CHAT_ID) {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
    console.log("telegram:", r.status);
  }
}
