/* CYBERCROWD RADIO — shared World chat dock.
   Reads booth-chat from Firebase. Account authority supplies the stage
   name. Free posts go through the account authority. No email, ZIP, or session is
   written to messages. Existing dock controls stay in this file. */
"use strict";
/* ============================================================
   CHAT DOCK — open / closed / undocked-and-draggable
   ============================================================ */
(function () {
const $ = (id) => document.getElementById(id);
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
  if (sys) li.textContent = text;
  else {
    const name = document.createElement("span");
    name.className = "who";
    name.textContent = who + ": ";
    li.appendChild(name);
    li.appendChild(document.createTextNode(text));
  }
  chatMsgs.appendChild(li);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}


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
    if (typeof window.say === "function") window.say("Chat undocked — drag the header anywhere.");
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


let room = null;
let connected = false;
let sending = false;
const note = chatDock && chatDock.querySelector(".chat-note");
function status(text) { if (note) note.textContent = text; }

function connect() {
  try {
    const cfg = window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig;
    if (!window.firebase || !cfg) { status("Chat connection is unavailable. Reload to try again."); return; }
    if (!window.firebase.apps.length) window.firebase.initializeApp(cfg);
    room = window.firebase.database().ref("booth-chat");
    room.limitToLast(100).on("value", function(snapshot) {
      if (!chatMsgs) return;
      chatMsgs.textContent = "";
      snapshot.forEach(function(child) {
        const message = child.val();
        if (!message || typeof message.stageName !== "string" || typeof message.text !== "string") return;
        chatSay(message.stageName.slice(0, 60), message.text.slice(0, 240));
      });
    }, function() { status("Chat could not load. Your radio keeps playing."); });
    window.firebase.database().ref(".info/connected").on("value", function(snapshot) {
      connected = snapshot.val() === true;
      status(connected ? "World chat — free with your signed-in account." : "Chat is offline. Your radio keeps playing.");
    });
  } catch (_) { status("Chat could not connect. Reload to try again."); }
}

if (chatForm) chatForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const text = (chatInput ? chatInput.value : "").trim();
  if (!text || sending) return;
  if (text.length > 240) { status("Keep your message within 240 characters."); return; }
  if (!room || !connected) { status("Chat is offline. Your message is still here."); return; }
  let session = "";
  try { session = localStorage.getItem("ccr-session") || ""; } catch (_) {}
  if (!session || !window.CCAuthority) { status("Sign in to use your stage name in chat."); return; }
  sending = true;
  try {
    const result = await window.CCAuthority.ask("/api/chat", { session: session, text: text });
    if (!result || result.success !== true) {
      const error = result && result.error;
      status(error === "sign in required"
        ? "Please sign in again. Your message is still here."
        : (error === "chat setup required"
          ? "World chat is being connected. Your message is still here."
          : "Your message could not be posted. It is still here; try again."));
      return;
    }
    if (chatInput.value.trim() === text) chatInput.value = "";
    status("World chat");
  } catch (_) {
    status("Your message could not be posted. It is still here; try again.");
  } finally { sending = false; }
});
connect();
window.CC_CHAT_LOADED = true;
})();
