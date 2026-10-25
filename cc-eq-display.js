/* CYBERCROWD RADIO — live equalizer display only.
   One job: digital display above the equalizer faders.
   What it is: when Hertz come in, you see all the wavelengths going up and
   down, from normal levels to tripping. A canvas spectrum above the faders,
   bars for frequency, green for normal, red peak when a bar trips high,
   frequency labels 20Hz to 20kHz below. Live song audio only, never synthetic,
   never simulated, flat when no live audio is playing.
   Authority: display only. Owns the canvas, the analyser, the draw loop.
   Does not own faders, engine, rail, gate, or trial. Does not change sound.
   Source: new file, not cut from app.js. It taps the live stream audio source
   already made by the equalizer engine, as a parallel branch, so the main
   sound path is unchanged. Faders, engine, and rail files are untouched.
   It works on the live stream path, the same path the faders work on.
   It does not work on the bucket DJ path, because that path has no EQ engine.
   Insert: it inserts its canvas before the faders zone, in the same EQ seat,
   after the mount has built the seat. It is loaded after mount in script order.
   This file alone does nothing visible until station.html loads it after mount.
*/
"use strict";
window.CCEQDisplay = (function () {
  var canvas = null;
  var ctx2d = null;
  var analyser = null;
  var audioCtx = null;
  var data = null;
  var peaks = [];
  var running = false;
  var connectTimer = null;
  var BAR_COUNT = 64;
  var LABELS = ["20Hz", "60", "150", "400", "1k", "2.5k", "6k", "20kHz"];

  function findAudio() {
    if (window.CCPlayerAudio) return window.CCPlayerAudio;
    return document.querySelector("audio[data-cc-player]") || document.querySelector("audio");
  }

  function tryConnect() {
    var audio = findAudio();
    var source = null;
    if (!audio || !audio._ccEqSource) return false;
    if (analyser) return true;
    try {
      source = audio._ccEqSource;
      audioCtx = source.context;
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.52;
      analyser.minDecibels = -90;
      analyser.maxDecibels = 0;
      source.connect(analyser);
      data = new Uint8Array(analyser.frequencyBinCount);
      peaks = new Array(BAR_COUNT).fill(0);
      return true;
    } catch (e) {
      analyser = null;
      return false;
    }
  }

  function draw() {
    var i, bin, value, height, x, w, peak;
    if (!canvas || !ctx2d) return;
    if (!analyser) {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.fillStyle = "#0a0a0a";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(draw);
      return;
    }
    try { analyser.getByteFrequencyData(data); } catch (e) {}
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.fillStyle = "#0a0a0a";
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    w = canvas.width / BAR_COUNT;
    for (i = 0; i < BAR_COUNT; i++) {
      bin = Math.floor(Math.pow(i / BAR_COUNT, 1.5) * (data.length - 1));
      value = data[bin] / 255;
      height = value * (canvas.height - 20);
      if (value > peaks[i]) peaks[i] = value;
      else peaks[i] = Math.max(0, peaks[i] - 0.01);
      x = i * w;
      ctx2d.fillStyle = value > 0.85 ? "#ff3333" : "#33ff66";
      ctx2d.fillRect(x + 1, canvas.height - 20 - height, w - 2, height);
      peak = peaks[i] * (canvas.height - 20);
      ctx2d.fillStyle = "#ff3333";
      ctx2d.fillRect(x + 1, canvas.height - 20 - peak - 2, w - 2, 2);
    }
    ctx2d.fillStyle = "#888888";
    ctx2d.font = "10px monospace";
    for (i = 0; i < LABELS.length; i++) {
      x = (i / (LABELS.length - 1)) * (canvas.width - 30);
      ctx2d.fillText(LABELS[i], x, canvas.height - 5);
    }
    requestAnimationFrame(draw);
  }

  function mount() {
    var seat, fadersZone, styleEl;
    seat = document.querySelector(".cc-eq-seat-faders");
    if (!seat) return false;
    if (canvas) return true;
    styleEl = document.createElement("style");
    styleEl.setAttribute("data-cc-eq-display", "1");
    styleEl.textContent = ".cc-eq-display{display:block;width:100%;height:120px}";
    document.head.appendChild(styleEl);
    canvas = document.createElement("canvas");
    canvas.className = "cc-eq-display";
    canvas.width = 600;
    canvas.height = 120;
    ctx2d = canvas.getContext("2d");
    seat.parentNode.insertBefore(canvas, seat);
    connectTimer = setInterval(function () {
      if (tryConnect()) clearInterval(connectTimer);
    }, 1000);
    tryConnect();
    if (!running) {
      running = true;
      requestAnimationFrame(draw);
    }
    return true;
  }

  function autoMount() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }

  autoMount();

  return {
    mount: mount,
    status: function () {
      return { mounted: !!canvas, analyser: !!analyser };
    }
  };
})();
