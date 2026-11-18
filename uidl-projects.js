// Show the signed-in owner's project list and send explicit actions to Authority.
(async function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const form = byId('add-project');
  const input = form.elements.projectName;
  const status = byId('status');
  const signIn = byId('sign-in');
  let session;
  let requestId;
  let busy = false;

  async function ask(action, fields = {}) {
    const result = await window.CCAuthority.ask('/api/channel-projects', { session, action, ...fields });
    if (result.signIn) {
      signIn.hidden = false;
      byId('my-palm').hidden = true;
    }
    if (result.error || result.ok === false) throw new Error(
      result.ok === false ? 'Could not reach Radio Authority. Try again.' : result.error
    );
    return result;
  }

  async function reload() {
    const result = await ask('list');
    byId('welcome').textContent = result.stageName ? 'Welcome, ' + result.stageName : 'My Account';
    for (const id of ['active', 'archived']) byId(id).replaceChildren();
    byId('empty').hidden = result.projects.some(project => !project.archived);
    const archivedCount = result.projects.filter(project => project.archived).length;
    byId('archive-count').textContent = '(' + archivedCount + ')';
    byId('no-archives').hidden = archivedCount > 0;
    byId('add-button').textContent = result.projects.length ? 'Add another project' : 'Create first project';
    if (!result.projects.length) byId('empty').textContent = 'Create your first private channel draft.';
    else byId('empty').textContent = 'All your projects are archived.';
    for (const project of result.projects) {
      const row = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = project.name;
      row.append(name);
      for (const [action, label] of [
        project.archived ? ['restore', 'Restore as draft'] : ['archive', 'Archive channel'],
        ['delete', 'Delete channel']
      ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('aria-label', label + ' — ' + project.name);
        button.addEventListener('click', () => {
          if (busy) return;
          if (action === 'delete' && !window.confirm('Permanently delete the draft “' + project.name + '”?')) return;
          change(action, { id: project.id });
        });
        row.append(button);
      }
      byId(project.archived ? 'archived' : 'active').append(row);
    }
    byId('projects').hidden = false;
    byId('my-palm').hidden = false;
  }

  async function change(action, fields) {
    busy = true;
    input.disabled = true;
    status.textContent = 'Saving…';
    try {
      await ask(action, fields);
      if (action === 'create') {
        form.reset();
        requestId = undefined;
      }
      await reload();
      status.textContent = 'Project list updated.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      input.disabled = false;
      busy = false;
    }
  }

  input.addEventListener('input', () => { requestId = undefined; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (busy || !input.value.trim()) return;
    requestId ??= crypto.randomUUID();
    change('create', { id: requestId, name: input.value.trim() });
  });
  try {
    session = localStorage.getItem('ccr-session');
    if (!session) {
      signIn.hidden = false;
      status.textContent = 'Sign in to open My Projects.';
      return;
    }
    await reload();
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message;
  }
})();
