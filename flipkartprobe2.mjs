// flipkartprobe2.mjs - READ-ONLY. Looks inside the Flipkart search page data to find each listing's stock state.
// Never logs in, never buys.  Run:  node --env-file=.env flipkartprobe2.mjs
const URL_ = "https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

export function extractState(html) {
  const i = html.indexOf("__INITIAL_STATE__");
  if (i < 0) return null;
  const start = html.indexOf("{", i);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let k = start; k < html.length; k++) {
    const c = html[k];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return html.slice(start, k + 1); }
  }
  return null;
}
export function walk(o, path, cb, depth = 0) {
  if (depth > 40 || o === null || typeof o !== "object") return;
  cb(o, path);
  if (Array.isArray(o)) o.forEach((v, i) => walk(v, path + "[" + i + "]", cb, depth + 1));
  else for (const k in o) walk(o[k], path + "." + k, cb, depth + 1);
}
const short = (v, n) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > n ? s.slice(0, n) + "…" : s; };

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = ["FLIPKART PROBE 2"];
  try {
    const r = await fetch(URL_, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.flipkart.com/" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
    const h = await r.text();
    out.push(`status ${r.status} | ${h.length} chars`);
    const raw = extractState(h);
    out.push("state json: " + (raw ? raw.length + " chars" : "NOT FOUND"));
    if (raw) {
      let st = null;
      try { st = JSON.parse(raw); } catch (e) { out.push("parse error: " + e.message.slice(0, 80)); }
      if (st) {
        out.push("top keys: " + Object.keys(st).slice(0, 12).join(","));
        const avStates = new Map(); const prods = [];
        walk(st, "$", (o, p) => {
          if ("availability" in o) {
            const k = short(o.availability, 160);
            avStates.set(k, (avStates.get(k) || 0) + 1);
            if (("titles" in o) || ("title" in o) || ("productId" in o) || ("itemId" in o)) prods.push({ o, p });
          }
        });
        out.push("objects with availability: " + [...avStates.values()].reduce((a, b) => a + b, 0) + " | with title/id: " + prods.length);
        out.push("availability values seen:");
        [...avStates.entries()].slice(0, 6).forEach(([k, n]) => out.push(`  x${n} ${k}`));
        if (prods[0]) {
          out.push("first listing path: " + prods[0].p.slice(0, 120));
          out.push("its keys: " + Object.keys(prods[0].o).slice(0, 20).join(","));
          prods.slice(0, 4).forEach((x, i) => out.push(`#${i + 1} ` + short({ t: x.o.titles || x.o.title, a: x.o.availability, pr: x.o.pricing || x.o.price }, 330)));
        }
      }
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
