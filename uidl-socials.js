/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: uidl-socials.js
Movements: Attach and remove profile URLs on the signed-in owner's Socials ring.
Purpose: Manage social profiles under the existing UIDL.
Does NOT: Publish a profile or ask for social passwords.
*/
(async function () {
  const form = document.getElementById('social-form');
  const input = document.getElementById('social-url');
  const status = document.getElementById('social-status');
  const list = document.getElementById('social-list');
  const session = localStorage.getItem('ccr-session');
  if (!session) { status.textContent = 'Sign in to attach your profiles.'; return; }

  async function ask(action, url) {
    const result = await window.CCAuthority.ask('/api/channel-projects', { session, action, url });
    if (result.signIn) document.getElementById('sign-in').hidden = false;
    if (result.error || result.ok === false) throw new Error(result.ok === false ? 'Could not reach Radio Authority.' : result.error);
    return result;
  }
  let busy = false;
  async function refresh(action, url) {
    if (busy) return;
    busy = true;
    form.querySelector('button').disabled = true;
    try {
      if (action) await ask(action, url);
      const result = await ask('list-socials');
      list.replaceChildren();
      for (const href of result.urls) {
        const row = document.createElement('li');
        const title = document.createElement('span');
        title.textContent = href;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', 'Remove ' + href);
        remove.onclick = () => refresh('remove-social', href);
        row.append(title, remove);
        list.append(row);
      }
      if (action === 'attach-social') form.reset();
      status.textContent = action === 'attach-social' ? 'Attached to your Socials ring.' :
        action === 'remove-social' ? 'Link removed.' : '';
      form.hidden = false;
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; form.querySelector('button').disabled = false; }
  }
  form.onsubmit = event => {
    event.preventDefault();
    refresh('attach-social', input.value.trim());
  };
  document.addEventListener('cc-profile-attached', () => refresh());
  await refresh();
})();
