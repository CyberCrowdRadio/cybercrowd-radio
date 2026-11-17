/* Open the existing listener equalizer inside the Channels console. */
(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const open = byId('channelsEqOpen');
  const close = byId('channelsEqClose');
  const panel = byId('channelsEqPanel');
  const controls = byId('channelsEqControls');
  const status = byId('channelsEqStatus');
  const membership = byId('channelsEqMembership');

  window.CCEQGate.onJoinRequest(() => {
    status.textContent = 'Your EQ trial has ended.';
    membership.hidden = false;
    membership.focus();
  });
  window.CCEQTrial.onEnd(() => {
    window.CCEQReset.reset();
    status.textContent = 'Your EQ trial has ended.';
    membership.hidden = false;
  });

  open.addEventListener('click', () => {
    panel.hidden = false;
    open.setAttribute('aria-expanded', 'true');
    if (!window.CCEQMount.mount(controls) || !window.CCEQMount.status().railAttached) {
      status.textContent = 'Could not connect EQ to the radio.';
    }
    close.focus();
  });

  close.addEventListener('click', () => {
    panel.hidden = true;
    open.setAttribute('aria-expanded', 'false');
    if (!open.disabled) open.focus();
  });
})();
