'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = require('../public/assets/heavenly-catalog');
const bookmarks = require('../public/assets/heavenly-bookmarks');
const navigation = require('../public/assets/heavenly-navigation');
const clone = value => JSON.parse(JSON.stringify(value));
const get = (data, id) => bookmarks.findEntry(data, id);
function store(data) {
  let raw = data === undefined ? null : JSON.stringify(data);
  const other = {heavenly_broken_links:JSON.stringify({'https://newgrounds.com':true}), heavenly_settings:'{"unrelated":true}'};
  return { getItem:key => key === 'heavenly_bookmarks' ? raw : other[key] || null,
    setItem:(key, value) => { if (key !== 'heavenly_bookmarks') throw new Error('Unexpected storage mutation'); raw = value; } };
}
function oldRelease() {
  const previous = clone(catalog.release); previous.version = '2026.10.23.1'; previous.date = '2026-10-23';
  previous.data.bookmarks = previous.data.bookmarks.filter(b => !['bm_history_minds','bm_dancing_bunny'].includes(b.id));
  previous.data.bookmarks.forEach(b => { if (b.categoryId === 'cat_games' && b.order >= 7) b.order -= 2; });
  get(previous.data, 'bm_ng').title = 'Newgrounds: Syshi';
  previous.data.bookmarks.push({id:'bm_user_ng',title:'Newgrounds',url:'https://newgrounds.com',type:'folder_bookmark',builtIn:false,categoryId:'cat_games',subSectionId:'user',order:99,hidden:false,icon:get(previous.data,'bm_ng').icon,subBookmarks:[]});
  return previous;
}
function oldData() { return catalog.fresh(oldRelease()); }
function assertOne(data) {
  assert(get(data, 'bm_ng')); assert.equal(get(data,'bm_ng').builtIn, true); assert.equal(get(data,'bm_ng').title, 'Newgrounds');
  assert.equal(get(data, 'bm_user_ng'), null); assert.equal(data.bookmarks.filter(b => b.id === 'bm_ng').length, 1);
}
function noOptional(data) { assert.equal(get(data,'bm_history_minds'),null); assert.equal(get(data,'bm_dancing_bunny'),null); }

