/* CCPlayLive — reflect actual playback in the station labels.
   Signup owns the blocker and releases it only after verified sign-in.
   This file never opens or dismisses signup. */

(function () {
  "use strict";

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
