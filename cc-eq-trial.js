/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
FACE - LISTENER LOCAL

FILE:
cc-eq-trial.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Give a visitor one timed try of the equalizer.

FUNCTION:
Run one trial per page load. Starting a trial sets the gate
to trial access, so the visitor can move the faders. When the
time runs out the trial locks the gate, which clicks the
visitor out, and calls a registered end handler, the door
hook. A countdown readout can be mounted into a seat, ticking
every second. This file has no seat, no faders, no reset
button, and no gate of its own; it drives the gate. It keeps
no record across reloads and makes no network calls. It never
touches the broadcast, the server, or any other listener.

DIAL, NOT LAW:
- TRIAL_SECONDS: how long one trial runs. Change this number
  and the job stays the same. It is a starting value, not a
  ruling, and setLength changes it for the next trial.
*/

'use strict';

window.CCEQTrial = (function () {
  var TRIAL_SECONDS = 120;

  var timer = null;
  var tickTimer = null;
  var endAt = 0;
  var running = false;
  var ended = false;
  var endFn = null;
  var countdownRoot = null;
  var countdownText = null;
  var styleEl = null;

  function hasGate() {
    return !!(window.CCEQGate && window.CCEQGate.setAccess && window.CCEQGate.getAccess);
  }

  function remaining() {
    var ms;
    if (!running) return 0;
    ms = endAt - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }

  function format(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' + sec : '' + sec);
  }

  function css() {
    return '.cc-eq-trial-countdown{font-size:14px}';
  }

  function renderCountdown() {
    var s;
    if (!countdownText) return;
    if (running) s = remaining();
    else if (ended) s = 0;
    else s = TRIAL_SECONDS;
    countdownText.textContent = 'Trial: ' + format(s) + ' left';
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function startTick() {
    stopTick();
    if (!countdownText) return;
    renderCountdown();
    tickTimer = setInterval(renderCountdown, 1000);
  }

  function end() {
    var fn;
    if (!running) return;
    running = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    stopTick();
    ended = true;
    if (window.CCEQGate && window.CCEQGate.setAccess) {
      try { window.CCEQGate.setAccess('locked'); } catch (e) {}
    }
    fn = endFn;
    if (fn) {
      try { fn(); } catch (e) {}
    }
    renderCountdown();
  }

  function start() {
    var ms;
    if (running) return true;
    if (ended) return false;
    if (!hasGate()) return false;
    if (window.CCEQGate.getAccess() === 'member') return false;
    ms = TRIAL_SECONDS * 1000;
    window.CCEQGate.setAccess('trial');
    endAt = Date.now() + ms;
    running = true;
    timer = setTimeout(end, ms);
    startTick();
    return true;
  }

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    stopTick();
    running = false;
    endAt = 0;
    renderCountdown();
  }

  function mountCountdown(container) {
    if (countdownRoot) return true;
    if (!container) return false;
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-trial', '1');
    styleEl.textContent = css();
    document.head.appendChild(styleEl);
    countdownRoot = document.createElement('div');
    countdownRoot.className = 'cc-eq-trial-countdown';
    countdownText = document.createElement('span');
    countdownRoot.appendChild(countdownText);
    container.appendChild(countdownRoot);
    renderCountdown();
    startTick();
    return true;
  }

  function unmountCountdown() {
    stopTick();
    if (countdownRoot && countdownRoot.parentNode) countdownRoot.parentNode.removeChild(countdownRoot);
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    countdownRoot = null;
    countdownText = null;
    styleEl = null;
  }

  function setLength(seconds) {
    if (typeof seconds !== 'number') return false;
    if (seconds <= 0) return false;
    TRIAL_SECONDS = Math.floor(seconds);
    return true;
  }

  function onEnd(fn) {
    if (typeof fn === 'function') endFn = fn;
  }

  function status() {
    return {
      running: running,
      ended: ended,
      remaining: remaining(),
      length: TRIAL_SECONDS
    };
  }

  return {
    start: start,
    stop: stop,
    remaining: remaining,
    mountCountdown: mountCountdown,
    unmountCountdown: unmountCountdown,
    setLength: setLength,
    onEnd: onEnd,
    status: status
  };
})();
