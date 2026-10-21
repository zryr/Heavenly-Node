'use strict';
const assert = require('node:assert/strict');
const bookmarks = require('../public/assets/heavenly-bookmarks');
const fs = require('node:fs'), vm = require('node:vm');
const navigation = require('../public/assets/heavenly-navigation');
function fixture() {
  let data = { bookmarks:[{id:'fixture',url:'https://original.test/',title:'Original',personalNote:'Keep',launchPreference:'direct',subBookmarks:[
    {id:'m1',title:'First',url:'https://one.test/'},{id:'m2',title:'Second',url:'https://two.test/',isUser:true},
    {id:'asset',url:'https://cdn.test/icon.svg'},{id:'hidden',url:'https://hidden.test/',hidden:true},{id:'dup',url:'https://one.test'}]}]};
  const storage = { getItem:()=>JSON.stringify(data), setItem:(key,value)=>{data=JSON.parse(value);} };
  const get = ()=>JSON.parse(storage.getItem()).bookmarks[0];
  const state = (broken={})=>bookmarks.mirrorState(get(),'','',broken);
  const resolve = (broken={})=>{const s=state(broken);bookmarks.saveMirrorPreferences(storage,'fixture',s.preferences);return s;};
  return {storage,get,state,resolve};
}
describe('Persistent mirror choices',()=>{
 it('chooses and persists any eligible preferred destination, including the original',()=>{
  const f=fixture();bookmarks.chooseMirror(f.storage,'fixture','id:m1',{});
  assert.equal(f.resolve().active.url,'https://one.test/');assert.equal(f.state().preferred.identity,'id:m1');
  bookmarks.chooseMirror(f.storage,'fixture','main',{});assert.equal(f.resolve().active.identity,'main');
  assert.equal(f.get().url,'https://original.test/');assert.equal(f.get().personalNote,'Keep');assert.equal(f.get().launchPreference,'direct');
 });
 it('retains the fallback through restoration and refresh without losing the preference',()=>{
  const f=fixture();bookmarks.chooseMirror(f.storage,'fixture','id:m1',{});
  const fallback=f.resolve({'https://one.test/':true});assert.equal(fallback.active.identity,'main');assert(fallback.promoted);
  assert.equal(f.resolve().active.identity,'main');assert.equal(f.state().preferred.identity,'id:m1');assert(!f.state().promoted);
  bookmarks.chooseMirror(f.storage,'fixture','id:m1',{});assert.equal(f.state().active.identity,'id:m1');
 });
 it('orders eligible entries by saved IDs while leaving shipped child records intact',()=>{
  const f=fixture(),before=f.get().subBookmarks;
  bookmarks.reorderMirrors(f.storage,'fixture','id:m1','id:m2',false,{});
  assert.deepEqual(f.state().ordered.map(e=>e.identity),['main','id:m1','id:m2','id:asset']);assert.deepEqual(f.get().subBookmarks,before);
  const broken={'https://original.test/':true};assert.equal(f.resolve(broken).active.identity,'id:m1');
  assert.equal(f.resolve().active.identity,'id:m1');assert.deepEqual(f.state().ordered.map(e=>e.identity),['main','id:m1','id:m2','id:asset']);
 });
 it('keeps a working active site when order or broken non-active entries change',()=>{
  const f=fixture();bookmarks.chooseMirror(f.storage,'fixture','id:m2',{});
  bookmarks.reorderMirrors(f.storage,'fixture','main','id:m1',true,{});
  assert.equal(f.resolve({'https://one.test/':true}).active.identity,'id:m2');assert(!f.state().promoted);
 });
 it('explains all-broken state without inventing a working destination or repeated promotions',()=>{
  const f=fixture(),broken={'https://original.test/':true,'https://one.test/':true,'https://two.test/':true,'https://cdn.test/icon.svg':true};
  assert(f.resolve(broken).allBroken);assert(f.state(broken).active.isBroken);assert(!f.resolve(broken).promoted);
 });
 it('does not switch or promote merely on restoring an all-broken collection',()=>{
  const f=fixture(),broken={'https://original.test/':true,'https://one.test/':true,'https://two.test/':true,'https://cdn.test/icon.svg':true};f.resolve(broken);delete broken['https://one.test/'];
  assert.equal(f.resolve(broken).active.identity,'main');assert(!f.state(broken).promoted);assert.equal(f.state(broken).available[0].identity,'id:m1');
  bookmarks.chooseMirror(f.storage,'fixture','id:m1',broken);assert.equal(f.resolve(broken).active.identity,'id:m1');
 });
 it('retains order and intentional asset-style destinations without rewriting saved URLs',()=>{
  const f=fixture();assert.equal(f.state().entries.length,5);assert.equal(f.state().ordered.length,4);
  bookmarks.chooseMirror(f.storage,'fixture','id:asset',{});assert.equal(f.state().active.url,'https://cdn.test/icon.svg');assert.equal(f.get().subBookmarks.find(e=>e.id==='asset').url,'https://cdn.test/icon.svg');
  const broken={'https://one.test':true};assert(f.state(broken).broken.some(e=>e.identity==='id:m1'));
  bookmarks.reorderMirrors(f.storage,'fixture','id:m1','main',false,broken);assert.equal(f.state().ordered[0].identity,'id:m1');
 });
 it('respects explicit exclusions and rejects invalid or unsafe URLs independently of extension',()=>{
  for(const url of ['https://cdn.test/page.svg?view=1#start','https://cdn.test/image.png','https://cdn.test/data.json'])assert(bookmarks.eligibleMirror({url}));
  for(const entry of [{url:'https://valid.test/',mirrorEligible:false},{url:'https://valid.test/',hidden:true},{url:'javascript:alert(1)',mirrorEligible:true},{url:'data:image/svg+xml,hello'},{url:'invalid'}])assert(!bookmarks.eligibleMirror(entry));
  const parent={url:'https://main.test/',mirrorEligible:false,subBookmarks:[{id:'allowed',url:'https://cdn.test/home.svg'}]};assert.equal(bookmarks.mirrorState(parent,'','',{}).active.identity,'id:allowed');
 });
 it('handles legacy URLs without IDs and newly reconciled entries without duplicates',()=>{
  const bm={url:'https://original.test/',mirrorPreferences:{order:['url:https://legacy.test/']},subBookmarks:[{url:'https://legacy.test/'},{id:'new',url:'https://new.test/'}]};
  const s=bookmarks.mirrorState(bm,'','',{});assert.equal(s.ordered[0].identity,'url:https://legacy.test/');assert.equal(s.ordered.length,3);
 });
 it('keeps choices out of public shares, preserves them across stale ordinary writes',()=>{
  const f=fixture();bookmarks.chooseMirror(f.storage,'fixture','id:m1',{});
  const stale={bookmarks:[{...f.get(),mirrorPreferences:{active:'main'}}]};
  bookmarks.preserveStoredNotes(stale,{bookmarks:[f.get()]});assert.equal(stale.bookmarks[0].mirrorPreferences.active,'id:m1');
  assert(!JSON.stringify(bookmarks.publicSharePayload(stale,true)).includes('mirrorPreferences'));
 });
 for(const file of ['index.html','settings.html']) it('preserves complex catalog choices during '+file+' reconciliation',()=>{
  const html=fs.readFileSync(require.resolve('../public/'+file),'utf8');const f=fixture();const c={URL,HeavenlyNavigation:navigation,HeavenlyBookmarks:bookmarks,localStorage:f.storage};vm.createContext(c);
  let a=html.indexOf('    var DEFAULT_BOOKMARK_DATA =');vm.runInContext(html.slice(a,html.indexOf('\n    };',a)+7),c);
  const data=JSON.parse(JSON.stringify(c.DEFAULT_BOOKMARK_DATA));assert.equal(data.categories.length,4);assert.equal(data.bookmarks.length,52);
  const aether=data.bookmarks.find(b=>b.id==='bm_aether'),opium=data.bookmarks.find(b=>b.id==='bm_opium');assert.equal(aether.subBookmarks.length,16);assert.equal(opium.subBookmarks.length,22);
  aether.mirrorPreferences={preferred:'id:sub_aether_3',active:'id:sub_aether_5',order:['id:sub_aether_3','main'],explained:true};
  f.storage.setItem('heavenly_bookmarks',JSON.stringify(data));
  for(const name of ['loadBookmarkData','saveBookmarkData']){a=html.indexOf('    function '+name+'(');vm.runInContext(html.slice(a,html.indexOf('\n    function ',a+1)),c)}
  const loaded=c.loadBookmarkData();assert.deepEqual(JSON.parse(JSON.stringify(loaded.bookmarks.find(b=>b.id==='bm_aether').mirrorPreferences)),aether.mirrorPreferences);
  const s=bookmarks.mirrorState(opium,'','',{});assert.equal(s.ordered.length,23);assert.equal(s.entries.length,23);assert(s.ordered.some(e=>e.url.endsWith('.svg')));
 });
});
