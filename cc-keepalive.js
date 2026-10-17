/* CC Keep Alive — play all night. 2026-10-16.
 * James: "Everytime I want to listen it stops... Play all night"
 *
 * Mobile browsers kill background audio. This fights back:
 * - Media Session API (lock screen controls, tells OS "I'm music")
 * - Wake Lock (optional, keeps screen on)
 * - Never pause on visibilitychange
 *
 * DOES NOT: prevent the OS from killing the tab if it's desperate.
 * DOES: give the station the best possible chance to play all night.
 */

(function () {
  "use strict";

  var wakeLock = null;

  function setupMediaSession() {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Cybercrowd Radio",
        artist: "Sonny Daze / Kinetic",
        album: "Live 24/7",
      });

      // Lock screen / notification controls
      var actions = [
        ["play", function () { if (window.CCRadioDJ) window.CCRadioDJ.start(); }],
        ["pause", function () { if (window.CCRadioDJ) window.CCRadioDJ.stop(); }],
        ["previoustrack", function () {}],
        ["nexttrack", function () { if (window.CCDJ && window.CCDJ.next) window.CCDJ.next(); }],
      ];
      actions.forEach(function (a) {
        try { navigator.mediaSession.setActionHandler(a[0], a[1]); }
        catch (_) {}
      });
    } catch (_) {}
  }

  function updateNowPlaying(title) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || "Cybercrowd Radio",
        artist: "Sonny Daze / Kinetic",
        album: "Live 24/7",
      });
    } catch (_) {}
  }

  // Don't let the page going invisible stop the music
  function guardVisibility() {
    document.addEventListener("visibilitychange", function () {
      // Do NOTHING when hidden. Keep playing.
      // The old code might have paused here — we don't.
      if (document.hidden) {
        console.log("[KEEPALIVE] Tab hidden — music continues.");
      } else {
        // Re-acquire wake lock when visible again
        requestWakeLock();
      }
    });
  }

  // Wake Lock: keeps the screen on so the OS doesn't kill us
  function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      navigator.wakeLock.request("screen").then(function (lock) {
        wakeLock = lock;
        console.log("[KEEPALIVE] Wake lock active.");
        lock.addEventListener("release", function () {
          wakeLock = null;
        });
      }).catch(function () {
        // Wake lock denied — that's fine, music still plays
      });
    } catch (_) {}
  }

  // Keep the AudioContext alive (some browsers suspend it)
  function keepAudioAlive() {
    setInterval(function () {
      try {
        if (window.CCDJ && window.CCDJ.audio && window.CCDJ.audio.paused) {
          // Audio paused but shouldn't be — resume
          var a = window.CCDJ.audio;
          // Only auto-resume if the DJ isn't intentionally stopped
          if (!window.CCRadioDJ || !window.CCRadioDJ.isStopped()) {
            a.play().catch(function () {});
          }
        }
      } catch (_) {}
    }, 10000); // check every 10s
  }

  window.CCKeepAlive = {
    updateNowPlaying: updateNowPlaying,
    requestWakeLock: requestWakeLock,
  };

  // Init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setupMediaSession();
      guardVisibility();
      requestWakeLock();
      keepAudioAlive();
    });
  } else {
    setupMediaSession();
    guardVisibility();
    requestWakeLock();
    keepAudioAlive();
  }
})();
