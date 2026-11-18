/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: cc-channels-page.js
Movements: Give each puzzle ring its own turning position.
Purpose: Browse published destinations inside the Channels console.
Does NOT: Publish drafts or expose an observer's private follows or likes.
*/
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const grid = byId('channelsGrid');
  if (!grid) return;
  const channels = (window.STATION_CONFIG?.channels || []).filter(item => item && secure(item.src));
  const viewer = byId('selectedChannelLink');
  const stage = byId('channelDetails');
  const placeholder = byId('channelEmptyInfo');
  function secure(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  }

  function selectChannel(index) {
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
    placeholder.hidden = true;
    stage.hidden = false;
  }


  const returning = new URLSearchParams(location.search).get('selected');
  const entries = { socials: [], following: [], liked: [], new: [], news: [], attached: [] };
  channels.forEach((channel, index) => {
    const entry = { label: channel.name || 'Creator channel', index };
    entries.new.push(entry);
    if (channel.kind === 'news' || channel.category === 'news') entries.news.push(entry);
    if (channel.attached === true) entries.attached.push(entry);
    for (const link of Array.isArray(channel.links) ? channel.links : []) {
      const href = secure(link?.url);
      if (href && link.label) entries.socials.push({ label: link.label, index, href });
    }
  });

  for (const ring of grid.querySelectorAll('.lock-ring')) {
    const lane = ring.dataset.lane;
    const items = entries[lane];
    const stops = Math.max(10, items.length);
    const face = ring.querySelector('.lock-face');
    const title = ring.querySelector('strong').textContent;
    const restored = lane === 'new' && returning
      ? items.findIndex(item => String(channels[item.index].id || channels[item.index].name) === returning) : -1;
    let position = Math.max(0, restored);
    let drag;
    let ignoreUntil = 0;
    let lastTap = -Infinity;
    function paint() {
      const item = items[position];
      const value = item ? item.label : 'Empty · ' + position;
      ring.querySelector('.dial-before').textContent = (position + stops - 1) % stops;
      ring.querySelector('.dial-after').textContent = (position + 1) % stops;
      ring.querySelector('.dial-entry').textContent = value;
      face.setAttribute('aria-label', title + ', ' + value + ', position ' + position);
      face.setAttribute('aria-disabled', String(!item));
    }
    function turn(step) {
      position = (position + stops + step) % stops;
      lastTap = -Infinity;
      paint();
      if (face.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        face.animate([{ backgroundPositionX: (step * 21) + 'px' }, { backgroundPositionX: '0px' }], { duration: 220 });
      }
    }
    ring.querySelector('.turn-back').addEventListener('click', () => turn(-1));
    ring.querySelector('.turn-next').addEventListener('click', () => turn(1));
    ring.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      turn(event.key === 'ArrowLeft' ? -1 : 1);
    });
    face.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      face.setPointerCapture(event.pointerId);
    });
    face.addEventListener('pointercancel', () => { drag = undefined; });
    face.addEventListener('pointerup', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag = undefined;
      if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      ignoreUntil = performance.now() + 420;
      turn(dx < 0 ? 1 : -1);
    });
    function show(item) {
      selectChannel(item.index);
      viewer.textContent = item.href ? 'Open ' + item.label : 'Enter channel';
      if (item.href) viewer.href = item.href;
    }
    face.addEventListener('click', event => {
      const now = performance.now(), item = items[position];
      if (!item || now < ignoreUntil) return;
      show(item);
      if (event.detail === 2 || (event.pointerType === 'touch' && now - lastTap < 350)) viewer.click();
      lastTap = now;
    });
    paint();
    if (restored >= 0) show(items[restored]);
  }
})();
