/* Connect or disconnect the listener's radio without leaving Channels. */
(function () {
  'use strict';

  const enter = document.getElementById('channelsRadioEnter');
  const disconnect = document.getElementById('channelsRadioDisconnect');
  const status = document.getElementById('channelsRadioStatus');
  const stream = window.STATION_CONFIG?.streamUrl?.trim();
  let active;

  function release(message) {
    const audio = active;
    active = undefined;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    enter.disabled = !stream;
    disconnect.disabled = true;
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
    audio.src = stream;

    const failed = () => {
      if (active === audio) release('Radio unavailable. Tap Enter to retry.');
    };
    audio.addEventListener('error', failed, { once: true });
    audio.addEventListener('ended', failed, { once: true });

    try {
      await audio.play();
      if (active === audio) status.textContent = 'Connected';
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
