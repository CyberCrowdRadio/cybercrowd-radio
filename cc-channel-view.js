/* Creator channel viewer — playback only, never modifies station broadcast. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const channels=(window.STATION_CONFIG&&window.STATION_CONFIG.channels)||[];
const id=new URLSearchParams(location.search).get('channel');
const channel=channels.find(c=>String(c.id||c.name)===id);
const stage=$('creatorStage'),status=$('creatorStatus');
function safe(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u:null;}catch(_){return null;}}
function stop(){stage.querySelectorAll('audio,video').forEach(m=>{m.pause();m.removeAttribute('src');m.load();});stage.replaceChildren();status.textContent='Channel media stopped.';}
$('creatorStop').addEventListener('click',stop);
if(!channel){status.textContent='Channel not found in station directory.';return;}
$('creatorTitle').textContent=String(channel.name||'Creator Channel');
$('creatorDescription').textContent=String(channel.description||'');
const u=safe(channel.src);
if(!u){status.textContent='No valid HTTPS feed configured.';return;}
const pathname=u.pathname.toLowerCase();
if(/\.(mp4|webm|ogv)$/.test(pathname)||/\.(mp3|aac|ogg)$/.test(pathname)){
const video=/\.(mp4|webm|ogv)$/.test(pathname);
const media=document.createElement(video?'video':'audio');media.controls=true;media.preload='none';media.src=u.href;
if(video)media.playsInline=true;
stage.append(media);
status.textContent='Feed configured. Press play to connect; live status unverified.';
media.addEventListener('error',()=>{status.textContent='Media could not be played. Check the creator feed.';});
}else{
const link=document.createElement('a');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open creator live destination';
stage.append(link);status.textContent='External creator destination. Live status unverified.';
}
})();