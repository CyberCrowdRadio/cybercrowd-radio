/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
FACE - LISTENER LOCAL

FILE:
cc-eq-faders.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Give the listener five fat faders for the equalizer engine.

FUNCTION:
Build five vertical faders, one per engine band, into a given
container. Moving a fader moves that band in the listener's own
sound only, through the engine. Flat at zero is DJ SETTINGS.
This file has no seat, no rail, no reset button, no trial, and
no gate. Those are other steps. The gate step decides who may
move these faders. This file never touches the broadcast, the
server, or any other listener. It has no timers, no network
calls, and no storage. If the engine is missing it builds
nothing, because faders with no engine would be pretend, and
the face already suffers from a pretend dial.

DIALS, NOT LAW:
- NAMES: words on the faders. Bass is the lowest band, Voice is
  the middle band, Top is the highest band, as a starting
  placement. The two number labels are unnamed until he names
  them. Change these words and the job stays the same.
- FADER_MIN, FADER_MAX, FADER_STEP: travel of each fader.
- FADER_HEIGHT: how tall each fader stands.
*/

'use strict';

window.CCEQFaders = (function () {
  var NAMES = ['Bass', '250', 'Voice', '4000', 'Top'];
  var FADER_MIN = -12;
  var FADER_MAX = 12;
  var FADER_STEP = 1;
  var FADER_HEIGHT = 160;

  var root = null;
  var sliders = [];
  var styleEl = null;

  function hasEngine() {
    return !!(window.CCEQEngine && window.CCEQEngine.setBand && window.CCEQEngine.bands);
  }

  function css() {
    return '.cc-eq-faders{display:flex;gap:16px;align-items:flex-start}' +
      '.cc-eq-fader{display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '.cc-eq-fader-name{font-size:14px}' +
      '.cc-eq-fader-value{font-size:14px}' +
      '.cc-eq-fader input[type=range]{writing-mode:vertical-lr;direction:rtl;width:44px;height:' + FADER_HEIGHT + 'px}' +
      '.cc-eq-fader input[type=range]::-webkit-slider-thumb{width:44px;height:44px}' +
      '.cc-eq-fader input[type=range]::-moz-range-thumb{width:44px;height:44px}';
  }

  function formatDb(v) {
    if (v > 0) return '+' + v;
    return '' + v;
  }

  function setValue(index, v) {
    var slider = sliders[index];
    if (!slider) return false;
    if (v > FADER_MAX) v = FADER_MAX;
    if (v < FADER_MIN) v = FADER_MIN;
    slider.value = v;
    slider._valueLabel.textContent = formatDb(v);
    if (window.CCEQEngine) window.CCEQEngine.setBand(index, v);
    return true;
  }

  function values() {
    var out = [];
    var i;
    for (i = 0; i < sliders.length; i++) {
      out.push(parseInt(sliders[i].value, 10));
    }
    return out;
  }

  function mount(container) {
    var bands;
    var i;
    var wrap;
    var nameEl;
    var slider;
    var valueEl;
    if (root) return true;
    if (!container) return false;
    if (!hasEngine()) return false;
    bands = window.CCEQEngine.bands();
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-faders', '1');
    styleEl.textContent = css();
    document.head.appendChild(styleEl);
    root = document.createElement('div');
    root.className = 'cc-eq-faders';
    for (i = 0; i < bands.length; i++) {
      wrap = document.createElement('div');
      wrap.className = 'cc-eq-fader';
      nameEl = document.createElement('div');
      nameEl.className = 'cc-eq-fader-name';
      nameEl.textContent = NAMES[i] || ('' + bands[i]);
      slider = document.createElement('input');
      slider.type = 'range';
      slider.setAttribute('orient', 'vertical');
      slider.min = FADER_MIN;
      slider.max = FADER_MAX;
      slider.step = FADER_STEP;
      slider.value = 0;
      slider.setAttribute('aria-label', NAMES[i] || ('' + bands[i]));
      valueEl = document.createElement('div');
      valueEl.className = 'cc-eq-fader-value';
      valueEl.textContent = '0';
      slider._valueLabel = valueEl;
      slider._bandIndex = i;
      slider.addEventListener('input', function (ev) {
        var s = ev.target;
        var v = parseInt(s.value, 10);
        s._valueLabel.textContent = formatDb(v);
        window.CCEQEngine.setBand(s._bandIndex, v);
      });
      wrap.appendChild(nameEl);
      wrap.appendChild(slider);
      wrap.appendChild(valueEl);
      root.appendChild(wrap);
      sliders.push(slider);
    }
    container.appendChild(root);
    return true;
  }

  function unmount() {
    if (window.CCEQEngine && window.CCEQEngine.reset) {
      try { window.CCEQEngine.reset(); } catch (e) {}
    }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    root = null;
    sliders = [];
    styleEl = null;
  }

  return {
    mount: mount,
    unmount: unmount,
    setValue: setValue,
    values: values
  };
})();
