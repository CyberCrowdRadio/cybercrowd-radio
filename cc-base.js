/* CYBERCROWD RADIO — base helpers only.
   One job: shared helpers for later stones.
   Authority: helpers only. Owns no page, no handle, no sound, no chat.
   Source: app.js lines 1-11, cut out whole, IIFE wrapper removed so later
   stones loaded after this file can use cfg, $, reduced as shared globals.
   This file alone does nothing visible. It is stone 1 of 29.
   Station still runs on app.js until the loader switch after stone 29.
*/
"use strict";
const cfg = window.STATION_CONFIG || {};
const $ = (id) => document.getElementById(id);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
window.CC_BASE_LOADED = true;
