/* CYBERCROWD RADIO — donor wall only.
   One job: the donor wall.
   What it is: the plaque wall. Donor names and records read from local
   storage, rendered as plaques, with an empty plaque waiting when no
   donor is logged yet.
   Authority: donor wall only. Owns donor data and rendering. Forms call
   loadDonors and renderDonors, they do not own donor data.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 196-221, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 11 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ---------- donor wall (local until the archive backend lands) ---------- */
const donorWall = $("donorWall");
const DONOR_KEY = "cybercrowd-donors";
function loadDonors() {
  try { return JSON.parse(localStorage.getItem(DONOR_KEY) || "[]"); }
  catch (_) { return []; }
}
function renderDonors() {
  if (!donorWall) return;
  const donors = loadDonors();
  donorWall.innerHTML = "";
  if (!donors.length) {
    const li = document.createElement("li");
    li.className = "plaque plaque-empty";
    li.textContent = "The first plaque is waiting for a name.";
    donorWall.appendChild(li);
    return;
  }
  donors.forEach((d) => {
    const li = document.createElement("li");
    li.className = "plaque";
    li.innerHTML = `<strong>${d.name}</strong><span>${d.record}</span>`;
    donorWall.appendChild(li);
  });
}
renderDonors();
window.CC_DONOR_WALL_LOADED = true;
