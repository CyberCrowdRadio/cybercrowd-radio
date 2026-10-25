/* CYBERCROWD RADIO — Gong only.
   One job: the Gong.
   What it is: kill the current song, say your piece through
   Kinetic, then Kinetic takes back over on the next track.
   Authority: Gong only. Owns the gong button and speakAsKinetic.
   Uses $ from cc-base.js, stone 1. Uses kineticSay from
   cc-kinetic-talk.js, stone 18, loaded before this file.
   Uses stopAllModes, setLive, bcastMode and playStraight from
   cc-receiver.js, stone 14, and cc-modes.js, stone 15.
   Reads studioStatus, owned by cc-studio.js, stone 20, loaded
   after this file, only inside a tap handler after all stones
   load, never at load time. Uses window.CCRadioDJ, which is
   not a stone.
   Source: app.js lines 519-555, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: the typed text falls back to empty
   if the Kinetic input is not on this page. Original line assumed
   kineticSay exists. When it exists, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 19 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* GONG IT: kill the song, say your piece, Kinetic takes back over. */
const gongBtn = $("gongBtn");
function speakAsKinetic(text, done) {
  if (!('speechSynthesis' in window)) { done(); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = done;
    u.onerror = done;
    setTimeout(() => { try { window.speechSynthesis.cancel(); } catch (e) {} done(); }, 30000);
    window.speechSynthesis.speak(u);
  } catch (e) { done(); }
}
if (gongBtn) gongBtn.addEventListener("click", () => {
  const text = ((kineticSay ? kineticSay.value : "") || "").trim();
  // Gong the current song — stop everything now.
  stopAllModes();
  setLive(false);
  if (studioStatus) studioStatus.textContent = "GONGED! 🔔";
  const resume = () => {
    if (kineticSay) kineticSay.value = "";
    if (studioStatus) studioStatus.textContent = "Kinetic takes back over.";
    if (bcastMode === "aidj" && window.CCRadioDJ) {
      window.CCRadioDJ.next(); // skip to next track
      if (window.CCRadioDJ.isStopped()) window.CCRadioDJ.start(nowPlaying);
      setLive(true);
    } else if (bcastMode === "straight") {
      setLive(true);
      playStraight();
    }
  };
  if (text) {
    speakAsKinetic(text, resume);
  } else {
    setTimeout(resume, 800); // brief gong pause, then next song
  }
});
window.CC_GONG_LOADED = true;
