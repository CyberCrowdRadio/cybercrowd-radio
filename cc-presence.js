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

  // Presence keys identify this page connection, never the member's stage name.
  // A fresh key per load prevents one tab's disconnect from removing another.
  var connectionId = null;
  function getUid() {
    if (connectionId) return connectionId;
    var bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
      connectionId = 'u_' + Array.prototype.map.call(bytes, function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    } else {
      connectionId = 'u_' + Date.now().toString(36) + '_' +
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
    return connectionId;
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

  function identityMetadata() {
    var account = window.CCAccount;
    var verified = !!(account && account.verified === true && account.stageName);
    return { t: Date.now(), v: 2, stageName: verified ? account.stageName : 'guest', hasAccount: verified ? 1 : 0 };
  }

  function init() {
    // A sign-in updates the existing connection's display metadata.
    // It must not create a second presence record or replace the connection key.
    if (initialized) {
      if (myRef) {
        myRef.set(identityMetadata());
      }
      return;
    }
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
    myRef.set(identityMetadata());

    // Auto-remove on disconnect
    myRef.onDisconnect().remove();

    // Heartbeat: refresh timestamp every 30s so stale entries expire
    setInterval(function () {
      if (myRef) {
        myRef.set(identityMetadata());
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