describe('Phase 3 Newgrounds compatibility: mandatory migration matrix', () => {
  it('1. fresh installation has one normal official Newgrounds', () => { const data = catalog.load(store()); assertOne(data); assert.equal(catalog.pending(data).changes.length,0); });
  it('2. both legacy records consolidate by stable identity without installing optional games', () => {
    const data = catalog.prepare(oldData()); assertOne(data); noOptional(data);
    assert(data._catalog.tombstones['bookmark:bm_user_ng']); assert(!data._catalog.accepted['bookmark:bm_user_ng']);
    assert.equal(data._catalog.migrations.newgrounds.originals.length,2);
  });
  it('3. old Syshi alone retains saved notes and original position', () => {
    const data = oldData(); data.bookmarks = data.bookmarks.filter(b => b.id !== 'bm_user_ng'); get(data,'bm_ng').personalNote='Syshi note'; get(data,'bm_ng').order=41;
    const result=catalog.prepare(data); assertOne(result); assert.equal(get(result,'bm_ng').personalNote,'Syshi note'); assert.equal(get(result,'bm_ng').order,41); noOptional(result);
  });
  it('4. normal legacy record alone is promoted in place with its existing personal placement', () => {
    const data = oldData(); data.bookmarks=data.bookmarks.filter(b=>b.id!=='bm_ng'); get(data,'bm_user_ng').personalNote='Normal note';
    const result = catalog.prepare(data); assertOne(result); assert.equal(get(result,'bm_ng').subSectionId,'user'); assert.equal(get(result,'bm_ng').order,99); assert.equal(get(result,'bm_ng').personalNote,'Normal note'); noOptional(result);
  });
  it('5. notes on both records survive, including two maximum-length notes in recovery', () => {
    const data=oldData(), a='A'.repeat(4000), b='B'.repeat(4000); get(data,'bm_ng').personalNote=a; get(data,'bm_user_ng').personalNote=b;
    const result=catalog.prepare(data), record=get(result,'bm_ng'); assert(record.personalNote.includes(a)); assert(record.personalNote.includes(b));
    assert(result._catalog.migrations.newgrounds.originals.some(s=>s.record.personalNote===b));
    assert.deepEqual(catalog.prepare(clone(result)), result);
  });
  it('6. custom children on both sides survive once; different identities sharing a URL stay distinct', () => {
    const data=oldData(); get(data,'bm_ng').subBookmarks=[{id:'child_a',title:'A',url:'https://same.test/',isUser:true,personalNote:'A note'}]; get(data,'bm_user_ng').subBookmarks=[{id:'child_b',title:'B',url:'https://same.test/',isUser:true,personalNote:'B note'}];
    const result=catalog.prepare(data); assert.deepEqual(get(result,'bm_ng').subBookmarks.map(c=>c.id),['child_a','child_b']); assert.equal(get(result,'child_b').personalNote,'B note'); assert.deepEqual(catalog.prepare(clone(result)),result);
  });
  it('7. hiding either legacy record keeps the consolidated bookmark hidden', () => {
    for (const [a,b] of [[false,false],[true,false],[false,true],[true,true]]) { const data=oldData();get(data,'bm_ng').hidden=a;get(data,'bm_user_ng').hidden=b;const result=catalog.prepare(data);assert.equal(get(result,'bm_ng').hidden,a||b);assert.equal(get(catalog.restoreOrder(result,{}),'bm_ng').hidden,a||b); }
  });
  it('8. custom placement wins over defaults, with deterministic canonical priority for conflicts', () => {
    const data=oldData(); get(data,'bm_user_ng').categoryId='cat_movies';get(data,'bm_user_ng').subSectionId='user';get(data,'bm_user_ng').order=-9;
    const result=catalog.prepare(clone(data));assert.equal(get(result,'bm_ng').categoryId,'cat_movies');assert.equal(get(result,'bm_ng').order,-9);
    get(data,'bm_ng').categoryId='cat_anime';get(data,'bm_ng').order=80;const conflict=catalog.prepare(data);assert.equal(get(conflict,'bm_ng').categoryId,'cat_anime');assert.equal(get(conflict,'bm_ng').order,80);assert(conflict._catalog.migrations.newgrounds.conflicts.includes('position'));
  });
  it('9. both mirror sets and valid active/preferred/order choices survive conservatively', () => {
    const data=oldData(), a=get(data,'bm_ng'), b=get(data,'bm_user_ng');a.subBookmarks=[{id:'mirror_a',url:'https://a.test/',isUser:true}];b.subBookmarks=[{id:'mirror_b',url:'https://b.test/',isUser:true}];
    a.mirrorPreferences={active:'id:mirror_a',order:['id:mirror_a','main']};b.mirrorPreferences={preferred:'id:mirror_b',active:'id:mirror_b',order:['id:mirror_b','main']};
    const result=catalog.prepare(data), n=get(result,'bm_ng');assert.equal(n.mirrorPreferences.active,'id:mirror_a');assert.equal(n.mirrorPreferences.preferred,'id:mirror_b');assert.deepEqual(n.mirrorPreferences.order,['id:mirror_a','main','id:mirror_b']);assert(result._catalog.migrations.newgrounds.conflicts.includes('mirrorPreferences.active'));
  });
  it('10. an imported older private backup keeps notes, children, and prior skipped decisions', () => {
    const data=oldData();get(data,'bm_user_ng').personalNote='Imported note';get(data,'bm_ng').subBookmarks.push({id:'import_child',url:'https://import.test/',isUser:true});data._catalog.decisions['historical-change']='skipped';
    const result=catalog.imported(data,data,true);assertOne(result);assert.equal(get(result,'bm_ng').personalNote,'Imported note');assert(get(result,'import_child'));assert.equal(result._catalog.decisions['historical-change'],'skipped');noOptional(result);
    assert.deepEqual(catalog.imported(clone(result),clone(result),true),result);
  });
  it('11. Skip performs the required compatibility repair but never installs optional additions', () => {
    const data=oldData(), result=catalog.merge(data,catalog.release,'skipped');assertOne(result);noOptional(result);assert.equal(catalog.pending(result).changes.length,0);
    const storage=store(result);for(let i=0;i<3;i++){const loaded=catalog.load(storage);assertOne(loaded);noOptional(loaded);assert.equal(catalog.pending(loaded).changes.length,0);}
  });
  it('12. repeated update application neither duplicates games nor resurrects the retired alias', () => {
    const result=catalog.merge(oldData(),catalog.release,'applied'), again=catalog.merge(result,catalog.release,'applied');assertOne(again);assert.deepEqual(again,result);
    for(const id of ['bm_history_minds','bm_dancing_bunny'])assert.equal(again.bookmarks.filter(b=>b.id===id).length,1);
  });
  it('13. repeated browser loads produce a byte-stable migrated collection', () => {
    const storage=store(oldData());catalog.load(storage);const once=storage.getItem('heavenly_bookmarks');for(let i=0;i<4;i++)catalog.load(storage);assert.equal(storage.getItem('heavenly_bookmarks'),once);
  });
  it('14. invalid saved data fails safely without overwriting the original', () => {
    for(const data of [{categories:null,bookmarks:[]},{categories:[],bookmarks:[null]},(()=>{const d=oldData();get(d,'bm_ng').subBookmarks='bad';return d;})()]) {const storage=store(data),before=storage.getItem('heavenly_bookmarks');assert.throws(()=>catalog.load(storage));assert.equal(storage.getItem('heavenly_bookmarks'),before);}
  });
  it('15. a localStorage write failure preserves the original collection, decisions, and external broken map', () => {
    const storage=store(oldData()),before=storage.getItem('heavenly_bookmarks'),broken=storage.getItem('heavenly_broken_links');storage.setItem=()=>{throw new Error('Quota exceeded');};assert.throws(()=>catalog.load(storage),/Quota/);assert.equal(storage.getItem('heavenly_bookmarks'),before);assert.equal(storage.getItem('heavenly_broken_links'),broken);
    assert.throws(()=>catalog.commit(storage,'applied'),/Quota/);assert.equal(storage.getItem('heavenly_bookmarks'),before);
  });
  it('16. unrelated personal Newgrounds URLs retain every identity and customization', () => {
    const data=oldData();const personal={id:'my_newgrounds',title:'My Newgrounds',url:'https://newgrounds.com',categoryId:'cat_games',subSectionId:'user',order:-33,builtIn:false,personalNote:'Mine',subBookmarks:[{id:'personal_child',url:'https://newgrounds.com/portal/view/1'}]};data.bookmarks.push(personal);
    const result=catalog.merge(data,catalog.release,'applied');assertOne(result);assert.deepEqual(get(result,'my_newgrounds'),personal);assert(get(result,'personal_child'));
  });
});

