/* ============================================================
   cc-adworm.js — JAMES'S ADWORM (2026-10-19)
   The board-moving worm. His invention, his words:
   - The lane opening IS the ad.
   - Left pushes > top pushes > right pushes > bottom pushes >
     left pushes > one top square.
   - Worm is a CRAWLER, not a zip line. Slow, deliberate.
   - Eye distraction beats any picture — the movement makes
     the eye look, no matter what.
   - NO BLINK anywhere (epilepsy). Glow / pulse only.
   - Music never stops. Unintrusive. Never steals time.
   - Tap the worm: thanks | add your commercial > pick your tier.
   ============================================================ */
(function () {
  'use strict';

  var LANE = 76;                 // lane width, px
  var LEG_MS = 3000;             // 3 secs per leg
  var PUSH_MS = 800;             // board push speed
  var FADE_MS = 1500;            // worm fade-out (slow, never blink)
  var IDLE_MS = 4 * 60 * 1000;   // worm visits every 4 minutes

  var ADS = ['your ad here'];    // lane text (rotates)

  var TIERS = [
    { name: 'Diamond', price: '$399', per: 'per event' },
    { name: 'Gold',    price: '$149', per: 'per event' },
    { name: 'Silver',  price: '$49',  per: 'per event' }
  ];

  // Each leg: push slides the whole board [x, y]; the lane opens
  // on `lane`; the worm pops or crawls [from, to].
  var LEGS = [
    { push: [-LANE, 0], lane: 'left',   worm: 'pop' },
    { push: [0, LANE],  lane: 'top',    worm: ['left', 'right'] },
    { push: [LANE, 0],  lane: 'right',  worm: ['top', 'bottom'] },
    { push: [0, -LANE], lane: 'bottom', worm: ['right', 'left'] },
    { push: [LANE, 0],  lane: 'left',   worm: ['bottom', 'top'] }
  ];

  var stage, worm, square, toast, overlay;
  var laneEls = {};
  var running = false;
  var adIdx = 0;

  /* ---------- style (no blink keyframes anywhere) ---------- */
  function css() {
    if (document.getElementById('ccw-css')) return;
    var s = document.createElement('style');
    s.id = 'ccw-css';
    s.textContent = [
      '#ccw-stage{position:fixed;inset:0;z-index:9990;pointer-events:none;}',
      '#ccw-stage .ccw-lane{position:absolute;display:none;align-items:center;justify-content:center;',
      ' background:rgba(10,10,18,.92);border:2px solid #f5b301;color:#f5b301;',
      ' font:700 15px/1.2 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;}',
      '#ccw-stage .ccw-lane.on{display:flex;}',
      '#ccw-stage .ccw-lane.left{left:0;top:0;bottom:0;width:' + LANE + 'px;border-width:0 2px 0 0;writing-mode:vertical-rl;}',
      '#ccw-stage .ccw-lane.right{right:0;top:0;bottom:0;width:' + LANE + 'px;border-width:0 0 0 2px;writing-mode:vertical-rl;}',
      '#ccw-stage .ccw-lane.top{left:0;right:0;top:0;height:' + LANE + 'px;border-width:0 0 2px 0;}',
      '#ccw-stage .ccw-lane.bottom{left:0;right:0;bottom:0;height:' + LANE + 'px;border-width:2px 0 0 0;}',
      /* the worm: a crawler segment with a slow glow pulse (NOT a blink) */
      '#ccw-worm{position:absolute;width:54px;height:54px;border-radius:50%;pointer-events:auto;cursor:pointer;',
      ' background:radial-gradient(circle at 35% 35%, #ffe9a8, #f5b301 55%, #9a6b00);',
      ' transform:scale(0);transition:transform .45s cubic-bezier(.34,1.56,.64,1), left ' + LEG_MS + 'ms linear, top ' + LEG_MS + 'ms linear, opacity ' + FADE_MS + 'ms ease;',
      ' animation:ccwGlow 3s ease-in-out infinite;}',
      '#ccw-worm.in{transform:scale(1);}',
      '#ccw-worm.gone{opacity:0;}',
      '@keyframes ccwGlow{',
      ' 0%,100%{box-shadow:0 0 10px 2px rgba(245,179,1,.5);}',
      ' 50%{box-shadow:0 0 26px 9px rgba(245,179,1,.85);}}',
      /* one top square: the finale */
      '#ccw-square{position:absolute;left:50%;top:14px;width:120px;height:120px;margin-left:-60px;',
      ' display:none;align-items:center;justify-content:center;text-align:center;',
      ' background:rgba(10,10,18,.94);border:2px solid #f5b301;color:#ffe9a8;',
      ' font:700 13px/1.3 system-ui,sans-serif;pointer-events:auto;cursor:pointer;}',
      '#ccw-square.on{display:flex;}',
      /* tap card + tier picker */
      '#ccw-overlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;',
      ' background:rgba(0,0,0,.55);pointer-events:auto;}',
      '#ccw-overlay.on{display:flex;}',
      '#ccw-card{background:#101018;border:2px solid #f5b301;border-radius:14px;padding:26px 30px;text-align:center;max-width:86vw;}',
      '#ccw-card h3{color:#ffe9a8;margin:0 0 6px;font:700 20px system-ui,sans-serif;}',
      '#ccw-card p{color:#cfcfcf;margin:0 0 18px;font:14px system-ui,sans-serif;}',
      '#ccw-card button{display:block;width:100%;margin:8px 0;padding:13px 18px;font:700 16px system-ui,sans-serif;',
      ' border-radius:10px;border:2px solid #f5b301;background:transparent;color:#f5b301;cursor:pointer;}',
      '#ccw-card button.solid{background:#f5b301;color:#111;}',
      '#ccw-card button small{display:block;font-weight:400;font-size:12px;opacity:.8;}',
      '#ccw-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;display:none;',
      ' background:#101018;border:2px solid #f5b301;color:#ffe9a8;border-radius:10px;padding:12px 20px;',
      ' font:600 15px system-ui,sans-serif;pointer-events:none;}',
      '#ccw-toast.on{display:block;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- build ---------- */
  function build() {
    if (stage) return;
    css();
    stage = document.createElement('div');
    stage.id = 'ccw-stage';
    ['left', 'top', 'right', 'bottom'].forEach(function (side) {
      var l = document.createElement('div');
      l.className = 'ccw-lane ' + side;
      l.textContent = ADS[adIdx % ADS.length];
      stage.appendChild(l);
      laneEls[side] = l;
    });
    worm = document.createElement('div');
    worm.id = 'ccw-worm';
    worm.setAttribute('role', 'button');
    worm.setAttribute('aria-label', 'Advertisement');
    worm.addEventListener('click', onTap);
    stage.appendChild(worm);
    square = document.createElement('div');
    square.id = 'ccw-square';
    square.textContent = ADS[adIdx % ADS.length];
    square.addEventListener('click', onTap);
    stage.appendChild(square);
    document.body.appendChild(stage);

    overlay = document.createElement('div');
    overlay.id = 'ccw-overlay';
    document.body.appendChild(overlay);

    toast = document.createElement('div');
    toast.id = 'ccw-toast';
    document.body.appendChild(toast);

    document.body.style.transition = 'transform ' + PUSH_MS + 'ms ease-in-out';
    stage.style.transition = 'transform ' + PUSH_MS + 'ms ease-in-out';
  }

  /* ---------- board push ---------- */
  function pushBoard(x, y) {
    document.body.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    stage.style.transform = 'translate(' + (-x) + 'px,' + (-y) + 'px)';
  }
  function relaxBoard() {
    document.body.style.transform = '';
    stage.style.transform = '';
  }

  /* ---------- worm placement ---------- */
  function lanePos(lane, at) {
    var w = window.innerWidth, h = window.innerHeight, m = LANE / 2;
    if (lane === 'left')   return { x: m, y: at === 'top' ? m + 10 : h - m - 10 };
    if (lane === 'right')  return { x: w - m, y: at === 'top' ? m + 10 : h - m - 10 };
    if (lane === 'top')    return { x: at === 'left' ? m + 40 : w - m - 40, y: m };
    return { x: at === 'left' ? m + 40 : w - m - 40, y: h - m }; // bottom
  }
  function placeWorm(p) {
    worm.style.left = (p.x - 27) + 'px';
    worm.style.top = (p.y - 27) + 'px';
  }

  /* ---------- run the circuit ---------- */
  function run() {
    if (running) return;
    build();
    running = true;
    square.classList.remove('on');
    worm.classList.remove('gone');
    adIdx++;
    var ad = ADS[adIdx % ADS.length];
    Object.keys(laneEls).forEach(function (k) { laneEls[k].textContent = ad; });
    square.textContent = ad;
    doLeg(0);
  }

  function doLeg(i) {
    if (i >= LEGS.length) { finale(); return; }
    var leg = LEGS[i];
    Object.keys(laneEls).forEach(function (k) {
      laneEls[k].classList.toggle('on', k === leg.lane);
    });
    pushBoard(leg.push[0], leg.push[1]);
    if (leg.worm === 'pop') {
      worm.style.transitionProperty = 'transform, opacity';
      placeWorm(lanePos('left', 'top'));
      void worm.offsetWidth;
      worm.style.transitionProperty = '';
      worm.classList.add('in');
    } else {
      worm.style.transitionProperty = '';
      placeWorm(lanePos(leg.lane, leg.worm[0]));
      void worm.offsetWidth;
      placeWorm(lanePos(leg.lane, leg.worm[1]));
    }
    setTimeout(function () { doLeg(i + 1); }, LEG_MS);
  }

  /* ---------- finale: one top square ---------- */
  function finale() {
    relaxBoard();
    Object.keys(laneEls).forEach(function (k) { laneEls[k].classList.remove('on'); });
    square.classList.add('on');
    var sr = square.getBoundingClientRect();
    worm.style.transitionProperty = '';
    worm.style.left = (sr.left + sr.width / 2 - 27) + 'px';
    worm.style.top = (sr.top + sr.height / 2 - 27) + 'px';
    setTimeout(function () {
      worm.classList.add('gone');
      setTimeout(function () {
        worm.classList.remove('in', 'gone');
        square.classList.remove('on');
        running = false;
      }, FADE_MS + 400);
    }, LEG_MS);
  }

  /* ---------- tap: thanks | add your commercial ---------- */
  function onTap(e) {
    e.stopPropagation();
    overlay.classList.add('on');
    overlay.innerHTML =
      '<div id="ccw-card"><h3>Tap the worm</h3><p>Thanks for looking.</p>' +
      '<button id="ccw-thanks" class="solid">thanks</button>' +
      '<button id="ccw-add">add your commercial<small>pick your tier</small></button>' +
      '<button id="ccw-close">close</button></div>';
    document.getElementById('ccw-thanks').addEventListener('click', function () {
      overlay.classList.remove('on');
      showToast('Thank you for supporting Cybercrowd Radio!');
    });
    document.getElementById('ccw-add').addEventListener('click', pickTier);
    document.getElementById('ccw-close').addEventListener('click', function () {
      overlay.classList.remove('on');
    });
  }

  function pickTier() {
    var html = '<div id="ccw-card"><h3>pick your tier</h3><p>Your commercial rides the worm.</p>';
    TIERS.forEach(function (t, i) {
      html += '<button data-tier="' + i + '" class="solid">' + t.name +
              '<small>' + t.price + ' ' + t.per + '</small></button>';
    });
    html += '<button id="ccw-back">back</button></div>';
    overlay.innerHTML = html;
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-tier]'), function (b) {
      b.addEventListener('click', function () {
        var t = TIERS[+b.getAttribute('data-tier')];
        overlay.classList.remove('on');
        showToast(t.name + ' ' + t.price + ' — checkout opens soon.');
      });
    });
    document.getElementById('ccw-back').addEventListener('click', onTap);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    setTimeout(function () { toast.classList.remove('on'); }, 2600);
  }

  function stop() {
    running = false;
    relaxBoard();
  }

  /* ---------- go ---------- */
  window.CCAdworm = { run: run, stop: stop };
})  ();
