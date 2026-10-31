'use strict';
const assert=require('node:assert/strict');
const M=require('../public/assets/heavenly-messages');
const data=require('../public/assets/heavenly-messages-data');
const byId=id=>data.items.find(item=>item.id===id);
const words=id=>byId(id).segments.map(segment=>segment.text).join('');
describe('Phase 8 exact notes and defensive scene state',function(){
 it('keeps stable IDs and exact punctuation, emoji and intentionally punctuated jokes',function(){
  const exact={msg_know:'Those who know this website... 💀',msg_blocked:'All of these links are getting blocked 😭',msg_week:'All of this js to get blocked in a week 🥀',msg_doggy:'A tiny break with my Doggy',msg_khezu:'More than a Khezu…',msg_ao_oni:'oh look its ao oni',msg_naenae:'no Nae-Nae... there are no plugs here 🫩',msg_boundary:'no you cant use it for that.'};
  for(const[id,text]of Object.entries(exact)){assert.equal(words(id),text);assert.equal(byId(id).reducedMotionText,text)}
  assert.equal(new Set(data.items.map(item=>item.id)).size,data.items.length);
  assert.deepEqual(byId('msg_naenae').segments[1],{text:'Nae-Nae',emphasis:true,gradient:'ocean'});
  assert.equal(byId('msg_search').enabled,false);assert.equal(byId('msg_bookmarks').enabled,false);
 });
 it('uses confirmed scene lines and puts reactions on the intended note and side',function(){
  assert.deepEqual(byId('msg_ao_oni').action.steps.map(({speaker,text})=>({speaker,text})),[{speaker:'You',text:'what is an ao oni'},{speaker:'Cloudy',text:"you don't know ball"}]);
  assert.deepEqual(byId('msg_khezu').action.steps.map(({speaker,text})=>({speaker,text})),[{speaker:'Hunter',text:'So… can I use this for… something else?'},{speaker:'You',text:'wait, why he looking kinda…'},{speaker:'Cloudy',text:'yo wth 😭'}]);
  assert(byId('msg_ao_oni').action.steps.every(step=>step.asset!=='anger'));
  assert.deepEqual(byId('msg_go').noteImage,{asset:'anger',imagePlacement:'inline'});
  assert(byId('msg_purple_hulk').action.steps.every(step=>step.asset==='ao-side'&&step.imagePlacement==='right'));
 });
 it('hides all music note families by default with a reversible flag and retained source',function(){
  function selected(){const c=M.createController({data,random:M.createSeededRandom('music visibility')});const seen=new Set();for(let i=0;i<800;i++){seen.add(c.getCurrent().id);c.next()}c.destroy();return seen}
  const music=data.items.filter(item=>item.action?.type==='playlist');assert.equal(music.length,4);assert(music.every(item=>item.enabled));
  try{M.config.musicNotes=false;let seen=selected();for(const item of music)assert(!seen.has(item.id));M.config.musicNotes=true;seen=selected();for(const item of music)assert(seen.has(item.id))}finally{M.config.musicNotes=false}
 });
 it('accepts legacy placements and strictly validates new placement/image choices',function(){
  const old=M.clone(byId('msg_khezu'));old.action.steps.forEach(step=>delete step.imagePlacement);assert.equal(M.validateItem(old),true);
  for(const change of [item=>item.action.steps[0].imagePlacement='absolute',item=>item.noteImage={asset:'https://evil.invalid/a.png',imagePlacement:'inline'},item=>item.noteImage={asset:'anger',imagePlacement:'right',onclick:'alert(1)'}]){const item=M.clone(byId('msg_khezu'));change(item);assert.throws(()=>M.validateItem(item))}
 });
 it('keeps discoveries, appearances, completion and opt-out state distinct across reload',function(){
  const map=new Map(),storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
  let store=M.createSceneStore(storage);assert.deepEqual(store.read('ao-oni'),{discovered:false,completed:false,appearances:0,autoOpen:true,autoChoiceMade:false});
  store.update('ao-oni',{discovered:true});store.update('ao-oni',{appearance:true});assert.equal(store.read('ao-oni').completed,false);
  store.update('ao-oni',{completed:true});store=M.createSceneStore(storage);assert.equal(store.read('ao-oni').completed,true);assert.equal(store.read('ao-oni').appearances,1);
  store.update('ao-oni',{autoOpen:false,autoChoiceMade:true});assert.equal(store.read('ao-oni').completed,true);store.update('ao-oni',{autoOpen:true});assert.equal(store.read('ao-oni').appearances,1);assert.equal(store.read('ao-oni').autoChoiceMade,true);
 });
 it('recovers corrupt and hostile state and tolerates denied browser storage',function(){
  for(const serialized of ['not json','null','[]','{"schema":2,"scenes":{"ao-oni":{"completed":true}}}','{"schema":1,"scenes":{"ao-oni":{"completed":"yes","appearances":-8},"__proto__":{"completed":true}}}']){
   const store=M.createSceneStore({getItem:()=>serialized,setItem:()=>{throw Error('quota')}});assert.equal(store.read('ao-oni').completed,false);assert.equal(store.update('ao-oni',{appearance:true,completed:true}).appearances,1);assert.equal(store.read('ao-oni').completed,true)
  }
  assert.throws(()=>M.createSceneStore().read('__proto__'));assert.equal({}.completed,undefined);
 });
 it('shares one versioned dialogue-state normalizer with backup import/export',function(){
  const normalized=M.normalizeSceneState({schema:1,scenes:{'ao-oni':{completed:true,appearances:6}}});
  assert.equal(normalized.schema,1);assert.deepEqual(Object.keys(normalized.scenes),['ao-oni']);assert.equal(normalized.scenes['ao-oni'].completed,true);assert.equal(normalized.scenes['ao-oni'].appearances,6);assert.equal(normalized.scenes['ao-oni'].autoOpen,true);
  for(const value of [null,[],{}, {schema:2,scenes:{}},{schema:1,scenes:[]}])assert.throws(()=>M.normalizeSceneState(value),/schema/);
  assert.throws(()=>M.normalizeSceneState({schema:1,scenes:{'unrecognized-scene':{completed:true}}}),/scene/);
 });
 it('merges other tabs and observes imported/reset dialogue state in the existing session',function(){
  const map=new Map(),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
  const a=M.createSceneStore(storage),b=M.createSceneStore(storage);a.read('ao-oni');b.read('doggy');
  a.update('ao-oni',{completed:true,appearance:true});b.update('doggy',{completed:true,appearance:true});a.update('khezu',{discovered:true});
  for(const store of[a,b]){assert.equal(store.read('ao-oni').completed,true);assert.equal(store.read('doggy').completed,true);assert.equal(store.read('khezu').discovered,true)}
  storage.setItem('heavenly_dialogue_state_v1',JSON.stringify({schema:1,scenes:{khezu:{completed:true,appearances:7}}}));
  assert.equal(a.read('khezu').appearances,7);assert.equal(b.read('ao-oni').completed,false);map.delete('heavenly_dialogue_state_v1');assert.equal(a.read('khezu').completed,false);
 });
 it('retains unsupported/corrupt persisted bytes while scenes work transiently, until explicit replacement',function(){
  for(const raw of ['invalid JSON','null','{"schema":2,"scenes":{"ao-oni":{"completed":true}}}','{"schema":1,"scenes":{"future-scene":{"completed":true}}}','{"schema":1,"scenes":{"ao-oni":{"completed":"yes"}}}']){
   let saved=raw,writes=0;const storage={getItem:()=>saved,setItem:(_key,value)=>{saved=value;writes++}};const store=M.createSceneStore(storage);
   store.update('ao-oni',{discovered:true,completed:true,appearance:true});assert.equal(store.read('ao-oni').completed,true);assert.equal(saved,raw);assert.equal(writes,0);
   saved=JSON.stringify({schema:1,scenes:{doggy:{completed:true}}});assert.equal(store.read('ao-oni').completed,false);assert.equal(store.read('doggy').completed,true);store.update('ao-oni',{appearance:true});assert.equal(writes,1);assert.equal(JSON.parse(saved).scenes.doggy.completed,true);
  }
 });
});
