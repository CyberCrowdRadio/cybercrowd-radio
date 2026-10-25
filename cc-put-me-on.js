/* CYBERCROWD RADIO — Put Me On only.
   One job: the Put Me On button.
   What it is: one button that puts the listener in the queue and
   says Sonny Daze picks who is on, then disables itself and reads
   IN THE QUEUE.
   Authority: Put Me On only. Owns that button and its status line.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 474-483, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 17 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const putMeOnBtn = $("putMeOnBtn");
const putMeOnStatus = $("putMeOnStatus");
if (putMeOnBtn) putMeOnBtn.addEventListener("click", () => {
  if (putMeOnStatus) {
    putMeOnStatus.hidden = false;
    putMeOnStatus.textContent = "You're in the queue — Sonny Daze picks who's on.";
  }
  putMeOnBtn.disabled = true;
  putMeOnBtn.textContent = "IN THE QUEUE";
});
window.CC_PUT_ME_ON_LOADED = true;
