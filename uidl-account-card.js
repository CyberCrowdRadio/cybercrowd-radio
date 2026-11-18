/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: uidl-account-card.js
Movements: Display the signed-in owner's Dewey card and private Radio details.
Purpose: Open or create the existing Authority metadata card under the owner's UIDL.
Does NOT: Display private keys or publish a channel.
*/
(async function () {
  'use strict';
  const id = key => document.getElementById(key);
  const session = localStorage.getItem('ccr-session');
  if (!session) return;
  const status = id('card-status');
  const button = id('card-action');
  async function load() {
    button.disabled = true;
    try {
      const account = await window.CCAuthority.ask('/api/session', {session});
      if (!account.success) {
        if (account.ok === false) throw new Error('Account details are temporarily unavailable.');
        return;
      }
      id('identity').hidden = false;
      id('stage').textContent = account.stageName || 'Unspecified';
      id('email').textContent = account.email;
      id('zip').textContent = account.zip || 'Unspecified';
      id('card-fields').hidden = false;
      let result = await window.CCAuthority.ask('/api/metadata', {session, action: 'get'});
      if (!result.success) throw new Error('Could not load your Dewey card.');
      if (!result.card) {
        result = await window.CCAuthority.ask('/api/metadata', {session, action: 'create'});
        if (!result.success || !result.card) throw new Error('Could not open your Dewey card.');
      }
      id('show').textContent = result.card.fields.projectName || 'Unspecified';
      status.textContent = 'Linked to your UIDL';
      button.hidden = true;
    } catch (error) {
      id('identity').hidden = false;
      status.textContent = error.message;
      button.textContent = 'Try again';
      button.hidden = false;
    } finally { button.disabled = false; }
  }
  button.addEventListener('click', load);
  await load();
})();
