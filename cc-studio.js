/* CYBERCROWD RADIO — studio broadcast only.
   One job: studio broadcast.
   What it is: paste a studio stream URL, remember it between
   visits, GO LIVE to broadcast from the studio, GO OFF AIR to
   hand back to the bucket.
   Authority: studio broadcast only. Owns the studio URL, the
   go-live buttons and the studio status line.
   Uses $ and cfg from cc-base.js, stone 1. Uses setLive from
   cc-receiver.js, stone 14, loaded before this file. Calls say()
   from cc-toast.js, stone 5, loaded before this file.
   Uses window.CCRadioDJ, the bucket DJ, which is not a stone.
   Source: app.js lines 557-602, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: the studio URL falls back to empty
   if the studio URL field is not on this page. Original line
   assumed studioUrl exists. When it exists, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 20 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   STUDIO BROADCAST — Sonny Daze goes live from the studio
   ============================================================ */
const studioUrl = $("studioStreamUrl");
const goLiveBtn = $("goLiveBtn");
const goOffAirBtn = $("goOffAirBtn");
const studioStatus = $("studioStatus");
// Remember the stream URL between visits.
try {
  const saved = localStorage.getItem("cc-studio-url") || "";
  if (saved && studioUrl) studioUrl.value = saved;
  if (saved) cfg.streamUrl = saved;
} catch (e) {}
function setStudioLive(on) {
  if (goLiveBtn) goLiveBtn.hidden = on;
  if (goOffAirBtn) goOffAirBtn.hidden = !on;
  if (studioStatus) {
    studioStatus.textContent = on
      ? "ON AIR — you're broadcasting live from the studio."
      : "Standby — paste your stream URL and hit GO LIVE.";
    studioStatus.classList.toggle("live", on);
  }
}
if (goLiveBtn) goLiveBtn.addEventListener("click", () => {
  const url = (studioUrl ? studioUrl.value : "").trim();
  if (!url) {
    if (studioStatus) studioStatus.textContent = "Paste your stream URL first.";
    return;
  }
  cfg.streamUrl = url;
  try { localStorage.setItem("cc-studio-url", url); } catch (e) {}
  // Stop the bucket DJ — the studio is live now.
  if (window.CCRadioDJ && !window.CCRadioDJ.isStopped()) window.CCRadioDJ.stop();
  setLive(true);
  setStudioLive(true);
  say("You're live from the studio!");
});
if (goOffAirBtn) goOffAirBtn.addEventListener("click", () => {
  cfg.streamUrl = "";
  try { localStorage.removeItem("cc-studio-url"); } catch (e) {}
  if (studioUrl) studioUrl.value = "";
  setLive(false);
  setStudioLive(false);
  say("Off air — Sonny Daze is back on the bucket.");
});
setStudioLive(!!(cfg.streamUrl || "").trim());
window.CC_STUDIO_LOADED = true;
