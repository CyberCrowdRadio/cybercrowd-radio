/* CYBERCROWD RADIO — forms only.
   One job: forms.
   What it is: wireForm, the shared submit handler, plus the
   donor form call and the email form call. The donor form
   call reads donor data and renders the wall, it does not
   own donor data.
   Authority: forms only. Owns form submit wiring, nothing else.
   Uses $ from cc-base.js, stone 1. Uses loadDonors, DONOR_KEY
   and renderDonors from cc-donor-wall.js, stone 11, loaded
   before this file, only inside the donor form call.
   NOTE ON ORDER: the wireForm definition is original lines
   864-877. The donor and email form calls are original lines
   954-965. In the original file they sit after the request
   queue in file order, but by job they are forms, so they
   are cut here, not in the request queue stone. No line is
   duplicated in any other stone.
   Source: app.js lines 864-877 plus 954-965, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 25 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   FORMS — front-end only until backends are wired (see README)
   ============================================================ */
function wireForm(formId, msgId, okText) {
  const form = $(formId), msg = $(msgId);
  if (!form || !msg) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // TODO: POST to backend (Cloudflare Worker + D1/KV, or form service).
    msg.hidden = false;
    msg.textContent = okText(form);
    form.reset();
  });
}

// Donor and email form calls, original lines 954-965.
wireForm("donorForm", "donorMsg", (f) => {
  const rec = f.querySelector("#donorRecord").value.trim();
  const name = f.querySelector("#donorName").value.trim();
  const donors = loadDonors();
  donors.unshift({ name: name.replace(/</g, "&lt;"), record: rec.replace(/</g, "&lt;") });
  try { localStorage.setItem(DONOR_KEY, JSON.stringify(donors.slice(0, 60))); } catch (_) {}
  renderDonors();
  return `Logged, ${name} — "${rec}" is on the caretaker's desk. Your plaque is on the wall.`;
});
wireForm("emailForm", "emailMsg", () =>
  "You're on the list — the Sunday caretaker letter lands weekly."
);
window.CC_FORMS_LOADED = true;
