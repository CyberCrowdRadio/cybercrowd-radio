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
    chatTab.textContent = "Chat";
    chatTab.setAttribute("aria-label", "Open chat");
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
  chatMinBtn.textContent = "–";
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
  if (e.target.closest("button") || (e.button !== undefined && e.button !== 0)) return;
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
  chatMsgs.parentNode.insertBefore(actions, chatMsgs);
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
