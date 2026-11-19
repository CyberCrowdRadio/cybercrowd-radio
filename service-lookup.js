/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: service-lookup.js
Movements: Resolve the service number entered or opened from a shared link.
Purpose: Display the service's published name and selected work evidence.
Does NOT: Query the account owner or enumerate related projects.
*/
const code=new URLSearchParams(location.search).get('ulid')?.trim().toUpperCase();
if(code){
  const el=id=>document.getElementById(id);
  el('code').value=code;
  try{
    if(!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(code))throw Error('Enter the 26-character service ULID.');
    el('status').textContent='Finding service…';
    const response=await fetch('https://radio-authority.cybercrowdradio.workers.dev/api/service?ulid='+encodeURIComponent(code),{cache:'no-store'});
    if(!response.ok)throw Error(response.status===404?'Service not found.':'Lookup unavailable. Try again.');
    const card=await response.json();
    el('name').textContent=card.name;
    if(card.evidence && new URL(card.evidence).protocol==='https:'){
      el('evidence').href=card.evidence;el('evidence').hidden=false;
    }
    el('card').hidden=false;el('status').textContent='';
  }catch(error){el('status').textContent=error.message;}
}
