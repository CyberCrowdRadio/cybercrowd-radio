/* CYBERCROWD RADIO — mobile nav only.
   One job: mobile nav open and close.
   Authority: mobile nav only. Owns nothing else.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 90-100, cut out whole.
   Guard added for the cut: if menu button or mobile nav is not on this page,
   do nothing, so a missing nav does not kill later stones. Original was unguarded.
   When both elements exist, effect is identical to the original.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 4 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const menuBtn = $("menuBtn");
const mobileNav = $("mobileNav");
if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  mobileNav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => mobileNav.classList.remove("open"))
  );
}
window.CC_MOBILE_NAV_LOADED = true;
