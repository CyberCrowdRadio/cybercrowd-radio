/* CCFade — fade markers for abrupt song endings.
 * One job: mark the current song so the DJ talks over its abrupt
 * ending and introduces the next song.
 *
 * HOW IT WORKS:
 * - While listening, James hears a song with an abrupt ending
 * - He hits the "FADE" button
 * - The song is marked in Firebase, in the same kind of marker the
 *   Thunder button writes, for the current song only
 * - The box reads the marker and has the DJ talk over the ending
 *   and introduce the next song
 *
 * DOES: mark songs, check markers, persist in Firebase. It writes
 * the marker only; it does no talking, no fading, and no advancing
 * on the face. The box does the talking and the introduction.
 * DOES NOT: auto-detect (James teaches it live), and it does not
 * choose the next song.
 *
 * This file mirrors cc-thunder.js exactly in structure, with the
 * Firebase ref "fade", the button "fadeBtn", and window.CCFade.
 */

(function () {
  "use strict";

  var db = null;
  var fadeRef = null;
  var fadeCache = {}; // trackId -> true (in-memory cache)
  var initialized = false;

  function init() {
    if (initialized) return;
    if (typeof firebase === "undefined") return;
    var cfg = (window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig);
    if (!cfg || !cfg.apiKey) return;
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.database();
      fadeRef = db.ref("fade");
      // Load all markers into cache
      fadeRef.on("value", function (snap) {
        fadeCache = snap.val() || {};
      });
      initialized = true;
    } catch (e) {
      console.warn("[CCFade] init failed", e);
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

  function isFadeMarked(trackId) {
    if (!trackId) return false;
    return !!fadeCache[trackId];
  }

  function markFade(trackId) {
    if (!trackId) {
      trackId = getCurrentTrackId();
      if (!trackId) return false;
    }
    // Toggle: if already marked, unmark it
    var isMarked = isFadeMarked(trackId);
    try {
      if (fadeRef) {
        if (isMarked) {
          fadeRef.child(trackId).remove();
        } else {
          var update = {};
          update[trackId] = { t: Date.now(), by: "james" };
          fadeRef.update(update);
        }
      }
      // Update cache immediately for responsive UI
      if (isMarked) {
        delete fadeCache[trackId];
      } else {
        fadeCache[trackId] = { t: Date.now(), by: "james" };
      }
      updateButton(!isMarked);
      return true;
    } catch (e) {
      return false;
    }
  }

  function updateButton(isMarked) {
    var btn = document.getElementById("fadeBtn");
    if (btn) {
      btn.classList.toggle("is-active", isMarked);
      btn.setAttribute("aria-pressed", isMarked ? "true" : "false");
    }
  }

  function checkAndUpdateButton() {
    var trackId = getCurrentTrackId();
    updateButton(isFadeMarked(trackId));
  }

  // Wire up the button
  function initButton() {
    var btn = document.getElementById("fadeBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      markFade();
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

  window.CCFade = {
    isFadeMarked: isFadeMarked,
    mark: markFade,
    init: init,
  };
})();
