/* CYBERCROWD RADIO — hero standby only.
   One job: the hero standby line.
   What it is: the line under the hero that says what day it is and what show
   is on today, or says Standby, the needle drops when we go live, when no
   show is set for today. It sets that line into the now-playing element once,
   at load.
   Authority: hero standby only. Reads todayShow from cc-shows.js, stone 7,
   read only, does not write it. Owns standbyText and the hero now-playing line.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 156-163, cut out whole.
   Named change for the cut: original standbyText used day and DAY_NAMES from
   the shows block. This stone uses its own hero day and hero day names, same
   values, so it does not depend on shows internal variable names, and does
   not redeclare DAY_NAMES. todayShow is still read from shows, read only.
   Guard: if the now-playing element is not on this page, do nothing.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 8 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const HERO_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const heroDay = new Date().getDay();
function standbyText() {
  if (todayShow) return `Today is ${HERO_DAY_NAMES[heroDay]} — ${todayShow.name} · ${todayShow.time}`;
  return "Standby — the needle drops when we go live";
}
const heroNowPlaying = $("nowPlaying");
if (heroNowPlaying) heroNowPlaying.textContent = standbyText();
window.CC_HERO_STANDBY_LOADED = true;
