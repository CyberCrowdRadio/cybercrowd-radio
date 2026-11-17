/* Connect or disconnect the listener's radio without leaving Channels. */
(function () {
  'use strict';

  const enter = document.getElementById('channelsRadioEnter');
  const disconnect = document.getElementById('channelsRadioDisconnect');
  const status = document.getElementById('channelsRadioStatus');
  const openEq = document.getElementById('channelsEqOpen');
  const stream = window.STATION_CONFIG?.streamUrl?.trim();
  let active;

  function release(message) {
    const audio = active;
    active = undefined;
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
    if (window.CCEQMount?.status().mounted && window.CCEQRail.connect()) {
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
        openEq.disabled = false;
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
