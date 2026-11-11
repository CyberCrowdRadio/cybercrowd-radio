/* CyberCrowd Radio — Creator Market
 * One job: manage a creator-owned merchandise catalog and export store-ready listings.
 * No network writes, payment claims, or social posting. UIDL is supplied by verified host.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.CCCreatorMarket=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const safe=(s,n)=>{if(typeof s!=='string'||!s.trim())throw Error(n+' required');return s.trim();};
  const url=(s)=>{const u=new URL(safe(s,'URL'));if(u.protocol!=='https:'||u.username||u.password)throw Error('HTTPS URL required');return u.href;};
  const copy=o=>JSON.parse(JSON.stringify(o));
  function createCatalog({creatorUidl,channelId}){
    return {schema:'cc-market-1',creatorUidl:safe(creatorUidl,'UIDL'),channelId:safe(channelId,'channel'),items:[],events:[]};
  }
  function addItem(c,actor,item){
    if(actor!==c.creatorUidl)throw Error('UIDL mismatch');
    const x=copy(c),id=safe(item.id,'item ID');
    if(x.items.some(i=>i.id===id))throw Error('Duplicate item');
    const amount=Number(item.priceCents);
    if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid price');
    x.items.push({id,title:safe(item.title,'title'),description:String(item.description||''),priceCents:amount,currency:'USD',imageUrl:item.imageUrl?url(item.imageUrl):null,productUrl:item.productUrl?url(item.productUrl):null,status:'draft'});
    x.events.push({type:'item-created',id,actor});return x;
  }
  function linkItem(c,actor,id,productUrl){
    if(actor!==c.creatorUidl)throw Error('UIDL mismatch');
    const x=copy(c),item=x.items.find(i=>i.id===id);
    if(!item)throw Error('Unknown item');
    item.productUrl=url(productUrl);item.status='linked';
    x.events.push({type:'item-linked',id,actor});return x;
  }
  function publishable(c,id){
    const item=c.items.find(i=>i.id===id);
    if(!item||!item.productUrl||item.status!=='linked')throw Error('Item needs verified store URL');
    return {creatorUidl:c.creatorUidl,channelId:c.channelId,productId:item.id,title:item.title,storeUrl:item.productUrl,shareText:item.title+' — '+item.productUrl};
  }
  function serialize(c){return JSON.stringify(c);}
  function deserialize(raw){const c=JSON.parse(raw);if(c.schema!=='cc-market-1'||!Array.isArray(c.items)||!Array.isArray(c.events))throw Error('Invalid catalog');safe(c.creatorUidl,'UIDL');safe(c.channelId,'channel');return c;}
  return Object.freeze({createCatalog,addItem,linkItem,publishable,serialize,deserialize});
});
