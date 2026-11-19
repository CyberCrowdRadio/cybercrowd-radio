/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: service-picker.js
Movements: Start provider sign-in from each platform icon.
Purpose: Save profile attachments through the existing UIDL authority.
Does NOT: Collect provider passwords.
*/
// The last field enables Authority's provider-consent flow when configured.
const services = [
  ["xbox","Xbox","Gamertag","https://www.xbox.com/en-US/play/user/","Gaming",true],
  ["playstation","PlayStation","Online ID","https://profile.playstation.com/","Gaming",true],
  ["facebook","Facebook","Username","https://www.facebook.com/","Social",true],
  ["youtube","YouTube","Handle","https://www.youtube.com/@","Video",true],
  ["instagram","Instagram","Username","https://www.instagram.com/","Social",true],
  ["tiktok","TikTok","Username","https://www.tiktok.com/@","Video",true],
  ["x-twitter","X","Username","https://x.com/","Social",true],
  ["twitch","Twitch","Channel name","https://www.twitch.tv/","Video",true],
  ["dlive","DLive","Channel name","https://dlive.tv/","Video",true],
  ["threads","Threads","Username","https://www.threads.com/@","Social"],
  ["bluesky","Bluesky","Full handle","https://bsky.app/profile/","Social"],
  ["reddit","Reddit","Username","https://www.reddit.com/user/","Social"],
  ["pinterest","Pinterest","Username","https://www.pinterest.com/","Social"],
  ["snapchat","Snapchat","Username","https://www.snapchat.com/add/","Social"],
  ["discord","Discord","Public invite code","https://discord.gg/","Community"],
  ["telegram","Telegram","Channel username","https://t.me/","Community"],
  ["whatsapp","WhatsApp","Public channel code","https://www.whatsapp.com/channel/","Community"],
  ["mastodon","Mastodon","Full public profile URL","","Social"],
  ["linkedin","LinkedIn","Profile name","https://www.linkedin.com/in/","Work"],
  ["github","GitHub","Username","https://github.com/","Work"],
  ["behance","Behance","Username","https://www.behance.net/","Work"],
  ["dribbble","Dribbble","Username","https://dribbble.com/","Work"],
  ["googlemaps","Google Business Profile","Google Maps place or share URL","","Work"],
  ["vinted","Vinted","Public member URL","","Shops"],
  ["ebay","eBay","Seller username","https://www.ebay.com/usr/","Shops"],
  ["etsy","Etsy","Shop name","https://www.etsy.com/shop/","Shops"],
  ["shopify","Shopify","Storefront URL","","Shops"],
  ["gumroad","Gumroad","Shop name","https://{handle}.gumroad.com/","Shops"],
  ["depop","Depop","Shop username","https://www.depop.com/","Shops"],
  ["patreon","Patreon","Creator name","https://www.patreon.com/","Creator support"],
  ["kofi","Ko-fi","Page name","https://ko-fi.com/","Creator support"],
  ["buymeacoffee","Buy Me a Coffee","Page name","https://buymeacoffee.com/","Creator support"],
  ["bandcamp","Bandcamp","Artist name in your URL","https://{handle}.bandcamp.com/","Music"],
  ["soundcloud","SoundCloud","Profile name","https://soundcloud.com/","Music"],
  ["spotify","Spotify","Artist ID","https://open.spotify.com/artist/","Music"],
  ["mixcloud","Mixcloud","Username","https://www.mixcloud.com/","Music"],
  ["substack","Substack","Publication name","https://{handle}.substack.com/","Publishing"],
  ["medium","Medium","Username","https://medium.com/@","Publishing"],
  ["vimeo","Vimeo","Profile name","https://vimeo.com/","Video"],
  ["kick","Kick","Channel name","https://kick.com/","Video"],
  ["steam","Steam","Custom profile name","https://steamcommunity.com/id/","Gaming",true],
  ["itchdotio","itch.io","Creator name","https://{handle}.itch.io/","Gaming"],
  ["linktree","Linktree","Username","https://linktr.ee/","Publishing"]
];
export function profileAddress(base, raw) {
  if (!base) {
    const address = new URL(raw.trim());
    if (address.protocol !== 'https:' || address.username || address.password || address.href.length > 1000)
      throw Error('Enter the full HTTPS link to your public page.');
    return address.href;
  }
  const handle = raw.trim().replace(/^@/, '');
  if (!handle || handle.length > 100 || /[\/\\:?&%\u0000-\u001f]/.test(handle) || /^\.+$/.test(handle))
    throw Error('Enter the name you use on this service.');
  if (base.includes('{handle}')) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(handle)) throw Error('Enter the name before the first dot in your page address.');
    return base.replace('{handle}',handle.toLowerCase());
  }
  return base + encodeURIComponent(handle);
}
class ServicePicker extends HTMLElement {
  connectedCallback() {
    if (this.children.length) return;
    const grid = document.createElement('div');
    grid.className = 'service-grid';
    const filters = document.createElement('div');
    filters.className = 'service-filters';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Find a platform';
    search.setAttribute('aria-label','Find a platform');
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = '‹ Categories';
    const heading = document.createElement('h3');
    const menu = document.createElement('div');
    menu.className = 'service-menu';
    menu.setAttribute('role','group');
    menu.setAttribute('aria-label','Platform categories');
    filters.append(search,back);
    const empty = document.createElement('p');
    empty.hidden = true;
    empty.textContent = 'No matching platforms. Try another name.';
    let group = '';
    let lastCategory;
    function renderMenu() {
      const term = search.value.trim().toLowerCase();
      const atMenu = !term && !group;
      menu.hidden = !atMenu;
      grid.hidden = atMenu;
      back.hidden = atMenu;
      manual.hidden=true;
      heading.textContent = atMenu ? 'Choose a category' : term ? 'Search results' : group;
      form.hidden = true;
      message.textContent = '';
      let count = 0;
      for (const tile of grid.children) {
        tile.hidden = atMenu || (term ? !tile.dataset.search.includes(term) : tile.dataset.group !== group);
        if (!tile.hidden) count++;
      }
      empty.hidden = atMenu || count > 0;
    }
    for (const name of [...new Set(services.map(service => service[4]))].sort()) {
      const option = document.createElement('button');
      option.type = 'button';
      const count = services.filter(service => service[4] === name).length;
      option.textContent = name + ' (' + count + ')';
      option.onclick = () => {
        group = name;
        lastCategory = option;
        renderMenu();
        Array.from(grid.children).find(tile => !tile.hidden)?.focus();
      };
      menu.append(option);
    }
    search.addEventListener('input', () => { group = ''; renderMenu(); });
    back.onclick = () => {
      group = '';
      search.value = '';
      renderMenu();
      (lastCategory || search).focus();
    };
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
    const manual=document.createElement('button');
    manual.type='button';
    manual.textContent='Save a public profile link';
    manual.hidden=true;
    const ready=new Set(['steam']);
    function labelTile(tile,name){
      const direct=ready.has(tile.dataset.service);
      tile.lastChild.textContent=direct ? 'Sign in' : 'Profile link';
      tile.setAttribute('aria-label',(direct?'Sign in with ':'Add a public link for ')+name);
    }
    function signIntoRadio(id){
      sessionStorage.setItem('cc-social-resume',id);
      location.assign('signin.html?return=uidl#socials');
    }
    manual.onclick=()=>{
      const [,name,field,base]=selected;
      manual.hidden=true;
      label.textContent=name+' · '+field;
      form.hidden=false;
      input.value='';
      input.type=base?'text':'url';
      input.placeholder=base?field:'https://';
      input.focus();
    };
    for (const service of services) {
      const [id,name,field,base,group,consent] = service;
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.dataset.service = id;
      tile.dataset.group = group;
      tile.dataset.search = (name+' '+group+' '+id).toLowerCase();
      tile.setAttribute('aria-pressed','false');
      tile.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="palm-icons.svg?v=catalog43#'+id+'"></use></svg>';
      tile.append(document.createTextNode(name),document.createElement('small'));
      labelTile(tile,name);
      tile.onclick = async () => {
        selected=service;
        form.hidden=true;
        manual.hidden=true;
        const session=localStorage.getItem('ccr-session');
        if(!session){signIntoRadio(id);return;}
        for(const other of grid.children) other.setAttribute('aria-pressed',String(other===tile));
        if(!consent){
          message.textContent=name+' account sign-in is unavailable on CyberCrowd.';
          manual.hidden=false;
          manual.focus();
          return;
        }
        message.textContent='Opening '+name+' sign-in…';
        for(const other of grid.children) other.disabled=true;
        try {
          const result=await window.CCAuthority.ask('/api/social-connect',{action:'begin',provider:id,session});
          if(result.signIn){signIntoRadio(id);return;}
          if(result.url && result.state){
            sessionStorage.setItem('cc-social-pending',JSON.stringify({state:result.state,provider:id,back:location.pathname}));
            location.assign(result.url);return;
          }
          message.textContent=result.unavailable ? name+' account sign-in is unavailable on CyberCrowd.' : result.error || 'Could not open sign-in. Try again.';
          manual.hidden=!result.unavailable;
        }catch{message.textContent='Could not open sign-in. Try again.';}
        finally{for(const other of grid.children) other.disabled=false;}
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
    this.append(filters,heading,menu,message,manual,form,empty,grid);
    fetch('https://radio-authority.cybercrowdradio.workers.dev/api/social-connect',{cache:'no-store'})
      .then(response=>response.ok ? response.json() : null).then(result=>{
        if(!Array.isArray(result?.configured))return;
        ready.clear();
        for(const id of result.configured)ready.add(id);
        Array.from(grid.children).forEach((tile,index)=>labelTile(tile,services[index][1]));
      }).catch(()=>{});
    const resume=sessionStorage.getItem('cc-social-resume');
    if(resume && localStorage.getItem('ccr-session') && location.hash==='#socials'){
      sessionStorage.removeItem('cc-social-resume');
      const tile=Array.from(grid.children).find(tile=>tile.dataset.service===resume);
      if(tile){group=tile.dataset.group;queueMicrotask(()=>tile.click());}
    }
    renderMenu();
  }
}
customElements.define('cc-service-picker',ServicePicker);
