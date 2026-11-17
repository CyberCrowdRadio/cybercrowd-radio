/* Own the in-page creator connection and release it on manual disconnect or exit. */
(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const directory = window.STATION_CONFIG?.channels || [];
  const id = new URLSearchParams(location.search).get('channel');
  const channel = directory.find(item => item && String(item.id || item.name) === id);
  const stage = byId('creatorStage');
  const status = byId('creatorStatus');
  const enter = byId('creatorEnter');
  const stop = byId('creatorStop');
  const exit = byId('creatorExit');
  const back = byId('creatorBack');
  let media;
  let swipeStart;

  function secure(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url : null;
    } catch {
      return null;
    }
  }

  function disconnect() {
    const connection = media;
    media = undefined;
    if (connection) {
      connection.pause();
      connection.removeAttribute('src');
      connection.load();
      connection.remove();
    }
    stop.disabled = true;
    if (connection) enter.hidden = false;
    status.textContent = 'Disconnected.';
  }

  function exitChannel() {
    disconnect();
    window.location.assign(back.href);
  }

  stop.addEventListener('click', disconnect);
  exit.addEventListener('click', exitChannel);
  back.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    exitChannel();
  });
  exit.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && event.isPrimary) {
      swipeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      exit.setPointerCapture(event.pointerId);
    }
  });
  exit.addEventListener('pointercancel', () => { swipeStart = undefined; });
  exit.addEventListener('pointerup', event => {
    if (swipeStart?.pointerId !== event.pointerId) return;
    const upward = swipeStart.y - event.clientY;
    const sideways = Math.abs(swipeStart.x - event.clientX);
    swipeStart = undefined;
    if (upward >= 45 && upward > sideways * 1.25) exitChannel();
  });
  window.addEventListener('pagehide', () => {
    if (media) disconnect();
  });

  if (!channel) {
    status.textContent = 'Channel not found in station directory.';
    return;
  }
  const returnUrl = new URL(back.href, window.location.href);
  returnUrl.searchParams.set('selected', id);
  back.href = returnUrl.href;
  byId('creatorTitle').textContent = channel.name || 'Creator Channel';
  byId('creatorDescription').textContent = channel.description || '';
  const feed = secure(channel.src);
  if (!feed) {
    status.textContent = 'No valid HTTPS feed configured.';
    return;
  }

  const video = /\.(mp4|webm|ogv)$/i.test(feed.pathname);
  const audio = /\.(mp3|aac|ogg)$/i.test(feed.pathname);
  if (!video && !audio) {
    const link = document.createElement('a');
    link.href = feed.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open creator live destination';
    stage.append(link);
    status.textContent = 'External creator destination. Live status unverified.';
    return;
  }

  function connect() {
    if (media) return;
    const connection = document.createElement(video ? 'video' : 'audio');
    connection.preload = 'none';
    connection.src = feed.href;
    if (video) connection.playsInline = true;
    media = connection;
    enter.hidden = true;
    stop.disabled = false;
    status.textContent = 'Connecting…';
    stage.append(connection);

    function connectionFailed(message) {
      if (media !== connection) return;
      disconnect();
      status.textContent = message;
    }

    connection.addEventListener('playing', () => {
      if (media === connection) status.textContent = 'Connected. Live status unverified.';
    });
    connection.addEventListener('error', () => connectionFailed('Could not connect to this feed.'));
    connection.addEventListener('ended', () => connectionFailed('The feed ended.'));
    connection.play().catch(() => connectionFailed('Tap Enter to connect.'));
  }

  enter.addEventListener('click', connect);
  enter.hidden = false;
  status.textContent = 'Feed configured. Tap Enter to connect.';
})();
