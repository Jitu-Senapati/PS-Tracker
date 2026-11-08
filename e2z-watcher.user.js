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
    // Optional extra chats (friends) that should also get the stock alerts. Asked once.
    if (token && chat && GM_getValue("extra_set_v2", "") !== "1") {
      const x = prompt("Extra Telegram chat ids that should also get STOCK ALERTS (friends), separated by commas, no spaces. Leave empty for none.", GM_getValue("extra_chats", "") || "");
      if (x !== null) { // pressing Cancel keeps what was saved and asks again on the next page load
        GM_setValue("extra_chats", (x || "").trim());
        GM_setValue("extra_set_v2", "1");
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
