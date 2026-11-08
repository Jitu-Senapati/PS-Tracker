// woohooprobe3.mjs - READ-ONLY. Shows the full Woohoo product data block and where the amounts appear. Never logs in, never buys.
// Run:  node --env-file=.env woohooprobe3.mjs
const URL_ = "https://www.woohoo.in/playstation-e-gift-instant-voucher";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const short = (s, n) => (s.length > n ? s.slice(0, n) + "…" : s);
const out = ["WOOHOO PROBE 3"];
try {
  const r = await fetch(URL_, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
  const h = await r.text();
  out.push(`page ${r.status} ${Math.round(h.length / 1024)}KB`);
  const blocks = [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const prod = blocks.find((b) => /"Product"/.test(b));
  if (prod) {
    let s = prod;
    try { s = JSON.stringify(JSON.parse(prod)); } catch {}
    out.push("PRODUCT DATA: " + short(s.replace(/"https?:\/\/[^"]+"/g, (u) => (u.length > 60 ? '"URL"' : u)), 1700));
  } else out.push("no Product json-ld");
  const globals = [...new Set([...h.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=\s*/g)].map((m) => m[1]))].slice(0, 10);
  out.push("window globals: " + (globals.join(", ") || "none"));
  const ctx = [...h.matchAll(/.{0,70}\b[45]000\b.{0,50}/g)].map((m) => m[0].replace(/\s+/g, " "));
  out.push("places with 4000 or 5000: " + ctx.length);
  ctx.slice(0, 5).forEach((c) => out.push("  " + c));
} catch (e) { out.push("ERROR " + e.message); }
const msg = out.join("\n");
console.log(msg);
const { BOT_TOKEN, CHAT_ID } = process.env;
if (BOT_TOKEN && CHAT_ID) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
  console.log("telegram:", r.status);
}
