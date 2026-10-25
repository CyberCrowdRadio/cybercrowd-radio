/* CYBERCROWD RADIO — archive mail only.
   One job: the archive mail line.
   What it is: one line that says where to mail LPs, filled from the
   archive mail address in config, only if both the address and the
   line element exist.
   Authority: archive mail only. Owns that one line, nothing else.
   Uses $ and cfg from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 223-226, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 12 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ---------- archive mail line ---------- */
const mailTo = (cfg.archive && cfg.archive.mailTo || "").trim();
const mailLineEl = $("mailLine");
if (mailTo && mailLineEl) mailLineEl.textContent = "Mail your LPs to: " + mailTo;
window.CC_ARCHIVE_MAIL_LOADED = true;
