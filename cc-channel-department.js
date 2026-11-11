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
const allowed=['youtube','dlive','facebook','x'];
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
const heading=document.createElement('h3');heading.textContent=project;
const bio=document.createElement('p');bio.textContent=$('channelBio').value.trim()||'Your show description appears here.';
const note=document.createElement('p');note.textContent='CyberCrowd channel box — private preview. Broadcasting and public publication are separate.';
media.append(heading,bio,note);
message.textContent='Previewing your channel inside CyberCrowd.';
});

form.addEventListener('submit',async function(ev){
ev.preventDefault();if(!current||!project)return;
setReady(false);
try{
const links={};for(const k of allowed)links[k]=https($(k+'Link').value.trim());

const ref=firebase.database().ref('users/'+current.uid+'/channelDepartment');
await ref.update({bio:$('channelBio').value.trim().slice(0,1000),radioBackground:$('channelAudio').checked,links:links,updatedAt:firebase.database.ServerValue.TIMESTAMP});
status.textContent='Channel settings saved to your account. Live status is not verified.';
}catch(e){status.textContent='Save failed: '+e.message;}
finally{setReady(!!current);}
});
})();