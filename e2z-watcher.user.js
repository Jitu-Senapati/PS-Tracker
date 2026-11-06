// ==UserScript==
// @name         E2Z PSN India watcher
// @namespace    ps-tracker
// @version      1.0
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

  const CHECK_EVERY_MS = 60 * 1000;       // reload about every minute
  const JITTER_MS = 20 * 1000;            // plus 0-20 seconds random, so it is not robotic
  const SETTLE_MS = 6 * 1000;             // wait for the page to finish drawing before checking
  const REMIND_MS = 20 * 60 * 1000;       // while still in stock, remind every 20 minutes
  const HEARTBEAT_MS = 6 * 60 * 60 * 1000; // "I'm alive" message every 6 hours

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
    return { token, chat };
  }

  function send(text) {
    const { token, chat } = getCreds();
    if (!token || !chat) return;
    GM_xmlhttpRequest({
      method: "POST",
      url: "https://api.telegram.org/bot" + token + "/sendMessage",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000) }),
    });
  }

  // Find products on the page that are NOT marked out of stock.
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
      found.set(link, { name, price, link });
    });
    // Backup signal: a buy-type button exists even if the product boxes were not recognised.
    if (found.size === 0) {
      const btn = Array.from(document.querySelectorAll("a, button")).find((el) =>
        /^(add to cart|buy now|select options)/i.test((el.innerText || el.value || "").trim())
      );
      if (btn) found.set(location.href, { name: "A buy button appeared on the page", price: "", link: location.href });
    }
    return found;
  }

  function main() {
    const { token, chat } = getCreds();
    if (!token || !chat) return; // no details yet: do nothing, do not keep reloading

    const now = Date.now();
    setTimeout(() => location.reload(), CHECK_EVERY_MS + Math.random() * JITTER_MS);

    // Cloudflare "Just a moment" screen
    if (/just a moment/i.test(document.title)) {
      const n = (GM_getValue("blocked", 0) || 0) + 1;
      GM_setValue("blocked", n);
      if (n === 5) send("⚠️ E2Z watcher: stuck on the 'Just a moment' check for 5 tries in a row. Open Firefox and look at the screen.");
      return;
    }
    GM_setValue("blocked", 0);

    setTimeout(() => {
      const items = scan();
      const prev = JSON.parse(GM_getValue("last_links", "[]"));
      const fresh = Array.from(items.values()).filter((i) => !prev.includes(i.link));
      const lastAlert = GM_getValue("last_alert", 0);

      if (items.size > 0 && (fresh.length > 0 || now - lastAlert > REMIND_MS)) {
        const lines = Array.from(items.values()).map((i) => "• " + i.name + (i.price ? " " + i.price : "") + "\n" + i.link);
        send("🟢 E2Z PSN India: in stock now!\n\n" + lines.join("\n\n"));
        GM_setValue("last_alert", now);
      }
      GM_setValue("last_links", JSON.stringify(Array.from(items.keys())));

      if (now - GM_getValue("last_beat", 0) > HEARTBEAT_MS) {
        send("✅ E2Z watcher is running. " + (items.size ? items.size + " item(s) in stock." : "Nothing in stock right now."));
        GM_setValue("last_beat", now);
      }
    }, SETTLE_MS);
  }

  main();
})();
