/* CYBERCROWD RADIO — ticker only.
   One job: ticker track content.
   Authority: ticker only. Owns ticker track inner HTML, nothing else.
   Uses $ and cfg from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 115-121, cut out whole.
   Guard added for the cut: if the ticker track is not on this page, do nothing,
   so a missing ticker does not kill later stones. Original guard was if (track).
   Effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 6 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const track = $("tickerTrack");
if (track) {
  const items = (cfg.ticker || []).map((t) => `<span>${t}</span><i>✦</i>`).join("");
  track.innerHTML = items + items;
}
window.CC_TICKER_LOADED = true;
