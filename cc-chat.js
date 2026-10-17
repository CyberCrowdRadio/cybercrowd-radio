/* CC Chat — real-time chat via Firebase. 2026-10-17. */
(function () {
  "use strict";
  var db = null;
  var chatRef = null;
  var initialized = false;
  function init() {
    if (initialized) return;
    if (typeof firebase === 'undefined') return;
    var cfg = (window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig) || window.CC_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) return;
    try {
      firebase.initializeApp(cfg);
      db = firebase.database();
      chatRef = db.ref('booth-chat');
      initialized = true;
      listenForMessages();
    } catch (e) { console.warn('[CCChat] Init failed:', e); }
  }
  function getHandle() {
    try { return localStorage.getItem('ccr-handle') || 'guest'; }
    catch (_) { return 'guest'; }
  }
  function sendMessage(text) {
    if (!initialized || !chatRef) return false;
    text = (text || '').trim();
    if (!text) return false;
    chatRef.push({ handle: getHandle(), text: text, timestamp: Date.now(), color: 'blue' });
    return true;
  }
  function listenForMessages() {
    if (!chatRef) return;
    chatRef.limitToLast(50).on('child_added', function (snapshot) {
      var msg = snapshot.val();
      if (msg) displayMessage(msg);
    });
  }
  function displayMessage(msg) {
    var container = document.getElementById('chatMessages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-' + (msg.color || 'blue');
    var handle = (msg.handle || 'guest').replace(/</g, '&lt;');
    var text = (msg.text || '').replace(/</g, '&lt;');
    div.innerHTML = '<span class="chat-handle">' + handle + ':</span> ' + text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    while (container.children.length > 50) container.removeChild(container.firstChild);
  }
  function buildUI() {
    var input = document.getElementById('chatInput');
    var sendBtn = document.getElementById('chatSend');
    if (input && sendBtn) {
      sendBtn.addEventListener('click', function () { if (sendMessage(input.value)) input.value = ''; });
      input.addEventListener('keypress', function (e) { if (e.key === 'Enter') { if (sendMessage(input.value)) input.value = ''; } });
    }
  }
  window.CCChat = { init: init, send: sendMessage, isReady: function () { return initialized; } };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildUI(); init();
      var tries = 0;
      var timer = setInterval(function () { if (initialized || tries++ > 20) clearInterval(timer); else init(); }, 500);
    });
  } else { buildUI(); init(); }
})();
