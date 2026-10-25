/* CYBERCROWD RADIO — handles only.
   One job: handles, no profiles, just handles.
   Authority: handles only. Owns handle storage, handle rendering, handle pill tap.
   Calls say() for the reserved message — say lives in cc-toast.js, stone 5,
   loaded after this file, called only on user action after all stones load.
   Uses $ from cc-base.js, stone 1, loaded before this file.
   Source: app.js lines 12-86, cut out whole, IIFE indent removed, no logic changed.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 2 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const HANDLE_KEY = "ccr-handle";
const FOUNDER_HANDLE = "fatmon'lefthanded";
const RESERVED = ["cybercrowd"]; // James owns it — blocked for everyone, no exceptions
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
    // Don't auto-generate random junk — ask the user to pick their handle
    // James: "it always randomly picks my name... Thats not becoming a part of the radio"
    if (!h) {
      h = prompt("Pick your handle for the station:", "");
      if (h) {
        h = h.trim().toLowerCase().replace(/[^a-z0-9'_-]/g, "");
        if (h && !RESERVED.some(r => h.includes(r))) {
          localStorage.setItem(HANDLE_KEY, h);
          return h;
        }
      }
      // If they cancel or enter invalid, use guest (not random)
      return "guest";
    }
    return h;
  } catch (_) { return "guest"; }
}
function isFounder(h) {
  return (h || "").toLowerCase() === FOUNDER_HANDLE;
}
function setHandle(h) {
  h = (h || "").trim().toLowerCase().replace(/[^a-z0-9'_-]/g, "");
  if (!h) return false;
  // Block cybercrowd for everyone EXCEPT the founder — James owns it.
  // If your current handle is the founder handle, you can claim it.
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
    // Visual original from founder — gold mark
    if (isFounder(h)) {
      pill.classList.add("founder");
      ht.innerHTML = "★ " + h.replace(/</g, "&lt;");
    } else {
      pill.classList.remove("founder");
    }
  }
}
// Tap the handle pill to change your handle.
const handlePill = $("handlePill");
renderHandle();
if (handlePill) handlePill.addEventListener("click", () => {
  const cur = getHandle();
  const next = prompt("Your handle:", cur);
  if (next !== null) setHandle(next);
});
window.CC_HANDLE_LOADED = true;
