/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: cc-channel-department.js
Movements: Edit and preview an attached project using the owner's verified UIDL.
Purpose: Save private channel settings through Authority.
Does NOT: Publish a channel.
*/
(async function(){
'use strict';
const $=id=>document.getElementById(id);
const {open, ask, earlier}=CCOwnerTools;
const form=$('channelDepartmentForm'),status=$('channelDepartmentStatus');
const allowed=['youtube','dlive','facebook','x'];
let project='',revision=0;
function fill(c){$('channelBio').value=c.bio||'';$('channelAudio').checked=!!c.radioBackground;for(const k of allowed)$(k+'Link').value=c.links?.[k]||'';}
function ready(on){$('channelSave').disabled=!on;$('channelPreview').disabled=!on;}
async function load(){
  const now=++revision; ready(false);$('channelPreviewPanel').hidden=true; fill({});
  project=$('project').selectedOptions[0].text; $('channelName').textContent=project;
  try{const res=await ask('channel-settings-get');if(revision!==now)return;fill(res.settings||{});status.textContent='Private channel settings';ready(true);}
  catch(e){if(revision===now)status.textContent=e.message;}
}
try{await open();await load();}catch(e){status.textContent=e.message;return;}
$('project').onchange=load;
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


form.onsubmit=async event=>{
  event.preventDefault();ready(false);$('project').disabled=true;
  try{
    const links=Object.fromEntries(allowed.map(k=>[k,$(k+'Link').value.trim()]));
    await ask('channel-settings-save',{asset:{bio:$('channelBio').value.trim(),radioBackground:$('channelAudio').checked,links}});
    status.textContent='Channel settings saved to your account.';
  }catch(e){status.textContent=e.message;}finally{ready(true);$('project').disabled=false;}
};
$('recover').onclick=async()=>{
  const now=revision;
  try{const settings=await earlier('channelDepartment');if(now!==revision)return;
    if(!settings){status.textContent='No earlier settings found.';return;}
    fill(settings);status.textContent='Earlier settings loaded for preview. Save to attach them to the selected project.';
  }catch(e){status.textContent=e.message;}
};
})();