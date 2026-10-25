/* CYBERCROWD RADIO — adworm only.
   One job: the adworm.
   What it is: the ad blocks on the page, filled from config,
   with one traveler block highlighted at a time on a slow
   circuit, no flashing ever.
   Authority: adworm only. Owns ad block filling and the
   traveler circuit, nothing else.
   Uses cfg and reduced from cc-base.js, stone 1, loaded
   before this file.
   Source: app.js lines 841-862, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 24 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   adWorm — 8 blocks, gentle circuit, NO flashing ever
   The traveler highlights one block at a time, slow fade only.
   ============================================================ */
const adworm = cfg.adworm || {};
const allBlocks = [];
document.querySelectorAll("[data-adworm]").forEach((el) => {
  const id = el.dataset.adworm;
  const isCorner = id.startsWith("corner-");
  const list = isCorner ? (adworm.corners || []) : (adworm.banners || []);
  const meta = list.find((b) => b.id === id) || {};
  el.innerHTML = `<a href="#advertise"><span>AD — ${meta.label || id}<br />Your Pop here · ${adworm.popPrice || "$5.99"}</span></a>`;
  allBlocks.push(el);
});
if (!reduced && allBlocks.length > 1) {
  let traveler = 0;
  setInterval(() => {
    allBlocks.forEach((b) => b.classList.remove("traveling"));
    traveler = (traveler + 1) % allBlocks.length;
    allBlocks[traveler].classList.add("traveling");
  }, 6000); // slow circuit: side → top → bottom → back
}
window.CC_ADWORM_LOADED = true;
