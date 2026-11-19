/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: palm.js
Movements: Load UIDL subscriptions and display attributed activity inside the verified account.
Purpose: Let the owner open profiles, read feeds and acknowledge entries.
Does NOT: Infer reactions or contacts from a profile URL.
*/
import { publicLink, readFeed } from './palm-feed.js';
const el = id => document.getElementById(id);
const status = message => { el('status').textContent = message; };
const accountSession = localStorage.getItem('ccr-session');
function requireSignIn() {
  el('workspace').hidden = true;
  location.replace('signin.html?return=palm');
}
window.addEventListener('storage', () => {
  if (localStorage.getItem('ccr-session') !== accountSession) {
    el('workspace').hidden = true;
    location.reload();
  }
});
window.addEventListener('pagehide', () => { el('workspace').hidden = true; });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
function make(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function link(label, href) {
  const node = make('a', label);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}
function button(label, handler) {
  const node = make('button', label);
  node.onclick = async () => {
    node.disabled = true;
    try { await handler(); } catch (error) { status(error.message); }
    finally { node.disabled = false; }
  };
  return node;
}
async function ask(action, url, entryIds) {
  const session = localStorage.getItem('ccr-session');
  if (!session || session !== accountSession) { requireSignIn(); throw Error('Sign in required.'); }
  const result = await window.CCAuthority.ask('/api/channel-projects', { session, action, url, entryIds });
  if (result.signIn) { requireSignIn(); throw Error('Sign in required.'); }
  if (result.error || result.ok === false) throw Error(result.error || 'Authority is unavailable.');
  return result;
}
let version = 0;
async function refresh() {
  const generation = ++version;
  el('refresh').disabled = true;
  try {
    const { profiles, feeds, stageName } = await ask('palm-list');
    if (generation !== version) return;
    el('identity-welcome').textContent = stageName ? 'Welcome, ' + stageName : 'My Palm';
    el('workspace').hidden = false;
    el('panel').hidden = false;
    el('signin').hidden = true;
    const profileRows = profiles.filter(url => publicLink(url)).map(url => {
      const row = make('li','');
      row.append(link(new URL(url).host + new URL(url).pathname, url),make('small','Profile link'));
      return row;
    });
    el('profiles').replaceChildren(...(profileRows.length ? profileRows : [make('li','No profiles attached yet.')]));
    el('events').replaceChildren();
    el('empty').textContent = feeds.length ? 'Reading your sources…' : 'Attach a feed to see activity here.';
    status('');
    const events = [];
    const rows = await Promise.all(feeds.map(async feed => {
      const row = make('li','');
      let title = new URL(feed.url).host;
      try {
        const data = await readFeed(feed.url);
        title = data.title;
        for (const item of data.items) events.push({ ...item, title, feed });
        row.append(make('span',title), make('small',data.items.length + ' recent entries'));
      } catch (error) {
        row.append(make('span',title),make('small','Could not read this source. ' + error.message));
      }
      row.append(link('Open feed',feed.url),button('Remove feed',async () => { await ask('palm-remove',feed.url); await refresh(); }));
      return row;
    }));
    if (generation !== version) return;
    el('sources').replaceChildren(...rows);
    events.sort((a,b) => b.date-a.date);
    el('empty').textContent = events.length ? '' : feeds.length ? 'No entries loaded. See My feeds for source status.' : 'Attach a feed to see activity here.';
    for (const item of events) {
      const row = make('li','');
      const seen = item.feed.read.includes(item.id);
      const info = make('small',item.title + (item.date ? ' · ' + new Date(item.date).toLocaleString() : ''));
      row.append(item.href ? link(item.label,item.href) : make('strong',item.label),info);
      if (seen) row.append(make('small','Read'));
      else {
        const mark = button('Mark read',async () => {
          await ask('palm-read',item.feed.url,[item.id]);
          mark.replaceWith(make('small','Read'));
        });
        row.append(mark);
      }
      el('events').append(row);
    }
  } catch (error) { if (generation === version) status(error.message); }
  finally { if (generation === version) el('refresh').disabled = false; }
}
document.addEventListener('cc-profile-attached',refresh);
el('refresh').onclick = refresh;
el('add').onsubmit = async event => {
  event.preventDefault();
  const address = publicLink(el('address').value.trim());
  if (!address) { status('Enter an HTTPS feed address.'); return; }
  const save = el('add').querySelector('button');
  save.disabled = true;
  try { await ask('palm-add',address); el('add').reset(); await refresh(); }
  catch (error) { status(error.message); }
  finally { save.disabled = false; }
};
if (accountSession) refresh();
else requireSignIn();
