'use strict';
const assert=require('node:assert/strict'),bookmarks=require('../public/assets/heavenly-bookmarks'),diagnostics=require('../lib/proxy-diagnostics');
describe('Active mirrors and explicit note sharing',()=>{
 const bm={id:'a',title:'Aether',url:'https://a.test/',personalNote:'Local',subBookmarks:[{id:'builtin',title:'Built in',url:'https://b.test/'},{id:'user',title:'My mirror',url:'https://c.test/',isUser:true,personalNote:'Nested'}]};
 it('prefers a working user mirror, deduplicates URLs and preserves canonical identity',()=>{
  const before=JSON.stringify(bm),result=bookmarks.mirrorState(bm,bm.url,bm.title,{[bm.url]:true});
  assert.equal(result.primary.url,'https://c.test/');assert.equal(result.primary.isPromoted,true);assert.equal(result.broken.length,1);assert.equal(JSON.stringify(bm),before);
  const restored=bookmarks.mirrorState(bm,bm.url,bm.title,{});assert.equal(restored.primary.url,bm.url);assert.equal(restored.primary.isPromoted,false);
  const duplicate={...bm,subBookmarks:[...bm.subBookmarks,{url:'https://c.test/'}]};assert.equal(bookmarks.mirrorState(duplicate,bm.url,bm.title,{}).entries.length,3);
 });
 it('keeps all-broken destinations identifiable rather than inventing a working fallback',()=>{
  const broken=Object.fromEntries([bm,...bm.subBookmarks].map(b=>[b.url,true]));const result=bookmarks.mirrorState(bm,bm.url,bm.title,broken);assert.equal(result.primary.url,bm.url);assert(result.primary.isBroken);assert.equal(result.broken.length,3);
 });
 it('excludes notes by default and includes nested plain text only for explicit opt-in',()=>{
  const payload={categories:[{id:'category',personalNote:'Not a bookmark note'}],bookmarks:[bm]},off=bookmarks.publicSharePayload(payload),on=bookmarks.publicSharePayload(payload,true);
  assert(!JSON.stringify(off).includes('personalNote'));assert.equal(on.categories[0].personalNote,undefined);assert.equal(on.bookmarks[0].personalNote,'Local');assert.equal(on.bookmarks[0].subBookmarks[1].personalNote,'Nested');assert.equal(payload.bookmarks[0].personalNote,'Local');
  assert.equal(bookmarks.publicSharePayload({bookmarks:[{personalNote:{html:'bad'}}]},true).bookmarks[0].personalNote,undefined);
 });
 it('keeps conflicting local notes unless replacement is explicit and never touches unrelated records',()=>{
  const data={bookmarks:[structuredClone(bm),{id:'other',personalNote:'Unrelated'}]},incoming={bookmarks:[{id:'a',personalNote:'Shared',subBookmarks:[{id:'builtin',personalNote:'New nested'},{id:'user',personalNote:'Shared nested'}]}]};
  bookmarks.mergeSharedNotes(data,incoming,false);assert.equal(data.bookmarks[0].personalNote,'Local');assert.equal(data.bookmarks[0].subBookmarks[0].personalNote,'New nested');assert.equal(data.bookmarks[0].subBookmarks[1].personalNote,'Nested');
  bookmarks.mergeSharedNotes(data,incoming,true);assert.equal(data.bookmarks[0].personalNote,'Shared');assert.equal(data.bookmarks[0].subBookmarks[1].personalNote,'Shared nested');assert.equal(data.bookmarks[1].personalNote,'Unrelated');
 });
 it('classifies genuine upstream 526 separately from transport TLS failures',()=>{
  const upstream=diagnostics.publicSnapshot({statusCode:526,phase:'response',source:'upstream',targetUrl:'https://www.rivestream.app/'});assert.equal(upstream.status,526);assert.equal(upstream.code,'UPSTREAM_HTTP_ERROR');assert.equal(upstream.phase,'response');assert.equal(upstream.source,'upstream');
  const tls=diagnostics.classify({code:'CERT_HAS_EXPIRED'});assert.equal(tls.status,502);assert.equal(tls.phase,'tls');
 });
});
