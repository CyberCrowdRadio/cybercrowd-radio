/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: uidl-ican.js
Movements: Attach a capability and its evidence to the account's living résumé.
Purpose: Maintain the owner's private I CAN records through Authority.
Does NOT: Attest to the evidence or publish it.
*/
(async function () {
  const get = id => document.getElementById(id);
  const form = get('ican-form');
  const list = get('ican-list');
  const status = get('ican-status');
  const session = localStorage.getItem('ccr-session');
  if (!session) { status.textContent = 'Sign in to open your résumé.'; return; }
  async function ask(action, fields = {}) {
    const result = await window.CCAuthority.ask('/api/channel-projects',{ session, action, ...fields });
    if (result.error || result.ok === false) throw Error(result.error || 'Authority is unavailable.');
    return result;
  }
  async function load() {
    const result = await ask('ican-list');
    const rows = result.capabilities.map(item => {
      const row = document.createElement('li');
      const title = document.createElement('span');
      title.textContent = item.statement;
      row.append(title);
      for (const href of item.evidence) {
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = 'Open evidence';
        row.append(anchor);
      }
      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.onclick = async () => {
        remove.disabled = true;
        try { await ask('ican-remove',{ id: item.id }); await load(); }
        catch (error) { status.textContent = error.message; remove.disabled = false; }
      };
      row.append(remove);
      return row;
    });
    list.replaceChildren(...rows);
    status.textContent = rows.length ? 'Private capabilities and evidence' : 'Add your first capability.';
    form.hidden = false;
  }
  let pending;
  form.oninput = () => { pending = undefined; };
  form.onsubmit = async event => {
    event.preventDefault();
    const save = form.querySelector('button');
    save.disabled = true;
    pending ||= { id: crypto.randomUUID(), name: get('ican-name').value.trim(), url: get('ican-proof').value.trim() };
    try { await ask('ican-attach',pending); await load(); form.reset(); pending = undefined; }
    catch (error) { status.textContent = error.message; }
    finally { save.disabled = false; }
  };
  try { await load(); } catch (error) { status.textContent = error.message; }
})();
