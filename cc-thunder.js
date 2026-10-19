/* CCThunder — thunderous entry markers.
 * James 2026-10-19: "Thundering songs need as i listen to click as they play
 * if the AI talks over i can say button toggle as DJ effect >>> for down
 * stream for the next time it comes around"
 *
 * HOW IT WORKS:
 * - While listening, James hears a thunderous song intro
 * - If the AI talks over it (wrong), he hits the "THUNDER" button
 * - The song is marked as thunderous in Firebase
 * - Next time that song plays, the AI stays silent during the intro
 *
 * DOES: mark songs, check markers before AI talks, persist in Firebase.
 * DOES NOT: auto-detect (James teaches it live).
 */

(function () {
  "use strict";

  var db = null;
  var thunderRef = null;
  var thunderCache = {}; // trackId -> true (in-memory cache)
  var initialized = false;

  function init() {
    if (initialized) return;
    if (typeof firebase === "undefined") return;
    var cfg = (window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig);
    if (!cfg || !cfg.apiKey) return;
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.database();
      thunderRef = db.ref("thunder");
      // Load all markers into cache
      thunderRef.on("value", function (snap) {
        thunderCache = snap.val() || {};
      });
      initialized = true;
    } catch (e) {
      console.warn("[CCThunder] init failed", e);
    }
  }

  function getCurrentTrackId() {
    // Try to get from the player
    try {
      if (window.CCPlayer && window.CCPlayer.currentTrackId) {
        return window.CCPlayer.currentTrackId();
      }
      // Fallback: from the now-playing element
      var el = document.getElementById("nowPlaying");
      if (el && el.dataset.trackId) return el.dataset.trackId;
    } catch (_) {}
    return null;
  }

  function isThunderous(trackId) {
    if (!trackId) return false;
    return !!thunderCache[trackId];
  }

  function markThunderous(trackId) {
    if (!trackId) {
      trackId = getCurrentTrackId();
      if (!trackId) return false;
    }
    // Toggle: if already marked, unmark it
    var isMarked = isThunderous(trackId);
    try {
      if (thunderRef) {
        if (isMarked) {
          thunderRef.child(trackId).remove();
        } else {
          var update = {};
          update[trackId] = { t: Date.now(), by: "james" };
          thunderRef.update(update);
        }
      }
      // Update cache immediately for responsive UI
      if (isMarked) {
        delete thunderCache[trackId];
      } else {
        thunderCache[trackId] = { t: Date.now(), by: "james" };
      }
      updateButton(!isMarked);
      return true;
    } catch (e) {
      return false;
    }
  }

  function updateButton(isMarked) {
    var btn = document.getElementById("thunderBtn");
    if (btn) {
      btn.classList.toggle("is-active", isMarked);
      btn.setAttribute("aria-pressed", isMarked ? "true" : "false");
    }
  }

  function checkAndUpdateButton() {
    var trackId = getCurrentTrackId();
    updateButton(isThunderous(trackId));
  }

  // Wire up the button
  function initButton() {
    var btn = document.getElementById("thunderBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      markThunderous();
    });
    // Update button state when track changes
    setInterval(checkAndUpdateButton, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      initButton();
    });
  } else {
    init();
    initButton();
  }

  window.CCThunder = {
    isThunderous: isThunderous,
    mark: markThunderous,
    init: init,
  };
})();
