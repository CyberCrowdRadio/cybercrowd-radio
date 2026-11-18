/* Render the published directory and browse it without entering a channel. */
(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const grid = byId('channelsGrid');
  if (!grid) return;

  const directory = window.STATION_CONFIG?.channels || [];
  const pageSize = 6;
  const channels = directory.filter(channel => channel && secure(channel.src));
  const positions = Math.max(pageSize, channels.length);
  const previous = byId('rotatorPrevious');
  const next = byId('rotatorNext');
  const viewer = byId('selectedChannelLink');
  const stage = byId('channelDetails');
  const placeholder = byId('channelEmptyInfo');
  const returnChannel = new URLSearchParams(location.search).get('selected');
  let selected = returnChannel ? channels.findIndex(channel => String(channel.id || channel.name) === returnChannel) : -1;
  let first = selected < 0 ? 0 : Math.floor(selected / pageSize) * pageSize;
  let swipe;
  let lastTouchTap;
  let ignoreClickUntil = 0;

  function secure(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  }

  function selectChannel(index) {
    selected = index;
    const channel = channels[index];
    byId('selectedChannelName').textContent = channel.name || 'Creator channel';
    byId('selectedChannelDescription').textContent = channel.description || '';
    viewer.href = 'channel-view.html?channel=' + encodeURIComponent(String(channel.id || channel.name));
    const creatorLinks = byId('selectedCreatorLinks');
    const list = creatorLinks.querySelector('ul');
    list.replaceChildren();
    for (const entry of Array.isArray(channel.links) ? channel.links : []) {
      const href = secure(entry?.url);
      if (!href || !entry.label) continue;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = href;
      link.textContent = entry.label;
      item.append(link);
      list.append(item);
    }
    creatorLinks.hidden = !list.childElementCount;
    grid.querySelectorAll('button').forEach(card => {
      card.setAttribute('aria-pressed', String(Number(card.dataset.channelIndex) === index));
    });
    placeholder.hidden = true;
    stage.hidden = false;
  }

  function renderPage() {
    grid.replaceChildren();
    for (let offset = 0; offset < pageSize; offset++) {
      const index = (first + offset) % positions;
      const channel = channels[index];
      if (!channel) {
        const socket = document.createElement('div');
        socket.className = 'cc-rotator-socket';
        socket.setAttribute('aria-hidden', 'true');
        const marker = document.createElement('span');
        marker.textContent = String(index + 1).padStart(2, '0');
        socket.append(marker);
        grid.append(socket);
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cc-channel-select';
      button.dataset.channelIndex = index;
      button.setAttribute('aria-pressed', String(selected === index));
      const title = document.createElement('strong');
      title.textContent = channel.name || 'Creator channel';
      const kind = document.createElement('span');
      kind.textContent = channel.kind || 'Channel destination';
      button.append(title, kind);
      button.addEventListener('click', event => {
        const now = performance.now();
        if (now < ignoreClickUntil) return;
        selectChannel(index);
        if (event.pointerType === 'touch') {
          if (lastTouchTap?.index === index && now - lastTouchTap.time <= 350) {
            lastTouchTap = undefined;
            viewer.click();
            return;
          }
          lastTouchTap = { index, time: now };
        }
      });
      button.addEventListener('dblclick', event => {
        if (event.sourceCapabilities?.firesTouchEvents || performance.now() < ignoreClickUntil) return;
        selectChannel(index);
        viewer.click();
      });
      grid.append(button);
    }
    const position = String(first + 1).padStart(2, '0') + ' / ' + String(positions).padStart(2, '0');
    byId('rotatorPosition').textContent = (channels.length ? '' : 'No feeds · ') + position;
  }

  function move(direction) {
    first = (first + direction + positions) % positions;
    lastTouchTap = undefined;
    renderPage();
    if (grid.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      grid.animate([{ transform: 'translateX(' + (direction * 12) + 'px)', opacity: 0.75 },
        { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  grid.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && event.isPrimary) swipe = { x: event.clientX, y: event.clientY };
  });
  grid.addEventListener('pointercancel', () => { swipe = undefined; });
  grid.addEventListener('pointerup', event => {
    if (!swipe || !event.isPrimary) return;
    const x = event.clientX - swipe.x;
    const y = event.clientY - swipe.y;
    swipe = undefined;
    if (Math.abs(x) < 45 || Math.abs(x) <= Math.abs(y) * 1.25) return;
    ignoreClickUntil = performance.now() + 350;
    move(x < 0 ? 1 : -1);
  });

  grid.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
    grid.focus();
  });
  renderPage();
  if (selected >= 0) selectChannel(selected);
})();
