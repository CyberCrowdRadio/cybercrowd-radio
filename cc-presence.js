/* cc-presence.js — Live listener count via Firebase. 2026-10-18.
 * James: "I want to see 2 people listening now or 55,000000"
 *
 * Each listener's app writes presence/{uid} with a timestamp.
 * We count active entries for the live "X listening now" number.
 * Presence auto-cleans on disconnect via onDisconnect().remove().
 *
 * REQUIRES: Firebase Realtime Database. Config in window.STATION_CONFIG.firebaseConfig.
 *
 * DOES: count live listeners, display the number, log peaks.
 * DOES NOT: track who specifically is listening (privacy).
 * Owner roster may read these keys; public count still number only.
 */

(function () {
  "use strict";

  var db = null;
  var presenceRef = null;
  var myRef = null;
  var countEl = null;
  var initialized = false;
  var uid = null;

  function getUid() {
    try {
      var savedHandle = localStorage.getItem('ccr-handle');
      if (savedHandle) {
        window.CCAccount = window.CCAccount || {};
        window.CCAccount.stageName = savedHandle;
      }
    } catch (e) {}
    // A signed-in member is counted under his stage name;
    // a guest gets an anonymous counting id that shows nowhere.
    try {
      var h = (window.CCAccount && window.CCAccount.stageName) || null;
      if (h) return 'h_' + h.replace(/[^a-z0-9]/gi, '').toLowerCase();
    } catch (e) {}
    // Fallback: random ID persisted in localStorage
    try {
      var id = localStorage.getItem('cc-presence-uid');
      if (!id) {
        id = 'u_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cc-presence-uid', id);
      }
      return id;
    } catch (e) {
      return 'u_' + Math.random().toString(36).substr(2, 9);
    }
  }

  function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return '' + n;
  }

  function updateDisplay(count) {
    if (!countEl) {
      countEl = document.getElementById('listenerCount');
    }
    if (countEl) {
      countEl.textContent = formatCount(count);
    }
    // Also update any element with data-listener-count
    try {
      var els = document.querySelectorAll('[data-listener-count]');
      for (var i = 0; i < els.length; i++) {
        els[i].textContent = formatCount(count);
      }
    } catch (e) {}
  }

  function init() {
    if (initialized) return;
    if (typeof firebase === 'undefined') {
      console.warn('[CCPresence] Firebase SDK not loaded');
      return;
    }
    var cfg = (window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig) || window.CC_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) {
      console.warn('[CCPresence] No Firebase config');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      db = firebase.database();
    } catch (e) {
      console.warn('[CCPresence] Firebase init failed', e);
      return;
    }

    uid = getUid();
    presenceRef = db.ref('presence');
    myRef = presenceRef.child(uid);

    // Mark ourselves present with a timestamp
    var now = Date.now();
    var stageName = (window.CCAccount && window.CCAccount.stageName) || 'guest';
    var hasAccount = 0;
    try { hasAccount = localStorage.getItem('ccr-session') ? 1 : 0; } catch (e) {}
    myRef.set({ t: now, v: 1, stageName: stageName, hasAccount: hasAccount });

    // Auto-remove on disconnect
    myRef.onDisconnect().remove();

    // Heartbeat: refresh timestamp every 30s so stale entries expire
    setInterval(function () {
      if (myRef) {
        var heartbeatStageName = (window.CCAccount && window.CCAccount.stageName) || 'guest';
        var heartbeatHasAccount = 0;
        try { heartbeatHasAccount = localStorage.getItem('ccr-session') ? 1 : 0; } catch (e) {}
        myRef.set({ t: Date.now(), v: 1, stageName: heartbeatStageName, hasAccount: heartbeatHasAccount });
      }
    }, 30000);

    // Listen for count changes
    presenceRef.on('value', function (snap) {
      var count = 0;
      var cutoff = Date.now() - 90000; // 90s stale threshold
      snap.forEach(function (child) {
        var val = child.val();
        if (val && val.t && val.t > cutoff) count++;
      });
      updateDisplay(count);
    });

    initialized = true;
    console.log('[CCPresence] Listening as ' + uid);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Delay slightly to let Firebase SDK load
    setTimeout(init, 1000);
  }

  window.CCPresence = {
    init: init,
    getUid: getUid
  };
})();
