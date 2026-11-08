// flipkartprobe4.mjs - READ-ONLY. Lists EVERY listing in the Flipkart search data and shows how each one is stored.
// Never logs in, never buys.  Run:  node --env-file=.env flipkartprobe4.mjs
import { extractState } from "./flipkartprobe2.mjs";
const URL_ = "https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const short = (v, n) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > n ? s.slice(0, n) + "…" : s; };
const findStr = (o, re, d = 0) => { if (d > 12 || o == null) return null; if (typeof o === "string") return re.test(o) ? o : null; if (typeof o !== "object") return null; for (const k in o) { const r = findStr(o[k], re, d + 1); if (r) return r; } return null; };

// every object that has action.params.productId is one listing
export function listingItems(root) {
  const out = [];
  const rec = (o, path, d) => {
    if (d > 40 || o == null || typeof o !== "object") return;
    const pid = o.action && o.action.params && o.action.params.productId;
    if (typeof pid === "string" && pid) { out.push({ pid, o, path }); return; }
    if (Array.isArray(o)) o.forEach((x, i) => rec(x, path + "[" + i + "]", d + 1));
    else for (const k in o) rec(o[k], path + "." + k, d + 1);
  };
  rec(root, "$", 0);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = ["FLIPKART PROBE 4"];
  try {
    const r = await fetch(URL_, { headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9", Accept: "text/html,application/xhtml+xml", Referer: "https://www.flipkart.com/" }, redirect: "follow", signal: AbortSignal.timeout(40000) });
    const h = await r.text();
    const raw = extractState(h);
    out.push(`status ${r.status} | html ${h.length} | json ${raw ? raw.length : "none"}`);
    if (raw) {
      const items = listingItems(JSON.parse(raw));
      const uniq = new Map(); items.forEach((x) => { if (!uniq.has(x.pid)) uniq.set(x.pid, x); });
      out.push(`listing objects: ${items.length} | unique products: ${uniq.size}`);
      let odd = null; let n = 0;
      for (const x of uniq.values()) {
        n++;
        const b = x.o.value && x.o.value.buyability;
        const title = (x.o.value && x.o.value.titles && x.o.value.titles.title) || findStr(x.o, /rs\.?\s*\d|\d\s*inr|gift card/i) || "?";
        const label = b ? (b.message || "(no message)") : (findStr(x.o, /^(coming soon|currently unavailable|sold out|out of stock|notify me)$/i) || "no label");
        const where = x.path.replace("$.multiWidgetState.widgetsData.", "").replace(/\.slotData\.widget\.data/, "").slice(0, 34);
        out.push(`${n}) ${b ? "B" : "-"} ${short(label, 22)} | ${short(title, 38)} | ${where}`);
        if (!b && !odd) odd = x;
      }
      if (odd) out.push("sample without buyability: " + short(odd.o, 700));
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
