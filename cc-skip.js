/* CCSkip — skip markers for the current song.
 * One job: mark the current song so the box fades it out and goes
 * to the next chosen song.
 *
 * HOW IT WORKS:
 * - While listening, James decides the current song should end now
 * - He hits the "SKIP" button
 * - The song is marked in Firebase, in the same kind of marker the
 *   Thunder button writes, for the current song only
 * - The box reads the marker, fades the current song out, and goes
 *   to the next chosen song
 *
 * DOES: mark songs, check markers, persist in Firebase. It writes
 * the marker only; it does no fading and no advancing on the face,
 * and it does not choose the next song. The box does the fade and
 * the move to the next chosen song.
 * DOES NOT: auto-detect (James teaches it live).
 *
 * This file mirrors cc-thunder.js exactly in structure, with the
 * Firebase ref "skip", the button "skipBtn", and window.CCSkip.
 */

(function () {
  "use strict";

  var db = null;
  var skipRef = null;
  var skipCache = {}; // trackId -> true (in-memory cache)
  var initialized = false;

  function init() {
    if (initialized) return;
    if (typeof firebase === "undefined") return;
    var cfg = (window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig);
    if (!cfg || !cfg.apiKey) return;
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.database();
      skipRef = db.ref("skip");
      // Load all markers into cache
      skipRef.on("value", function (snap) {
        skipCache = snap.val() || {};
      });
      initialized = true;
    } catch (e) {
      console.warn("[CCSkip] init failed", e);
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

  function isSkipMarked(trackId) {
    if (!trackId) return false;
    return !!skipCache[trackId];
  }

  function markSkip(trackId) {
    if (!trackId) {
      trackId = getCurrentTrackId();
      if (!trackId) return false;
    }
    // Toggle: if already marked, unmark it
    var isMarked = isSkipMarked(trackId);
    try {
      if (skipRef) {
        if (isMarked) {
          skipRef.child(trackId).remove();
        } else {
          var update = {};
          update[trackId] = { t: Date.now(), by: "james" };
          skipRef.update(update);
        }
      }
      // Update cache immediately for responsive UI
      if (isMarked) {
        delete skipCache[trackId];
      } else {
        skipCache[trackId] = { t: Date.now(), by: "james" };
      }
      updateButton(!isMarked);
      return true;
    } catch (e) {
      return false;
    }
  }

  function updateButton(isMarked) {
    var btn = document.getElementById("skipBtn");
    if (btn) {
      btn.classList.toggle("is-active", isMarked);
      btn.setAttribute("aria-pressed", isMarked ? "true" : "false");
    }
  }

  function checkAndUpdateButton() {
    var trackId = getCurrentTrackId();
    updateButton(isSkipMarked(trackId));
  }

  // Wire up the button
  function initButton() {
    var btn = document.getElementById("skipBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      markSkip();
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

  window.CCSkip = {
    isSkipMarked: isSkipMarked,
    mark: markSkip,
    init: init,
  };
})();
