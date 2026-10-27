/* CCPlayLive — play without a signup gate, and a true LIVE label.
 * One job: let the play button start the live stream, and show LIVE
 * while the stream actually plays.
 *
 * WHY THIS FILE EXISTS:
 * - cc-signup-overlay.js opens its email overlay on load when there is
 *   no ccr-session. The overlay covers the whole page, so a tap meant
 *   for the play button never reaches it. Listening must not need a
 *   signup, an email check, or a trial first.
 * - app.js setLive() reads $("iconPause"), but station.html has no
 *   iconPause element. setLive() throws before it updates onairText
 *   and streamState, so the face stays on STANDBY / SIGNAL OFFLINE
 *   even while the stream audio plays.
 *
 * DOES: close only the overlay that opened by itself on page load,
 * using the signup overlay's own close, and set the ON AIR / SIGNAL
 * LIVE labels from the stream audio element's own playing, pause,
 * and error events. It does not change the stream URL, the volume,
 * or the audio element, and it does not start, stop, or mute audio.
 * The signup overlay still opens when Sign up or Sign in is tapped,
 * because those links call CCSignup.open() themselves.
 * DOES NOT: touch the signup overlay file, app.js, or any trial file.
 * The equalizer trial still governs only the equalizer seat.
 */

(function () {
  "use strict";

  var closedOnce = false;

  function closeAutoOverlay() {
    if (closedOnce) return;
    closedOnce = true;
    try {
      if (window.CCSignup && window.CCSignup.close) {
        window.CCSignup.close();
        return;
      }
      var overlay = document.getElementById("signupOverlay");
      if (overlay) overlay.style.display = "none";
    } catch (_) {}
  }

  function setLiveLabel(on) {
    var playBtn = document.getElementById("playBtn");
    var iconPlay = document.getElementById("iconPlay");
    var iconMute = document.getElementById("iconMute");
    var iconPause = document.getElementById("iconPause");
    var nowPlaying = document.getElementById("nowPlaying");
    var streamState = document.getElementById("streamState");
    var onairPill = document.getElementById("onairPill");
    var onairText = document.getElementById("onairText");
    var receiver = playBtn ? playBtn.closest(".receiver") : null;
    if (receiver) receiver.classList.toggle("playing", on);
    if (iconPlay) iconPlay.style.display = on ? "none" : "";
    if (iconMute) {
      iconMute.style.display = on ? "" : "none";
      if (on) iconMute.textContent = "MUTE";
    }
    if (iconPause) iconPause.style.display = on ? "" : "none";
    if (playBtn) {
      playBtn.setAttribute("aria-label", on ? "Pause live stream" : "Play live stream");
    }
    if (onairPill) onairPill.classList.toggle("live", on);
    if (onairText) onairText.textContent = on ? "ON AIR" : "STANDBY";
    if (streamState) {
      streamState.innerHTML = on ? "SIGNAL&nbsp;LIVE" : "SIGNAL&nbsp;OFFLINE";
      streamState.classList.toggle("live", on);
    }
    if (nowPlaying && on) nowPlaying.textContent = "You're listening live";
    if (nowPlaying && !on) {
      nowPlaying.textContent = "Standby — the needle drops when we go live";
    }
  }

  function attach(audio) {
    if (!audio || audio.__ccPlayLive) return;
    audio.__ccPlayLive = true;
    audio.addEventListener("playing", function () { setLiveLabel(true); });
    audio.addEventListener("pause", function () { setLiveLabel(false); });
    audio.addEventListener("ended", function () { setLiveLabel(false); });
    audio.addEventListener("error", function () { setLiveLabel(false); });
    if (!audio.paused) setLiveLabel(true);
  }

  function attachCurrent() {
    try {
      if (window.CCPlayerAudio) attach(window.CCPlayerAudio);
    } catch (_) {}
  }

  function init() {
    closeAutoOverlay();
    var playBtn = document.getElementById("playBtn");
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        attachCurrent();
        setTimeout(attachCurrent, 0);
        setTimeout(attachCurrent, 500);
      });
    }
    attachCurrent();
    setInterval(attachCurrent, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.CCPlayLive = {
    setLiveLabel: setLiveLabel,
    attach: attach
  };
})();
