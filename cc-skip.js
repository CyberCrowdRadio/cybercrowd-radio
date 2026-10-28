/* CCSkip — skip advance requests for the current song.
 * One job: write one advance request when James taps SKIP, so
 * the box can stop the current song and go to the next song
 * in the block. It writes the request only; it does no fading,
 * no advancing, no pausing, and no reshuffling on the face, and
 * it deletes nothing.
 *
 * HOW IT WORKS:
 * - While listening, James decides the current song should end now
 * - He hits the "SKIP" button (id "skipBtn" in station.html,
 *   shown to the owner only, in the same owner list as
 *   "thunderBtn")
 * - One advance request is written in Firebase, under the
 *   "skip" ref, as a new child: { t, by: "james", advance: true }
 * - A tap never removes a request. There is no toggle: a second
 *   tap writes a second request. Nothing is deleted.
 *
 * GAP, READ FIRST: the face has no current track ID in code.
 * No file in this repo defines window.CCPlayer or a
 * currentTrackId function, and station.html gives the
 * "nowPlaying" element no data-trackId and no song title.
 * The face also has no next song in the block: no block plan
 * and no queue is exposed here. So this file invents no
 * track ID, no song title, and no next song. It writes only
 * the tap itself, with its time. The box is the only place
 * that knows which song is playing and which song is next:
 * it must resolve the current and next songs from its own
 * block plan at the time it reads the request, speak the
 * past-and-next moment between them, and demote the skipped
 * song. Until a bridge carries this request to the box, no
 * box file reads it: dj-controller.js says so in its own
 * comments, and dj-bowl-keeper.js reads no skip marker at
 * all. That bridge is still missing.
 *
 * DOES: write advance requests, persist in Firebase.
 * DOES NOT: auto-detect (James teaches it live), pause,
 * reshuffle, delete, or name the current or next song.
 */

(function () {
  "use strict";

  var db = null;
  var skipRef = null;
  var skipCache = {}; // trackId -> true (in-memory cache, legacy marks only)
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

  function isSkipMarked(trackId) {
    if (!trackId) return false;
    return !!skipCache[trackId];
  }

  // One tap, one advance request. Never a toggle, never a
  // removal: a request already written stays written.
  function requestAdvance() {
    if (!skipRef) {
      init();
      if (!skipRef) return false;
    }
    try {
      skipRef.push({ t: Date.now(), by: "james", advance: true });
      return true;
    } catch (e) {
      console.warn("[CCSkip] advance request failed", e);
      return false;
    }
  }

  // Wire up the button. The button stays tappable: a tap is a
  // request, not a state, so no pressed state is kept here.
  function initButton() {
    var btn = document.getElementById("skipBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      requestAdvance();
    });
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
    mark: requestAdvance,
    requestAdvance: requestAdvance,
    init: init,
  };
})();
