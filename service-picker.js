/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: service-picker.js
Movements: Start provider sign-in from each platform icon.
Purpose: Save profile attachments through the existing UIDL authority.
Does NOT: Collect provider passwords.
*/
const services = [
  [
    "xbox",
    "Xbox",
    "Gamertag",
    "https://www.xbox.com/en-US/play/user/"
  ],
  [
    "playstation",
    "PlayStation",
    "Online ID",
    "https://profile.playstation.com/"
  ],
  [
    "facebook",
    "Facebook",
    "Username",
    "https://www.facebook.com/"
  ],
  [
    "youtube",
    "YouTube",
    "Handle",
    "https://www.youtube.com/@"
  ],
  [
    "instagram",
    "Instagram",
    "Username",
    "https://www.instagram.com/"
  ],
  [
    "tiktok",
    "TikTok",
    "Username",
    "https://www.tiktok.com/@"
  ],
  [
    "x-twitter",
    "X",
    "Username",
    "https://x.com/"
  ],
  [
    "twitch",
    "Twitch",
    "Channel name",
    "https://www.twitch.tv/"
  ],
  [
    "dlive",
    "DLive",
    "Channel name",
    "https://dlive.tv/"
  ]
];
export function profileAddress(base, raw) {
  const handle = raw.trim().replace(/^@/, '');
  if (!handle || handle.length > 100 || /[\/\\:?&%\u0000-\u001f]/.test(handle) || /^\.+$/.test(handle))
    throw Error('Enter the name you use on this service.');
  return base + encodeURIComponent(handle);
}
class ServicePicker extends HTMLElement {
  connectedCallback() {
    if (this.children.length) return;
    const grid = document.createElement('div');
    grid.className = 'service-grid';
    const form = document.createElement('form');
    form.hidden = true;
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.id = 'service-handle';
    input.required = true;
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    label.htmlFor = input.id;
    const save = document.createElement('button');
    save.textContent = 'Attach profile';
    const message = document.createElement('p');
    message.setAttribute('role','status');
    form.append(label,input,save);
    let selected;
    for (const service of services) {
      const [id,name,field] = service;
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.dataset.service = id;
      tile.setAttribute('aria-pressed','false');
      tile.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="palm-icons.svg#'+id+'"></use></svg>';
      tile.append(document.createTextNode(name));
      tile.setAttribute('aria-label','Connect '+name);
      tile.onclick = async () => {
        selected = service;
        form.hidden = true;
        const session = localStorage.getItem('ccr-session');
        if (!session) { location.assign('signin.html?return=uidl'); return; }
        for (const other of grid.children) {
          other.disabled = true;
          other.setAttribute('aria-pressed',String(other === tile));
        }
        message.textContent = 'Opening '+name+' sign-in…';
        try {
          const result = await window.CCAuthority.ask('/api/social-connect',{action:'begin',provider:id,session});
          if (result.signIn) { location.assign('signin.html?return=uidl'); return; }
          if (result.url && result.state) {
            sessionStorage.setItem('cc-social-pending',JSON.stringify({state:result.state,provider:id,back:location.pathname}));
            location.assign(result.url);
            return;
          }
          message.textContent = result.error || 'Connection unavailable. Try again.';
          if (result.unavailable) {
            message.textContent = name+' sign-in is unavailable. You can save your public profile here.';
            label.textContent = name+' '+field.toLowerCase();
            form.hidden = false;
            input.value = '';
            input.focus();
          }
        } catch { message.textContent = 'Could not open sign-in. Try again.'; }
        finally { for (const other of grid.children) other.disabled=false; }
      };
      grid.append(tile);
    }
    form.onsubmit = async event => {
      event.preventDefault();
      const [id,name,field,base] = selected;
      try {
        const url = profileAddress(base,input.value);
        const session = localStorage.getItem('ccr-session');
        if (!session) throw Error('Sign in to attach a profile.');
        save.disabled = true;
        for (const tile of grid.children) tile.disabled = true;
        const result = await window.CCAuthority.ask('/api/channel-projects',{session,action:'attach-social',url});
        if (!result.success) throw Error(result.error || 'Could not attach this profile.');
        message.textContent = name+' profile attached to your Socials ring.';
        form.hidden = true;
        for (const tile of grid.children) tile.setAttribute('aria-pressed','false');
        this.dispatchEvent(new CustomEvent('cc-profile-attached',{bubbles:true}));
      } catch (error) { message.textContent = error.message; }
      finally { save.disabled = false; for (const tile of grid.children) tile.disabled = false; }
    };
    this.append(grid,form,message);
  }
}
customElements.define('cc-service-picker',ServicePicker);
