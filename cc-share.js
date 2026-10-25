/* CYBERCROWD RADIO — share and referral only.
   One job: share and referral.
   What it is: the Share the station button. Tapping it builds
   a share link with a referral code saved in local storage,
   opens the native share sheet if the device has one, or
   copies the link if it does not. No custom dialog is added
   here, and no share words are invented: the words are the
   original words, whole, from the original file.
   Authority: share and referral only. Owns the referral code
   and the share button, nothing else.
   Uses $ from cc-base.js, stone 1. Calls say() from
   cc-toast.js, stone 5, loaded before this file, only on a tap.
   Source: app.js lines 971-994, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 29 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============ SHARE — with referral tracking ============ */
function getRefCode() {
  try {
    var code = localStorage.getItem("ccr_ref");
    if (!code) {
      code = "r" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem("ccr_ref", code);
    }
    return code;
  } catch (_) { return "rshare"; }
}
var shareBtn = $("shareBtn");
if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    var url = location.origin + location.pathname + "?ref=" + getRefCode();
    var data = { title: "Cybercrowd Radio", text: "AI plays AI — 69 songs, DJ on the decks. Sonny Daze will jack the vinyl rack.", url: url };
    try {
      if (navigator.share) { await navigator.share(data); say("Shared!"); }
      else { await navigator.clipboard.writeText(url); say("Link copied — share it!"); }
    } catch (_) {
      try { await navigator.clipboard.writeText(url); say("Link copied — share it!"); } catch (_) {}
    }
  });
}
window.CC_SHARE_LOADED = true;
