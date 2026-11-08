// woohooprobe2.mjs - READ-ONLY. Finds where the Woohoo page gets its amounts from. Never logs in, never buys.
// Run:  node --env-file=.env woohooprobe2.mjs
const URL_ = "https://www.woohoo.in/playstation-e-gift-instant-voucher";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const H = { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "*/*" };
const short = (s, n) => (s.length > n ? s.slice(0, n) + "…" : s);
const out = ["WOOHOO PROBE 2"];
try {
  const r = await fetch(URL_, { headers: { ...H, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
  const h = await r.text();
  out.push(`page ${r.status} ${Math.round(h.length / 1024)}KB`);
  const ld = [...h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].replace(/\s+/g, " "));
  ld.forEach((x, i) => out.push(`json-ld ${i + 1}: ${short(x, 380)}`));
  const srcs = [...new Set([...h.matchAll(/<script[^>]+src="([^"]+)"/gi)].map((m) => new URL(m[1], URL_).href))];
  const preload = [...new Set([...h.matchAll(/(?:href|src)="([^"]+\.js[^"]*)"/gi)].map((m) => new URL(m[1], URL_).href))];
  const files = [...new Set([...srcs, ...preload])].filter((u) => !/google|gtag|facebook|clarity|hotjar/i.test(u)).slice(0, 8);
  out.push("script files: " + files.length);
  for (const f of files) {
    try {
      const rr = await fetch(f, { headers: H, signal: AbortSignal.timeout(40000) });
      const js = await rr.text();
      const hosts = [...new Set([...js.matchAll(/https?:\/\/[A-Za-z0-9.\-]+\.(?:woohoo\.in|qwikcilver\.com|woohoo\.com)[A-Za-z0-9_\-\/\.]{0,50}/g)].map((m) => m[0]))].slice(0, 5);
      const rel = [...new Set([...js.matchAll(/["'`](\/(?:api|rest|graphql|v\d)\/[A-Za-z0-9_\-\/\.{}$]{2,60})["'`]/g)].map((m) => m[1]))].slice(0, 6);
      const hits = ["product not found", "denomination", "url_key", "getProduct", "productBy"].map((k) => `${k}=${js.toLowerCase().split(k.toLowerCase()).length - 1}`).join(" ");
      out.push(`- ${new URL(f).pathname.split("/").pop().slice(0, 30)} ${Math.round(js.length / 1024)}KB | ${hits}`);
      if (hosts.length) out.push("    hosts: " + hosts.join(" "));
      if (rel.length) out.push("    paths: " + rel.join(" "));
    } catch (e) { out.push("- " + short(f, 50) + " ERROR " + e.message); }
  }
} catch (e) { out.push("ERROR " + e.message); }
const msg = out.join("\n");
console.log(msg);
const { BOT_TOKEN, CHAT_ID } = process.env;
if (BOT_TOKEN && CHAT_ID) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
  console.log("telegram:", r.status);
}
