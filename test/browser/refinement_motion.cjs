'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright'),app=require('../../app');
const output=path.resolve(__dirname,'../../docs/homepage-refinement/evidence');let browser,server,context;
const result={captured:new Date().toISOString(),input:'Actual Chromium CDP touch: 520ms hold, 14 moves 45ms apart, release and reload. Mouse resize and category controls use browser input.',loader:'Actual shared CSS animations paused at stated currentTime after reopening the existing preview. Live recording includes one normal-clock settling cycle.',physicalDevices:[],captures:[],errors:[]};
(async()=>{
 fs.mkdirSync(output,{recursive:true});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});result.browser=await browser.version();
 context=await browser.newContext({hasTouch:true,viewport:{width:1180,height:820},recordVideo:{dir:output,size:{width:1180,height:820}}});await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>(r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/'))||['image','font','stylesheet'].includes(r.request().resourceType())?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>result.errors.push(e.message));
 const shot=async(id,note)=>{await page.screenshot({path:path.join(output,id+'.png')});result.captures.push({id,file:'evidence/'+id+'.png',width:1180,height:820,note})};
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1000);
 const grip=page.locator('#left-resize'),a=await grip.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+55);await page.mouse.down();await page.mouse.move(a.x+a.width/2+35,a.y+55,{steps:10});assert.equal(await page.locator('#heavenly-drag-avatar').count(),0);await shot('refinement-resizing','Pressed mouse resize; no bookmark drag preview.');await page.mouse.up();
 await page.locator('#layout-options-trigger').click();await page.locator('#reset-home-layout').click();await page.waitForTimeout(220);
 const category=page.locator('#left-column .category-collapse-toggle').first();await category.click();await page.waitForTimeout(60);await shot('refinement-category-closing','Real category height animation 60ms after collapse input.');await category.click();await page.waitForTimeout(300);assert.equal(await category.getAttribute('aria-expanded'),'true');
 const handle=page.locator('#left-column .bookmark-card .drag-dots-handle').first();await handle.scrollIntoViewIfNeeded();const source=handle.locator('xpath=ancestor::*[contains(@class,"bookmark-card")][1]'),id=await source.getAttribute('data-bm-id');
 const saved=()=>page.evaluate(id=>{const d=loadBookmarkData(),b=d.bookmarks.find(x=>x.id===id);return d.bookmarks.filter(x=>x.categoryId===b.categoryId&&x.subSectionId===b.subSectionId).sort((x,y)=>x.order-y.order).map(x=>x.id)},id);
 const before=await saved(),b=await handle.boundingBox(),target=await page.locator('#left-column .bookmark-card').nth(3).boundingBox(),cdp=await context.newCDPSession(page),point=(x,y)=>({id:1,x,y,radiusX:5,radiusY:5,force:1});
 const x=b.x+b.width/2,y=b.y+b.height/2,tx=target.x+target.width/2,ty=target.y+target.height*.85;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});await page.waitForTimeout(520);
 for(let i=1;i<=14;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x+(tx-x)*i/14,y+(ty-y)*i/14)]});await page.waitForTimeout(45);if(i===9)await shot('refinement-touch-drag','Active continuous emulated touch with the real bookmark drag preview.');}
 assert.equal(await page.locator('#heavenly-drag-avatar').count(),1);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);await shot('refinement-drop','Touch release and settling. The recorded ordering is asserted after reload.');const after=await saved();assert.notDeepEqual(after,before);await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(350);assert.deepEqual(await saved(),after);result.drag={bookmarkId:id,before,after,persisted:true};
 for(const route of ['home','settings']){
  if(route==='settings'){await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1000)}
  await page.waitForFunction(()=>document.getElementById('heavenly-loading-screen').style.display==='none');
  await page.evaluate(()=>{const l=document.getElementById('heavenly-loading-screen');l.classList.remove('fade-out');l.style.display='flex';l.getAnimations({subtree:true}).forEach(a=>{a.currentTime=0;a.play()})});
  await page.waitForTimeout(2100);
  for(const time of [0,900,2200]){
   await page.evaluate(time=>{const l=document.getElementById('heavenly-loading-screen');l.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=time})},time);await page.waitForTimeout(30);
   const properties=await page.evaluate(()=>{const l=document.getElementById('heavenly-loading-screen'),right=getComputedStyle(l.querySelector('.loading-wing-right')).transform,matrix=new DOMMatrixReadOnly(right);return{left:getComputedStyle(l.querySelector('.loading-wing-left')).transform,right,mirrored:matrix.a*matrix.d-matrix.b*matrix.c<0,animationCount:l.getAnimations({subtree:true}).length}});
   assert(properties.mirrored,route+' '+time+' right wing must preserve mirror: '+JSON.stringify(properties));await shot('loader-'+route+'-'+time,'Shared '+route+' loader; real CSS animations paused at '+time+'ms.');result.captures.at(-1).properties=properties;
  }
  await page.evaluate(()=>document.getElementById('heavenly-loading-screen').style.display='none');
 }
 assert.deepEqual(result.errors,[]);const video=page.video();await context.close();context=null;const raw=await video.path(),dest=path.join(output,'refinement-motion.webm');fs.renameSync(raw,dest);result.recording='evidence/refinement-motion.webm';fs.writeFileSync(path.join(output,'motion.json'),JSON.stringify(result,null,2));console.log('PASS continuous touch drop persists; category reversal; shared loaders at 0/900/2200ms; real recording.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await context?.close();await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
