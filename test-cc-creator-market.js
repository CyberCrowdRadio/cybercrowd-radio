/* Development-branch tests for cc-creator-market.js.
 * Run: node test-cc-creator-market.js
 * No external dependencies or network calls.
 */
'use strict';
const assert=require('node:assert/strict');
const market=require('./cc-creator-market.js');
const uidl='uidl-creator-1';
const catalog=market.createCatalog({creatorUidl:uidl,channelId:'atomic-kricket'});
assert.equal(catalog.items.length,0);
assert.throws(()=>market.addItem(catalog,'intruder',{id:'shirt',title:'Shirt',priceCents:2500}),/UIDL mismatch/);
assert.throws(()=>market.addItem(catalog,uidl,{id:'shirt',title:'Shirt',priceCents:-1}),/Invalid price/);
const withItem=market.addItem(catalog,uidl,{id:'shirt',title:'Atomic Kricket Shirt',priceCents:2500});
assert.equal(catalog.items.length,0,'Original catalog remains unchanged');
assert.equal(withItem.items[0].status,'draft');
assert.throws(()=>market.addItem(withItem,uidl,{id:'shirt',title:'Duplicate',priceCents:100}),/Duplicate/);
assert.throws(()=>market.publishable(withItem,'shirt'),/verified store URL/);
assert.throws(()=>market.linkItem(withItem,uidl,'shirt','javascript:alert(1)'),/HTTPS/);
assert.throws(()=>market.linkItem(withItem,'intruder','shirt','https://example.com/shirt'),/UIDL mismatch/);
const linked=market.linkItem(withItem,uidl,'shirt','https://example.com/shirt');
const listing=market.publishable(linked,'shirt');
assert.equal(listing.creatorUidl,uidl);
assert.equal(listing.channelId,'atomic-kricket');
assert.equal(listing.storeUrl,'https://example.com/shirt');
assert.equal(market.deserialize(market.serialize(linked)).items[0].id,'shirt');
assert.equal(withItem.items[0].status,'draft','Linking does not mutate earlier catalog');
console.log('Creator market: 13 assertions passed');
