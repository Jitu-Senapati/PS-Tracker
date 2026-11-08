// woohooprobe.mjs - READ-ONLY. Looks at the Woohoo PlayStation page. Never logs in, never buys.
// Run:  node --env-file=.env woohooprobe.mjs
const URL_ = "https://www.woohoo.in/playstation-e-gift-instant-voucher";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&#8377;|&#x20b9;/gi, "₹").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const out = ["WOOHOO PROBE"];
try {
  const r = await fetch(URL_, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
  const h = await r.text();
  out.push(`status ${r.status} | ${Math.round(h.length / 1024)}KB | final ${new URL(r.url).pathname}`);
  out.push("title: " + ((h.match(/<title>([^<]*)<\/title>/i) || [])[1] || "-").slice(0, 80));
  const text = strip(h);
  out.push("visible text start: " + text.slice(0, 200));
  out.push("words: " + ["product not found", "not found", "out of stock", "currently unavailable", "checkout", "buy now", "add to cart", "select your amount", "amount"].map((k) => `${k}=${text.toLowerCase().split(k).length - 1}`).join(" "));
  out.push("amounts in visible text: " + ([...new Set((text.match(/₹\s?[\d,]{4,6}/g) || []))].slice(0, 12).join(" ") || "none"));
  out.push("next-data=" + /__NEXT_DATA__/.test(h) + " | json-ld=" + (h.match(/application\/ld\+json/g) || []).length + " | scripts=" + (h.match(/<script/g) || []).length);
  const keys = [...h.matchAll(/.{0,40}"(?:[a-zA-Z_]*(?:denomination|availab|inStock|outOfStock|stock|minPrice|maxPrice|amounts?)[a-zA-Z_]*)"\s*:\s*[^,}]{0,50}/gi)].map((m) => m[0].replace(/\s+/g, " "));
  out.push("stock/amount fields in page: " + keys.length);
  [...new Set(keys)].slice(0, 8).forEach((k) => out.push("  " + k));
  const apis = [...new Set([...h.matchAll(/https?:\/\/[a-z0-9.\-]*(?:api|rest|graphql|gateway)[a-z0-9.\-]*\/[^"'\s\\<>]{0,60}/gi)].map((m) => m[0]))].slice(0, 6);
  out.push("api-looking addresses: " + (apis.length ? "" : "none"));
  apis.forEach((a) => out.push("  " + a));
} catch (e) { out.push("ERROR " + e.message); }
const msg = out.join("\n");
console.log(msg);
const { BOT_TOKEN, CHAT_ID } = process.env;
if (BOT_TOKEN && CHAT_ID) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
  console.log("telegram:", r.status);
}
