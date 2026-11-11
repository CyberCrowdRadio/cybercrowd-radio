/* Channels Department: owner-only profile editor.
 * Account identity comes from Firebase Auth; channel name from users/{uid}/project.
 * Writes remain inside the existing user's profile. Public publication requires
 * separately verified database rules and a public directory.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const status=$('channelDepartmentStatus'),form=$('channelDepartmentForm');
if(!status||!form)return;
let current=null,project='';
const allowed=['website','youtube','dlive','facebook','x'];
function https(s){if(!s)return '';const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password)throw Error('HTTPS link required');return u.href;}
function setReady(ready){$('channelSave').disabled=!ready;$('channelPreview').disabled=!ready;}
setReady(false);
CCAuth.onUser(async function(user){
current=null;project='';setReady(false);
if(!user||!user.emailVerified){status.textContent='Sign in with a verified account to manage your channel.';return;}
try{
await CCAuth.init();
const snap=await firebase.database().ref('users/'+user.uid).get();
const profile=snap.val();
if(!profile||!profile.project)throw Error('Your account has no show/channel name.');
current=user;project=String(profile.project);
$('channelName').textContent=project;
const c=profile.channelDepartment||{};
$('channelBio').value=String(c.bio||'');
$('channelLiveUrl').value=String(c.liveUrl||'');
$('channelAudio').checked=!!c.radioBackground;
for(const k of allowed)$(k+'Link').value=String((c.links||{})[k]||'');
status.textContent='Editing your account channel. Saving does not make a stream live.';
setReady(true);
}catch(e){status.textContent='Channel unavailable: '+e.message;}
});

$('channelStop').addEventListener('click',function(){
$('channelMedia').replaceChildren();$('channelPreviewPanel').hidden=true;
});
$('channelPreview').addEventListener('click',function(){
const panel=$('channelPreviewPanel'),media=$('channelMedia'),message=$('channelPreviewStatus');
media.replaceChildren();panel.hidden=false;
let source='';
try{source=https($('channelLiveUrl').value.trim());}catch(e){message.textContent=e.message;return;}
if(!source){
message.textContent='No creator stream configured. Radio remains available separately.';
const a=document.createElement('a');a.href='station.html';a.textContent='Listen to CyberCrowd Radio';media.append(a);return;
}
const u=new URL(source);
if(/\\.(mp4|webm|ogg)$/i.test(u.pathname)){
const video=document.createElement('video');video.controls=true;video.playsInline=true;video.src=source;video.style.maxWidth='100%';media.append(video);
message.textContent='Direct video preview. This does not verify that the feed is live.';
}else if(/\\.(mp3|aac)$/i.test(u.pathname)){
const audio=document.createElement('audio');audio.controls=true;audio.src=source;media.append(audio);
message.textContent='Direct audio preview. This does not verify that the feed is live.';
}else{
const a=document.createElement('a');a.href=source;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open configured channel destination';
media.append(a);message.textContent='External feed: open the creator destination. Live status is not verified.';
}
});

form.addEventListener('submit',async function(ev){
ev.preventDefault();if(!current||!project)return;
setReady(false);
try{
const links={};for(const k of allowed)links[k]=https($(k+'Link').value.trim());
const liveUrl=https($('channelLiveUrl').value.trim());
const record={bio:$('channelBio').value.trim().slice(0,1000),liveUrl:liveUrl,radioBackground:$('channelAudio').checked,links:links,updatedAt:firebase.database.ServerValue.TIMESTAMP};
await firebase.database().ref('users/'+current.uid+'/channelDepartment').set(record);
status.textContent='Channel settings saved to your account. Live status is not verified.';
}catch(e){status.textContent='Save failed: '+e.message;}
finally{setReady(!!current);}
});
})();