/* CYBERCROWD RADIO — black and gold trifecta equalizer display.
   One job: the equalizer picture on top, black and gold, old school,
   eye pleasing, with the song name underneath the picture.
   What it is: fifteen gold bars on black, grouped into five trifectas,
   three bars per button, in order left to right: Bass, 250, Voice,
   4000, Top. Three Bass, three 250s, three Voice, three 4000s, three
   Tops. When you move a button, its trifecta moves together, so you
   can actually see the trifecta of that channel move, not one thin
   bar lost in ninety six, and not one single bar alone.
   Colors: black and gold only. Black panel, gold border, gold bars,
   gold baseline, gold fader line, gold text. No blue, no white, no
   red, no green. Those colors were abusive, not eye pleasing. Gold
   and black is the station theme, black not brown.
   Old school: an eight year old walks up, opens the glass door,
   plays with a button, moves it, and over there on the panel that
   one little fader glider changes the picture. The kid does not
   know mid range or voices or trebles, but he knows the button
   over here does thump thump thump thump thump of the bass.
   Play, see, hear, no jargon first. Buttons are simplified, black
   and gold, eye pleasing, click a button and the fader pops up.
   Glass door: the popup file is the glass door. Button opens the
   door, fader comes up, close the door or swipe left or right
   according to the starting button. Bass far left, no left swipe,
   only right to 250 and so on, continuous, straight line, no
   circle. This file does not change swipe, it does not change
   popup, it does not change faders, engine, rail, gate, or trial.
   Layout, in order, by flex order on the seat: display panel first,
   song name underneath the picture inside the panel, popup buttons
   second, faders row hidden third, reset fourth, countdown fifth.
   Faders row is hidden, not deleted. Faders logic stays standing,
   popup sets the same values the row sets, reset still works, and
   the row returns if this file is removed. No permanent faders
   row underneath the equalizer picture, as ordered.
   Song name: underneath the spectrum, inside the panel, gold text
   on black, from the page nowPlaying element, clean title only,
   no bracket junk. The sentence format, This song blah is titled
   blah, is NOT guessed here, because the real example was not
   given yet. Song name zone shows clean title only for now, and
   that sentence will be one line change when the real example
   is given, not a rebuild.
   Live only: song data is live analyser data, never synthetic,
   never simulated, flat when no live audio. Fader gain is read
   live from the faders themselves, every frame, and applied to
   the bars in that band, so moving Bass moves the Bass trifecta,
   moving Top moves the Top trifecta, normal to tripping.
   Analyser: FFT 4096, smoothing 0.52, minus 90 to 0, peak hold
   250 ms, carried from the vector top part, reformatted to
   trifecta, not stripped to a simple meter.
   Authority: display only. Owns the panel, the canvas, the song
   name zone, the analyser, the draw loop, and the seat order and
   faders row hidden rule for this layout. Does not own faders,
   engine, rail, gate, trial, popup, or sound. Does not change
   sound, does not touch faders, engine, or rail files.
   This file alone does nothing visible until station.html loads
   it after mount, same wiring rule as before.
*/
"use strict";
window.CCEQDisplay = (function () {
  var panel = null;
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
    var dt, i, j, idx, width, height, left, top, bottom, usable, nyquist, hz, bin, levelDb, target, gain, speed, x, barWidth, groupGap, barGap, barHeight, y, faderLineY, faderVal, signalPeak, rms, sum, v;
    requestAnimationFrame(draw);
    if (!canvas || !ctx2d) return;
    if (!lastTime) lastTime = now;
    dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    width = canvas.width;
    height = canvas.height;
    left = 28; top = 14; bottom = height - 9; usable = bottom - top;
    ctx2d.clearRect(0, 0, width, height);
    ctx2d.strokeStyle = GOLD_DARK;
    ctx2d.lineWidth = 1;
    ctx2d.beginPath(); ctx2d.moveTo(left, bottom); ctx2d.lineTo(width - 6, bottom); ctx2d.stroke();
    ctx2d.font = "8px monospace";
    ctx2d.fillStyle = GOLD_DARK;
    for (i = 0; i < 5; i++) ctx2d.fillText("-" + (i * 18), 0, top + usable * i / 5 + 3);
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
    rms = Math.sqrt(sum / timeData.length);
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
      ".cc-eq-seat{display:flex;flex-direction:column;gap:12px}" +
      ".cc-eq-display-panel{order:1;position:relative;background:#000000;border:1px solid #c9a227;box-shadow:inset 0 1px #c9a22733,0 16px 45px #00000020;overflow:hidden;color:#c9a227;font-family:monospace;font-size:11px;width:100%}" +
      ".cc-eq-display-panel::after{content:'';position:absolute;top:-1px;left:20px;width:55px;height:1px;background:#ffd700}" +
      ".cc-eq-display-head{display:flex;align-items:center;justify-content:space-between;padding:19px 21px;border-bottom:1px solid #c9a22733}" +
      ".cc-eq-display-title{font-size:10px;letter-spacing:1.5px;color:#ffd700}" +
      ".cc-eq-display-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#ffd700;box-shadow:0 0 10px #ffd70060;margin-right:8px}" +
      ".cc-eq-display-small{font-size:9px;color:#8a6d1b}" +
      ".cc-eq-display-top{display:flex;justify-content:space-between;padding:22px 24px 0}" +
      ".cc-eq-display-overline{color:#8a6d1b;font-size:9px;letter-spacing:2px}" +
      ".cc-eq-display-big{font:600 39px sans-serif;color:#ffd700}" +
      ".cc-eq-display-big small{font:10px monospace;color:#8a6d1b}" +
      ".cc-eq-display-chart{height:220px;margin:0 16px 0 12px;position:relative}" +
      ".cc-eq-display-chart canvas{display:block;width:100%;height:100%}" +
      ".cc-eq-display-song{margin:12px 24px 0;padding:12px 14px;border:1px solid #c9a22733;background:#000000;color:#ffd700;font-size:16px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".cc-eq-display-labels{display:flex;justify-content:space-between;margin:12px 26px 0 44px;color:#c9a227;font-size:11px}" +
      ".cc-eq-display-labels span{flex:1;text-align:center}" +
      ".cc-eq-display-footer{margin-top:20px;padding:14px 21px;border-top:1px solid #c9a22733;display:flex;justify-content:space-between;gap:12px;font-size:9px;color:#8a6d1b}" +
      ".cc-eq-popup-root{order:2}" +
      ".cc-eq-seat-faders{order:3;display:none !important}" +
      ".cc-eq-seat-reset{order:4}" +
      ".cc-eq-seat-countdown{order:5}";
    document.head.appendChild(styleEl);
    panel = document.createElement("section");
    panel.className = "cc-eq-display-panel";
    panel.innerHTML =
      '<div class="cc-eq-display-head"><div class="cc-eq-display-title"><span class="cc-eq-display-dot"></span>LIVE EQUALIZER</div><span class="cc-eq-display-small">FFT 4096 / LIVE ONLY</span></div>' +
      '<div class="cc-eq-display-top"><div><div class="cc-eq-display-overline">SIGNAL PEAK</div><div class="cc-eq-display-big"><span id="ccEqPeakValue">--</span> <small>dBFS</small></div></div><span class="cc-eq-display-small">15 BARS / 5 TRIFECTAS</span></div>' +
      '<div class="cc-eq-display-chart"><canvas id="ccEqSpectrum" aria-label="Live audio equalizer, black and gold, five trifectas"></canvas></div>' +
      '<div class="cc-eq-display-song" id="ccEqSongName">Standby</div>' +
      '<div class="cc-eq-display-labels"><span>Bass</span><span>250</span><span>Voice</span><span>4000</span><span>Top</span></div>' +
      '<div class="cc-eq-display-footer"><span>LIVE AUDIO ANALYSIS</span><span>THREE PER CHANNEL</span><span>PEAK HOLD 250 ms</span></div>';
    canvas = panel.querySelector("#ccEqSpectrum");
    peakEl = panel.querySelector("#ccEqPeakValue");
    songEl = panel.querySelector("#ccEqSongName");
    ctx2d = canvas.getContext("2d");
    canvas.width = 600;
    canvas.height = 220;
    seat.parentNode.insertBefore(panel, seat);
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
