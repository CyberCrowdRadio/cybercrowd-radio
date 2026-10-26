/* cc-eq-reset-design.js — PUBLIC FACE only, not authority
 * ONE JOB: design the RESET button, black and gold only.
 * This file changes no values, no engine, no sound, no gate, no trial.
 * It only styles the button that already reads RESET, so it does
 * not look like a big white square stuck on a wall.
 * PROBLEM, from James, 2026-10-26: the reset button is a big white
 * square button, color, diagram, and design all wrong, it looks
 * like somebody tried to wipe their ass and stuck it on a wall.
 * FIX: no white, no square, no browser default.
 * Black background, gold border, gold text, rounded corners,
 * same as the band buttons and the fader handle, old school,
 * black and gold only, no blue, no white, no green.
 * Touch: 56px tall minimum, padding for a finger, not a small
 * white box, not a flat white square.
 * Word stays RESET, his word, no change to the word, only the
 * color and the shape around it.
 * This file alone does nothing visible until station.html loads it
 * after the reset button, same wiring rule as display.
 */
(function () {
  'use strict';
  function mount() {
    if (document.querySelector('[data-cc-eq-reset-design]')) return true;
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-reset-design', '1');
    styleEl.textContent =
      '.cc-eq-reset-button {' +
      ' background: #000000 !important; color: #e9c979 !important;' +
      ' border: 2px solid #c9a227 !important; border-radius: 8px !important;' +
      ' padding: 16px 24px !important; min-height: 56px !important;' +
      ' font-size: 18px !important; font-weight: 700 !important;' +
      ' letter-spacing: 2px !important; cursor: pointer !important; }';
    document.head.appendChild(styleEl);
    window.CC_EQ_RESET_DESIGN_LOADED = true;
    return true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
