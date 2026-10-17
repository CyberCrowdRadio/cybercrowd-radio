/* GO LIVE takeover — James's spec, 2026-10-16.
 * When he hits LIVE: his audio takes FULL AUTHORITY. Playlist stops.
 * Listeners hear HIM. They can browse, but the broadcast is his.
 * When he flips back: Kinetic resumes, playlist continues.
 *
 * DOES NOT: stream to other listeners yet (needs Cloudflare relay).
 * DOES: capture his mic/interface, take over local broadcast, show LIVE.
 * ONLY: one button, 5-sec countdown, full takeover.
 */

(function () {
  "use strict";

  var liveStream = null;
  var liveAudio = null;
  var isLive = false;
  var playlistAudio = null; // reference to the station player

  // Find the station's audio element
  function findPlaylist() {
    // The dj-sequence player
    if (window.CCDJ && window.CCDJ.audio) return window.CCDJ.audio;
    var els = document.querySelectorAll("audio");
    for (var i = 0; i < els.length; i++) {
      if (!els[i].id || els[i].id !== "golive-monitor") return els[i];
    }
    return null;
  }

  function showLiveBanner() {
    var b = document.getElementById("cc-live-banner");
    if (!b) {
      b = document.createElement("div");
      b.id = "cc-live-banner";
      b.style.cssText = [
        "position:fixed; top:0; left:0; right:0; z-index:99998;",
        "background:#a93226; color:#f5edd8; text-align:center;",
        "font-family:monospace; font-weight:bold; padding:8px;",
        "font-size:.9rem; letter-spacing:.15em;",
      ].join("");
      document.body.appendChild(b);
    }
    b.textContent = "● LIVE — SONNY DAZE ON AIR";
    b.style.display = "block";
  }

  function hideLiveBanner() {
    var b = document.getElementById("cc-live-banner");
    if (b) b.style.display = "none";
  }

  var GoLiveTakeover = {
    isLive: function () { return isLive; },

    /* Hit LIVE: countdown, then take over. */
    goLive: function () {
      if (isLive) return;
      if (window.CCGoLive) {
        window.CCGoLive.start(function () { GoLiveTakeover._takeover(); });
      } else {
        GoLiveTakeover._takeover();
      }
    },

    _takeover: function () {
      // 1. Stop the playlist
      playlistAudio = findPlaylist();
      if (playlistAudio) {
        playlistAudio.pause();
      }

      // 2. Capture his mic/interface (MOTU)
      var constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        liveStream = stream;

        // 3. Play his audio through (monitor locally + this IS the broadcast source)
        liveAudio = new Audio();
        liveAudio.id = "golive-monitor";
        liveAudio.srcObject = stream;
        // Don't play locally to avoid feedback — this goes to the relay
        // liveAudio.play();

        isLive = true;
        showLiveBanner();

        // 4. Announce the handoff
        if (window.CCKineticAnnounce) {
          window.CCKineticAnnounce("Sonny Daze is live!");
        }

        // 5. TODO: pipe stream to Cloudflare relay for listeners
        // This needs the worker deployed. Without it, listeners
        // see the LIVE banner but hear silence.
        console.log("[GO LIVE] Local capture active. Relay pending Cloudflare deploy.");

        try {
          localStorage.setItem("cc_live_flag", JSON.stringify({
            live: true,
            since: Date.now(),
            dj: "Sonny Daze",
          }));
        } catch (_) {}
      }).catch(function (err) {
        console.error("[GO LIVE] Mic access denied:", err);
        alert("Mic access needed for GO LIVE. Check your browser permissions.");
        // Resume playlist
        if (playlistAudio) playlistAudio.play();
      });
    },

    /* Flip back to Kinetic: stop live, resume playlist. */
    flipToAI: function () {
      if (!isLive) return;

      // 1. Stop live capture
      if (liveStream) {
        liveStream.getTracks().forEach(function (t) { t.stop(); });
        liveStream = null;
      }
      if (liveAudio) {
        liveAudio.srcObject = null;
        liveAudio = null;
      }

      isLive = false;
      hideLiveBanner();

      try {
        localStorage.setItem("cc_live_flag", JSON.stringify({ live: false }));
      } catch (_) {}

      // 2. Announce handoff (James's script)
      var msg = "Thank you Sonny Daze. cybercrowdradio.com is now live with Kinetic.";
      if ("speechSynthesis" in window) {
        var u = new SpeechSynthesisUtterance(msg);
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      }

      // 3. Resume playlist
      setTimeout(function () {
        playlistAudio = findPlaylist();
        if (playlistAudio) {
          playlistAudio.play().catch(function () {});
        }
        // If DJ sequencer exists, let it take over
        if (window.CCDJ && window.CCDJ.next) {
          // Don't force next — just resume
        }
      }, 3000); // let the handoff announcement finish
    },
  };

  window.CCGoLiveTakeover = GoLiveTakeover;

  // DON'T wire buttons here — app.js owns mode switching.
  // app.js calls CCGoLiveTakeover.goLive() when switching to live mode.
  // Wiring buttons here caused double-handlers (both play at once).
})();
