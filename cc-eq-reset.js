/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
FACE - LISTENER LOCAL

FILE:
cc-eq-reset.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Give the listener one RESET button for the equalizer.

FUNCTION:
Build one button that reads RESET. One tap returns every
fader and every band to zero, which is DJ SETTINGS, the sound
exactly as the DJ sent it. It works through the faders when
they are present, so the sliders visibly return to zero, and
falls back to the engine when they are not. If neither the
faders nor the engine is present it builds nothing, because a
reset button with nothing to reset would be pretend. This file
has no seat, no rail, no faders, no trial, and no gate. The
gate step decides who may press this button. It never touches
the broadcast, the server, or any other listener. It has no
timers, no network calls, and no storage.

NO DIALS:
The button reads RESET, his word.
*/

'use strict';

window.CCEQReset = (function () {
  var root = null;
  var button = null;
  var styleEl = null;

  function hasFaders() {
    return !!(window.CCEQFaders && window.CCEQFaders.setValue && window.CCEQFaders.values);
  }

  function hasEngine() {
    return !!(window.CCEQEngine && window.CCEQEngine.reset);
  }

  function css() {
    return '.cc-eq-reset{display:flex}' +
      '.cc-eq-reset-button{min-height:44px;padding:10px 20px;font-size:16px}';
  }

  function reset() {
    var vals;
    var i;
    var ok = false;
    if (hasFaders()) {
      vals = window.CCEQFaders.values();
      if (vals.length) {
        for (i = 0; i < vals.length; i++) {
          if (window.CCEQFaders.setValue(i, 0)) ok = true;
        }
        return ok;
      }
    }
    if (hasEngine()) {
      try {
        window.CCEQEngine.reset();
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  function mount(container) {
    if (root) return true;
    if (!container) return false;
    if (!hasFaders() && !hasEngine()) return false;
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-reset', '1');
    styleEl.textContent = css();
    document.head.appendChild(styleEl);
    root = document.createElement('div');
    root.className = 'cc-eq-reset';
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'cc-eq-reset-button';
    button.textContent = 'RESET';
    button.setAttribute('aria-label', 'Reset to DJ settings');
    button.addEventListener('click', function () {
      reset();
    });
    root.appendChild(button);
    container.appendChild(root);
    return true;
  }

  function unmount() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    root = null;
    button = null;
    styleEl = null;
  }

  return {
    mount: mount,
    unmount: unmount,
    reset: reset
  };
})();
