/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: cc-eq-fader-design.js
Movements: Style the existing row and popup faders.
Purpose: Console slots, black sliding caps, white markers, and level ticks.
Does NOT: Change sound, access, trial length, or fader values.
*/
(function () {
  'use strict';
  function mount() {
    if (document.querySelector('[data-cc-eq-fader-design-v3]')) return;
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-fader-design-v3', '1');
    styleEl.textContent = "\n.cc-eq-fader input[type=range], .cc-eq-popup-slider {\n  -webkit-appearance:none; appearance:none; writing-mode:vertical-lr; direction:rtl;\n  width:64px; min-width:64px; height:240px; padding:0; margin:0 8px;\n  border:0; border-radius:4px; box-sizing:border-box; cursor:ns-resize;\n  touch-action:none; user-select:none;\n  background:repeating-linear-gradient(to bottom,#e9c979 0 2px,transparent 2px 12px) left 0 top 32px / 12px calc(100% - 64px) no-repeat,\n    repeating-linear-gradient(to bottom,#e9c979 0 2px,transparent 2px 12px) right 0 top 32px / 12px calc(100% - 64px) no-repeat;\n}\n.cc-eq-fader input[type=range]:focus-visible, .cc-eq-popup-slider:focus-visible {\n  outline:3px solid #e9c979; outline-offset:4px;\n}\n.cc-eq-fader input[type=range]::-webkit-slider-runnable-track, .cc-eq-popup-slider::-webkit-slider-runnable-track {\n  width:8px; height:100%; background:#050505; border:1px solid #675b3d; border-radius:4px;\n}\n.cc-eq-fader input[type=range]::-webkit-slider-thumb, .cc-eq-popup-slider::-webkit-slider-thumb {\n  -webkit-appearance:none; appearance:none; box-sizing:border-box; width:48px; height:64px;\n  border:2px solid #393939; border-radius:9px; margin:0 0 0 -21px;\n  background:linear-gradient(to bottom,transparent 46%,#f5f0da 46% 54%,transparent 54%),\n    linear-gradient(to right,#090909,#333 22%,#141414 45% 70%,#050505);\n  box-shadow:inset 0 2px 2px #777, inset 0 -3px 3px #000, 2px 4px 6px #000b;\n}\n.cc-eq-fader input[type=range]::-moz-range-track, .cc-eq-popup-slider::-moz-range-track {\n  width:8px; height:100%; background:#050505; border:1px solid #675b3d; border-radius:4px;\n}\n.cc-eq-fader input[type=range]::-moz-range-thumb, .cc-eq-popup-slider::-moz-range-thumb {\n  box-sizing:border-box; width:48px; height:64px; border:2px solid #393939; border-radius:9px;\n  background:linear-gradient(to bottom,transparent 46%,#f5f0da 46% 54%,transparent 54%),\n    linear-gradient(to right,#090909,#333 22%,#141414 45% 70%,#050505);\n  box-shadow:inset 0 2px 2px #777, inset 0 -3px 3px #000, 2px 4px 6px #000b;\n}\n.cc-eq-faders {gap:4px; padding:8px; background:#15130f; border:1px solid #675b3d; border-radius:8px;}\n.cc-eq-fader-name, .cc-eq-fader-value {color:#e9c979; font:600 16px monospace;}\n.cc-eq-popup-panel {box-sizing:border-box; background:#15130f !important; border:2px solid #c9a227 !important; color:#e9c979 !important;}\n.cc-eq-popup-body {gap:8px;}\n.cc-eq-popup-label, .cc-eq-popup-value {color:#e9c979 !important;}\n.cc-eq-popup-btn, .cc-eq-popup-close, .cc-eq-popup-arrow {background:#000 !important; color:#e9c979 !important; border:2px solid #c9a227 !important;}\n.cc-eq-popup-btn-on {background:#c9a227 !important; color:#000 !important;}\n";
    document.head.appendChild(styleEl);
    window.CC_EQ_FADER_DESIGN_LOADED = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
