/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: account-entry.js
Movements: Open Palm after identity verification and retain private account deep links.
Purpose: Give the account a single identity gate.
Does NOT: Issue identities or grant membership.
*/
(async function () {
  const status = document.getElementById('status');
  const gate = document.getElementById('sign-in');
  const session = localStorage.getItem('ccr-session');
  const sections = ['#projects','#identity','#socials','#resume'];
  const section = sections.includes(location.hash) ? location.hash : '';
  gate.href = 'signin.html?return=uidl' + section;
  function showGate() {
    status.textContent = 'Sign in to open your CyberCrowd account.';
    gate.hidden = false;
    document.getElementById('create-identity').hidden = false;
  }
  if (!session) { showGate(); return; }
  window.addEventListener('storage', () => {
    if (localStorage.getItem('ccr-session') !== session) location.reload();
  });
  window.addEventListener('pagehide', () => { document.getElementById('account-tools').hidden = true; });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  const account = await window.CCAuthority.ask('/api/session', {session});
  if (!account.success) {
    showGate();
    if (account.ok === false) status.textContent = 'Account verification is unavailable. Try again.';
    return;
  }
  if (!account.uidl) {
    status.textContent = 'Your session is verified. Your UIDL connection is unavailable.';
    return;
  }
  if (!section) { location.replace('palm.html'); return; }
  document.getElementById('account-tools').hidden = false;
  document.getElementById('my-palm').hidden = false;
  document.getElementById('welcome').textContent = 'Welcome, ' + account.stageName;
  for (const src of ['uidl-projects.js?v=pda','uidl-ican.js','uidl-socials.js','uidl-account-card.js']) {
    const script = document.createElement('script');
    script.src = src;
    document.body.append(script);
  }
  document.querySelector(section)?.scrollIntoView();
})();