/* CYBERCROWD RADIO — broadcast modes only.
   One job: broadcast modes.
   What it is: the three mode switches, AI DJ, Straight, and Live.
   Switching stops every mode, then restarts in the new mode if the
   station was playing.
   Authority: modes only. Owns mode buttons and mode switching.
   Uses $ and cfg from cc-base.js, stone 1. Uses audio, playing,
   setLive and nowPlaying from cc-receiver.js, stone 14, loaded
   before this file. Uses window.CCRadioDJ, the bucket DJ, which
   is not a stone.
   Source: app.js lines 336-422, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 15 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   3 BROADCAST MODES — switch on the fly
   AI DJ: Sonny Daze voice + songs from the bucket
   STRAIGHT R2: just the music, no voice
   GO LIVE: station ID on repeat, then studio stream
   ============================================================ */
const modeAIDJ = $("modeAIDJ");
const modeStraight = $("modeStraight");
const modeLive = $("modeLive");
let bcastMode = "aidj";
let straightAudio = null;
let liveAudio = null;

function stopAllModes() {
  if (window.CCRadioDJ && !window.CCRadioDJ.isStopped()) window.CCRadioDJ.stop();
  if (straightAudio) { try { straightAudio.pause(); } catch (e) {} straightAudio = null; }
  if (liveAudio) { try { liveAudio.pause(); } catch (e) {} liveAudio = null; }
  if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
}
function setModeButtons(mode) {
  bcastMode = mode;
  [[modeAIDJ, "aidj"], [modeStraight, "straight"], [modeLive, "live"]].forEach(([btn, m]) => {
    if (!btn) return;
    const on = m === mode;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
// Straight R2: fetch /now, play the track, repeat.
async function playStraight() {
  try {
    const r = await fetch("/now");
    const now = await r.json();
    if (!now.id) { nowPlaying.textContent = "No tracks in the bucket."; return; }
    nowPlaying.textContent = now.title;
    straightAudio = new Audio("/t/" + now.id);
    straightAudio.addEventListener("ended", () => { if (bcastMode === "straight" && playing) playStraight(); });
    straightAudio.addEventListener("error", () => { if (bcastMode === "straight" && playing) setTimeout(playStraight, 3000); });
    await straightAudio.play();
  } catch (e) {
    nowPlaying.textContent = "Couldn't reach the station — retrying…";
    setTimeout(() => { if (bcastMode === "straight" && playing) playStraight(); }, 5000);
  }
}
// GO LIVE: station ID song on repeat until studio stream is set.
async function playLiveStandby() {
  try {
    const r = await fetch("/station-id");
    const sid = await r.json();
    if (!sid.id) { nowPlaying.textContent = "No station ID found."; return; }
    nowPlaying.textContent = "STANDBY — " + sid.title + " (on repeat)";
    liveAudio = new Audio("/t/" + sid.id);
    liveAudio.loop = true;
    await liveAudio.play();
  } catch (e) {
    nowPlaying.textContent = "Standby…";
  }
}
function switchMode(mode) {
  const wasPlaying = playing;
  stopAllModes();
  setLive(false);
  setModeButtons(mode);
  if (!wasPlaying) return;
  // Restart in the new mode.
  if (mode === "aidj" && window.CCRadioDJ) {
    window.CCRadioDJ.start(nowPlaying);
    setLive(true);
  } else if (mode === "straight") {
    setLive(true);
    playStraight();
  } else if (mode === "live") {
    const url = (cfg.streamUrl || "").trim();
    if (url) {
      // Studio stream is ready — play it.
      audio = new Audio(url);
      audio.play().then(() => setLive(true)).catch(() => setLive(false));
    } else {
      // No studio stream yet — station ID on repeat.
      setLive(true);
      playLiveStandby();
    }
  }
}
if (modeAIDJ) modeAIDJ.addEventListener("click", () => switchMode("aidj"));
if (modeStraight) modeStraight.addEventListener("click", () => switchMode("straight"));
if (modeLive) modeLive.addEventListener("click", () => switchMode("live"));
window.CC_MODES_LOADED = true;
