/* CYBERCROWD RADIO — Kinetic talk break only.
   One job: the Kinetic talk break.
   What it is: James types a line, Kinetic says it out loud, the
   music pauses, then the music resumes in the current mode.
   Authority: Kinetic talk break only. Owns that input, button
   and spoken break, nothing else.
   Uses $ from cc-base.js, stone 1. Uses stopAllModes, setLive,
   bcastMode, playStraight and nowPlaying from cc-receiver.js,
   stone 14, and cc-modes.js, stone 15, loaded before this file.
   Reads studioStatus, owned by cc-studio.js, stone 20, loaded
   after this file, only inside a tap handler after all stones
   load, never at load time.
   Source: app.js lines 485-517, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: the typed text falls back to empty
   if the Kinetic input is not on this page. Original line assumed
   kineticSay exists. When it exists, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 18 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* Kinetic talk break: James types it, Kinetic says it, music resumes. */
const kineticSay = $("kineticSay");
const kineticSayBtn = $("kineticSayBtn");
if (kineticSayBtn) kineticSayBtn.addEventListener("click", () => {
  const text = ((kineticSay ? kineticSay.value : "") || "").trim();
  if (!text) return;
  // Pause whatever is playing.
  stopAllModes();
  setLive(false);
  if (studioStatus) studioStatus.textContent = "Kinetic is talking…";
  // Kinetic says it.
  const done = () => {
    if (kineticSay) kineticSay.value = "";
    if (studioStatus) studioStatus.textContent = "Back to the music.";
    // Resume in current mode.
    if (bcastMode === "aidj" && window.CCRadioDJ) {
      window.CCRadioDJ.start(nowPlaying);
      setLive(true);
    } else if (bcastMode === "straight") {
      setLive(true);
      playStraight();
    }
  };
  if (!('speechSynthesis' in window)) { done(); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = done;
    u.onerror = done;
    setTimeout(() => { try { window.speechSynthesis.cancel(); } catch (e) {} done(); }, 30000);
    window.speechSynthesis.speak(u);
  } catch (e) { done(); }
});
window.CC_KINETIC_TALK_LOADED = true;
