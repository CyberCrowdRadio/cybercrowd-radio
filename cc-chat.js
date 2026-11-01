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


// Layout preferences contain no chat messages or account information.
let placement = "open";
try {
  const saved = JSON.parse(localStorage.getItem("cc-chat-layout") || "null");
  if (saved && saved.mode === "undocked" && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
    placement = "undocked"; dockedPos = {left:saved.left, top:saved.top};
  }
} catch (_) {}
const layoutStyle = document.createElement("style");
layoutStyle.textContent = '.chat-controls button{width:auto;min-width:44px;min-height:44px;padding:6px 10px}.chat-tab:not([hidden]){display:block}.chat-dock[data-state="closed"]{visibility:hidden}.chat-dock[data-state="undocked"]{right:auto;bottom:auto;width:320px;max-width:calc(100vw - 16px)}';
document.head.appendChild(layoutStyle);
layoutStyle.textContent += `
.chat-dock{width:400px;color:#fff}
.chat-dock[data-state="open"],.chat-dock[data-state="undocked"]{height:600px;max-height:85dvh}
.chat-dock[data-state="undocked"]{width:400px}
.chat-title{font-family:Inter,sans-serif;font-size:20px;letter-spacing:0;line-height:1.3;color:#fff}
.chat-head{gap:12px}
.chat-dock .chat-msgs li,.chat-dock[data-state="undocked"] .chat-msgs li{font-size:20px;line-height:1.5}
.chat-dock .chat-msgs .who,.chat-dock[data-state="undocked"] .chat-msgs .who{font-size:18px;letter-spacing:0;color:#ffe39a}
.chat-form{flex-wrap:wrap;flex-shrink:0}
.chat-form label{width:100%;font-size:20px;font-weight:700}
.chat-form input{min-width:0;width:100%;flex:1 1 100%;min-height:52px;font-size:20px}
.chat-form button{width:100%;min-height:56px;font-size:22px;font-weight:700}
.chat-help{padding:10px 14px;margin:0;font-size:18px;line-height:1.4;color:#fff}
.chat-note{font-size:16px;color:#f5e6bf}
.chat-tools{padding:8px 12px;flex-shrink:0;font-size:16px}
.chat-tools summary{cursor:pointer;min-height:44px;display:list-item;padding:10px 0;touch-action:manipulation}
.chat-tools button{min-height:44px;padding:8px 12px;font-size:18px}
.chat-tab:not([hidden]){width:auto;height:auto;min-height:56px;max-width:90vw;padding:14px;font-size:18px;font-weight:700}
.chat-dock button:focus-visible,.chat-dock summary:focus-visible,.chat-tab:focus-visible{outline:3px solid #fff;outline-offset:2px}
@media(max-width:860px){.chat-dock[data-state="open"]{height:100dvh;max-height:100dvh}}
`;
if (chatDock) {
  const title = chatDock.querySelector(".chat-title");
  if (title) title.textContent = "Talk to everyone listening";
  chatDock.setAttribute("aria-label", "Talk to everyone listening");
  const body = chatDock.querySelector(".chat-body");
  if (body) {
    const help = document.createElement("p");
    help.className = "chat-help"; help.id = "chatInstructions";
    help.textContent = "Type your message below, then press SEND.";
    body.insertBefore(help, body.firstChild);
    if (chatUndockBtn) {
      const movement = document.createElement("details"); movement.className = "chat-tools";
      const summary = document.createElement("summary"); summary.textContent = "Move this window";
      movement.appendChild(summary); movement.appendChild(chatUndockBtn);
      const hint = document.createElement("p");
      hint.textContent = "Press Undock, drag the title, and leave it where you want. Press Dock to return it to the corner.";
      movement.appendChild(hint); body.appendChild(movement);
    }
  }
}
if (chatForm && chatInput) {
  let label = chatForm.querySelector("label");
  if (!label) { label = document.createElement("label"); chatForm.insertBefore(label,chatInput); }
  label.className = ""; label.htmlFor = "chatInput"; label.textContent = "Your message";
  chatInput.placeholder = "Type here…";
  chatInput.setAttribute("aria-describedby", "chatInstructions");
  const send = chatForm.querySelector('button[type="submit"]');
  if (send) { send.textContent = "SEND"; send.setAttribute("aria-label", "Send your message"); }
}

