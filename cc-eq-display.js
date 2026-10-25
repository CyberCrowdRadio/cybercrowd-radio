/* CYBERCROWD RADIO — golden equalizer in the tuner.
   One job, one spot: the little area that says CYBERCROWD RADIO.
   That little spot used to be a red needle going left and right.
   Now it is a golden thing doing its thing, with parameters
   slightly underneath that, inside that same little area.
   Not a square panel taking the whole screen. Not a full screen
   meter. Compact, dial window size, wide and short, rounded,
   black and gold only, fitting the tuner area it lives in.
   Golden thing: fifteen gold bars on black, grouped into five
   trifectas, three bars per button, in order left to right:
   Bass, 250, Voice, 4000, Top. Three Bass, three 250s, three
   Voice, three 4000s, three Tops. When you move a button, its
   trifecta moves together, so you can see the trifecta move.
   Parameters slightly underneath: Bass, 250, Voice, 4000, Top
   are buttons, slightly underneath the golden bars, inside the
   same little area, black and gold, tap one and the glass door
   fader pops up. Label is button, same spot, one Bass, one 250,
   one Voice, one 4000, one Top, no second row below, popup
   buttons row below is hidden, not deleted, popup panel still
   pops up when a parameter button is tapped.
   Song label outside: song label is NOT inside this panel.
   Song label comes in outside the buttons of the EQ, and
   everything underneath that is landed. This file creates a
   separate song label zone outside the panel, underneath the
   parameters, landed, gold text on black, clean title only,
   from the page nowPlaying element, no bracket junk. The
   sentence format, This song blah is titled blah, is NOT
   guessed here, real example not given yet, clean title only
   for now, one line change later, not a rebuild.
   Glass door: button opens the door, fader comes up, close
   the door or swipe left or right according to the starting
   button. Bass far left, no left swipe, only right to 250 and
   so on, continuous, straight line, no circle. This file does
   not change swipe, popup, faders, engine, rail, gate, trial.
   Layout, in order: panel first, song label outside second,
   popup panel third, faders row hidden fourth, reset fifth,
   countdown sixth. Faders row hidden, not deleted, popup sets
   same values, reset still works, row returns if this file
   is removed. No square panel, no red needle, no scale.
   Live only: song data is live analyser data, never synthetic,
   never simulated, flat when no live audio. Fader gain is read
   live from the faders, every frame, applied to bars in that
   band, so moving Bass moves Bass trifecta, moving Top moves
   Top trifecta. Analyser: FFT 4096, smoothing 0.52, minus 90
   to 0, peak hold 250 ms, carried, reformatted to trifecta.
   Authority: display only. Owns panel, canvas, song label
   outside zone, analyser, draw loop, seat order. Does not own
   faders, engine, rail, gate, trial, popup, or sound. Does not
   change sound, does not touch faders, engine, or rail files.
   This file alone does nothing visible until station.html
   loads it after mount, same wiring rule as before.
   This version supersedes the label button version pending
   before it, do not place that version, place this version.
*/
"use strict";
window.CCEQDisplay = (function () {
  var panel = null;
  var songZone = null;
  var canvas = null;
  var ctx2d = null;
  var peakEl = null;
  var songEl = null;
  var analyser = null;
  var data = null;
  var timeData = null;
  var levels = [];
  var peaks = [];
  var holds = [];
  var running = false;
  var connectTimer = null;
  var lastTime = 0;
  var BANDS = [
    { label: "Bass", freqs: [40, 60, 90], fader: 0 },
    { label: "250", freqs: [180, 250, 350], fader: 1 },
    { label: "Voice", freqs: [700, 1000, 1400], fader: 2 },
    { label: "4000", freqs: [2800, 4000, 5600], fader: 3 },
    { label: "Top", freqs: [7000, 10000, 14000], fader: 4 }
  ];
  var TOTAL = 15;
  var GOLD = "#c9a227";
  var GOLD_BRIGHT = "#ffd700";
  var GOLD_DARK = "#8a6d1b";

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
      analyser = source.context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.52;
      analyser.minDecibels = -90;
      analyser.maxDecibels = 0;
      source.connect(analyser);
      data = new Float32Array(analyser.frequencyBinCount);
      timeData = new Float32Array(analyser.fftSize);
      levels = new Array(TOTAL).fill(0);
      peaks = new Array(TOTAL).fill(0);
      holds = new Array(TOTAL).fill(0);
      return true;
    } catch (e) {
      analyser = null;
      return false;
    }
  }

  function faderValues() {
    try {
      if (window.CCEQFaders && window.CCEQFaders.values) return window.CCEQFaders.values();
    } catch (e) {}
    return null;
  }

  function faderGain(bandIndex) {
    var vals = faderValues();
    if (!vals || vals.length <= bandIndex) return 1;
    return Math.pow(10, vals[bandIndex] / 20);
  }

  function faderValue(bandIndex) {
    var vals = faderValues();
    if (!vals || vals.length <= bandIndex) return 0;
    return vals[bandIndex];
  }

  function db(value) {
    return 20 * Math.log10(Math.max(value, 0.000001));
  }

  function cleanTitle(text) {
    if (!text) return "Standby";
    return String(text).replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "").trim();
  }

  function updateSongName() {
    var el, text;
    if (!songEl) return;
    el = document.getElementById("nowPlaying");
    text = el ? cleanTitle(el.textContent) : "Standby";
    if (!text) text = "Standby";
    songEl.textContent = text;
  }

  function draw(now) {
    var dt, i, j, idx, width, height, left, top, bottom, usable, nyquist, hz, bin, levelDb, target, gain, speed, x, barWidth, groupGap, barGap, barHeight, y, faderLineY, faderVal, signalPeak, sum, v;
    requestAnimationFrame(draw);
    if (!canvas || !ctx2d) return;
    if (!lastTime) lastTime = now;
    dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    width = canvas.width;
    height = canvas.height;
    left = 20; top = 6; bottom = height - 6; usable = bottom - top;
    ctx2d.clearRect(0, 0, width, height);
    ctx2d.strokeStyle = GOLD_DARK;
    ctx2d.lineWidth = 1;
    ctx2d.beginPath(); ctx2d.moveTo(left, bottom); ctx2d.lineTo(width - 6, bottom); ctx2d.stroke();
    if (!analyser) {
      if (peakEl) peakEl.textContent = "--";
      return;
    }
    try {
      analyser.getFloatFrequencyData(data);
      analyser.getFloatTimeDomainData(timeData);
    } catch (e) { return; }
    signalPeak = 0; sum = 0;
    for (i = 0; i < timeData.length; i++) {
      v = Math.abs(timeData[i]);
      if (v > signalPeak) signalPeak = v;
      sum += timeData[i] * timeData[i];
    }
    if (peakEl) peakEl.textContent = signalPeak > 0.00001 ? db(signalPeak).toFixed(1) : "-INF";
    nyquist = analyser.context ? analyser.context.sampleRate / 2 : 22050;
    barGap = 4;
    groupGap = 18;
    barWidth = (width - left - 6 - barGap * 10 - groupGap * 4) / TOTAL;
    idx = 0;
    for (i = 0; i < BANDS.length; i++) {
      faderVal = faderValue(BANDS[i].fader);
      faderLineY = bottom - ((faderVal + 12) / 24) * usable;
      for (j = 0; j < 3; j++) {
        hz = BANDS[i].freqs[j];
        bin = Math.max(1, Math.min(data.length - 1, Math.floor(hz / nyquist * data.length)));
        levelDb = data[bin];
        gain = faderGain(BANDS[i].fader);
        target = Math.max(0, Math.min(1, (levelDb + 90) / 90)) * gain;
        if (target > 1) target = 1;
        speed = target > levels[idx] ? 30 : 10;
        levels[idx] += (target - levels[idx]) * (1 - Math.exp(-speed * dt));
        if (levels[idx] >= peaks[idx]) { peaks[idx] = levels[idx]; holds[idx] = now + 250; }
        else if (now > holds[idx]) peaks[idx] = Math.max(levels[idx], peaks[idx] - dt * 0.3);
        x = left + idx * (barWidth + barGap) + i * groupGap;
        barHeight = levels[idx] * usable;
        y = bottom - barHeight;
        ctx2d.fillStyle = GOLD;
        ctx2d.fillRect(x, y, barWidth, barHeight);
        ctx2d.fillStyle = GOLD_BRIGHT;
        ctx2d.fillRect(x, y, barWidth, 2);
        ctx2d.fillStyle = GOLD_BRIGHT;
        ctx2d.fillRect(x, bottom - peaks[idx] * usable - 3, barWidth, 2);
        idx = idx + 1;
      }
      ctx2d.strokeStyle = GOLD_BRIGHT;
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(left + i * (3 * (barWidth + barGap) + groupGap), faderLineY);
      ctx2d.lineTo(left + i * (3 * (barWidth + barGap) + groupGap) + 3 * barWidth + 2 * barGap, faderLineY);
      ctx2d.stroke();
    }
  }

  function mount() {
    var seat, styleEl;
    seat = document.querySelector(".cc-eq-seat-faders");
    if (!seat) return false;
    if (panel) return true;
    styleEl = document.createElement("style");
    styleEl.setAttribute("data-cc-eq-display", "1");
    styleEl.textContent =
      ".cc-eq-seat{display:flex;flex-direction:column;gap:8px}" +
      ".cc-eq-display-panel{order:1;position:relative;background:#000000;border:1px solid #c9a227;border-radius:16px;box-shadow:inset 0 1px #c9a22733,0 8px 20px #00000020;overflow:hidden;color:#c9a227;font-family:monospace;font-size:11px;width:100%}" +
      ".cc-eq-display-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #c9a22733}" +
      ".cc-eq-display-title{font-size:10px;letter-spacing:1.5px;color:#ffd700}" +
      ".cc-eq-display-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#ffd700;margin-right:8px}" +
      ".cc-eq-display-small{font-size:9px;color:#8a6d1b}" +
      ".cc-eq-display-chart{height:80px;margin:6px 12px 0 8px;position:relative}" +
      ".cc-eq-display-chart canvas{display:block;width:100%;height:100%}" +
      ".cc-eq-display-labels{display:flex;justify-content:space-between;margin:6px 12px 8px;color:#c9a227;font-size:11px}" +
      ".cc-eq-display-btn{flex:1;text-align:center;color:#ffd700;background:#000000;border:1px solid #c9a227;border-radius:8px;padding:6px 4px;cursor:pointer;font:inherit;font-size:12px}" +
      ".cc-eq-display-btn:active{background:#c9a227;color:#000000}" +
      ".cc-eq-song-outside{order:2;margin:0;padding:8px 12px;border:1px solid #c9a227;border-radius:8px;background:#000000;color:#ffd700;font-size:14px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".cc-eq-popup-root{order:3}" +
      ".cc-eq-popup-row{display:none !important}" +
      ".cc-eq-seat-faders{order:4;display:none !important}" +
      ".cc-eq-seat-reset{order:5}" +
      ".cc-eq-seat-countdown{order:6}";
    document.head.appendChild(styleEl);
    panel = document.createElement("section");
    panel.className = "cc-eq-display-panel";
    panel.innerHTML =
      '<div class="cc-eq-display-head"><div class="cc-eq-display-title"><span class="cc-eq-display-dot"></span>CYBERCROWD RADIO</div><span class="cc-eq-display-small">LIVE / <span id="ccEqPeakValue">--</span> dBFS</span></div>' +
      '<div class="cc-eq-display-chart"><canvas id="ccEqSpectrum" aria-label="Golden equalizer in the tuner, five trifectas"></canvas></div>' +
      '<div class="cc-eq-display-labels"><button type="button" class="cc-eq-display-btn" data-cc-band="0">Bass</button><button type="button" class="cc-eq-display-btn" data-cc-band="1">250</button><button type="button" class="cc-eq-display-btn" data-cc-band="2">Voice</button><button type="button" class="cc-eq-display-btn" data-cc-band="3">4000</button><button type="button" class="cc-eq-display-btn" data-cc-band="4">Top</button></div>';
    canvas = panel.querySelector("#ccEqSpectrum");
    peakEl = panel.querySelector("#ccEqPeakValue");
    ctx2d = canvas.getContext("2d");
    canvas.width = 600;
    canvas.height = 80;
    seat.parentNode.insertBefore(panel, seat);
    songZone = document.createElement("div");
    songZone.className = "cc-eq-song-outside";
    songZone.id = "ccEqSongOutside";
    songZone.textContent = "Standby";
    seat.parentNode.insertBefore(songZone, seat);
    songEl = songZone;
    panel.querySelectorAll(".cc-eq-display-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-cc-band"), 10) || 0;
        try {
          if (window.CCEQPopup && window.CCEQPopup.open) window.CCEQPopup.open(i);
        } catch (e) {}
      });
    });
    updateSongName();
    setInterval(updateSongName, 2000);
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
      return { mounted: !!panel, analyser: !!analyser };
    }
  };
})();
