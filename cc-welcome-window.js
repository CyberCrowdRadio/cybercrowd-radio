/* cc-welcome-window.js - Welcome scroll roster from Firebase presence. 2026-10-26.
 * Reads the same Firebase presence node as cc-presence.js.
 * Project: cybercrowd-radio
 * Database URL: https://cybercrowdradio-default-rtdb.firebaseio.com/
 * Presence node: presence
 * Counts children within 90 seconds, refreshes every 30 seconds.
 * Renders one name-only line per online visitor, from presence data only.
 * No fake names. No invented stage names. Never fakes a roster.
 * No count, no heading, names only, in the invisible welcome scroll area.
 * This scroll area is separate from Booth Chat, the EQ box, and the listening now line.
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
var seenKeys = {};
  var retries = 0;
  function getRosterEl() { ensureWelcomeArea(); return document.getElementById("ccWelcomeRoster"); } function ensureWelcomeStyle() { if (document.getElementById("ccWelcomeStyle")) return; var s = document.createElement("style"); s.id = "ccWelcomeStyle"; s.textContent = '#ccWelcomeArea{position:absolute;top:auto;left:0;margin:0;width:360px;background:transparent;border:0;box-shadow:none;padding:0;color:#f5edd8;text-align:left;pointer-events:none;z-index:1} #ccWelcomeArea p{margin:0 0 8px;font-size:1rem;line-height:1.3;color:#f5edd8;white-space:nowrap} #ccWelcomeRoster{list-style:none;margin:0;padding:0;height:170px;overflow-y:auto;overflow-x:visible;pointer-events:auto} #ccWelcomeRoster li{margin:0 0 6px;font-size:0.9rem;line-height:1.35;overflow-wrap:normal;word-break:keep-all;white-space:nowrap} @keyframes ccWelcomeUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}} #ccWelcomeRoster li.cc-welcome-new{animation:ccWelcomeUp 0.6s ease-out} @media (max-width:860px){#ccWelcomeArea{position:static;margin:0;margin-bottom:12px;width:auto}#ccWelcomeRoster{height:auto;overflow:visible}}'; if (document.head) document.head.appendChild(s); } function ensureWelcomeArea() { ensureWelcomeStyle(); var a = document.getElementById("ccWelcomeArea"); if (a) return a; var p = document.getElementById("ccWelcomePlaceholder"); a = document.createElement("div"); a.id = "ccWelcomeArea"; a.setAttribute("aria-label", "Welcome"); var t = document.createElement("p"); t.textContent = "welcome"; var u = document.createElement("ul"); u.id = "ccWelcomeRoster"; u.setAttribute("aria-live", "polite"); a.appendChild(t); a.appendChild(u); if (p) { p.appendChild(a); } else { var r = document.querySelector(".receiver"); if (r && r.parentNode) { r.parentNode.insertBefore(a, r); } else if (document.body) { document.body.appendChild(a); } else { return null; } } return a; }
  // Roster element ccWelcomeRoster is built by this file into the ccWelcomePlaceholder in station.html. Welcome markup and CSS live here, not in station.html. StageName is the handle only; project is separate and is not shown here. Guest is kept as its own stacked category, labeled Guest, alongside stageName handles. Welcome width is sized to fit a handle of up to 33 characters; shorter handles fit too, and no length limit is set in this file.
  function setRosterLine(text) {
    var roster = getRosterEl();
    if (!roster) return;
    roster.textContent = "";
//
//
//
/* Do not scroll to the bottom: the first arrival stays at the top, under the fixed welcome line. */
    var li = document.createElement("li");
    li.textContent = text;
    roster.appendChild(li);
  }
  function showCountOnly() { }
  function displayName(val) {
    var name = (val && val.stageName) || "";
    if (typeof name !== "string") name = String(name);
    name = name.trim();
    if (!name || name.toLowerCase() === "guest") return "Guest";
    return name;
  }
  function render(data) {
    var current = {};
    var roster = getRosterEl();
    if (!roster) return;
    var cutoff = Date.now() - ONLINE_WINDOW_MS;
    var order = [];
    if (data) {
      Object.keys(data).forEach(function (key) {
        var val = data[key];
        if (!val || typeof val !== "object") return;
        var t = val.t;
        if (typeof t === "string") t = Number(t);
        if (typeof t === "number" && !isNaN(t) && t <= cutoff) return;
        current[key] = displayName(val); order.push(key);
      });
    }
    var visitors = []; visitors.sort(function (a, b) {
      return displayName(a).toLowerCase().localeCompare(displayName(b).toLowerCase());
    });
    var i; var visitors = [];
    for (i = roster.children.length - 1; i >= 0; i--) { if (!current[roster.children[i].getAttribute("data-key")]) roster.removeChild(roster.children[i]); }
for (i = 0; i < roster.children.length; i++) { var k = roster.children[i].getAttribute("data-key"); if (current[k]) roster.children[i].textContent = current[k]; roster.children[i].setAttribute("data-category", current[k] === "Guest" ? "guest" : "verified"); }
order.forEach(function (key) { if (seenKeys[key]) return; seenKeys[key] = true; var li = document.createElement("li"); li.setAttribute("data-key", key); li.setAttribute("data-category", current[key] === "Guest" ? "guest" : "verified"); li.textContent = current[key]; li.className = "cc-welcome-new"; roster.appendChild(li); });
Object.keys(seenKeys).forEach(function (k) { if (!current[k]) delete seenKeys[k]; });
/* Do not scroll to the bottom: the first arrival stays at the top, under the fixed welcome line. */
    // Empty roster stays empty: no placeholder names, only real presence names.
    visitors.forEach(function (val) {
      var li = document.createElement("li");
      li.textContent = displayName(val);
      roster.appendChild(li);
    });
  }
  function refresh() {
    if (!presenceRef) return;
    try { presenceRef.once("value", function (snap) { render(snap.val()); }); } catch (e) {}
  }
  function init() { ensureWelcomeArea();
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
