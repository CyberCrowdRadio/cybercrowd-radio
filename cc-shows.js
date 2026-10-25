/* CYBERCROWD RADIO — shows only.
   One job: the list of radio shows.
   What it is: the show cards on the shows page, each card with time, show name,
   short description, and days it airs. A card is marked today if it airs today,
   marked on-now if it is airing right now, and the live-now pill is set to the
   show that is on now.
   Authority: shows only. Owns liveShow and todayShow, later stones read them only,
   they do not write them.
   Uses $ and cfg from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 122-155, cut out whole.
   Guard: if the shows grid is not on this page, do nothing, liveShow and
   todayShow stay empty, later stones handle empty.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 7 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const showsGrid = $("showsGrid");
const showsNow = new Date();
const showsDay = showsNow.getDay();
const showsHour = showsNow.getHours() + showsNow.getMinutes() / 60;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let liveShow = null;
let todayShow = null;
if (showsGrid) {
  (cfg.shows || []).forEach((s) => {
    const el = document.createElement("article");
    el.className = "show";
    if ((s.day || []).includes(showsDay)) {
      el.classList.add("today");
      todayShow = s;
    }
    if ((s.day || []).includes(showsDay) && showsHour >= s.start && showsHour < s.end) {
      el.classList.add("on-now");
      liveShow = s;
    }
    el.innerHTML = `
      <p class="show-time">${s.time}</p>
      <h3>${s.name}</h3>
      <p>${s.blurb}</p>
      <span class="show-days">${s.days}</span>`;
    showsGrid.appendChild(el);
  });
  if (liveShow) {
    const liveNowEl = $("liveNow");
    const liveNowNameEl = $("liveNowName");
    if (liveNowEl) liveNowEl.hidden = false;
    if (liveNowNameEl) liveNowNameEl.textContent = liveShow.name;
  }
}
window.CC_SHOWS_LOADED = true;