function savePlacement() {
  try { localStorage.setItem("cc-chat-layout", JSON.stringify({
    mode:placement, left:dockedPos ? dockedPos.left : 0, top:dockedPos ? dockedPos.top : 0
  })); } catch (_) {}
}
function placeChat(left, top) {
  const r = chatDock.getBoundingClientRect();
  dockedPos = {
    left:Math.max(0, Math.min(Math.max(0, window.innerWidth-r.width), left)),
    top:Math.max(0, Math.min(Math.max(0, window.innerHeight-r.height), top))
  };
  chatDock.style.left = dockedPos.left + "px";
  chatDock.style.top = dockedPos.top + "px";
}
function setChatState(state) {
  if (typeof viewReady !== "undefined" && viewReady) {
    if (state === "closed" || (chatDock && chatDock.dataset.state === "closed")) clearView();
    liveView = state !== "closed";
    if (liveView) refreshIdentity();
  }
  if (!chatDock) return;
  chatDock.dataset.state = state;
  chatDock.classList.remove("fullscreen");
  if (chatTab) {
    chatTab.hidden = state !== "closed";
    chatTab.textContent = "TALK TO PEOPLE";
    chatTab.setAttribute("aria-label", "Talk to everyone listening");
  }
  if (state !== "closed") {
    placement = state;
    if (state === "open") {
      chatDock.style.left = ""; chatDock.style.top = "";
      if (isMobile()) chatDock.classList.add("fullscreen");
    } else {
      placeChat(dockedPos ? dockedPos.left : 16, dockedPos ? dockedPos.top : 16);
    }
    savePlacement();
    setTimeout(() => { if (chatInput) chatInput.focus({preventScroll:true}); }, 380);
  }
  if (chatUndockBtn) {
    chatUndockBtn.textContent = placement === "undocked" ? "Dock" : "Undock";
    chatUndockBtn.setAttribute("aria-label", placement === "undocked" ? "Dock chat" : "Undock chat — drag the header to move");
    chatUndockBtn.title = chatUndockBtn.getAttribute("aria-label");
  }
}
if (chatMinBtn) {
  chatMinBtn.textContent = "Hide";
  chatMinBtn.setAttribute("aria-label", "Minimize chat");
  chatMinBtn.addEventListener("click", () => setChatState("closed"));
}
if (chatTab) chatTab.addEventListener("click", () => setChatState(placement));
if (chatUndockBtn) chatUndockBtn.addEventListener("click", () => {
  if (chatDock.dataset.state === "undocked") setChatState("open");
  else {
    const r = chatDock.getBoundingClientRect();
    dockedPos = {left:r.left, top:r.top};
    setChatState("undocked");
  }
});
// Drag only the header; release leaves the box in place.
let cDrag = null;
if (chatHead) chatHead.addEventListener("pointerdown", e => {
  if (e.target.closest("button, details, summary") || (e.button !== undefined && e.button !== 0)) return;
  if (chatDock.dataset.state !== "undocked") {
    const r = chatDock.getBoundingClientRect();
    dockedPos = {left:r.left, top:r.top};
    setChatState("undocked");
  }
  const r = chatDock.getBoundingClientRect();
  cDrag = {id:e.pointerId, x:e.clientX-r.left, y:e.clientY-r.top};
  chatHead.setPointerCapture(e.pointerId);
  e.preventDefault();
});
if (chatHead) chatHead.addEventListener("pointermove", e => {
  if (!cDrag || cDrag.id !== e.pointerId || !chatHead.hasPointerCapture(e.pointerId)) return;
  placeChat(e.clientX-cDrag.x, e.clientY-cDrag.y);
});
["pointerup","pointercancel","lostpointercapture"].forEach(ev => {
  if (chatHead) chatHead.addEventListener(ev, () => {
    if (cDrag) savePlacement();
    cDrag = null;
  });
});
window.addEventListener("resize", () => {
  if (chatDock && chatDock.dataset.state === "undocked" && dockedPos) {
    placeChat(dockedPos.left,dockedPos.top); savePlacement();
  }
});



