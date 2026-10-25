/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
FACE - LISTENER LOCAL

FILE:
cc-eq-mount.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Seat the whole equalizer on the dial card.

FUNCTION:
Build one seat inside the dial card, with zones for faders,
reset, and the trial countdown, and wire the pieces together
in order: rail, faders, reset, countdown, gate. The seat is
found four ways, in order: an explicit element handed to
mount, a window seat hook, the dial card carrying the
dialCard id that the placement steps add, or the equalizer
seat carrying the eqSeat id from the dial-scraped station
page. This file guesses no other selectors: if no seat is
found, auto-mount does nothing and status says so. If any
piece is missing, mount builds nothing and status names
the missing pieces. When the gate reads locked at mount
time, the trial starts for the visitor; members and running
trials are left alone. This file never touches the broadcast,
the server, or any other listener.

SEAT HONESTY, READ THIS:
The seat lands as its own block inside the dial card. Fine
position, right side over the strip near the needle, rides
with the face styling pass once the seat is live and visible,
because the card's layout is not in this file. Auto-mount
tries once per page load and does not poll: after placing
missing pieces, reload the page.
*/

'use strict';

window.CCEQMount = (function () {
  var seatEl = null;
  var seatDiv = null;
  var styleEl = null;
  var mounted = false;
  var trialStarted = false;

  function has(obj, fn) {
    return !!(obj && obj[fn]);
  }

  function missingPieces() {
    var out = [];
    if (!has(window.CCEQEngine, 'attach') || !has(window.CCEQEngine, 'bands') || !has(window.CCEQEngine, 'setBand') || !has(window.CCEQEngine, 'reset')) out.push('engine');
    if (!has(window.CCEQRail, 'connect') || !has(window.CCEQRail, 'disconnect') || !has(window.CCEQRail, 'status')) out.push('rail');
    if (!has(window.CCEQFaders, 'mount') || !has(window.CCEQFaders, 'setValue') || !has(window.CCEQFaders, 'values') || !has(window.CCEQFaders, 'unmount')) out.push('faders');
    if (!has(window.CCEQReset, 'mount') || !has(window.CCEQReset, 'unmount')) out.push('reset');
    if (!has(window.CCEQGate, 'mount') || !has(window.CCEQGate, 'setAccess') || !has(window.CCEQGate, 'getAccess') || !has(window.CCEQGate, 'unmount')) out.push('gate');
    if (!has(window.CCEQTrial, 'mountCountdown') || !has(window.CCEQTrial, 'unmountCountdown') || !has(window.CCEQTrial, 'start') || !has(window.CCEQTrial, 'stop') || !has(window.CCEQTrial, 'status')) out.push('trial');
    return out;
  }

  function css() {
    return '.cc-eq-seat{display:flex;flex-direction:column;gap:12px;align-items:center}' +
      '.cc-eq-seat-faders,.cc-eq-seat-reset,.cc-eq-seat-countdown{display:flex;justify-content:center}';
  }

  function teardown() {
    try { if (window.CCEQTrial) window.CCEQTrial.unmountCountdown(); } catch (e) {}
    try { if (window.CCEQReset) window.CCEQReset.unmount(); } catch (e) {}
    try { if (window.CCEQFaders) window.CCEQFaders.unmount(); } catch (e) {}
    try { if (window.CCEQGate) window.CCEQGate.unmount(); } catch (e) {}
    try { if (window.CCEQRail) window.CCEQRail.disconnect(); } catch (e) {}
    if (seatDiv && seatDiv.parentNode) seatDiv.parentNode.removeChild(seatDiv);
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    seatDiv = null;
    styleEl = null;
    mounted = false;
    trialStarted = false;
  }

  function mount(seat) {
    var fadersZone;
    var resetZone;
    var countdownZone;
    var missing;
    if (typeof seat === 'string') seat = document.getElementById(seat);
    if (!seat) return false;
    if (mounted && seatEl === seat) return true;
    if (mounted) teardown();
    missing = missingPieces();
    if (missing.length) return false;
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-mount', '1');
    styleEl.textContent = css();
    document.head.appendChild(styleEl);
    seatDiv = document.createElement('div');
    seatDiv.className = 'cc-eq-seat';
    fadersZone = document.createElement('div');
    fadersZone.className = 'cc-eq-seat-faders';
    resetZone = document.createElement('div');
    resetZone.className = 'cc-eq-seat-reset';
    countdownZone = document.createElement('div');
    countdownZone.className = 'cc-eq-seat-countdown';
    seatDiv.appendChild(fadersZone);
    seatDiv.appendChild(resetZone);
    seatDiv.appendChild(countdownZone);
    seatEl = seat;
    seatEl.appendChild(seatDiv);
    try { window.CCEQRail.connect(); } catch (e) {}
    if (!window.CCEQFaders.mount(fadersZone)) { teardown(); return false; }
    if (!window.CCEQReset.mount(resetZone)) { teardown(); return false; }
    if (!window.CCEQTrial.mountCountdown(countdownZone)) { teardown(); return false; }
    if (!window.CCEQGate.mount(seatDiv)) { teardown(); return false; }
    mounted = true;
    trialStarted = false;
    if (window.CCEQGate.getAccess() === 'locked') {
      try { trialStarted = !!window.CCEQTrial.start(); } catch (e) { trialStarted = false; }
    }
    return true;
  }

  function unmount() {
    if (!mounted) return false;
    try { window.CCEQTrial.stop(); } catch (e) {}
    teardown();
    seatEl = null;
    return true;
  }

  function status() {
    var railAttached = false;
    var gateAccess = null;
    var trialRunning = false;
    try { if (window.CCEQRail) railAttached = !!window.CCEQRail.status().attached; } catch (e) {}
    try { if (window.CCEQGate) gateAccess = window.CCEQGate.getAccess(); } catch (e) {}
    try { if (window.CCEQTrial) trialRunning = !!window.CCEQTrial.status().running; } catch (e) {}
    return {
      mounted: mounted,
      seat: !!seatEl,
      missing: missingPieces(),
      railAttached: railAttached,
      gateAccess: gateAccess,
      trialRunning: trialRunning,
      trialStarted: trialStarted
    };
  }

  function runAuto() {
    var seat = null;
    if (window.CCEQ_SEAT) {
      seat = (typeof window.CCEQ_SEAT === 'string') ? document.getElementById(window.CCEQ_SEAT) : window.CCEQ_SEAT;
    }
    if (!seat) seat = document.getElementById('dialCard');
    if (!seat) seat = document.getElementById('eqSeat');
    if (seat) mount(seat);
  }

  function autoMount() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runAuto);
    } else {
      runAuto();
    }
  }

  autoMount();

  return {
    mount: mount,
    unmount: unmount,
    status: status,
    autoMount: autoMount
  };
})();
