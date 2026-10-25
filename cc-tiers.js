/* CYBERCROWD RADIO — membership tiers only.
   One job: membership tiers.
   What it is: the tier cards on the join page, each with name, price,
   blurb and perks, and a button that scrolls to listen for Free tiers
   or says checkout or keeper payments are not wired yet for paid tiers.
   Authority: tiers only. Owns tier rendering, nothing else.
   Uses $ , cfg and reduced from cc-base.js, stone 1, loaded before
   this file. Calls say() from cc-toast.js, stone 5, loaded before
   this file, only on a tap.
   Source: app.js lines 228-259, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: the listen scroll and the email focus
   run only if those elements exist. Original lines assumed them.
   When they exist, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 13 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ---------- membership tiers ---------- */
const tiersGrid = $("tiersGrid");
if (tiersGrid) {
const stripeLive = (cfg.stripePublishableKey || "").trim() !== "";
(cfg.memberships || []).forEach((m, i) => {
  const el = document.createElement("div");
  el.className = "tier" + (i === 1 ? " featured" : "");
  el.innerHTML = `
      <p class="tier-name">${m.name}</p>
      <p class="tier-price">${m.price}</p>
      <p class="tier-blurb">${m.blurb}</p>
      <ul>${(m.perks || []).map((p) => `<li>${p}</li>`).join("")}</ul>`;
  const btn = document.createElement("button");
  btn.className = "btn-brass";
  btn.type = "button";
  btn.textContent = m.price === "Free" ? "Start listening" : "Become " + m.name;
  btn.addEventListener("click", () => {
    if (m.price === "Free") {
      const listenEl = document.querySelector("#listen");
      if (listenEl) listenEl.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      return;
    }
    if (!stripeLive) {
      say("Keeper payments aren't wired yet — drop your email below and we'll hold your seat.");
      const emailAddr = document.querySelector("#emailAddr");
      if (emailAddr) emailAddr.focus();
      return;
    }
    say("Checkout opens here when Stripe is connected.");
  });
  el.appendChild(btn);
  tiersGrid.appendChild(el);
});
} // end if (tiersGrid) — tiers live on join.html now
window.CC_TIERS_LOADED = true;
