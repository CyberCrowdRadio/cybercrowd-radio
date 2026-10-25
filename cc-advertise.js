/* CYBERCROWD RADIO — advertise button only.
   One job: the advertise button.
   What it is: one button that says to tell the booth which
   block you want, with Pops starting at $5.99.
   Authority: advertise button only. Owns that button, nothing
   else.
   Uses $ from cc-base.js, stone 1. Calls say() from
   cc-toast.js, stone 5, loaded before this file, only on a tap.
   Source: app.js lines 967-969, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: the listener is wired only if the
   advertise button is on this page. Original line was unguarded
   and would throw on a page without it, killing later stones.
   When the button exists, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 28 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const advertiseBtn = $("advertiseBtn");
if (advertiseBtn) advertiseBtn.addEventListener("click", () =>
  say("Tell the booth which block you want — Pops start at $5.99.")
);
window.CC_ADVERTISE_LOADED = true;
