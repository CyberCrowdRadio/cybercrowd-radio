/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: cc-social-viewer.js
Movements: Display supported social content below the Channels console.
Purpose: Keep radio controls and social viewing on the same page.
Does NOT: Change playback, sign in to providers, or change saved links.
*/
(function () {
  'use strict';
  const providers = new Map([
    ['facebook.com', 'Facebook'], ['m.facebook.com', 'Facebook'],
    ['x.com', 'X'], ['twitter.com', 'X'], ['mobile.twitter.com', 'X'],
    ['reddit.com', 'Reddit'], ['old.reddit.com', 'Reddit'],
    ['instagram.com', 'Instagram'], ['tiktok.com', 'TikTok']
  ]);
  const escape = value => String(value).replace(/[&<>"']/g, char =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);

  function platformFor(href) {
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
      const host = url.hostname.replace(/^www\./, '');
      const alias = providers.get(host) || ({'youtu.be':'YouTube','vm.tiktok.com':'TikTok','threads.net':'Threads'})[host];
      if (typeof alias === 'string') return alias;
      for (const [, name,, base] of window.CCServiceCatalog?.services || []) {
        if (!base) continue;
        const domain = new URL(base.replace('{handle}', 'cc-placeholder')).hostname.replace(/^www\./, '');
        if (host === domain || (domain.startsWith('cc-placeholder.') && host.endsWith(domain.slice(14)))) return name;
      }
      if (/(^|\.)myshopify\.com$/.test(host)) return 'Shopify';
      if (/^vinted\.(com|co\.uk|fr|de)$/.test(host)) return 'Vinted';
      return null;
    } catch {
      return null;
    }
  }

  function widget(markup, script) {
    return { html: '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{margin:0;background:#fff;color:#151515;font:16px system-ui}blockquote{margin:0}iframe{max-width:100%}</style>' +
      markup + '<script async src="' + script + '"></script>' };
  }

  function destination(href, platform, width) {
    const url = new URL(href);
    const path = url.pathname.replace(/\/+$/, '');
    const link = escape(url.origin + path + '/');
    let match;
    if (platform === 'Facebook') {
      const source = encodeURIComponent(url.href);
      if (/^\/(?:[^/]+\/posts\/[^/]+|permalink\.php|story\.php)$/.test(path)) {
        return {src:'https://www.facebook.com/plugins/post.php?show_text=true&href=' + source};
      }
      if (/^\/(?:[^/]+\/videos\/\d+|reel\/\d+)$/.test(path) || (path === '/watch' && /^\d+$/.test(url.searchParams.get('v') || ''))) {
        return {src:'https://www.facebook.com/plugins/video.php?autoplay=false&href=' + source};
      }
      const id = url.searchParams.get('id');
      const name = /^\/[a-z\d.\-]+$/i.test(path) &&
        !/^\/(?:login|share|sharer\.php|profile\.php|groups|reel|watch|marketplace|settings|home\.php)$/i.test(path);
      let page;
      if (name) page = 'https://www.facebook.com' + path;
      else if (path === '/profile.php' && /^\d+$/.test(id || '')) page = 'https://www.facebook.com/profile.php?id=' + id;
      if (!page) return { help: 'Enter a public Facebook Page link.' };
      const query = new URLSearchParams({
        href: page, tabs: 'timeline', width: String(Math.max(180, Math.min(500, width))),
        height: '600', adapt_container_width: 'true', show_facepile: 'false'
      });
      return { page, src: 'https://www.facebook.com/plugins/page.php?' + query };
    }
    if (platform === 'X') {
      match = /^\/([a-z\d_]{1,15})(?:\/status\/(\d+))?$/i.exec(path);
      if (!match || /^(?:home|explore|search|messages|settings|compose|login|intent)$/i.test(match[1])) {
        return { help: 'Enter a public X profile or post link.' };
      }
      const target = 'https://twitter.com/' + match[1] + (match[2] ? '/status/' + match[2] : '');
      const markup = match[2] ? '<blockquote class="twitter-tweet"><a href="' + target + '">View post on X</a></blockquote>' :
        '<a class="twitter-timeline" data-height="600" data-dnt="true" href="' + target + '">Posts by @' + match[1] + '</a>';
      return widget(markup, 'https://platform.twitter.com/widgets.js');
    }
    if (platform === 'Reddit') {
      if (!/^\/(?:r\/[a-z\d_]+\/|user\/[a-z\d_-]+\/)?comments\/[a-z\d]+(?:\/[a-z\d_%.-]+){0,2}$/i.test(path)) {
        return { help: 'Enter the link to a public Reddit post or comment.' };
      }
      return widget('<blockquote class="reddit-embed-bq"><a href="' + link +
        '">View post on Reddit</a></blockquote>', 'https://embed.reddit.com/widgets.js');
    }
    if (platform === 'Instagram') {
      if (!/^\/(?:[a-z\d_.]+|(?:p|reel)\/[a-z\d_-]+)$/i.test(path) ||
          /^\/(?:p|reel|accounts|explore|direct|stories)$/i.test(path)) {
        return { help: 'Enter a public Instagram profile, post, or reel with embedding enabled.' };
      }
      return widget('<blockquote class="instagram-media" data-instgrm-permalink="' + link +
        '"><a href="' + link + '">View on Instagram</a></blockquote>', 'https://www.instagram.com/embed.js');
    }
    if (platform === 'YouTube') {
      const id = url.hostname === 'youtu.be' ? path.slice(1) : url.searchParams.get('v') || path.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1];
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? {src:'https://www.youtube-nocookie.com/embed/' + id} : {help:'Enter a public YouTube video link.'};
    }
    if (platform === 'Spotify' && /^\/(artist|album|track|playlist|episode|show)\/[A-Za-z0-9]+$/.test(path)) return {src:'https://open.spotify.com/embed' + path};
    if (platform === 'Vimeo' && /^\/\d+$/.test(path)) return {src:'https://player.vimeo.com/video' + path};
    if (platform === 'SoundCloud') return {src:'https://w.soundcloud.com/player/?url=' + encodeURIComponent(href)};
    if (platform !== 'TikTok') return {src:href, generic:true};
    match = /^\/@([a-z\d_.]+)(?:\/(?:video|photo)\/(\d+))?$/i.exec(path);
    if (!match) return { help: 'Enter a public TikTok creator or post link.' };
    if (match[2]) return { src: 'https://www.tiktok.com/player/v1/' + match[2] + '?autoplay=0' };
    return widget('<blockquote class="tiktok-embed" cite="' + link + '" data-unique-id="' + match[1] +
      '" data-embed-type="creator"><section><a href="' + link + '">@' + match[1] +
      '</a></section></blockquote>', 'https://www.tiktok.com/embed.js');
  }

  const panel = document.getElementById('social-content-viewer');
  if (!panel) return;
  const frame = panel.querySelector('iframe');
  const title = panel.querySelector('h2');
  const form = panel.querySelector('form');
  const field = form.querySelector('input');
  const note = panel.querySelector('[role="status"]');
  let previousFocus;
  const select = panel.querySelector('#social-content-platform');
  const recent = new Map();
  const saved = new Map();
  const savedSelect = document.getElementById('social-saved-profiles');
  const guestKey = 'cc-channels-guest-profiles-v1';
  const session = localStorage.getItem('ccr-session');
  const saveButton = form.querySelector('[type=submit]');
  function rememberOne(href, hint) {
    let url;
    try {url = new URL(href);} catch {return;}
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return;
    const platform = platformFor(url.href) || hint || 'Public profile';
    saved.set(url.href, platform);
    if (!recent.has(platform)) recent.set(platform, url.href);
    if (!Array.from(savedSelect.options).some(o => o.value === url.href)) {
      savedSelect.add(new Option(platform + ' · ' + url.hostname + url.pathname + url.search, url.href));
    }
    document.getElementById('social-saved-label').hidden = false;
  }
  savedSelect.add(new Option('Choose a saved profile', ''));
  savedSelect.onchange = () => {
    const href = savedSelect.value;
    if (href) open(href, savedSelect, saved.get(href));
  };
  function restoreGuest() {
    if (session) return;
    try {
      const entries = JSON.parse(localStorage.getItem(guestKey) || '[]');
      for (const [url, provider] of entries) rememberOne(url, provider);
    } catch {}
  }
  async function attach(href, provider) {
    if (session !== localStorage.getItem('ccr-session')) throw Error('Reload Channels to use the current account.');
    if (saved.has(href)) return;
    if (session) {
      const result = await window.CCAuthority.ask('/api/channel-projects', {session,action:'attach-social',url:href});
      if (!result.success) throw Error(result.error || 'Your profile could not be saved. Sign in and try again.');
    } else {
      const links = new Map(JSON.parse(localStorage.getItem(guestKey) || '[]'));
      links.set(href, provider);
      localStorage.setItem(guestKey, JSON.stringify([...links]));
    }
    rememberOne(href, provider);
    if (session) document.getElementById('ring-picker')?.dispatchEvent(new CustomEvent('cc-profile-attached',{bubbles:true,detail:{url:href}}));
  }
  function populate() {
    select.replaceChildren(new Option('Choose a platform', ''));
    for (const [,name,,,category] of window.CCServiceCatalog?.services || []) {
      let group = Array.from(select.children).find(el => el.label === category);
      if (!group) {group=document.createElement('optgroup');group.label=category;select.append(group);}
      group.append(new Option(name,name));
    }
  }
  populate();
  restoreGuest();
  window.addEventListener('cc-service-catalog-ready', () => {populate();restoreGuest();});
  document.getElementById('browse-social-platforms').onclick = event => {
    previousFocus = event.currentTarget;
    clearFrame(); frame.hidden = true; showPanel(); form.hidden = false;
    title.textContent = 'Socials'; select.value = ''; field.value = ''; note.textContent = '';
    select.focus({preventScroll:true});
  };

  let viewVersion = 0;
  function showPanel() {
    panel.hidden = false;
    if (!panel.open) panel.showModal();
  }
  function clearFrame() {
    viewVersion++;
    frame.removeAttribute('src');
    frame.removeAttribute('srcdoc');
  }

  function open(href, trigger, chosen) {
    const platform = platformFor(href) || chosen;
    if (!platform) return false;
    let checked;
    try {checked = new URL(href);} catch {return false;}
    if (checked.protocol !== 'https:' || checked.username || checked.password || checked.port || checked.origin === location.origin) return false;
    if (trigger) previousFocus = trigger;
    else if (panel.hidden) previousFocus = document.activeElement;
    if (platform === 'Public profile' && !Array.from(select.options).some(option => option.value === platform)) select.add(new Option(platform, platform));
    select.value = platform;
    recent.set(platform, href);
    showPanel();
    const content = destination(href, platform, Math.round(frame.parentElement.clientWidth));
    clearFrame();
    title.textContent = platform;
    frame.title = platform + ' content';
    frame.dataset.platform = platform;
    form.hidden = false;
    frame.hidden = Boolean(content.help);
    note.textContent = content.help || (content.generic ? 'Public page preview. This service controls whether it can display here.' : '');
    field.value = href;
    savedSelect.value = saved.has(href) ? href : '';
    saveButton.textContent = saved.has(href) ? 'View' : 'Save and view';
    if (content.page) {
      const version = viewVersion;
      frame.hidden = true;
      note.textContent = 'Opening Facebook Page…';
      fetch('/api/facebook-page-status?page=' + encodeURIComponent(content.page))
        .then(response => response.json()).then(result => {
          if (viewVersion !== version) return;
          if (result.available === false) {
            note.textContent = 'Facebook supplied no public Page preview for this address. Enter a public Facebook Page, post, or video link above.';
            return;
          }
          frame.setAttribute('sandbox','allow-scripts allow-same-origin');
          frame.src = content.src; frame.hidden = false;
          note.textContent = 'Facebook public Page. If the preview is blank, enter a public post or video link above.';
        }).catch(() => {if (version === viewVersion) note.textContent = 'Facebook could not be reached. Select View to reopen this Page.';});
    } else if (content.src) {
      frame.setAttribute('sandbox', content.generic ? 'allow-scripts' : 'allow-scripts allow-same-origin');
      frame.src = content.src;
    } else if (content.html) {
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.srcdoc = content.html;
    }
    title.focus({ preventScroll: true });

    return true;
  }

  panel.querySelector('#social-content-close').addEventListener('click', () => panel.close());
  panel.addEventListener('close', () => {
    clearFrame();
    panel.hidden = true;
    previousFocus?.focus({preventScroll:true});
  });
  field.oninput = () => {saveButton.textContent = 'Save and view';};
  select.onchange = () => {
    savedSelect.value = '';
    saveButton.textContent = 'Save and view';
    const platform = select.value;
    if (recent.has(platform)) {open(recent.get(platform));return;}
    clearFrame();
    frame.hidden = true;
    title.textContent = platform;
    note.textContent = platform === 'Reddit' ? 'Enter a public post link.' : 'Enter a username or public link.';
    field.value = '';
    field.focus();
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    let href = field.value.trim();
    const catalog = window.CCServiceCatalog;
    const service = catalog?.services.find(row => row[1] === select.value);
    try {
      if (!/^https:\/\//i.test(href)) {
        if (!service) throw Error('Choose a platform first.');
        href = catalog.profileAddress(service[3], href);
      }
      const known = platformFor(href);
      const custom = service && !service[3] ? service[1] : null;
      const platform = known || custom;
      const address = new URL(href);
      if (!platform || address.protocol !== 'https:' || address.username || address.password || address.port || address.origin === location.origin) throw Error('Enter a public HTTPS link for the selected platform.');
      saveButton.disabled = true;
      await attach(address.href, platform);
      if (!panel.hidden) open(address.href, null, platform);
    } catch (error) {note.textContent = error.message;} finally {saveButton.disabled = false;}
  });
  window.CCSocialViewer = {platformFor, open, remember(urls) {
    for (const href of urls) {
      const platform = platformFor(href);
      rememberOne(href, platform);
    }
  }};
})();
