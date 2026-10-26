/* cc-tip-seat.js — PUBLIC FACE only, not authority
 * ONE JOB: build the compact tip jar seat on the station page.
 * Seat only. No tip button, no refill, no Patreon, no balance here.
 * Those are separate files, separate shelves.
 * Tap the seat button to enlarge, tap again to shrink.
 */
(function () {
  'use strict';
  if (document.getElementById('tipjar')) return;
  var shareBtn = document.getElementById('shareBtn');
  var seat = document.createElement('section');
  seat.id = 'tipjar';
  seat.setAttribute('aria-label', 'Tip jar');
  seat.style.maxWidth = '280px';
  seat.style.margin = '12px auto 0';
  seat.style.background = '#0a0a0a';
  seat.style.border = '3px solid #c9a227';
  seat.style.borderRadius = '12px';
  seat.style.padding = '10px';
  seat.style.textAlign = 'center';
  seat.innerHTML =
    '<button id="hubTipExpand" style="width:100%;padding:8px;font-size:1rem;font-weight:800;color:#e9c979;background:transparent;border:none;cursor:pointer;">Tip Jar &#x2194;</button>' +
    '<div id="hubTipBody" style="display:none;"></div>';
  if (shareBtn && shareBtn.parentNode && shareBtn.parentNode.parentNode) {
    shareBtn.parentNode.parentNode.insertBefore(seat, shareBtn.parentNode.nextSibling);
  } else if (document.body) {
    document.body.appendChild(seat);
  }
  var expandBtn = seat.querySelector('#hubTipExpand');
  var body = seat.querySelector('#hubTipBody');
  if (expandBtn && body) {
    expandBtn.addEventListener('click', function () {
      body.style.display = (body.style.display === 'none') ? 'block' : 'none';
    });
  }
  window.CC_TIP_SEAT_LOADED = true;
})();