describe('Phase 3 official additions and preservation',()=>{
  it('ships exact destinations, stable identities, bundled fallbacks, and Dancing Bunny immediately before Gamebois',()=>{
    const data=catalog.fresh(),games=data.bookmarks.filter(b=>b.categoryId==='cat_games'&&b.subSectionId==='builtin').sort((a,b)=>a.order-b.order);
    assert.equal(get(data,'bm_history_minds').url,'https://historyminds.com/activities');assert.equal(get(data,'bm_dancing_bunny').url,'https://cdn.jsdelivr.net/gh/ltorl/dancing-bunny/index.svg');assert.equal(games[games.findIndex(b=>b.id==='bm_gamebois')-1].id,'bm_dancing_bunny');
    const icons=require('../public/assets/heavenly-icons');for(const id of ['bm_history_minds','bm_dancing_bunny']){const b=get(data,id);assert(icons.presets.some(i=>'preset:'+i.id===b.icon));assert(bookmarks.eligibleMirror(b));assert.equal(navigation.remoteUrl(b.url),b.url);}
  });
  it('Apply appends to customized saved order and preserves launch and Quick Save choices',()=>{
    const data=oldData();get(data,'bm_gamebois').order=-100;get(data,'bm_ng').icon='preset:heart';get(data,'bm_user_ng').launchPreference='direct';get(data,'bm_user_ng').disableQuickSaveWidget=true;
    const result=catalog.merge(data,catalog.release,'applied');assert.equal(get(result,'bm_gamebois').order,-100);assert.equal(get(result,'bm_ng').launchPreference,'direct');assert.equal(get(result,'bm_ng').disableQuickSaveWidget,true);assert.equal(get(result,'bm_ng').icon,'preset:heart');assert(get(result,'bm_dancing_bunny').order>get(result,'bm_ubg98').order);
  });
  it('keeps conflicting icons and launch settings recoverable and migration archives out of public sharing',()=>{
    const data=oldData();get(data,'bm_ng').launchPreference='proxy';get(data,'bm_user_ng').launchPreference='direct';get(data,'bm_user_ng').icon='https://private.test/icon.png';get(data,'bm_user_ng').personalNote='Private legacy note';
    const result=catalog.prepare(data),archive=result._catalog.migrations.newgrounds;assert(archive.originals.some(s=>s.record.launchPreference==='direct'));assert.equal(get(result,'bm_ng').launchPreference,'proxy');assert(archive.conflicts.includes('launchPreference'));
    const shared=bookmarks.publicSharePayload(bookmarks.shareableData(result,catalog.defaults),true);assert(!shared._catalog);assert(!JSON.stringify(shared).includes('Private legacy note'));
  });
  it('recognizes the retired shipped alias in old public-share inputs while preserving its personal children',()=>{
    const data=oldData();get(data,'bm_user_ng').personalNote='Official alias private note';get(data,'bm_user_ng').subBookmarks.push({id:'legacy_personal_child',title:'Saved game',url:'https://newgrounds.com/portal/view/2',isUser:true,personalNote:'Opted-in child note'});
    const shared=bookmarks.publicSharePayload(bookmarks.shareableData(data,catalog.defaults),true);assert.equal(get(shared,'bm_user_ng'),null);assert(get(shared,'legacy_personal_child'));assert.equal(get(shared,'legacy_personal_child').personalNote,'Opted-in child note');assert(!JSON.stringify(shared).includes('Official alias private note'));assert(!shared._catalog);
  });
  it('records official ranking changes for review while Apply preserves existing numeric order',()=>{
    const previous=oldRelease(), data=catalog.fresh(previous), next=clone(previous);next.version='2026.10.24.2';get(next.data,'bm_gamebois').order=0;get(data,'bm_gamebois').order=123;
    assert(catalog.pending(data,next).changes.some(c=>c.key==='bookmark:bm_gamebois'));const result=catalog.merge(data,next,'applied');assert.equal(get(result,'bm_gamebois').order,123);assert.equal(result._catalog.accepted['bookmark:bm_gamebois'].value.order,0);
  });
  it('loads the browser order bridge and the same generated defaults in the proxy bundle',()=>{
    const context={HeavenlyNavigation:navigation,self:null};context.self=context;vm.runInNewContext(fs.readFileSync('public/assets/heavenly-official-order.js','utf8'),context);vm.runInNewContext(fs.readFileSync('public/assets/heavenly-catalog.js','utf8'),context);
    assert.equal(JSON.stringify(context.HeavenlyCatalog.defaults),JSON.stringify(catalog.defaults));assert(fs.readFileSync('app.js','utf8').includes("'/public/assets/heavenly-official-order.js'"));
  });
});

