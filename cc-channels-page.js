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
  stage.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && window.CCSocialViewer?.open(link.href, link)) event.preventDefault();
  });
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
    let stops = Math.max(10, items.length);
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
      const value = item ? item.label : lane === 'socials' ? 'Link a social' : 'Tap to open';
      ring.querySelector('.dial-before').textContent = (position + stops - 1) % stops;
      ring.querySelector('.dial-after').textContent = (position + 1) % stops;
      ring.querySelector('.dial-entry').textContent = value;
      face.setAttribute('aria-label', title + ', ' + value + ', position ' + position);
      face.setAttribute('aria-haspopup',item ? 'false' : 'dialog');
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
      viewer.onclick = null;
      if (item.personal) {
        byId('selectedChannelName').textContent = item.label;
        byId('selectedChannelDescription').textContent = item.href;
        byId('selectedCreatorLinks').hidden = true;
        placeholder.hidden = true;
        stage.hidden = false;
      } else selectChannel(item.index);
      viewer.textContent = item.href ? 'Open ' + item.label : 'Enter channel';
      if (item.href) viewer.href = item.href;
      const platform = window.CCSocialViewer?.platformFor(item.href) || (item.personal ? 'Public profile' : null);
      if (!platform) return false;
      viewer.textContent = 'View ' + platform;
      viewer.href = '#social-content-viewer';
      viewer.onclick = event => {
        event.preventDefault();
        window.CCSocialViewer.open(item.href, viewer, platform);
      };
      return window.CCSocialViewer.open(item.href, face, platform);
    }
    face.addEventListener('click', event => {
      const now = performance.now(), item = items[position];
      if (now < ignoreUntil) return;
      if (!item) { openEmpty(); return; }
      const inPage = show(item);
      if (!inPage && (event.detail === 2 || (event.pointerType === 'touch' && now - lastTap < 350))) viewer.click();
      lastTap = now;
    });
    const dialog = byId('ring-prompt');
    const actionLink = byId('ring-action'), note = byId('ring-message'), picker = byId('ring-picker');
    let socialState = 'guest';
    function openEmpty() {
      byId('ring-title').textContent = title;
      picker.hidden = true;
      actionLink.hidden = false;
      actionLink.onclick = null;
      if (lane === 'socials') {
        const own = items.some(entry => entry.personal);
        note.textContent = socialState === 'guest' ? 'Would you like to link a social to your account?' :
          socialState === 'loading' ? 'Checking your socials…' :
          socialState === 'error' ? 'Your socials couldn’t be loaded.' :
          own ? 'Would you like to link another social?' : 'You have no socials linked. Would you like to link one?';
        actionLink.textContent = socialState === 'guest' ? 'Sign in to link a social' : socialState === 'error' ? 'Try again' : 'Link a social';
        actionLink.href = socialState === 'guest' ? 'signin.html?return=uidl#socials' : '#socials';
        actionLink.hidden = socialState === 'loading';
        if (socialState !== 'guest') actionLink.onclick = event => {
          event.preventDefault();
          if (socialState === 'error') { refreshSocials(); return; }
          actionLink.hidden = true; picker.hidden = false; note.textContent = 'Choose a platform.';
          picker.querySelector('button')?.focus();
        };
      } else {
        const prompts = {
          following:['There’s no followed channel in this position.','Find a service','/service'],
          liked:['There’s no liked channel in this position.','Browse the archive','/archive'],
          new:['There’s no new listing in this position.','Open my projects','/uidl#projects'],
          news:['There’s no news channel in this position.','Explore the map','/palm'],
          attached:['There’s no attached channel in this position.','Open channel settings','/channel-department']
        };
        const [message,label,href] = prompts[lane];
        note.textContent = message; actionLink.textContent = label; actionLink.href = href;
      }
      dialog.dataset.lane = lane;
      if (!dialog.open) dialog.showModal();
      if (!actionLink.hidden) actionLink.focus();
    }
    async function refreshSocials(attachedUrl=null) {
      const session=localStorage.getItem('ccr-session');
      if (!session) return;
      socialState='loading';
      const isOpen=()=>dialog.open && dialog.dataset.lane==='socials';
      if (isOpen()) openEmpty();
      try {
        const result=await window.CCAuthority.ask('/api/channel-projects',{session,action:'list-socials'});
        if (result.signIn) socialState='guest';
        else if (!Array.isArray(result.urls)) socialState='error';
        else {
          const creatorLinks=items.filter(entry=>!entry.personal);
          const own=result.urls.map(secure).filter(Boolean).map(href=>({
            label:new URL(href).host.replace(/^www\./,'')+new URL(href).pathname.replace(/\/$/,''),href,personal:true
          }));
          window.CCSocialViewer?.remember(own.map(item => item.href));
          items.splice(0,items.length,...own,...creatorLinks);
          stops=Math.max(10,items.length);
          if (attachedUrl) {
            const selected = own.findIndex(item => item.href === secure(attachedUrl));
            if (selected >= 0) position = selected;
          }
          if (position >= stops) position = 0;
          socialState='ready';
        }
      } catch { socialState='error'; }
      paint();
      if (isOpen()) {
        if(attachedUrl && socialState==='ready' && items[position]?.href === secure(attachedUrl)) {dialog.close();show(items[position]);}
        else openEmpty();
      }
    }
    paint();
    if(lane==='socials'){
      refreshSocials();
      picker.addEventListener('cc-profile-attached',event=>refreshSocials(event.detail?.url));
    }
    if (restored >= 0) show(items[restored]);
  }
})();
