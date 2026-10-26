/* cc-tip-button.js — PUBLIC FACE only, not authority
 * ONE JOB: add the ADD A TIP button to the tip seat body.
 * Face only. The tip itself is authority, not in this file.
 * Authority lives in radio-authority, via the existing tipjar adapter.
 */
(function () {
  'use strict';
  var body = document.getElementById('hubTipBody');
  if (!body || document.getElementById('tipjarBtn')) return;
  var btn = document.createElement('button');
  btn.id = 'tipjarBtn';
  btn.textContent = 'ADD A TIP';
  btn.style.display = 'block';
  btn.style.width = '100%';
  btn.style.padding = '12px';
  btn.style.marginBottom = '8px';
  btn.style.fontSize = '1rem';
  btn.style.fontWeight = '800';
  btn.style.color = '#2a1b0b';
  btn.style.background = 'linear-gradient(180deg,#ffd700 0%,#ffaa00 50%,#cc8800 100%)';
  btn.style.border = '2px solid #fff3c4';
  btn.style.borderRadius = '10px';
  btn.style.cursor = 'pointer';
  body.appendChild(btn);
  window.CC_TIP_BUTTON_LOADED = true;
})();
