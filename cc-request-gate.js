/* CYBERCROWD RADIO — request gate only.
   One job: the request subscriber gate.
   What it is: the request line is subscriber-only, gated behind
   signup. If the signup list is empty, the request form is hidden
   and the request gate is shown.
   Authority: request gate only. Owns that hide and show, nothing else.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js request gate block, cut out whole, IIFE indent removed.
   Ruling on the overlap: this gate block sits inside the forms range
   in the plan, so it is cut here as stone 26 alone, and stone 25
   is wireForm only, so no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 26 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* Request line is subscriber-only: gate behind signup (cybercrowd-list). */
try {
  const list = JSON.parse(localStorage.getItem("cybercrowd-list") || "[]");
  if (!list.length) {
    const form = $("requestForm"), gate = $("requestGate");
    if (form) form.hidden = true;
    if (gate) gate.hidden = false;
  }
} catch (_) {}
window.CC_REQUEST_GATE_LOADED = true;
