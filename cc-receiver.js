/* CYBERCROWD RADIO — live receiver only.
   One job: the live receiver.
   What it is: the one play button, the live sound, the volume, the
   ON AIR / STANDBY pill and the SIGNAL LIVE / SIGNAL OFFLINE line.
   Authority: the audio element. No other file pauses it directly;
   modes and studio call receiver stop through stopAllModes or setLive.
   Uses $ and cfg from cc-base.js, stone 1. Reads liveShow from
   cc-shows.js, stone 7, read only, and standbyText from
   cc-hero-standby.js, stone 8, read only, by typeof check.
   Calls say() from cc-toast.js, stone 5, loaded before this file.
   Uses window.CCRadioDJ, the bucket DJ, which is not a stone.
   Source: app.js lines 261-334, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: receiver is null if the play button is
   not on this page, setLive returns early if any receiver element
   is missing, the play listener is wired only if the button exists,
   and volume is read only if the volume slider exists. Original
   lines assumed all receiver elements exist. When they exist,
   effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 14 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   THE RECEIVER — honest live player
   ============================================================ */
const playBtn = $("playBtn");
const iconPlay = $("iconPlay"), iconMute = $("iconMute");
const nowPlaying = $("nowPlaying");
const streamState = $("streamState");
const onairPill = $("onairPill"), onairText = $("onairText");
const receiver = playBtn ? playBtn.closest(".receiver") : null;
const vol = $("volSlider");
let audio = null, playing = false;

function setLive(on) {
  if (!playBtn || !receiver || !iconPlay || !onairPill || !onairText || !streamState || !nowPlaying) return;
  playing = on;
  receiver.classList.toggle("playing", on);
  iconPlay.style.display = on ? "none" : "";
  if (iconMute) { iconMute.style.display = on ? "" : "none"; if (on) iconMute.textContent = "MUTE"; }
  playBtn.setAttribute("aria-label", on ? "Mute live sound" : "Play live stream");
  onairPill.classList.toggle("live", on);
  onairText.textContent = on ? "ON AIR" : "STANDBY";
  streamState.innerHTML = on ? "SIGNAL&nbsp;LIVE" : "SIGNAL&nbsp;OFFLINE";
  streamState.classList.toggle("live", on);
  nowPlaying.textContent = on
    ? (liveShow ? `${liveShow.name} — live now` : "You're listening live")
    : (typeof standbyText === "function" ? standbyText() : "Standby — the needle drops when we go live");
}

if (playBtn) playBtn.addEventListener("click", async () => {
  // ONE BUTTON: live studio stream if on air, otherwise Sonny Daze from the bucket.
  const streamUrl = (cfg.streamUrl || "").trim();
  if (!streamUrl) {
    // No live studio stream — Sonny Daze plays the bucket.
    if (!window.CCRadioDJ) {
      say("Player not loaded yet — try again in a moment.");
      return;
    }
    if (window.CCRadioDJ.isStopped()) {
      window.CCRadioDJ.start(nowPlaying);
      setLive(true);
      say("Cybercrowd Radio is on the air!");
    } else {
      window.CCRadioDJ.stop();
      setLive(false);
      say("Radio paused.");
    }
    playBtn.setAttribute("aria-label", window.CCRadioDJ.isStopped() ? "Play the radio" : "Pause the radio");
    return;
  }
  const url = streamUrl;
  try {
    if (!audio) {
      audio = new Audio(url);
      audio.preload = "none";
      audio.volume = vol ? vol.value / 100 : 1;
      if (vol) vol.addEventListener("input", () => (audio.volume = vol.value / 100));
      audio.addEventListener("error", () => {
        setLive(false);
        say("Couldn't reach the stream — it may be offline. Try again in a bit.");
      });
    }
    if (playing) {
      if (audio.muted) { audio.muted = false; if (iconMute) iconMute.textContent = "MUTE"; playBtn.setAttribute("aria-label", "Mute live sound"); say("Sound on."); }
      else { audio.muted = true; if (iconMute) iconMute.textContent = "SOUND ON"; playBtn.setAttribute("aria-label", "Unmute live sound"); say("Muted."); }
    }
    else {
      audio.muted = false;
      await audio.play();
      setLive(true);
    }
  } catch (_) {
    setLive(false);
    say("Couldn't reach the stream — it may be offline. Try again in a bit.");
  }
});
window.CC_RECEIVER_LOADED = true;
