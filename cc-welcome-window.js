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
  function getRosterEl() { return document.getElementById("ccWelcomeRoster"); }
  // Roster element is ccWelcomeRoster in station.html.
  function setRosterLine(text) {
    var roster = getRosterEl();
    if (!roster) return;
    roster.textContent = "";
//
//
//
if (roster.lastChild) roster.scrollTop = roster.scrollHeight;
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
    visitors.sort(function (a, b) {
      return displayName(a).toLowerCase().localeCompare(displayName(b).toLowerCase());
    });
    var i; var visitors = [];
    for (i = roster.children.length - 1; i >= 0; i--) { if (!current[roster.children[i].getAttribute("data-key")]) roster.removeChild(roster.children[i]); }
for (i = 0; i < roster.children.length; i++) { var k = roster.children[i].getAttribute("data-key"); if (current[k]) roster.children[i].textContent = current[k]; }
order.forEach(function (key) { if (seenKeys[key]) return; seenKeys[key] = true; var li = document.createElement("li"); li.setAttribute("data-key", key); li.textContent = current[key]; li.className = "cc-welcome-new"; roster.appendChild(li); });
Object.keys(seenKeys).forEach(function (k) { if (!current[k]) delete seenKeys[k]; });
if (roster.lastChild) roster.scrollTop = roster.scrollHeight;
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
