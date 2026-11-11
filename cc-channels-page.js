/* CCChannelsPage — render configured channels and open their actual destinations.
 * No fabricated live status, no replay substituted for live.
 */
(function(){
'use strict';
const grid=document.getElementById('channelsGrid');
if(!grid)return;
const channels=(window.STATION_CONFIG&&window.STATION_CONFIG.channels)||[];
function secure(src){try{const u=new URL(src);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch(_){return null;}}
const valid=channels.filter(c=>c&&secure(c.src));
grid.replaceChildren();
if(!valid.length){
const empty=document.createElement('div');empty.className='channel-empty';
const title=document.createElement('p');title.className='channel-empty-title';title.textContent='No verified channel feeds configured yet.';
const detail=document.createElement('p');detail.textContent='The department is ready for creators. A channel appears here only after its actual destination is configured.';
empty.append(title,detail);grid.append(empty);return;
}
for(const c of valid){
const link=document.createElement('a');link.className='channel-card';link.href='channel-view.html?channel='+encodeURIComponent(String(c.id||c.name));
const name=document.createElement('span');name.className='channel-name';name.textContent=String(c.name||'Creator channel');
const kind=document.createElement('span');kind.className='channel-kind';kind.textContent=String(c.kind||'Channel destination')+' — view channel';
link.append(name,kind);grid.append(link);
}
})();