describe('Accepted official order restoration',()=>{
  it('section restore changes only eligible ordering and preserves personal records and all nonlayout fields',()=>{
    const data=catalog.fresh(),games=data.bookmarks.filter(b=>b.categoryId==='cat_games');games.forEach((b,i)=>b.order=100-i);
    const target=get(data,'bm_gamebois');target.personalNote='Keep';target.hidden=true;target.launchPreference='direct';target.mirrorPreferences={active:'main',preferred:'main'};
    const moved=get(data,'bm_ng');moved.categoryId='cat_movies';moved.subSectionId='user';moved.order=200;
    const personal={id:'personal_order',title:'Mine',url:'https://personal.test/',categoryId:'cat_games',subSectionId:'builtin',order:24,personalNote:'Private'};data.bookmarks.push(personal);const before=clone(data);
    const preview=catalog.previewRestore(data,{categoryId:'cat_games',subSectionId:'builtin'});assert(preview.count>0);assert(preview.changes.every(c=>c.key.startsWith('bookmark:')||c.key.startsWith('children:')));
    const result=catalog.restoreOrder(data,{categoryId:'cat_games',subSectionId:'builtin'});assert.equal(get(result,'bm_gamebois').order,get(catalog.defaults,'bm_gamebois').order);assert.equal(get(result,'bm_gamebois').personalNote,'Keep');assert(get(result,'bm_gamebois').hidden);assert.equal(get(result,'bm_gamebois').launchPreference,'direct');assert.deepEqual(get(result,'bm_gamebois').mirrorPreferences,target.mirrorPreferences);assert.deepEqual(get(result,'bm_ng'),moved);assert.deepEqual(get(result,'personal_order'),personal);assert.deepEqual(result._catalog,data._catalog);assert.deepEqual(data,before);
    for(const b of before.bookmarks.filter(b=>b.categoryId!=='cat_games'))assert.deepEqual(get(result,b.id),b);
  });
  it('global restore restores accepted category sides and official section order around custom sections',()=>{
    const data=catalog.fresh();data.categories[0].side='bottom';data.categories[0].order=44;const games=data.categories.find(c=>c.id==='cat_games');games.subSections.reverse();games.subSections.splice(1,0,{id:'personal_section',title:'Mine',hidden:true});const result=catalog.restoreOrder(data,{});
    assert.equal(result.categories[0].side,catalog.defaults.categories[0].side);assert.equal(result.categories[0].order,catalog.defaults.categories[0].order);assert.deepEqual(result.categories.find(c=>c.id==='cat_games').subSections.map(s=>s.id),['builtin','personal_section','user']);assert(result.categories.find(c=>c.id==='cat_games').subSections[1].hidden);
  });
  it('skipped rankings and absent official entries are never installed or used by restore',()=>{
    const previous=oldRelease(),data=catalog.fresh(previous),next=clone(previous);next.version='2026.10.24.2';get(next.data,'bm_gamebois').order=-4;data.bookmarks=data.bookmarks.filter(b=>b.id!=='bm_ubg98');get(data,'bm_gamebois').order=999;
    const skipped=catalog.merge(data,next,'skipped'),result=catalog.restoreOrder(skipped,{categoryId:'cat_games'});assert.equal(get(result,'bm_gamebois').order,5);assert.equal(get(result,'bm_ubg98'),null);assert.deepEqual(result._catalog,skipped._catalog);
  });
  it('restores the most recently accepted official ranking without moving builtins to different destinations',()=>{
    const data=catalog.fresh(),next=clone(catalog.release);next.version='2026.10.24.2';get(next.data,'bm_gamebois').order=99;get(next.data,'bm_ng').categoryId='cat_movies';get(next.data,'bm_ng').subSectionId='builtin';const updated=catalog.merge(data,next,'applied');get(updated,'bm_gamebois').order=123;get(updated,'bm_ng').order=456;
    const restored=catalog.restoreOrder(updated,{});assert.equal(get(restored,'bm_gamebois').order,99);assert.equal(get(restored,'bm_ng').categoryId,'cat_games');assert.equal(get(restored,'bm_ng').order,456);
  });
  it('preview cancellation is read-only, stale previews fail, and failed writes are atomic',()=>{
    const data=catalog.fresh();get(data,'bm_gamebois').order=90;const storage=store(data),before=storage.getItem('heavenly_bookmarks'),preview=catalog.previewRestore(data,{});assert.equal(storage.getItem('heavenly_bookmarks'),before);
    assert.throws(()=>catalog.commitRestore(storage,{},'stale'),/changed/);assert.equal(storage.getItem('heavenly_bookmarks'),before);storage.setItem=()=>{throw new Error('Quota exceeded');};assert.throws(()=>catalog.commitRestore(storage,{},preview.fingerprint),/Quota/);assert.equal(storage.getItem('heavenly_bookmarks'),before);
  });
  it('validates section scopes and preserves unrelated nested arrays',()=>{
    const data=catalog.fresh(),folder=get(data,'bm_individual_games');folder.subBookmarks.reverse();const before=clone(folder);catalog.restoreOrder(data,{categoryId:'cat_movies'});assert.deepEqual(get(data,'bm_individual_games'),before);const result=catalog.restoreOrder(data,{categoryId:'cat_movies'});assert.deepEqual(get(result,'bm_individual_games'),before);
    assert.throws(()=>catalog.restoreOrder(data,{subSectionId:'builtin'}),/scope/);assert.throws(()=>catalog.restoreOrder(data,{categoryId:'missing'}),/no longer/);assert.throws(()=>catalog.restoreOrder(data,{categoryId:'cat_games',subSectionId:'missing'}),/no longer/);
  });
});
