/* cc-coin-banner.js — CRWD coin light ad banner
 * ONE JOB: spinning coin video as a light ad. Blue cover, Refill button with bling.
 *
 * - Video: muted, autoplay, loop, playsinline — never touches radio audio
 * - Blue cover background
 * - "Refill" button with shine-sweep bling effect (not a flat paper cutout)
 * - Covers the watermark emblem in the video's bottom-right corner
 * - Refill opens Moonshot to buy CRWD
 *
 * Does not: touch the playlist, the DJ, or the stream.
 */
(function () {
  'use strict';

  var VIDEO_URL = 'https://media.cybercrowdradio.com/graphics-cybercrowdradio/2026-03-01-055431358.mp4';

  var css = [
    '.cc-coin-banner {',
    '  position: relative;',
    '  width: 100%;',
    '  max-width: 420px;',
    '  margin: 0 auto;',
    '  border-radius: 12px;',
    '  overflow: hidden;',
    '  background: linear-gradient(135deg, #0a2463 0%, #1e5aa8 50%, #0a2463 100%);',
    '  box-shadow: 0 4px 24px rgba(30, 90, 168, 0.4);',
    '}',
    '.cc-coin-banner video {',
    '  display: block;',
    '  width: 100%;',
    '  height: auto;',
    '  object-fit: cover;',
    '}',
    '.cc-coin-banner .cc-emblem-cover {',
    '  position: absolute;',
    '  right: 0;',
    '  bottom: 0;',
    '  width: 90px;',
    '  height: 90px;',
    '  background: linear-gradient(135deg, #0a2463 0%, #1e5aa8 100%);',
    '  pointer-events: none;',
    '}',
    '.cc-coin-banner .cc-refill-btn {',
    '  position: absolute;',
    '  left: 50%;',
    '  bottom: 16px;',
    '  transform: translateX(-50%);',
    '  padding: 12px 36px;',
    '  font-size: 1.1rem;',
    '  font-weight: 700;',
    '  color: #fff;',
    '  background: linear-gradient(180deg, #ffd700 0%, #ffaa00 50%, #cc8800 100%);',
    '  border: 2px solid #fff3c4;',
    '  border-radius: 30px;',
    '  cursor: pointer;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.05em;',
    '  box-shadow: 0 2px 12px rgba(255, 215, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.5);',
    '  overflow: hidden;',
    '  transition: transform 0.15s ease;',
    '}',
    '.cc-coin-banner .cc-refill-btn:hover { transform: translateX(-50%) scale(1.05); }',
    '.cc-coin-banner .cc-refill-btn:active { transform: translateX(-50%) scale(0.97); }',
    /* Bling: shine sweep across the button */
    '.cc-coin-banner .cc-refill-btn::after {',
    '  content: "";',
    '  position: absolute;',
    '  top: 0;',
    '  left: -80%;',
    '  width: 60%;',
    '  height: 100%;',
    '  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.7), transparent);',
    '  animation: cc-bling-sweep 2.5s ease-in-out infinite;',
    '}',
    '@keyframes cc-bling-sweep {',
    '  0% { left: -80%; }',
    '  55% { left: 130%; }',
    '  100% { left: 130%; }',
    '}'
  ].join('\n');

  function openMoonshot() {
    // Try the Moonshot app first, fall back to website
    var appUrl = 'moonshot://';
    var webUrl = 'https://moonshot.money';
    var start = Date.now();
    window.location.href = appUrl;
    setTimeout(function () {
      if (Date.now() - start < 2000) window.open(webUrl, '_blank', 'noopener');
    }, 1500);
  }

  function mount(target) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.className = 'cc-coin-banner';

    var video = document.createElement('video');
    video.src = VIDEO_URL;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    // Never interrupt radio audio — no audio track, no audio context
    video.volume = 0;

    var emblemCover = document.createElement('div');
    emblemCover.className = 'cc-emblem-cover';

    var btn = document.createElement('button');
    btn.className = 'cc-refill-btn';
    btn.textContent = 'Refill';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openMoonshot();
    });

    banner.appendChild(video);
    banner.appendChild(emblemCover);
    banner.appendChild(btn);
    host.appendChild(banner);

    // Ensure it plays (some browsers need a nudge)
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* muted autoplay should work */ });

    return banner;
  }

  window.CCCoinBanner = { mount: mount };
})();
