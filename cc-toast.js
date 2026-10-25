/* CYBERCROWD RADIO — toast only.
   One job: say, the toast message.
   Authority: toast only. Owns toast element, toast timer, show and hide.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Called by other stones for messages only — say does not own their jobs.
   Source: app.js lines 101-114, cut out whole.
   Guard added for the cut: if the toast element is not on this page, say does
   nothing, so a missing toast does not kill later stones or callers.
   Original was unguarded. When toast exists, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 5 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const toast = $("toast");
let toastT = null;
function say(msg, ms = 3600) {
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 350);
  }, ms);
}
window.CC_TOAST_LOADED = true;
