// flipkartprobe.mjs - READ-ONLY. Looks at the Flipkart search page. Never logs in, never buys.
// Run:  node --env-file=.env flipkartprobe.mjs
const URL_ = "https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&#8377;|&#x20b9;/gi, "₹").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function listCards(html) {
  const re = /href="(\/[^"#?]*\/p\/(itm[a-z0-9]+)[^"]*)"/gi;
  const hits = []; let m;
  while ((m = re.exec(html))) hits.push({ pid: m[2], href: m[1], pos: m.index });
  const seen = new Set(); const cards = [];
  hits.forEach((h, i) => {
    if (seen.has(h.pid)) return; seen.add(h.pid);
    const end = Math.min(hits.slice(i + 1).find((x) => x.pid !== h.pid)?.pos ?? h.pos + 1500, h.pos + 1500);
    cards.push({ pid: h.pid, href: h.href, text: strip(html.slice(html.indexOf(">", h.pos) + 1, end)) });
  });
  return cards;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = ["FLIPKART PROBE"];
  try {
    const r = await fetch(URL_, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.flipkart.com/" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
    const h = await r.text();
    out.push(`status ${r.status} | ${h.length} chars | url ${new URL(r.url).pathname}`);
    out.push("robot/captcha words: " + /recaptcha|are you a human|unusual traffic|captcha|access denied/i.test(h));
    const low = h.toLowerCase();
    out.push("words: " + ["sold out", "currently unavailable", "out of stock", "notify me", "add to cart", "coming soon"].map((k) => `${k}=${low.split(k).length - 1}`).join(" "));
    out.push("initial-state=" + /__INITIAL_STATE__/.test(h));
    const av = [...h.matchAll(/"(?:availability|stockStatus|inStock|available)"\s*:\s*"?([A-Za-z_]+)"?/g)].map((m) => m[1]);
    out.push("stock fields: " + av.length + (av.length ? " e.g. " + [...new Set(av)].slice(0, 5).join(",") : ""));
    const cards = listCards(h);
    out.push("listing links found: " + cards.length);
    cards.slice(0, 12).forEach((c, i) => out.push(`${i + 1}) ${c.text.slice(0, 170)}`));
  } catch (e) { out.push("ERROR " + e.message); }
  const msg = out.join("\n");
  console.log(msg);
  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (BOT_TOKEN && CHAT_ID) {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: msg.slice(0, 4000) }) });
    console.log("telegram:", r.status);
  }
}
