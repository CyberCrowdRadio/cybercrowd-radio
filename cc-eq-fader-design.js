(function () {
  'use strict';
  function mount() {
    var old = document.querySelector('[data-cc-eq-fader-design]');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (document.querySelector('[data-cc-eq-fader-design-v2]')) return true;
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-fader-design-v2', '1');
    styleEl.textContent =
      '.cc-eq-fader input[type=range], .cc-eq-popup-slider {' +
      ' -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }' +
      '.cc-eq-fader input[type=range]::-webkit-slider-runnable-track, .cc-eq-popup-slider::-webkit-slider-runnable-track {' +
      ' width: 10px; background: #000000; border: 1px solid #c9a227; }' +
      '.cc-eq-fader input[type=range]::-webkit-slider-thumb, .cc-eq-popup-slider::-webkit-slider-thumb {' +
      ' -webkit-appearance: none; appearance: none; width: 72px; height: 48px; margin-left: -31px;' +
      ' background: #111111; border: 2px solid #c9a227; border-radius: 6px;' +
      ' box-shadow: inset 0 0 0 2px #000000, 0 0 0 1px #c9a227; }' +
      '.cc-eq-fader input[type=range]::-moz-range-track, .cc-eq-popup-slider::-moz-range-track {' +
      ' width: 10px; background: #000000; border: 1px solid #c9a227; }' +
      '.cc-eq-fader input[type=range]::-moz-range-thumb, .cc-eq-popup-slider::-moz-range-thumb {' +
      ' width: 72px; height: 48px; background: #111111; border: 2px solid #c9a227; border-radius: 6px;' +
      ' box-shadow: inset 0 0 0 2px #000000, 0 0 0 1px #c9a227; }' +
      '.cc-eq-popup-panel { background: #000000 !important; border: 2px solid #c9a227 !important; color: #e9c979 !important; }' +
      '.cc-eq-popup-label, .cc-eq-popup-value { color: #e9c979 !important; }' +
      '.cc-eq-popup-btn, .cc-eq-popup-close, .cc-eq-popup-arrow {' +
      ' background: #000000 !important; color: #e9c979 !important; border: 2px solid #c9a227 !important; }' +
      '.cc-eq-popup-btn-on { background: #c9a227 !important; color: #000000 !important; }' +
      '.cc-eq-popup-slider { accent-color: #c9a227; }';
    document.head.appendChild(styleEl);
    window.CC_EQ_FADER_DESIGN_LOADED = true;
    return true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
