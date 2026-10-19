/* CCSpamBlock — chat spam and bot protection.
 * James 2026-10-19: "Yes.. as long as it dont eat ourself"
 *
 * DOES: rate-limit, block obvious bots, filter spam patterns.
 * DOES NOT: block James, block based on single words, eat legitimate users.
 *
 * Rules:
 * 1. James (handle "cybercrowd" case-insensitive, or founder) is NEVER blocked.
 * 2. Rate limit: max 5 messages per 10 seconds. Bots are fast, humans aren't.
 * 3. Spam patterns: repeated identical messages, excessive links, excessive caps.
 * 4. No single-word bans — context matters.
 * 5. First offense: warning. Second: 1-min timeout. Third: 5-min timeout.
 *    James can override any block.
 */

(function () {
  "use strict";

  var messageTimes = {}; // handle -> array of timestamps
  var lastMessage = {}; // handle -> {text, count}
  var timeouts = {}; // handle -> timeout until timestamp
  var warnings = {}; // handle -> warning count

  var MAX_MSG_PER_WINDOW = 5;
  var WINDOW_MS = 10000;
  var TIMEOUT_1 = 60000; // 1 min
  var TIMEOUT_2 = 300000; // 5 min

  function isJames(handle) {
    if (!handle) return false;
    // James's handle contains "cybercrowd" (case-insensitive) OR is the founder
    var h = handle.toLowerCase();
    if (h.indexOf("cybercrowd") !== -1) return true;
    try {
      var founder = localStorage.getItem("ccr-founder");
      if (founder === "1") return true;
    } catch (_) {}
    return false;
  }

  function isTimedOut(handle) {
    var until = timeouts[handle];
    if (!until) return false;
    if (Date.now() > until) {
      delete timeouts[handle];
      return false;
    }
    return true;
  }

  function checkSpam(handle, text) {
    // James is never blocked
    if (isJames(handle)) return { blocked: false };

    // Check timeout
    if (isTimedOut(handle)) {
      return { blocked: true, reason: "timeout" };
    }

    var now = Date.now();

    // Rate limit: track message times
    if (!messageTimes[handle]) messageTimes[handle] = [];
    messageTimes[handle] = messageTimes[handle].filter(function (t) {
      return now - t < WINDOW_MS;
    });
    messageTimes[handle].push(now);

    if (messageTimes[handle].length > MAX_MSG_PER_WINDOW) {
      // Too fast — likely a bot
      return applyPenalty(handle, "rate");
    }

    // Repeated identical messages (spam)
    var last = lastMessage[handle];
    if (last && last.text === text) {
      last.count++;
      if (last.count >= 3) {
        return applyPenalty(handle, "repeat");
      }
    } else {
      lastMessage[handle] = { text: text, count: 1 };
    }

    // Excessive links (more than 3 URLs)
    var links = (text.match(/https?:\/\//g) || []).length;
    if (links > 3) {
      return applyPenalty(handle, "links");
    }

    // Excessive caps (over 80% caps and longer than 20 chars)
    if (text.length > 20) {
      var caps = (text.match(/[A-Z]/g) || []).length;
      var letters = (text.match(/[A-Za-z]/g) || []).length;
      if (letters > 0 && caps / letters > 0.8) {
        return applyPenalty(handle, "caps");
      }
    }

    return { blocked: false };
  }

  function applyPenalty(handle, reason) {
    warnings[handle] = (warnings[handle] || 0) + 1;
    var w = warnings[handle];

    if (w === 1) {
      // First offense: warning only, not blocked
      return { blocked: false, warning: "Slow down — that looked like spam (" + reason + ")" };
    } else if (w === 2) {
      timeouts[handle] = Date.now() + TIMEOUT_1;
      return { blocked: true, reason: "1-minute timeout for " + reason };
    } else {
      timeouts[handle] = Date.now() + TIMEOUT_2;
      return { blocked: true, reason: "5-minute timeout for " + reason };
    }
  }

  function clearUser(handle) {
    // James can clear anyone's warnings/timeouts
    delete warnings[handle];
    delete timeouts[handle];
    delete messageTimes[handle];
    delete lastMessage[handle];
  }

  window.CCSpamBlock = {
    check: checkSpam,
    clear: clearUser,
    isJames: isJames,
  };
})();
