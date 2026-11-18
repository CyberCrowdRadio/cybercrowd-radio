/* Connect or disconnect the listener's radio without leaving Channels. */
(function () {
  'use strict';

  const enter = document.getElementById('channelsRadioEnter');
  const disconnect = document.getElementById('channelsRadioDisconnect');
  const status = document.getElementById('channelsRadioStatus');
  const openEq = document.getElementById('channelsEqOpen');
  const stream = window.STATION_CONFIG?.streamUrl?.trim();
  const canvas = document.getElementById('channelsSpectrum');
  const pen = canvas.getContext('2d');
  let active;
  let frame;
  let meter;

  function startMeter() {
    if (!pen) return;
    meter = window.CCEQEngine.outputMeter();
    if (!meter) return;
    const bins = new Uint8Array(meter.frequencyBinCount);
    const centers = window.CCEQEngine.bands();
    const binHz = meter.context.sampleRate / meter.fftSize;
    function draw() {
      meter.getByteFrequencyData(bins);
      pen.clearRect(0, 0, canvas.width, canvas.height);
      pen.fillStyle = '#ffad32';
      centers.forEach((hz, index) => {
        const low = Math.max(1, Math.floor(hz / Math.SQRT2 / binHz));
        const high = Math.min(bins.length, Math.ceil(hz * Math.SQRT2 / binHz));
        let peak = 0;
        for (let bin = low; bin < high; bin++) peak = Math.max(peak, bins[bin]);
        const height = Math.round(peak / 255 * canvas.height);
        pen.fillRect(index * 36 + 3, canvas.height - height, 30, height);
      });
      frame = requestAnimationFrame(draw);
    }
    draw();
  }

  function release(message) {
    const audio = active;
    active = undefined;
    cancelAnimationFrame(frame);
    if (meter) meter.disconnect();
    meter = null;
    pen?.clearRect(0, 0, canvas.width, canvas.height);
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      window.CCEQRail?.disconnect();
      audio.remove();
    }
    enter.disabled = !stream;
    disconnect.disabled = true;
    openEq.disabled = true;
    status.textContent = message;
  }

  enter.addEventListener('click', async () => {
    if (!stream || active) return;
    const audio = new Audio();
    active = audio;
    enter.disabled = true;
    disconnect.disabled = false;
    status.textContent = 'Connecting…';
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.hidden = true;
    audio.setAttribute('data-cc-player', '1');
    audio.src = stream;
    document.body.append(audio);
    const attached = window.CCEQRail.attachTo(audio);
    if (attached) {
      startMeter();
      window.CCEQFaders.values().forEach((value, index) => window.CCEQEngine.setBand(index, value));
    }

    const failed = () => {
      if (active === audio) release('Radio unavailable. Tap Enter to retry.');
    };
    audio.addEventListener('error', failed, { once: true });
    audio.addEventListener('ended', failed, { once: true });

    try {
      await audio.play();
      if (active === audio) {
        status.textContent = 'Connected';
        openEq.disabled = !attached;
        if (!attached) status.textContent = 'Connected · EQ unavailable';
      }
    } catch {
      failed();
    }
  });

  disconnect.addEventListener('click', () => release('Disconnected'));
  window.addEventListener('pagehide', () => {
    if (active) release('Disconnected');
  });

  if (!stream) release('Radio stream unavailable.');
})();
