/* CYBERCROWD RADIO — footer year only.
   One job: set the footer year to the current year.
   Authority: footer year only. Owns nothing else.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js line 87-89, cut out whole.
   Guard added for the cut: if the year element is not on this page, do nothing,
   so a missing footer does not kill later stones. Original line was unguarded.
   When the year element exists, effect is identical to the original.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 3 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const yearEl = $("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
window.CC_FOOTER_YEAR_LOADED = true;