let room = null, connected = false, sending = false;
let snapshotValue = null, currentRound = null, baseline = new Set();
let ownSender = "", host = false, moderator = false, identityRound = "", firstSnapshot = true;
let liveView = !isMobile(), viewReady = false;
const note = chatDock && chatDock.querySelector(".chat-note");
function status(text) { if (note) note.textContent = text; }
function session() { try { return localStorage.getItem("ccr-session") || ""; } catch (_) { return ""; } }
async function ask(action, more) {
  if (!window.CCAuthority || !session()) return { success: false, error: "sign in required" };
  return window.CCAuthority.ask("/api/chat", Object.assign({ session: session(), action, round: currentRound || "initial" }, more || {}));
}
const actions = document.createElement("div");
actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;padding:10px";
function button(label, fn) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = label;
  b.style.cssText = "min-height:44px;padding:8px 12px;border:1px solid #c9a227;border-radius:8px;background:#101719;color:#f5e6bf;font:inherit;cursor:pointer";
  b.addEventListener("click", fn); actions.appendChild(b); return b;
}
const roundLabel = document.createElement("p");
roundLabel.style.cssText = "padding:0 12px;color:#e9c979";
const clearButton = button("Clear my view", clearView);
button("Roles & reports", () => window.open("administration.html", "_blank", "noopener"));
const resetButton = button("Start new round", () => hostAction("reset"));
const roundCount = document.createElement("input");
roundCount.type = "number"; roundCount.min = "1"; roundCount.step = "1";
roundCount.placeholder = "Number of comments"; roundCount.setAttribute("aria-label", "Number of comments in the round");
roundCount.style.cssText = "width:180px;min-height:44px;font:inherit;padding:8px";
roundCount.hidden = true; actions.appendChild(roundCount);
const tenButton = button("Start numbered round", () => hostAction("numbered"));
resetButton.hidden = true; tenButton.hidden = true;
if (chatMsgs && chatMsgs.parentNode) {
  const options = document.createElement("details"); options.className = "chat-tools";
  const summary = document.createElement("summary"); summary.textContent = "More options";
  options.appendChild(summary); options.appendChild(actions);
  chatMsgs.parentNode.appendChild(options);
  chatMsgs.parentNode.insertBefore(roundLabel, chatMsgs);
}
function messages() { return snapshotValue && snapshotValue.messages || {}; }
function clearView() {
  baseline = new Set(Object.keys(messages()));
  if (chatMsgs) chatMsgs.textContent = "";
}
function render() {
  if (!chatMsgs) return;
  chatMsgs.textContent = "";
  if (!liveView) return;
  const rows = messages();
  Object.keys(rows).sort((a,b) => rows[a].createdAt - rows[b].createdAt || a.localeCompare(b)).forEach(key => {
    if (baseline.has(key)) return;
    const m = rows[key];
    if (!m || typeof m.stageName !== "string" || typeof m.text !== "string") return;
    chatSay((m.number ? "#" + m.number + " " : "") + m.stageName.slice(0,60), m.text.slice(0,240));
    if (identityRound === currentRound && (m.sender === ownSender || moderator)) {
      const li = chatMsgs.lastElementChild;
      const retract = document.createElement("button");
      retract.type = "button"; retract.textContent = m.sender === ownSender ? "Retract" : "Remove";
      retract.setAttribute("aria-label", m.sender === ownSender ? "Retract your message" : "Remove message as moderator");
      retract.style.cssText = "margin:8px;min-height:44px;color:#e9c979;background:#101719;border:1px solid #c9a227;border-radius:6px";
      retract.addEventListener("click", async () => {
        retract.disabled = true;
        try {
          const answer = await ask(m.sender === ownSender ? "retract" : "remove", {messageId:key});
          if (!answer || !answer.success) { status("Could not retract that message. Try again."); retract.disabled = false; }
        } catch (_) { status("Could not retract that message. Try again."); retract.disabled = false; }
      });
      li.appendChild(retract);
    }
  });
}
async function refreshIdentity() {
  try {
    const result = await ask("status");
    host = !!(result && result.success && result.host);
    moderator = !!(result && result.success && result.moderator);
    ownSender = result && result.success ? result.sender || "" : "";
    identityRound = result && result.success ? result.round || "" : "";
    resetButton.hidden = !host; tenButton.hidden = !host; roundCount.hidden = !host;
    render();
  } catch (_) { resetButton.hidden = true; tenButton.hidden = true; roundCount.hidden = true; }
}
async function hostAction(action) {
  if (!host || sending) return;
  const limit = action === "numbered" ? Number(roundCount.value) : undefined;
  if (action === "numbered" && (!Number.isSafeInteger(limit) || limit < 1)) {
    status("Choose a whole number of comments, starting at 1."); roundCount.focus(); return;
  }
  if (!window.confirm(action === "numbered"
      ? "Clear the shared room and number the next " + limit + " messages?"
      : "Clear the shared room and start a new round?")) return;
  sending = true;
  resetButton.disabled = true; tenButton.disabled = true;
  try {
    const result = await ask(action, limit === undefined ? {} : {limit});
    status(result && result.success ? "New round started." : "The room could not be reset. Try again.");
  } catch (_) { status("The room could not be reset. Try again."); }
  finally { sending = false; resetButton.disabled = false; tenButton.disabled = false; }
}
function connect() {
  try {
    const cfg = window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig;
    if (!window.firebase || !cfg) { status("Chat connection is unavailable. Reload to try again."); return; }
    if (!window.firebase.apps.length) window.firebase.initializeApp(cfg);
    room = window.firebase.database().ref("booth-chat");
    room.on("value", function(snapshot) {
      const value = snapshot.val();
      snapshotValue = value && value.meta ? value : {meta:{id:"initial",mode:"open",count:0},messages:value || {}};
      const changed = currentRound !== snapshotValue.meta.id;
      currentRound = snapshotValue.meta.id;
      if (firstSnapshot) { clearView(); firstSnapshot = false; }
      else if (changed) { baseline = new Set(); refreshIdentity(); }
      const limit = snapshotValue.meta.mode === "next10" ? 10 : snapshotValue.meta.limit;
      roundLabel.textContent = limit
        ? "Numbered round: " + Math.min(snapshotValue.meta.count,limit) + " of " + limit + " received"
        : "Live World chat";
      render();
    }, function() { status("Chat could not load. Your radio keeps playing."); });
    window.firebase.database().ref(".info/connected").on("value", function(snapshot) {
      connected = snapshot.val() === true;
      status(connected ? "Live room — earlier messages do not replay when you return." : "Chat is offline. Your radio keeps playing.");
      if (connected) refreshIdentity();
    });
  } catch (_) { status("Chat could not connect. Reload to try again."); }
}
if (chatForm) chatForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const text = (chatInput ? chatInput.value : "").trim();
  if (!text || sending) return;
  if (text.length > 240) { status("Keep your message within 240 characters."); return; }
  if (!room || !connected) { status("Chat is offline. Your message is still here."); return; }
  sending = true;
  try {
    const result = await ask("post", {text});
    if (!result || !result.success) {
      status(result && result.error === "sign in required"
        ? "Please sign in again. Your message is still here."
        : (result && result.error === "round changed"
          ? "A new round has started. Tap send again to join it."
          : "Your message could not be posted. It is still here; try again."));
      return;
    }
    if (chatInput.value.trim() === text) chatInput.value = "";
    status("World chat");
  } catch (_) { status("Your message could not be posted. It is still here; try again."); }
  finally { sending = false; }
});
viewReady = true;
setChatState(isMobile() ? "closed" : placement);
window.addEventListener("storage", function(e) {
  if (e.key === "ccr-session") { clearView(); refreshIdentity(); }
});
window.addEventListener("pagehide", function() { clearView(); firstSnapshot = true; });
setInterval(refreshIdentity,30000);
connect();
window.CC_CHAT_LOADED = true;
})();
