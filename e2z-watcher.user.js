// ==UserScript==
// @name         E2Z PSN India watcher
// @namespace    ps-tracker
// @version      1.5
// @description  Reloads the E2Z PSN India page and sends a Telegram message when products appear. Read-only: never logs in, never buys.
// @match        https://e2zstore.com/category/psn-india/*
// @match        https://www.e2zstore.com/category/psn-india/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      api.telegram.org
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const PLATFORM = "E2Z Store";
  const WANT = [1000, 2000, 3000, 4000, 5000]; // only these amounts are reported
  const CHECK_EVERY_MS = 60 * 1000;        // reload about every minute
  const JITTER_MS = 20 * 1000;             // plus 0-20 seconds random
  const SETTLE_MS = 6 * 1000;              // wait for the page to finish drawing before checking
  const HEARTBEAT_MS = 6 * 60 * 60 * 1000; // "I'm alive" message every 6 hours
  const RESET_AFTER = 2;                   // window closes after 2 checks in a row with no stock

  // ---- Notification rules (same in every watcher) ----
  // One "window" per platform. It opens on the first stock, alerts at once, then:
  //  - a NEW amount appearing inside the window alerts at once (the 20-minute timer is NOT reset),
  //  - otherwise a reminder goes out every 20 minutes counted from the window's first alert,
  //  - the window closes after the platform has had no stock for `resetAfter` checks in a row.
  const REMIND_MS = 20 * 60 * 1000;
  function decide(st, avail, anyUnknown, now, resetAfter) {
    st.win ??= 0; st.known ??= []; st.next ??= 0; st.empty ??= 0;
    if (avail.length === 0) {
      if (!anyUnknown) { st.empty++; if (st.empty >= resetAfter) { st.win = 0; st.known = []; st.next = 0; } }
      return false;
    }
    st.empty = 0;
    if (!st.win) { st.win = now; st.next = now + REMIND_MS; st.known = [...avail]; return true; }
    let notify = false;
    if (avail.some((a) => !st.known.includes(a))) { notify = true; st.known = [...new Set([...st.known, ...avail])]; }
    if (now >= st.next) { notify = true; while (st.next <= now) st.next += REMIND_MS; }
    return notify;
  }
  const amtText = (a) => (a === 0 ? "check the page" : "₹" + a);
  const availLine = (avail) => "Available: " + [...avail].sort((x, y) => x - y).map(amtText).join(" ");
  // ---- end of notification rules ----

  // Your Telegram details are asked once and saved inside Violentmonkey on this phone only.
  function getCreds() {
    let token = GM_getValue("bot_token", "");
    let chat = GM_getValue("chat_id", "");
    if (!token) {
      token = (prompt("Paste your Telegram BOT_TOKEN, then press OK") || "").trim();
      if (token) GM_setValue("bot_token", token);
    }
    if (token && !chat) {
      chat = (prompt("Paste your Telegram CHAT_ID, then press OK") || "").trim();
      if (chat) GM_setValue("chat_id", chat);
    }
    // Friends' chat ids: they get the stock alerts too. Asked once (the question comes back on the next page load if you press Cancel).
    if (token && chat && GM_getValue("extra_set_v3", "") !== "1") {
      const x = prompt("Type your FRIENDS' Telegram chat ids here (not your own), separated by commas, no spaces. They will get the stock alerts. Do not leave this empty if you want them to get E2Z alerts.", GM_getValue("extra_chats", "") || "");
      if (x !== null) {
        const v = (x || "").trim();
        if (v || confirm("Nothing typed: your friends will NOT get E2Z alerts. Press OK to keep it that way, or Cancel to be asked again.")) {
          GM_setValue("extra_chats", v);
          GM_setValue("extra_set_v3", "1");
        }
      }
    }
    return { token, chat };
  }

  // Stock alerts (they start with the green circle) go to you and the extra chats; status messages go to you only.
  function send(text) {
    const { token, chat } = getCreds();
    if (!token || !chat) return;
    const owner = chat.split(",")[0].trim();
    const extra = (GM_getValue("extra_chats", "") || "").split(",").map((c) => c.trim()).filter(Boolean);
    const targets = text.startsWith("🟢") ? Array.from(new Set([owner, ...extra])) : [owner];
    targets.forEach((c) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: "https://api.telegram.org/bot" + token + "/sendMessage",
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ chat_id: c, text: text.slice(0, 4000) }),
      });
    });
  }

  const amountOf = (name, price) => {
    const m = (name || "").match(/Rs\.?\s*([\d,]+)/i) || (price || "").match(/([\d,]+)(?:\.\d+)?/);
    return m ? Number(m[1].replace(/,/g, "")) : 0;
  };

  // Find products on the page that are NOT marked out of stock, keyed by link.
  function scan() {
    const found = new Map();
    const boxes = document.querySelectorAll("li.product, div.product, .product-small, .products .product");
    boxes.forEach((b) => {
      const txt = (b.innerText || "").toLowerCase();
      if (txt.includes("out of stock") || txt.includes("sold out")) return;
      const a = b.querySelector("a[href*='/product/']") || b.querySelector("a[href]");
      const link = a ? a.href : location.href;
      const nameEl = b.querySelector(".woocommerce-loop-product__title, .product-title, .name, h2, h3");
      const name = ((nameEl ? nameEl.innerText : a ? a.innerText : "") || "").trim().slice(0, 80) || "Product";
      const priceEl = b.querySelector(".price");
      const price = priceEl ? priceEl.innerText.replace(/\s+/g, " ").trim() : "";
      const amt = amountOf(name, price);
      if (WANT.includes(amt)) found.set(link, { amt, name, link });
    });
    // Backup signal: a buy-type button exists even if the product boxes were not recognised.
    if (found.size === 0 && boxes.length === 0) {
      const btn = Array.from(document.querySelectorAll("a, button")).find((el) =>
        /^(add to cart|buy now|select options)/i.test((el.innerText || el.value || "").trim())
      );
      if (btn) found.set(location.href, { amt: 0, name: "A buy button appeared on the page", link: location.href });
    }
    return found;
  }

  function main() {
    const { token, chat } = getCreds();
    if (!token || !chat) return; // no details yet: do nothing, do not keep reloading
    const extraNow = (GM_getValue("extra_chats", "") || "").split(",").map((c) => c.trim()).filter(Boolean);
    if (GM_getValue("extra_notified", "") !== "n:" + extraNow.join(",")) { // tells you (only you) how many friends are saved
      send("✅ E2Z watcher updated (v1.5). Friends who will get the stock alerts: " + extraNow.length);
      GM_setValue("extra_notified", "n:" + extraNow.join(","));
    }

    const now = Date.now();
    setTimeout(() => location.reload(), CHECK_EVERY_MS + Math.random() * JITTER_MS);

    // Cloudflare "Just a moment" screen
    if (/just a moment/i.test(document.title)) {
      const n = (GM_getValue("blocked", 0) || 0) + 1;
      GM_setValue("blocked", n);
      if (n === 5) send("⚠️ " + PLATFORM + ": stuck on the 'Just a moment' check 5 times in a row. Open Firefox and look at the screen.");
      return;
    }
    GM_setValue("blocked", 0);

    setTimeout(() => {
      const items = scan();
      const avail = Array.from(new Set(Array.from(items.values()).map((i) => i.amt))).sort((x, y) => x - y);
      let st = {};
      try { st = JSON.parse(GM_getValue("win_state", "{}")); } catch (e) { st = {}; }
      if (decide(st, avail, false, now, RESET_AFTER)) {
        const lines = Array.from(items.values()).sort((x, y) => x.amt - y.amt).map((i) => (i.amt ? "₹" + i.amt : i.name) + " " + i.link);
        send("🟢 " + PLATFORM + ": in stock now\n" + availLine(avail) + "\n" + lines.join("\n"));
      }
      GM_setValue("win_state", JSON.stringify(st));

      if (now - GM_getValue("last_beat", 0) > HEARTBEAT_MS) {
        send("✅ E2Z watcher is running. " + (avail.length ? availLine(avail) : "Nothing in stock right now."));
        GM_setValue("last_beat", now);
      }
    }, SETTLE_MS);
  }

  main();
})();
