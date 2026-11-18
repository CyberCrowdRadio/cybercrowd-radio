/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: cc-owner-tools.js
Movements: Resolve creator tools through the same Authority session as Palm.
Purpose: Select an attached project and read earlier owner records on request.
Does NOT: Use a Firebase UID as the CyberCrowd owner.
*/
window.CCOwnerTools = (() => {
  const session = localStorage.getItem('ccr-session');
  const selector = document.getElementById('project');
  window.addEventListener('storage', () => {
    if (localStorage.getItem('ccr-session') !== session) location.reload();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  async function ask(action, fields = {}) {
    if (!session || session !== localStorage.getItem('ccr-session')) { location.replace('uidl.html'); throw Error('Sign in required.'); }
    const result = await CCAuthority.ask('/api/channel-projects',{session,action,projectId:selector.value,...fields});
    if (result.signIn) location.replace('uidl.html');
    if (result.error || result.ok === false) throw Error(result.error || 'Account unavailable.');
    return result;
  }
  async function open() {
    const data = await ask('list');
    selector.add(new Option(data.channelName,''));
    for (const p of data.projects.filter(p => !p.archived)) selector.add(new Option(p.name,p.id));
    document.getElementById('owner').hidden = false;
    return data;
  }
  let recovery;
  async function loadRecovery() {
    for (const src of ['config.js', ...['app','auth','database'].map(name=>'https://www.gstatic.com/firebasejs/10.12.5/firebase-'+name+'-compat.js'), 'cc-auth-config.js']) {
      await new Promise((resolve,reject) => {
        const script=document.createElement('script'); script.src=src; script.onload=resolve;
        script.onerror=()=>reject(Error('Earlier account storage is unavailable.')); document.head.append(script);
      });
    }
    await window.CCAuthBase.init();
  }
  async function earlier(field) {
    recovery ||= loadRecovery().catch(error=>{recovery=undefined;throw error;});
    await recovery;
    const user = await new Promise((resolve,reject) => {
      const unsubscribe = firebase.auth().onAuthStateChanged(u => { unsubscribe(); resolve(u); },reject);
    });
    if (!user || !user.emailVerified) throw Error('No verified earlier Firebase session is available on this device.');
    const account = await CCAuthority.ask('/api/session',{session});
    if (!account.success || !account.uidl || !account.email || account.email.toLowerCase() !== user.email?.toLowerCase())
      throw Error('The earlier account does not match this verified account.');
    const snap = await firebase.database().ref('users/' + user.uid + '/' + field).get();
    return snap.val();
  }
  return { ask, open, earlier };
})();