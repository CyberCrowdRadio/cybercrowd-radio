/* File repo: CyberCrowdRadio/cybercrowd-radio
 * File name: cc-channel-inputs.js
 * Movements: Add reusable source strips to the channel owner's input panel.
 * Purpose: Save device-local routing for each verified owner and project.
 * Does NOT: Transmit or monitor captured audio through the speakers.
 */
(() => {
  'use strict';
  const root = document.querySelector('#channelInputs');
  const rows = root.querySelector('.inputs-list');
  const message = root.querySelector('[role=status]');
  const project = document.querySelector('#project');
  const kinds = {mic:'Microphone', camera:'Camera', bose:'Bose T1', deck:'Record player',
    line:'Computer / line input', shared:'Shared tab or computer audio', effect:'Sound effect file', image:'Image'};
  const type = root.querySelector('.input-type');
  Object.entries(kinds).forEach(([value, label]) => type.add(new Option(label, value)));
  const session = localStorage.getItem('ccr-session');
  let key, state, context, mix, epoch = 0, devices = [];
  const active = new Map();
  const pending = new Set();
  const urls = new Map();
  const database = new Promise((resolve, reject) => {
    const req = indexedDB.open('cc-channel-inputs', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('panels');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const report = e => {message.textContent = e.message || String(e);};
  function save() {
    if (!key) return;
    const tx = db.transaction('panels', 'readwrite');
    tx.objectStore('panels').put(state, key);
    tx.onerror = () => report(tx.error || Error('Panel could not be saved on this device.'));
  }
  let db;
  function engine() {
    if (!context) {
      context = new AudioContext();
      mix = context.createMediaStreamDestination();
    }
    return context.resume();
  }
  function stop(id) {
    const item = active.get(id);
    if (!item) return;
    active.delete(id);
    item.player?.pause();
    item.stream?.getTracks().forEach(track => track.stop());
    for (const node of item.nodes) node.disconnect();
  }
  function clear() {
    epoch++;
    key = null;
    pending.clear();
    for (const id of [...active.keys()]) stop(id);
    for (const value of urls.values()) URL.revokeObjectURL(value);
    urls.clear();
    rows.replaceChildren();
    root.style.backgroundImage = '';
    root.disabled = true;
    message.textContent = '';
  }
  function url(file) {
    if (!urls.has(file)) urls.set(file, URL.createObjectURL(file));
    return urls.get(file);
  }
  function background() {
    root.style.backgroundImage = state.background ? 'linear-gradient(#10151bd9,#10151bd9),url("' + url(state.background) + '")' : '';
  }
  async function load() {
    clear();
    const version = epoch;
    try {
      const owner = await CCAuthority.ask('/api/session', {session});
      if (!owner.success || !owner.uidl) throw Error('Sign in to configure channel inputs.');
      const id = JSON.stringify([owner.uidl, project.value]);
      db = await database;
      const saved = await new Promise((resolve, reject) => {
        const r = db.transaction('panels').objectStore('panels').get(id);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (version !== epoch) return;
      key = id;
      state = saved || {sources:[], background:null};
      root.disabled = false;
      background();
      render();
    } catch(e) {if (version === epoch) report(e);}
  }
  function setGain(s) {
    const item = active.get(s.id);
    if (item?.gain) item.gain.gain.setTargetAtTime(s.muted ? 0 : s.level, context.currentTime, 0.012);
  }
  async function start(s) {
    const version = epoch;
    if (pending.has(s.id)) return;
    pending.add(s.id);
    const item = {nodes:[]};
    active.set(s.id, item);
    render();
    try {
      const video = s.kind === 'camera';
      if (!video) await engine();
      if (version !== epoch || active.get(s.id) !== item) return;
      if (s.kind === 'effect') {
        if (!s.file) throw Error('Choose a sound effect file first.');
        item.player = new Audio(url(s.file));
        item.input = context.createMediaElementSource(item.player);
        item.player.onended = () => {stop(s.id);render();};
      } else {
        const spec = s.device ? {deviceId:{exact:s.device}} : {};
        const stream = s.kind === 'shared'
          ? await navigator.mediaDevices.getDisplayMedia({video:true, audio:true})
          : await navigator.mediaDevices.getUserMedia(video ? {video:spec} : {audio:{...spec, channelCount:{ideal:8},
              echoCancellation:false, noiseSuppression:false, autoGainControl:false}});
        if (version !== epoch || active.get(s.id) !== item) {stream.getTracks().forEach(t=>t.stop());return;}
        item.stream = stream;
        const track = video ? stream.getVideoTracks()[0] : stream.getAudioTracks()[0];
        if (!track) throw Error('This source supplied no audio. Choose a source with audio sharing enabled.');
        track.onended = () => {stop(s.id);render();};
        if (s.kind === 'shared') stream.getVideoTracks().forEach(t => {t.enabled=false;});
        if (!video) item.input = context.createMediaStreamSource(stream);
        devices = await navigator.mediaDevices.enumerateDevices();
        if (active.get(s.id) !== item) {item.input?.disconnect();return;}
      }
      if (item.input) {
        item.nodes.push(item.input);
        item.gain = context.createGain();
        item.nodes.push(item.gain);
        if (s.channel) {
          const count = item.stream?.getAudioTracks()[0]?.getSettings().channelCount;
          if (!count || s.channel > count) throw Error('This device did not report that input channel.');
          const splitter = context.createChannelSplitter(count);
          item.nodes.push(splitter);
          item.input.connect(splitter);
          splitter.connect(item.gain, s.channel - 1);
        } else item.input.connect(item.gain);
        item.gain.connect(mix);
        setGain(s);
        if (item.player) await item.player.play();
      }
      if (version === epoch) message.textContent = '';
    } catch(e) {if (version === epoch) {stop(s.id);report(e);}}
    finally {if (version === epoch) {pending.delete(s.id);render();}}
  }
  function button(parent, text, action) {
    const b = document.createElement('button'); b.type='button'; b.textContent=text;
    b.onclick=action;parent.append(b);return b;
  }
  function field(parent, text, el) {
    const label=document.createElement('label');label.append(text,el);parent.append(label);return el;
  }
  function render() {
    rows.replaceChildren();
    const files = new Set([state.background, ...state.sources.map(s => s.file)]);
    for (const [file, value] of urls) {
      if (!files.has(file)) {URL.revokeObjectURL(value);urls.delete(file);}
    }
    for (const s of state.sources) {
      const row=document.createElement('fieldset'), title=document.createElement('legend');
      title.textContent=s.name;row.append(title);rows.append(row);
      const name=field(row,'Input name',document.createElement('input'));name.value=s.name;
      name.onchange=()=>{s.name=name.value.trim()||kinds[s.kind];name.value=title.textContent=s.name;save();};
      const camera=s.kind==='camera', image=s.kind==='image', file=image||s.kind==='effect';
      const item=active.get(s.id);
      if (file) {
        const pick=field(row,s.file?.name||'Choose file',document.createElement('input'));
        pick.type='file';pick.accept=image?'image/*':'audio/*';
        pick.onchange=()=>{if(pick.files[0]) {stop(s.id);s.file=pick.files[0];save();render();}};
        if(image && s.file){const img=document.createElement('img');img.alt=s.name;img.src=url(s.file);row.append(img);}
      } else if (s.kind!=='shared') {
        const select=field(row,'Device',document.createElement('select'));
        select.add(new Option('System default',''));
        devices.filter(d=>d.kind===(camera?'videoinput':'audioinput') && d.deviceId).forEach((d,i)=>select.add(new Option(d.label||'Device '+(i+1),d.deviceId)));
        if(s.device && ![...select.options].some(o=>o.value===s.device))select.add(new Option('Saved device',s.device));
        select.value=s.device;select.disabled=!!item;
        select.onchange=()=>{s.device=select.value;save();};
        if(!camera){
          const channel=field(row,'Interface channel (0 = full mix)',document.createElement('input'));
          channel.type='number';channel.min='0';channel.max='32';channel.value=s.channel;channel.disabled=!!item;
          channel.onchange=()=>{s.channel=Math.max(0,Math.min(32,Math.trunc(Number(channel.value)||0)));channel.value=s.channel;save();};
        }
      }
      if(!image && !camera){
        const volume=field(row,'Level',document.createElement('input'));volume.type='range';volume.min=0;volume.max=2;volume.step=.01;volume.value=s.level;
        volume.oninput=()=>{s.level=Number(volume.value);setGain(s);};volume.onchange=save;
        const mute=button(row,s.muted?'Unmute':'Mute',()=>{s.muted=!s.muted;setGain(s);save();render();});
        mute.setAttribute('aria-pressed',String(s.muted));
      }
      if(camera && item?.stream){const v=document.createElement('video');v.autoplay=v.muted=v.playsInline=true;v.srcObject=item.stream;row.append(v);}
      if(!image) button(row,item?'Stop':(s.kind==='effect'?'Play effect':'Connect'),()=>{if(item){stop(s.id);render();}else start(s);}).disabled=pending.has(s.id);
      button(row,'Remove',()=>{stop(s.id);state.sources=state.sources.filter(x=>x.id!==s.id);save();render();});
    }
  }
  root.querySelector('.input-add').onclick=()=>{
    const kind=type.value;
    state.sources.push({id:crypto.randomUUID(),kind,name:kinds[kind]+' '+(1+state.sources.filter(s=>s.kind===kind).length),level:1,muted:false,device:'',channel:0});
    save();render();
  };
  root.querySelector('.input-devices').onclick=async()=>{
    const version=epoch;
    try {const camera=type.value==='camera';const probe=await navigator.mediaDevices.getUserMedia(camera?{video:true}:{audio:true});
      probe.getTracks().forEach(t=>t.stop());const found=await navigator.mediaDevices.enumerateDevices();
      if(version===epoch){devices=found;render();}
    }catch(e){if(version===epoch)report(e);}
  };
  root.querySelector('.input-background').onchange=e=>{if(e.target.files[0]){state.background=e.target.files[0];background();save();render();}e.target.value='';};
  root.querySelector('.input-reset').onclick=()=>{state.background=null;background();save();render();};
  window.CCChannelInputs={getAudioStream:()=>active.size && mix ? mix.stream:null,
    getCameraStreams:()=>Array.from(active.values()).map(i=>i.stream).filter(s=>s?.getVideoTracks().some(t=>t.enabled))};
  project.addEventListener('change',load);
  window.addEventListener('pagehide',clear);
  const owner=document.querySelector('#owner');
  if(!owner.hidden)load();
  else new MutationObserver((_,observer)=>{if(!owner.hidden){observer.disconnect();load();}}).observe(owner,{attributes:true,attributeFilter:['hidden']});
})();
