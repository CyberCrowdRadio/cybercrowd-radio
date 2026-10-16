/* adworm.js — adWorm™ perimeter-circuit advertising system
 * ONE JOB: run the worm around the screen perimeter, 8 positions, per CC-IP-001.
 * Corners show donor names (honor wall). Rails carry paid ads.
 * 15-second ads. Blink to engage. Never interrupts content.
 * Does not: touch the player, the tip jar, or the signup flow.
 */
(function () {
  'use strict';
  var PATH = [
    { id: 'BL-01', type: 'corner', label: 'Entry' },
    { id: 'L-02',  type: 'rail',   label: 'Left Rail' },
    { id: 'TL-03', type: 'corner', label: 'Top Left' },
    { id: 'T-04',  type: 'rail',   label: 'Top Rail' },
    { id: 'TR-05', type: 'corner', label: 'Top Right' },
    { id: 'R-06',  type: 'rail',   label: 'Right Rail' },
    { id: 'BR-07', type: 'corner', label: 'Bottom Right' },
    { id: 'B-08',  type: 'rail',   label: 'Bottom Rail' }
  ];
  var AD_DURATION_MS = 15000;
  var BLINK_MS = 1200;
  var ads = [];
  var donors = [];
  var wormEl = null;
  var posIndex = 0;
  var currentAd = null;
  var running = false;
  var timer = null;
  function el(id) { return document.getElementById(id); }
  function buildWorm() {
    var wrap = document.createElement('div');
    wrap.id = 'adworm-perimeter';
    wrap.setAttribute('aria-label', 'adWorm advertising perimeter');
    PATH.forEach(function (p) {
      var slot = document.createElement('div');
      slot.className = 'adworm-slot adworm-' + p.type;
      slot.id = 'adworm-' + p.id;
      slot.dataset.position = p.id;
      wrap.appendChild(slot);
    });
    wormEl = document.createElement('div');
    wormEl.id = 'adworm';
    wormEl.setAttribute('role', 'button');
    wormEl.setAttribute('tabindex', '0');
    wormEl.setAttribute('aria-label', 'Tap the worm');
    wormEl.innerHTML = '<span class="adworm-body"></span><span class="adworm-text"></span>';
    wormEl.addEventListener('click', onWormTap);
    wrap.appendChild(wormEl);
    document.body.appendChild(wrap);
    injectStyles();
  }
  function injectStyles() {
    var css = [
      '#adworm-perimeter{position:fixed;inset:0;pointer-events:none;z-index:9990;}',
      '.adworm-slot{position:absolute;pointer-events:none;}',
      '.adworm-corner{width:120px;height:80px;}',
      '#adworm-BL-01{bottom:0;left:0;}',
      '#adworm-TL-03{top:0;left:0;}',
      '#adworm-TR-05{top:0;right:0;}',
      '#adworm-BR-07{bottom:0;right:0;}',
      '.adworm-rail{}',
      '#adworm-L-02{left:0;top:80px;bottom:80px;width:40px;}',
      '#adworm-R-06{right:0;top:80px;bottom:80px;width:40px;}',
      '#adworm-T-04{top:0;left:120px;right:120px;height:40px;}',
      '#adworm-B-08{bottom:0;left:120px;right:120px;height:40px;}',
      '#adworm{position:absolute;pointer-events:auto;cursor:pointer;',
      ' background:#1a1a2e;border:1px solid #c9a227;border-radius:20px;',
      ' padding:6px 14px;font-size:12px;color:#e8dcc0;',
      ' font-family:inherit;white-space:nowrap;',
      ' transition:left 1.2s ease-in-out,top 1.2s ease-in-out,opacity .3s;}',
      '#adworm .adworm-body{display:inline-block;width:8px;height:8px;',
      ' border-radius:50%;background:#c9a227;margin-right:8px;}',
      '#adworm.blink{animation:adworm-blink ' + BLINK_MS + 'ms ease-in-out;}',
      '@keyframes adworm-blink{0%,100%{opacity:1;}50%{opacity:.3;}}',
      '#adworm .adworm-text{max-width:200px;overflow:hidden;text-overflow:ellipsis;}',
      '.adworm-donor{font-style:italic;color:#c9a227;}'
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }
  function moveTo(pos) {
    var slot = el('adworm-' + pos.id);
    if (!slot || !wormEl) return;
    var r = slot.getBoundingClientRect();
    wormEl.style.left = (r.left + r.width / 2 - 60) + 'px';
    wormEl.style.top = (r.top + r.height / 2 - 16) + 'px';
    if (pos.type === 'corner') {
      wormEl.classList.remove('blink');
      void wormEl.offsetWidth;
      wormEl.classList.add('blink');
      if (pos.id === 'TL-03') showDonorName(pos);
    } else {
      showCurrentAd(pos);
    }
  }
  function showDonorName(pos) {
    if (!donors.length || !wormEl) return;
    var name = donors[Math.floor(Math.random() * donors.length)];
    var txt = wormEl.querySelector('.adworm-text');
    if (txt) {
      txt.innerHTML = '<span class="adworm-donor">♥ ' + escapeHtml(name) + '</span>';
    }
  }
  function showCurrentAd(pos) {
    if (!wormEl) return;
    var txt = wormEl.querySelector('.adworm-text');
    if (!txt) return;
    if (currentAd) {
      var html = '';
      if (currentAd.img) {
        html += '<img src="' + currentAd.img + '" style="width:24px;height:24px;border-radius:4px;vertical-align:middle;margin-right:6px;object-fit:cover;" />';
      }
      html += escapeHtml(currentAd.name + ': ' + currentAd.message);
      txt.innerHTML = html;
    } else if (donors.length) {
      var name = donors[Math.floor(Math.random() * donors.length)];
      txt.innerHTML = '<span class="adworm-donor">♥ ' + escapeHtml(name) + '</span>';
    } else {
      txt.textContent = 'Tap the worm!';
    }
  }
  function onWormTap() {
    if (currentAd && currentAd.link) {
      window.open(currentAd.link, '_blank', 'noopener');
    }
  }
  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function nextPosition() {
    if (!running) return;
    posIndex = (posIndex + 1) % PATH.length;
    moveTo(PATH[posIndex]);
    if (posIndex === 0) { pickNextAd(); }
    timer = setTimeout(nextPosition, AD_DURATION_MS / PATH.length);
  }
  function pickNextAd() {
    if (ads.length) {
      currentAd = ads[Math.floor(Math.random() * ads.length)];
    } else {
      currentAd = null;
    }
  }
  function start() {
    if (running) return;
    running = true;
    pickNextAd();
    moveTo(PATH[posIndex]);
    timer = setTimeout(nextPosition, AD_DURATION_MS / PATH.length);
  }
  function stop() {
    running = false;
    if (timer) clearTimeout(timer);
    if (wormEl) wormEl.style.opacity = '0';
  }
  function setAds(list) { ads = list || []; }
  function setDonors(list) { donors = list || []; }
  function addDonor(name) { if (name && donors.indexOf(name) < 0) donors.push(name); }
  document.addEventListener('DOMContentLoaded', function () {
    buildWorm();
    setDonors(['Bobby Sue']);
    setAds([
      { name: 'Cybercrowd.net', message: 'Where You Belong', link: 'https://cybercrowd.net' },
      { name: 'PixelPrix', message: 'The kids cleanup game', link: 'https://cybercade-game.com' },
      { name: 'Cybercrowd Radio', message: 'A museum with a transmitter', link: 'https://cybercrowdradio.com' },
    ]);
    start();
  });
  window.adworm = {
    start: start,
    stop: stop,
    setAds: setAds,
    setDonors: setDonors,
    addDonor: addDonor
  };
})();
