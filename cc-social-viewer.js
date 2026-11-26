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
      return providers.get(url.hostname.replace(/^www\./, '')) || null;
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
      return { src: 'https://www.facebook.com/plugins/page.php?' + query };
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
  let activePlatform;

  function clearFrame() {
    frame.removeAttribute('src');
    frame.removeAttribute('srcdoc');
  }

  function open(href, trigger) {
    const platform = platformFor(href);
    if (!platform) return false;
    if (trigger) previousFocus = trigger;
    else if (panel.hidden) previousFocus = document.activeElement;
    activePlatform = platform;
    panel.hidden = false;
    const content = destination(href, platform, Math.round(frame.parentElement.clientWidth));
    clearFrame();
    title.textContent = platform;
    frame.title = platform + ' content';
    frame.dataset.platform = platform;
    form.hidden = !content.help;
    frame.hidden = Boolean(content.help);
    note.textContent = content.help || '';
    field.value = '';
    if (content.src) {
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      frame.src = content.src;
    } else if (content.html) {
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.srcdoc = content.html;
    }
    title.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'nearest' });
    return true;
  }

  panel.querySelector('#social-content-close').addEventListener('click', () => {
    clearFrame();
    panel.hidden = true;
    previousFocus?.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const href = field.value.trim();
    if (platformFor(href) === activePlatform) open(href);
    else note.textContent = 'Enter a link from ' + activePlatform + '.';
  });
  window.CCSocialViewer = { platformFor, open };
})();
