/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: social-return.js
Movements: Return the selected provider account to the initiating Palm or account page.
Purpose: Complete consent in the original browser tab.
Does NOT: Accept provider credentials.
*/
const params=new URLSearchParams(location.search);
history.replaceState(null,'',location.pathname);
const status=document.getElementById('status'), back=document.getElementById('back');
try {
  const pending=JSON.parse(sessionStorage.getItem('cc-social-pending') || 'null');
  if (!pending || pending.provider!==params.get('provider') || pending.state!==params.get('state'))
    throw Error('This sign-in did not start in this tab. Return to your account and tap the service again.');
  sessionStorage.removeItem('cc-social-pending');
  if (['/palm','/palm.html'].includes(pending.back)) {back.href='/palm';back.textContent='Back to My Palm';}
  if (params.has('error') || !params.get('code')) throw Error('Sign-in was not completed.');
  const result=await window.CCAuthority.ask('/api/social-connect',{
    action:'finish',provider:pending.provider,state:pending.state,code:params.get('code'),session:localStorage.getItem('ccr-session')
  });
  if (!result.success) throw Error(result.error || 'Could not finish linking.');
  location.replace(back.href);
} catch(e) { status.textContent=e.message; }
