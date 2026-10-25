/* CYBERCROWD RADIO — chat dock only.
   One job: the chat dock.
   What it is: the chat dock that opens, closes, undocks and
   drags by its header, with a local echo until the live
   backend lands, never faked as live.
   Authority: chat dock only. Owns chat dock state, messages
   and drag, nothing else.
   Uses $ from cc-base.js, stone 1. Calls say() from
   cc-toast.js, stone 5, loaded before this file, only when
   the dock is undocked.
   Source: app.js lines 738-839, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: chatSay returns early if the message
   list is missing, setChatState returns early if the dock is
   missing, and every chat listener is wired only if its button
   or dock piece exists. Original lines assumed all chat pieces
   exist. When they exist, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 23 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   CHAT DOCK — open / closed / undocked-and-draggable
   ============================================================ */
const chatDock = $("chatDock");
const chatHead = $("chatHead");
const chatTab = $("chatTab");
const chatMinBtn = $("chatMinBtn");
const chatUndockBtn = $("chatUndockBtn");
const chatMsgs = $("chatMsgs");
const chatForm = $("chatForm");
const chatInput = $("chatInput");
const isMobile = () => window.matchMedia("(max-width: 860px)").matches;
let dockedPos = null; // remembered {left, top} when undocked

function chatSay(who, text, sys) {
  if (!chatMsgs) return;
  const li = document.createElement("li");
  if (sys) li.innerHTML = `<span class="sys">${text}</span>`;
  else li.innerHTML = `<span class="who">${who}</span>${text}`;
  chatMsgs.appendChild(li);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}
if (chatMsgs) chatSay(null, "The booth is quiet until we go live. Leave a message — the station answers back.", true);

// Mobile starts with chat closed behind the ">" tab (full-screen when opened).
// Desktop starts docked open.
if (isMobile()) setChatState("closed");

function setChatState(state) {
  if (!chatDock) return;
  chatDock.dataset.state = state;
  chatDock.classList.remove("fullscreen");
  if (state === "closed") {
    if (chatTab) { chatTab.hidden = false;
    chatTab.setAttribute("aria-label", "Open chat"); }
  } else {
    if (chatTab) chatTab.hidden = true;
    if (state === "open") {
      chatDock.style.left = "";
      chatDock.style.top = "";
      if (isMobile()) chatDock.classList.add("fullscreen");
    }
    if (state === "undocked" && dockedPos) {
      chatDock.style.left = dockedPos.left + "px";
      chatDock.style.top = dockedPos.top + "px";
    }
    setTimeout(() => { if (chatInput) chatInput.focus({ preventScroll: true }); }, 380);
  }
}

if (chatMinBtn) chatMinBtn.addEventListener("click", () => setChatState("closed"));
if (chatTab) chatTab.addEventListener("click", () => setChatState("open"));
if (chatUndockBtn) chatUndockBtn.addEventListener("click", () => {
  if (chatDock.dataset.state === "undocked") setChatState("open");
  else {
    const r = chatDock.getBoundingClientRect();
    dockedPos = { left: r.left, top: r.top };
    chatDock.style.left = r.left + "px";
    chatDock.style.top = Math.min(r.top, window.innerHeight - 200) + "px";
    setChatState("undocked");
    say("Chat undocked — drag the header anywhere.");
  }
});

// drag the dock by its header (touch + mouse)
let cDrag = null;
if (chatHead) chatHead.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  if (chatDock.dataset.state !== "undocked") {
    const r = chatDock.getBoundingClientRect();
    dockedPos = { left: r.left, top: r.top };
    chatDock.style.left = r.left + "px";
    chatDock.style.top = Math.min(r.top, window.innerHeight - 200) + "px";
    chatDock.dataset.state = "undocked";
  }
  cDrag = { x: e.clientX - chatDock.getBoundingClientRect().left, y: e.clientY - chatDock.getBoundingClientRect().top };
  chatHead.setPointerCapture(e.pointerId);
});
if (chatHead) chatHead.addEventListener("pointermove", (e) => {
  if (!cDrag || !chatHead.hasPointerCapture(e.pointerId)) return;
  const x = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - cDrag.x));
  const y = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - cDrag.y));
  chatDock.style.left = x + "px";
  chatDock.style.top = y + "px";
});
["pointerup", "pointercancel"].forEach((ev) => {
  if (chatHead) chatHead.addEventListener(ev, () => {
    if (cDrag) {
      const r = chatDock.getBoundingClientRect();
      dockedPos = { left: r.left, top: r.top };
    }
    cDrag = null;
  });
});

if (chatForm) chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (chatInput ? chatInput.value : "").trim();
  if (!text) return;
  chatSay("You", text.replace(/</g, "&lt;"));
  if (chatInput) chatInput.value = "";
  // Local echo until the live backend lands — honest, never faked as live.
  setTimeout(() => chatSay(null, "Noted — the booth answers back when we're live.", true), 900);
});
window.CC_CHAT_LOADED = true;
