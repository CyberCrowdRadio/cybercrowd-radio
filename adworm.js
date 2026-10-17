/* adWorm™ — ONE premium spot, top center.
 * 15-second ads. Worm-like motion. No flashing. Never interrupts.
 * James's spec, 2026-10-16.
 * DOES NOT: circle the screen, blink, or touch the player.
 * ONLY: sit top-center, wriggle like a worm, show one ad at a time.
 */

(function () {
  'use strict';

  var AD_DURATION_MS = 15000;

  var ads = [];
  var wormEl = null;
  var currentIndex = 0;
  var timer = null;
  var running = false;

  function el(id) { return document.getElementById(id); }

  function buildWorm() {
    // Remove old worm if present
    var old = el('adworm-solo');
    if (old) old.remove();

    wormEl = document.createElement('div');
    wormEl.id = 'adworm-solo';
    wormEl.setAttribute('role', 'button');
    wormEl.setAttribute('tabindex', '0');
    wormEl.setAttribute('aria-label', 'Tap the worm');
    wormEl.innerHTML = '<span class="adworm-wiggle"></span><span class="adworm-text">Tap the worm!</span>';
    wormEl.addEventListener('click', onWormTap);
    document.body.appendChild(wormEl);
    injectStyles();
  }

  function injectStyles() {
    var css = [
      '#adworm-solo{',
      ' position:fixed; top:12px; left:50%; transform:translateX(-50%);',
      ' z-index:9990; cursor:pointer;',
      ' background:#1a1a2e; border:1px solid #c9a227; border-radius:20px;',
      ' padding:8px 18px; font-size:13px; color:#e8dcc0;',
      ' font-family:inherit; white-space:nowrap;',
      ' max-width:90vw; overflow:hidden; text-overflow:ellipsis;',
      '}',
      '#adworm-solo .adworm-wiggle{',
      ' display:inline-block; width:10px; height:10px;',
      ' border-radius:50%; background:#c9a227; margin-right:10px;',
      ' animation:adworm-wriggle 1.2s ease-in-out infinite;',
      '}',
      '@keyframes adworm-wriggle{',
      ' 0%,100%{ transform:translateX(0) scale(1); }',
      ' 25%{ transform:translateX(-3px) scale(1.15); }',
      ' 50%{ transform:translateX(0) scale(1); }',
      ' 75%{ transform:translateX(3px) scale(1.15); }',
      '}',
      '#adworm-solo .adworm-text{',
      ' max-width:70vw; overflow:hidden; text-overflow:ellipsis;',
      ' display:inline-block; vertical-align:middle;',
      '}',
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function showAd() {
    if (!wormEl) return;
    var txt = wormEl.querySelector('.adworm-text');
    if (!txt) return;
    if (ads.length) {
      var ad = ads[currentIndex % ads.length];
      var html = '';
      if (ad.img) {
        html += '<img src="' + escapeHtml(ad.img) + '" style="height:20px;vertical-align:middle;margin-right:8px;" alt="">';
      }
      html += escapeHtml(ad.name + ': ' + ad.message);
      txt.innerHTML = html;
    } else {
      txt.textContent = 'Tap the worm!';
    }
  }

  function nextAd() {
    if (!running) return;
    currentIndex = (currentIndex + 1) % Math.max(ads.length, 1);
    showAd();
    timer = setTimeout(nextAd, AD_DURATION_MS);
  }

  function onWormTap() {
    // Tap the worm = "Would you like to create an ad?"
    // Yes → ad creator. No → nothing.
    if (confirm("Would you like to create an ad?")) {
      window.location.href = '/adworm.html';
    }
    // No = no interaction
  }

  function start() {
    if (running) return;
    running = true;
    showAd();
    timer = setTimeout(nextAd, AD_DURATION_MS);
  }

  function stop() {
    running = false;
    if (timer) clearTimeout(timer);
    if (wormEl) wormEl.style.display = 'none';
  }

  function setAds(list) {
    ads = list || [];
    currentIndex = 0;
    if (running) showAd();
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildWorm();
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
  };
})();
