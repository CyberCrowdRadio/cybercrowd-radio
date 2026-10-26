/* CYBERCROWD RADIO — handles only.
   One job: handles, no profiles, just handles.
   Authority: handles only. Owns handle storage, handle rendering, handle pill tap.
   Calls say() for the reserved message — say lives in cc-toast.js, stone 5,
   loaded after this file, called only on user action after all stones load.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 12-86, cut out whole, IIFE indent removed.
   REVISED 2026-10-25: handle prompt removed. No prompt() in this file at all.
   If no handle is saved, getHandle returns guest, no dialog, no block.
   Handle comes from the account shoebox, not from a browser prompt.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 2 of 29, revised. Station still runs on app.js until that switch.
*/
"use strict";
const HANDLE_KEY = "ccr-handle";
const FOUNDER_HANDLE = "fatmon'lefthanded";
const RESERVED = ["cybercrowd"];
function randomHandle() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let h = "";
  for (let i = 0; i < 2; i++) h += chars[Math.floor(Math.random() * 26)];
  for (let i = 0; i < 3; i++) h += chars[Math.floor(Math.random() * 36)];
  return h;
}
function getHandle() {
  try {
    let h = localStorage.getItem(HANDLE_KEY);
    if (!h) return "guest";
    return h;
  } catch (_) { return "guest"; }
}
function isFounder(h) {
  return (h || "").toLowerCase() === FOUNDER_HANDLE;
}
function setHandle(h) {
  h = (h || "").trim().toLowerCase().replace(/[^a-z0-9'_-]/g, "");
  if (!h) return false;
  var current = "";
  try { current = localStorage.getItem(HANDLE_KEY) || ""; } catch (_) {}
  var isFounder = (current.toLowerCase() === FOUNDER_HANDLE);
  if (!isFounder && RESERVED.some(r => h.includes(r))) {
    say("That handle is reserved by the founder.");
    return false;
  }
  try { localStorage.setItem(HANDLE_KEY, h); } catch (_) {}
  renderHandle();
  return true;
}
function renderHandle() {
  const ht = $("handleText");
  const pill = $("handlePill");
  if (!ht) return;
  const h = getHandle();
  ht.textContent = h;
  if (pill) {
    if (isFounder(h)) {
      pill.classList.add("founder");
      ht.innerHTML = "★ " + h.replace(/</g, "&lt;");
    } else {
      pill.classList.remove("founder");
    }
  }
}
const handlePill = $("handlePill");
renderHandle();
if (handlePill) handlePill.addEventListener("click", () => {
  if (typeof say === "function") say("Sign in to set your handle, your shoebox holds it.");
});
window.CC_HANDLE_LOADED = true;
