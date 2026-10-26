/* cc-welcome-window.js - Welcome Window roster from Firebase presence. 2026-10-26.
 * Reads the same Firebase presence node as cc-presence.js.
 * Project: cybercrowd-radio
 * Database URL: https://cybercrowdradio-default-rtdb.firebaseio.com/
 * Presence node: presence
 * Counts children within 90 seconds, refreshes every 30 seconds.
 * Renders one line per online visitor, from presence data only.
 * No fake names. No invented stage names. Never fakes a roster.
 * The public count stays number only.
 * This window is separate from Booth Chat, the EQ box, and the listening now line.
 * It contains no owner buttons and changes no owner buttons.
 */
(function () {
  "use strict";
  var DATABASE_URL = "https://cybercrowdradio-default-rtdb.firebaseio.com/";
  var PROJECT_ID = "cybercrowd-radio";
  var PRESENCE_NODE = "presence";
  var ONLINE_WINDOW_MS = 90000;
  var REFRESH_MS = 30000;
  var presenceRef = null;
  var initialized = false;
  var retries = 0;
  function getCountEl() { return document.getElementById("welcomeOnlineCount"); }
  function getRosterEl() { return document.getElementById("welcomeRoster"); }
  function setRosterLine(text) {
    var roster = getRosterEl();
    if (!roster) return;
    roster.textContent = "";
    var li = document.createElement("li");
    li.textContent = text;
    roster.appendChild(li);
  }
  function showCountOnly() { setRosterLine("Count only, no roster yet"); }
  function displayName(val) {
    var name = (val && val.stageName) || "";
    if (typeof name !== "string") name = String(name);
    name = name.trim();
    if (!name || name.toLowerCase() === "guest") return "Guest";
    return name;
  }
  function accountLabel(val) {
    var has = val ? val.hasAccount : undefined;
    if (has === 1 || has === "1" || has === true) return "Account yes";
    if (has === 0 || has === "0" || has === false) return "Account no - Bypass";
    return "";
  }
  function render(data) {
    var countEl = getCountEl();
    var roster = getRosterEl();
    if (!roster) return;
    var cutoff = Date.now() - ONLINE_WINDOW_MS;
    var visitors = [];
    if (data) {
      Object.keys(data).forEach(function (key) {
        var val = data[key];
        if (!val || typeof val !== "object") return;
        var t = val.t;
        if (typeof t === "string") t = Number(t);
        if (typeof t === "number" && !isNaN(t) && t <= cutoff) return;
        visitors.push(val);
      });
    }
    visitors.sort(function (a, b) {
      return displayName(a).toLowerCase().localeCompare(displayName(b).toLowerCase());
    });
    if (countEl) countEl.textContent = String(visitors.length);
    roster.textContent = "";
    if (!visitors.length) { setRosterLine("No one online yet"); return; }
    visitors.forEach(function (val) {
      var li = document.createElement("li");
      var label = accountLabel(val);
      li.textContent = label ? displayName(val) + " - " + label : displayName(val);
      roster.appendChild(li);
    });
  }
  function refresh() {
    if (!presenceRef) return;
    try { presenceRef.once("value", function (snap) { render(snap.val()); }); } catch (e) {}
  }
  function init() {
    if (initialized) return;
    if (typeof firebase === "undefined") {
      showCountOnly();
      if (retries < 10) { retries++; setTimeout(init, 1000); }
      return;
    }
    var cfg = (window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig) || window.CC_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) { showCountOnly(); return; }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      var db = firebase.database();
      presenceRef = db.ref(PRESENCE_NODE);
    } catch (e) { showCountOnly(); return; }
    presenceRef.on("value", function (snap) { render(snap.val()); });
    setInterval(refresh, REFRESH_MS);
    initialized = true;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 1000);
  }
  window.CCWelcomeWindow = { init: init, refresh: refresh, render: render };
})();
