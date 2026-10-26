/* cc-eq-button-design.js — PUBLIC FACE only, not authority
 * ONE JOB: design the five EQ band buttons, black and gold only.
 * Buttons, in order, left to right: Bass, 250, Voice, 4000, Top.
 * This file changes no values, no engine, no sound, no gate, no trial.
 * It only styles the buttons that open the popup, so a finger can
 * tap them, and so they match the fader handle, not the browser
 * default blue and white.
 * DESIGN, from the fader photo and the trifecta:
 * Black background, gold border, gold text, old school, black and
 * gold only, no blue, no white, no green.
 * Touch: big, 56px tall minimum, padding for a finger, not a small
 * text link, not a little dot.
 * On: the button for the band that is open in the popup turns gold
 * background, black text, so you can see which band you are on.
 * Off: black background, gold text, gold border.
 * This file alone does nothing visible until station.html loads it
 * after the popup, same wiring rule as display.
 */
(function () {
  'use strict';
  function mount() {
    if (document.querySelector('[data-cc-eq-button-design]')) return true;
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-cc-eq-button-design', '1');
    styleEl.textContent =
      '.cc-eq-popup-row { gap: 10px !important; }' +
      '.cc-eq-popup-btn {' +
      ' background: #000000 !important; color: #e9c979 !important;' +
      ' border: 2px solid #c9a227 !important; border-radius: 8px !important;' +
      ' padding: 16px 20px !important; min-height: 56px !important;' +
      ' font-size: 18px !important; font-weight: 700 !important;' +
      ' letter-spacing: 1px !important; cursor: pointer !important; }' +
      '.cc-eq-popup-btn-on {' +
      ' background: #c9a227 !important; color: #000000 !important; }' +
      '.cc-eq-popup-close, .cc-eq-popup-arrow {' +
      ' background: #000000 !important; color: #e9c979 !important;' +
      ' border: 2px solid #c9a227 !important; border-radius: 8px !important;' +
      ' min-height: 56px !important; min-width: 56px !important; }';
    document.head.appendChild(styleEl);
    window.CC_EQ_BUTTON_DESIGN_LOADED = true;
    return true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
