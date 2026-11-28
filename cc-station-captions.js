(() => {
  "use strict";
  const panel = document.querySelector("#stationCaptions");
  const output = document.querySelector("#stationCaptionLine");
  const edges = [100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300];
  const bands = edges.length - 1;
  let records, timer, analyser, source, bins, spectrum, controller;
  let history = [], locked, generation = 0, worker, busy = false, lastSearch = -Infinity, epoch = 0;

  function release() {
    if (source && analyser) {
      try { source.disconnect(analyser); } catch (_) {}
    }
    analyser = source = locked = null;
    history = [];
    epoch++;
    lastSearch = -Infinity;
  }

  function sample(player) {
    const input = player._ccEqSource;
    if (!input || input.context.state !== "running") return null;
    if (source !== input) {
      release();
      source = input;
      analyser = input.context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      bins = edges.map(hz => Math.ceil(hz * analyser.fftSize / input.context.sampleRate));
      spectrum = new Float32Array(analyser.frequencyBinCount);
      input.connect(analyser);
    }
    analyser.getFloatFrequencyData(spectrum);
    const levels = bins.slice(1).map((end, i) => {
      let peak = -Infinity;
      for (let j = bins[i]; j < end; j++) peak = Math.max(peak, spectrum[j]);
      return peak;
    });
    const peak = Math.max(...levels);
    return peak > -85 ? levels.map(v => Math.max(-63, v - peak)) : null;
  }

  function tick() {
    const player = window.CCPlayerAudio;
    if (!player || player.paused || player.readyState < 2) {
      release();
      output.textContent = "Waiting for radio audio.";
      return;
    }
    const time = player.currentTime;
    const levels = sample(player);
    if (!levels) {
      history = [];
      epoch++;
      lastSearch = -Infinity;
      locked = null;
      output.textContent = "";
      return;
    }
    const prior = history.at(-1);
    if (prior && (time <= prior.time || time - prior.time > 0.7)) {
      history = [];
      epoch++;
      lastSearch = -Infinity;
      locked = null;
    }
    history.push({time, levels});
    if (history.length > 16) history.shift();
    if (history.length >= 12 && !busy && time - lastSearch >= 0.8) {
      busy = true;
      lastSearch = time;
      worker.postMessage({samples: history, epoch});
    }
    if (locked && time - locked.time > 2) locked = null;
    if (!locked) {
      output.textContent = history.length < 12 ? "Listening for the song…" : "Listening for a captioned recording…";
      return;
    }
    const position = locked.frame * 2756 / 44100 + time - locked.time;
    const cue = records[locked.key].cues.find(([start, end]) => position >= start && position < end);
    output.textContent = cue ? cue[2] : "";
  }

  panel.addEventListener("toggle", async () => {
    const current = ++generation;
    clearInterval(timer);
    controller?.abort();
    worker?.terminate();
    busy = false;
    release();
    output.textContent = "";
    if (!panel.open) return;
    try {
      if (!records) {
        controller = new AbortController();
        output.textContent = "Loading captions…";
        const response = await fetch("/station-captions.json", {signal: controller.signal, cache: "no-cache"});
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (current !== generation) return;
        records = data;
      }
      worker = new Worker("/cc-caption-match.js");
      worker.onmessage = ({data}) => {
        busy = false;
        if (current === generation && data.epoch === epoch) locked = data.match;
      };
      worker.onerror = () => {
        clearInterval(timer);
        release();
        worker.terminate();
        output.textContent = "Caption matching is unavailable.";
      };
      worker.postMessage({records});
      tick();
      timer = setInterval(tick, 250);
    } catch (_) {
      if (current === generation) output.textContent = "Captions are unavailable.";
    }
  });
})();
