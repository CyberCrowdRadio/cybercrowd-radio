/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: uidl-market.js
Movements: Save creator merchandise drafts under the verified UIDL.
Purpose: Manage attached project drafts from Palm.
Does NOT: Publish listings or collect payments.
*/
(async function () {
  const get = id => document.getElementById(id);
  const { ask, open, earlier } = CCOwnerTools;
  const status = s => { get('notice').textContent = s; };
  async function list() {
    const {drafts} = await ask('market-list');
    const rows = drafts.map(d => {
      const li = document.createElement('li');
      li.textContent = d.title + ' · $' + (d.priceCents/100).toFixed(2) + ' · ' + d.channelId + ' ';
      if (d.productUrl) {
        const a = document.createElement('a'); a.href=d.productUrl; a.textContent='Open product'; a.rel='noopener noreferrer'; a.target='_blank'; li.append(a);
      }
      return li;
    });
    get('drafts').replaceChildren(...rows);
  }
  try { await open(); await list(); status('Private drafts'); } catch(e) {status(e.message); return;}
  get('marketForm').onsubmit=async e=>{
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
    try {
      await ask('market-save',{asset:{id:get('productId').value.trim(),title:get('title').value.trim(),priceCents:Math.round(Number(get('price').value)*100),productUrl:get('productUrl').value.trim()}});
      await list(); e.target.reset(); status('Draft saved to your account.');
    } catch(err){status(err.message);} finally{btn.disabled=false;}
  };
  get('recover').onclick=async e=>{
    const btn=e.target; btn.disabled=true;
    try {
      const records=Object.values(await earlier('marketDrafts') || {});
      const options=Array.from(get('project').options); let copied=0,unresolved=0;
      for(const record of records){
        const matches=options.filter(option=>option.text===record.channelId);
        if(matches.length!==1){unresolved++;continue;}
        try {await ask('market-save',{projectId:matches[0].value,asset:record});copied++;}
        catch{unresolved++;}
      }
      await list(); status(copied+' recovered or already saved. '+unresolved+' require review.');
    } catch(err){status(err.message);} finally{btn.disabled=false;}
  };
})();