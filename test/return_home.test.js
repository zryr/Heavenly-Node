'use strict';
const assert=require('node:assert/strict'),navigation=require('../public/assets/heavenly-navigation');
function setup({focused=true,closed=false}={}) {
 const origin='https://heavenly.test',url=origin+'/proxy/https://fixture.test/',store=new Map(),events={},timers=[];
 const home={location:new URL(origin+'/'),document:{hasFocus:()=>focused},crypto:{randomUUID:()=> 'launch-token'},focus(){this.focused=true},addEventListener(name,fn){events[name]=fn},localStorage:{getItem:()=>null},setTimeout(){}};
 const child={location:{href:'about:blank'},closed,sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},postMessage(data,target){this.lastMessage={data,target}},close(){this.closed=true},setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},addEventListener(){},removeEventListener(){}};
 home.open=()=>child;
 navigation.launch(home,url,{kind:'bookmark',settings:{openBookmarksInNewTab:true}});
 child.location=new URL(url);child.opener=home;
 return {home,child,events,timers,origin,token:JSON.parse(store.get('heavenly_home_return')).token};
}
describe('Safe return to the originating homepage',()=>{
 it('focuses the registered homepage and closes only its exact script-opened child',()=>{
  const f=setup();f.events.message({origin:f.origin,source:f.child,data:{type:'heavenly:return-home',token:f.token}});
  assert(f.home.focused);assert(f.child.closed);assert.equal(f.home.location.pathname,'/');assert.equal(f.home.__heavenlyHomeReturns.size,0);
 });
 it('rejects unrelated windows, forged origins, invalid tokens and tabs navigated elsewhere',()=>{
  const f=setup(),data={type:'heavenly:return-home',token:f.token};
  for(const event of [{origin:f.origin,source:{},data},{origin:'https://other.test',source:f.child,data},{origin:f.origin,source:f.child,data:{...data,token:'wrong'}}])f.events.message(event);
  assert(!f.child.closed);f.child.location=new URL(f.origin+'/settings.html');f.events.message({origin:f.origin,source:f.child,data});assert(!f.child.closed);
 });
 it('does not close a child when the browser refuses homepage focus',()=>{
  const f=setup({focused:false});f.events.message({origin:f.origin,source:f.child,data:{type:'heavenly:return-home',token:f.token}});
  assert(!f.child.closed);assert.equal(f.child.lastMessage.data.type,'heavenly:home-unavailable');
 });
 it('navigates manual tabs home without opening another tab',()=>{
  const f=setup();f.child.opener=null;navigation.returnHome(f.child);assert.equal(f.child.location.href,f.origin+'/');assert(!f.child.closed);
 });
 it('falls back in the current tab when the opener is inaccessible or does not respond',()=>{
  const f=setup();f.home.postMessage=()=>{throw Error('blocked')};navigation.returnHome(f.child);assert.equal(f.child.location.href,f.origin+'/');
  const g=setup();g.home.postMessage=()=>{};navigation.returnHome(g.child);g.timers[0]();assert.equal(g.child.location.href,g.origin+'/');assert(!g.child.closed);
 });
 it('routes sandboxed child Home through its registered wrapper',()=>{
  const origin='https://heavenly.test';let message;
  const win={location:{origin},parent:{postMessage:(...args)=>message=args}};navigation.returnHome(win);assert.deepEqual(message,['heavenly:home',origin]);
 });
});
