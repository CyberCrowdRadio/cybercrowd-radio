/* CYBERCROWD RADIO — AI DJ toggle only.
   One job: the AI DJ toggle.
   What it is: one toggle that turns Kinetic talking between
   songs on or off, remembered between visits, and sets the
   window flag other code reads.
   Authority: AI DJ toggle only. Owns that toggle and its flag.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 604-622, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 21 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* AI DJ toggle — Kinetic talks between songs or stays silent. */
const aiDjToggle = $("aiDjToggle");
let aiDjOn = true;
try {
  aiDjOn = localStorage.getItem("cc-ai-dj") !== "off";
} catch (e) {}
function setAiDj(on) {
  aiDjOn = on;
  window.CCKineticEnabled = on;
  try { localStorage.setItem("cc-ai-dj", on ? "on" : "off"); } catch (e) {}
  if (aiDjToggle) {
    aiDjToggle.textContent = on ? "ON" : "OFF";
    aiDjToggle.classList.toggle("is-on", on);
    aiDjToggle.setAttribute("aria-pressed", on ? "true" : "false");
  }
}
if (aiDjToggle) aiDjToggle.addEventListener("click", () => setAiDj(!aiDjOn));
setAiDj(aiDjOn);
window.CCKineticEnabled = aiDjOn;
window.CC_AI_DJ_TOGGLE_LOADED = true;
