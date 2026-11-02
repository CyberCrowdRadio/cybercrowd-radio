/* CYBERCROWD RADIO — World conversation and separate Booth inbox.
   Reads and posts go through account authority after entry eligibility checks.
   Authority supplies the stage name. No email, ZIP, or session is
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
.chat-head{gap:12px;flex-shrink:0}
.chat-menu{font-size:16px;margin-left:auto}
.chat-menu summary{cursor:pointer;min-height:44px;padding:10px 4px;touch-action:manipulation;white-space:nowrap}
.chat-menu>div{position:absolute;z-index:3;top:70px;right:8px;left:8px;max-height:65dvh;overflow:auto;background:#101719;border:1px solid #c9a227;border-radius:10px;box-shadow:0 8px 20px #000}
.chat-menu>div button{width:100%;text-align:left;min-height:44px}
.chat-menu summary:focus-visible{outline:3px solid white}
.chat-title{font-size:18px}
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
    chatTab.textContent = "CHAT";
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
let destination = "world", destinationChosen = false, reading = false, lastSession = "";
let snapshotValue = null, currentRound = null, baseline = new Set();
let ownSender = "", host = false, moderator = false, identityRound = "", firstSnapshot = true;
let liveView = !isMobile(), viewReady = false;
const note = chatDock && chatDock.querySelector(".chat-note");
function status(text) { if (note) note.textContent = text; }
function session() { try { return localStorage.getItem("ccr-session") || ""; } catch (_) { return ""; } }
async function ask(action, more) {
  if (!window.CCAuthority || !session()) return { success: false, error: "sign in required" };
  return window.CCAuthority.ask("/api/chat", Object.assign({ session: session(), action, destination, round: currentRound || "initial" }, more || {}));
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
button("World — talk with listeners", () => selectDestination("world"));
button("To the Booth — message the station", () => selectDestination("booth"));
button("Roles & reports", () => window.open("administration.html", "_blank", "noopener"));
const protectButton = button("Protect chat access — owner setup", async () => {
  if (!window.confirm("Require Authority-approved access to World and Booth messages? This backs up the Firebase rules, closes direct client access to these two chat branches, and preserves messages and other database branches.")) return;
  protectButton.disabled = true;
  try {
    const result = await ask("secure-access");
    status(result && result.success ? "Chat database access protected." : (result && result.error || "Chat protection could not be applied."));
  } catch (_) { status("Chat protection could not be applied."); }
  finally { protectButton.disabled = false; }
});
protectButton.hidden = true;
const verifyButton = document.createElement("button");
verifyButton.type = "button"; verifyButton.textContent = "Confirm my email for chat"; verifyButton.hidden = true;
verifyButton.style.cssText = "min-height:48px;padding:10px;font-size:18px;color:#fff;background:#101719;border:1px solid #c9a227;border-radius:8px";
verifyButton.addEventListener("click", () => {
  if (window.CCSignup && window.CCSignup.verifyChat) window.CCSignup.verifyChat();
});
if (chatForm) chatForm.after(verifyButton);
const resetButton = button("Start new round", () => hostAction("reset"));
const roundCount = document.createElement("input");
roundCount.type = "number"; roundCount.min = "1"; roundCount.step = "1";
roundCount.placeholder = "Number of comments"; roundCount.setAttribute("aria-label", "Number of comments in the round");
roundCount.style.cssText = "width:180px;min-height:44px;font:inherit;padding:8px";
roundCount.hidden = true; actions.appendChild(roundCount);
const tenButton = button("Start numbered round", () => hostAction("numbered"));
resetButton.hidden = true; tenButton.hidden = true;
if (chatMsgs && chatMsgs.parentNode) {
  const options = document.createElement("details"); options.className = "chat-menu";
  const summary = document.createElement("summary"); summary.textContent = "Chat menu";
  options.appendChild(summary); options.appendChild(actions);
  if (chatUndockBtn) actions.appendChild(chatUndockBtn);
  const moveHint = document.createElement("p");
  moveHint.textContent = "Undock, drag the title, and leave it where you want. Dock returns it to the corner.";
  actions.appendChild(moveHint);
  if (chatHead) chatHead.appendChild(options);
  else chatMsgs.parentNode.insertBefore(options,chatMsgs);
  chatMsgs.parentNode.insertBefore(roundLabel, chatMsgs);
}
function messages() { return snapshotValue && snapshotValue.messages || {}; }
function clearView() {
  baseline = new Set(Object.keys(messages()));
  if (chatMsgs) chatMsgs.textContent = "";
}
function discardRoom() {
  snapshotValue = null; currentRound = null; baseline = new Set(); firstSnapshot = true;
  ownSender = ""; identityRound = ""; connected = false; room = null;
  host = false; moderator = false;
  resetButton.hidden = true; tenButton.hidden = true; roundCount.hidden = true;
  if (chatMsgs) chatMsgs.textContent = "";
}
function selectDestination(next) {
  if (sending) { status("Wait for your current message to finish before changing destinations."); return; }
  if (chatInput && chatInput.value.trim()) {
    status("Send or erase your draft before changing destinations. It stays addressed to " + (destination === "world" ? "World." : "the booth.")); return;
  }
  destinationChosen = true;
  if (destination !== next) { destination = next; discardRoom(); }
  updateDestination(); refreshIdentity();
}
function updateDestination() {
  const title = chatDock && chatDock.querySelector(".chat-title");
  if (title) title.textContent = destination === "world" ? "World — talk with listeners" : "To the Booth";
  const label = chatForm && chatForm.querySelector("label");
  if (label) label.textContent = destination === "world" ? "Your message to World" : "Your message to the booth";
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
          else refreshIdentity();
        } catch (_) { status("Could not retract that message. Try again."); retract.disabled = false; }
      });
      li.appendChild(retract);
    }
  });
}
async function refreshIdentity() {
  if (reading || !liveView || document.hidden) return;
  const token = session(), target = destination;
  if (token !== lastSession) { discardRoom(); protectButton.hidden = true; lastSession = token; }
  if (!token) { discardRoom(); verifyButton.hidden = true; status("Sign in with your verified account to enter chat."); return; }
  reading = true;
  try {
    const result = await ask("read");
    if (token !== session() || target !== destination || !liveView) return;
    protectButton.hidden = !(result && (result.role === "owner" || result.owner === true));
    verifyButton.hidden = !(result && result.error === "verification required");
    if (!result || !result.success || !result.room) {
      discardRoom();
      status(result && result.error === "verification required"
        ? "Confirm your email and human check once to enter chat. Your existing account stays the same."
        : "Chat is unavailable. Your radio keeps playing.");
      return;
    }
    // Station operators begin at their booth, without World comments flooding it.
    if (!destinationChosen && result.host && destination === "world") {
      destination = "booth"; destinationChosen = true; discardRoom(); updateDestination(); return;
    }
    destinationChosen = true;
    host = !!(result && result.success && result.host);
    moderator = !!(result && result.success && result.moderator);
    ownSender = result && result.success ? result.sender || "" : "";
    identityRound = result && result.success ? result.round || "" : "";
    snapshotValue = result.room;
    const changed = currentRound !== snapshotValue.meta.id;
    currentRound = snapshotValue.meta.id;
    if (firstSnapshot) { clearView(); firstSnapshot = false; }
    else if (changed) baseline = new Set();
    connected = true; room = target;
    if (window.CCSignup && window.CCSignup.chatReady) window.CCSignup.chatReady();
    const limit = snapshotValue.meta.mode === "next10" ? 10 : snapshotValue.meta.limit;
    roundLabel.textContent = limit ? "Numbered round: " + Math.min(snapshotValue.meta.count,limit) + " of " + limit
      : (target === "world" ? "World conversation" : (moderator ? "Messages addressed to the booth" : "Your messages to the booth"));
    updateDestination();
    resetButton.hidden = !host; tenButton.hidden = !host; roundCount.hidden = !host;
    render();
    status(target === "world" ? "Live World conversation" : "To the Booth — separate from World conversation");
  } catch (_) { discardRoom(); status("Chat is unavailable. Your radio keeps playing."); }
  finally { reading = false; }
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
    if (result && result.success) refreshIdentity();
  } catch (_) { status("The room could not be reset. Try again."); }
  finally { sending = false; resetButton.disabled = false; tenButton.disabled = false; }
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
    status(destination === "world" ? "World conversation" : "To the Booth");
    refreshIdentity();
  } catch (_) { status("Your message could not be posted. It is still here; try again."); }
  finally { sending = false; }
});
viewReady = true;
setChatState(isMobile() ? "closed" : placement);
window.addEventListener("storage", function(e) {
  if (e.key === "ccr-session") { discardRoom(); refreshIdentity(); }
});
window.addEventListener("cc-account-verified", function() { discardRoom(); refreshIdentity(); });
window.addEventListener("pagehide", function() { discardRoom(); });
document.addEventListener("visibilitychange", function() { if (!document.hidden) refreshIdentity(); });
setInterval(refreshIdentity,3000);
updateDestination(); refreshIdentity();
window.CC_CHAT_LOADED = true;
})();
