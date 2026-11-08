// ==UserScript==
// @name         E2Z PSN India watcher
// @namespace    ps-tracker
// @version      1.4
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
