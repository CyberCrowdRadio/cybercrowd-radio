/* CYBERCROWD RADIO — retired segments only.
   One job: the retired segments list.
   What it is: the preserved list of retired show segments, kept, never deleted.
   Each entry is a line with the segment name in bold, then its note.
   It lives on the shows page, and it is a record, not a live show list.
   Authority: retired segments only. Owns retired list rendering, nothing else.
   Uses $ and cfg from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 164-173, cut out whole.
   Guard: if the retired list is not on this page, do nothing.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 9 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const retiredList = $("retiredList");
if (retiredList) {
  (cfg.retiredSegments || []).forEach((r) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${r.name}</strong> — ${r.note}`;
    retiredList.appendChild(li);
  });
}
window.CC_RETIRED_LOADED = true;
