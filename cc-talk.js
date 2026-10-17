/* CC Talk — James's mic interface. 2026-10-16.
 * Big TALK button. Mic input picker (phone / desktop / MOTU).
 * Live level meter so he SEES it's working.
 *
 * DOES NOT: stream to listeners (needs Cloudflare relay).
 * DOES: capture mic, show levels, let him talk and hear himself.
 * ONLY: talk interface. One button, one meter, one picker.
 */

(function () {
  "use strict";

  var stream = null;
  var analyser = null;
  var audioCtx = null;
  var talking = false;
  var meterRAF = null;

  function css() {
    if (document.getElementById("cctalk-css")) return;
    var s = document.createElement("style");
    s.id = "cctalk-css";
    s.textContent = [
      "#cc-talk{",
      " position:fixed; bottom:20px; right:20px; z-index:99997;",
      " background:#0a0a0f; border:2px solid #c9a227; border-radius:16px;",
      " padding:16px; text-align:center; font-family:monospace;",
      " display:none; min-width:200px;",
      "}",
      "#cc-talk.show{ display:block; }",
      "#cc-talk-btn{",
      " width:80px; height:80px; border-radius:50%; border:none; cursor:pointer;",
      " background:#1a1a1a; color:#f5edd8; font-size:2rem;",
      " border:2px solid #c9a227; margin-bottom:8px;",
      "}",
      "#cc-talk-btn.talking{ background:#a93226; border-color:#a93226; animation:talkPulse 1s infinite; }",
      "@keyframes talkPulse{ 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.08);} }",
      "#cc-talk-meter{ width:100%; height:8px; background:#1a1a1a; border-radius:4px; overflow:hidden; margin:8px 0; }",
      "#cc-talk-meter-fill{ height:100%; width:0%; background:#00ff9d; border-radius:4px; transition:width .05s; }",
      "#cc-talk-label{ color:#c9a227; font-size:.75rem; letter-spacing:.1em; }",
      "#cc-talk-input{",
      " background:#1a1a1a; color:#f5edd8; border:1px solid #c9a227;",
      " border-radius:6px; padding:6px; margin-top:8px; width:100%;",
      " font-family:monospace; font-size:.75rem;",
      "}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function build() {
    css();
    if (document.getElementById("cc-talk")) return;
    var d = document.createElement("div");
    d.id = "cc-talk";
    d.innerHTML =
      '<div id="cc-talk-label">TALK</div>' +
      '<button id="cc-talk-btn" aria-label="Push to talk">🎤</button>' +
      '<div id="cc-talk-meter"><div id="cc-talk-meter-fill"></div></div>' +
      '<select id="cc-talk-input"><option value="">Loading mics…</option></select>';
    document.body.appendChild(d);

    document.getElementById("cc-talk-btn").addEventListener("click", toggleTalk);
    document.getElementById("cc-talk-input").addEventListener("change", function (e) {
      if (talking) { stopTalk(); }
      startTalk(e.target.value || undefined);
    });

    listMics();
  }

  function listMics() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (devices) {
      var sel = document.getElementById("cc-talk-input");
      if (!sel) return;
      var mics = devices.filter(function (d) { return d.kind === "audioinput"; });
      if (!mics.length) {
        sel.innerHTML = '<option value="">No mic found</option>';
        return;
      }
      sel.innerHTML = mics.map(function (m, i) {
        var label = m.label || ("Microphone " + (i + 1));
        return '<option value="' + m.deviceId + '">' + esc(label) + "</option>";
      }).join("");
    }).catch(function () {});
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function startTalk(deviceId) {
    var constraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };
    if (deviceId) constraints.audio.deviceId = { exact: deviceId };

    navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
      stream = s;
      talking = true;

      var btn = document.getElementById("cc-talk-btn");
      if (btn) btn.classList.add("talking");

      // Level meter
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        drawMeter();
      } catch (_) {}

      // Store for the GO LIVE relay
      window.CCTalkStream = stream;
      console.log("[TALK] Mic live:", deviceId || "default");
    }).catch(function (err) {
      console.error("[TALK] Mic denied:", err);
      alert("Mic blocked. Tap the lock icon in your browser bar → allow microphone.");
    });
  }

  function drawMeter() {
    if (!analyser || !talking) return;
    var data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    var sum = 0;
    for (var i = 0; i < data.length; i++) sum += data[i];
    var level = Math.min(100, (sum / data.length / 128) * 100);
    var fill = document.getElementById("cc-talk-meter-fill");
    if (fill) fill.style.width = level + "%";
    meterRAF = requestAnimationFrame(drawMeter);
  }

  function stopTalk() {
    talking = false;
    if (meterRAF) cancelAnimationFrame(meterRAF);
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    window.CCTalkStream = null;
    var btn = document.getElementById("cc-talk-btn");
    if (btn) btn.classList.remove("talking");
    var fill = document.getElementById("cc-talk-meter-fill");
    if (fill) fill.style.width = "0%";
  }

  function toggleTalk() {
    if (talking) stopTalk();
    else {
      var sel = document.getElementById("cc-talk-input");
      startTalk(sel && sel.value ? sel.value : undefined);
    }
  }

  window.CCTalk = {
    show: function () {
      build();
      document.getElementById("cc-talk").classList.add("show");
      // Refresh mic list (labels need permission first)
      listMics();
    },
    hide: function () {
      var d = document.getElementById("cc-talk");
      if (d) d.classList.remove("show");
      stopTalk();
    },
    isTalking: function () { return talking; },
    getStream: function () { return stream; },
  };
})();
