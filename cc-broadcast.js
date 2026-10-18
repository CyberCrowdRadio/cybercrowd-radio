/* CC Broadcast — one song, one chat, one crowd. 2026-10-17.
 * James: "One song 25 million listener. One song chat."
 *
 * HOW IT WORKS:
 * - Firebase Realtime Database holds the shared now-playing state:
 *   ref "broadcast/now" = { trackUrl, title, artist, startedAt }
 * - Every listener reads it, loads the SAME audio file, seeks to
 *   the SAME position: (Date.now() - startedAt). Everyone hears
 *   the same song at the same time. One feed, every screen.
 * - When the track ends, Kinetic (or James) advances the state,
 *   and every client follows. No one drifts. No one picks their own.
 *
 * DOES: sync every listener to one shared song via Firebase.
 * DOES NOT: play local-only audio. DOES NOT: let clients choose tracks.
 */

(function () {
  "use strict";

  var BROADCAST_REF = 'broadcast/now';
  var SYNC_INTERVAL = 15000; // re-sync every 15s to prevent drift

  var audio = null;
  var currentKey = null;
  var syncTimer = null;
  var db = null;

  function getDb() {
    if (db) return db;
    try {
      if (window.firebase && window.firebase.database) {
        db = window.firebase.database();
        return db;
      }
    } catch (_) {}
    return null;
  }

  function trackKey(state) {
    if (!state) return null;
    return (state.trackUrl || '') + '|' + (state.startedAt || 0);
  }

  function applyState(state) {
    if (!state || !state.trackUrl) return;

    var key = trackKey(state);
    var now = Date.now();
    var position = Math.max(0, (now - (state.startedAt || now)) / 1000);

    // Same song already playing — just re-sync position if drifted
    if (key === currentKey && audio) {
      var drift = Math.abs(audio.currentTime - position);
      if (drift > 3 && isFinite(position)) {
        try { audio.currentTime = position; } catch (_) {}
      }
      updateNowPlaying(state);
      return;
    }

    // New song — everyone switches together
    currentKey = key;
    if (!audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.addEventListener('ended', onTrackEnded);
    }
    try {
      audio.pause();
      audio.src = state.trackUrl;
      audio.load();
      audio.addEventListener('canplay', function onCanPlay() {
        audio.removeEventListener('canplay', onCanPlay);
        if (isFinite(position)) {
          try { audio.currentTime = position; } catch (_) {}
        }
        audio.play().catch(function () {});
      });
    } catch (_) {}
    updateNowPlaying(state);
  }

  function onTrackEnded() {
    // Track finished locally — wait for the shared state to advance.
    // Kinetic or James advances broadcast/now; we follow.
    var d = getDb();
    if (!d) return;
    // Don't auto-advance locally. The shared state is the authority.
  }

  function updateNowPlaying(state) {
    var titleEl = document.getElementById('nowPlayingTitle');
    var artistEl = document.getElementById('nowPlayingArtist');
    if (titleEl && state.title) titleEl.textContent = state.title;
    if (artistEl && state.artist) artistEl.textContent = state.artist;

    // Also update document title so every tab shows the same song
    if (state.title) {
      document.title = state.title + (state.artist ? ' — ' + state.artist : '') + ' | Cybercrowd Radio';
    }
  }

  // James or Kinetic sets the shared song. Everyone follows.
  function setNowPlaying(trackUrl, title, artist) {
    var d = getDb();
    if (!d) return;
    d.ref(BROADCAST_REF).set({
      trackUrl: trackUrl,
      title: title || '',
      artist: artist || '',
      startedAt: Date.now(),
      setBy: 'sonny-daze'
    });
  }

  function start() {
    var d = getDb();
    if (!d) {
      // Firebase not ready yet — retry
      setTimeout(start, 2000);
      return;
    }
    d.ref(BROADCAST_REF).on('value', function (snap) {
      applyState(snap.val());
    });

    // Periodic re-sync to prevent drift
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(function () {
      var dd = getDb();
      if (!dd) return;
      dd.ref(BROADCAST_REF).once('value').then(function (snap) {
        applyState(snap.val());
      }).catch(function () {});
    }, SYNC_INTERVAL);
  }

  window.CCBroadcast = {
    start: start,
    setNowPlaying: setNowPlaying
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
