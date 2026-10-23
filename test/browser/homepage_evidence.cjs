'use strict';
// Actual browser screenshots/video. Before captures use an immutable git archive.
// Usage: node test/browser/homepage_evidence.cjs [--before /path/to/base/archive]
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const baselineAt=process.argv.indexOf('--before');
const before=baselineAt>=0;
const source=before?path.resolve(process.argv[baselineAt+1]):path.resolve(__dirname,'../..');
const app=require(path.join(source,'app'));
const output=path.resolve(__dirname,'../../docs/homepage-overhaul/evidence');
const phase=before?'before':'after';
let browser,server;
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 async function context(options={}){
  const ctx=await browser.newContext({hasTouch:true,viewport:{width:1440,height:1000},...options});
  await ctx.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
  await ctx.route('**/*',r=>(r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/'))||['image','font','stylesheet'].includes(r.request().resourceType())?r.continue():r.abort());
  return ctx;
 }
 const ctx=await context();const page=await ctx.newPage();page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(4000)]);await page.waitForTimeout(1200);
 const captures=[];
 async function shot(id,w,h,note,scroll=true){
  if(w)await page.setViewportSize({width:w,height:h});if(scroll)await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(320);
  const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,centerWidth:document.getElementById('center-container').getBoundingClientRect().width,layout:window.HeavenlyLayout?.getState()}));
  assert(!metrics.overflow,id+' has horizontal page overflow');
  await page.screenshot({path:path.join(output,phase+'-'+id+'.png')});
  captures.push({id,width:w||await page.evaluate(()=>innerWidth),height:h||await page.evaluate(()=>innerHeight),file:'evidence/'+phase+'-'+id+'.png',note,...metrics});
  console.log('CAPTURE '+phase+' '+id);
 }
 for(const [id,w,h]of[['wide',1440,1000],['medium',1180,900],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['phone',390,844],['large-phone',430,932],['small-laptop',1366,768],['ultrawide',1920,1080]])await shot(id,w,h,'Default saved-layout intent, built-in catalog content.');
 await page.setViewportSize({width:1440,height:1000});
 if(!before){
  const toggle=side=>page.locator('#'+side+'-sidebar [data-sidebar-toggle="'+side+'"]:visible').first().click();
  await page.locator('#reset-home-layout').click();await shot('both-expanded',1440,1000,'Both panels expanded, default widths.');
  await toggle('left');await shot('left-collapsed',1440,1000,'Left panel explicitly collapsed; right panel stays open.');
  await toggle('left');await toggle('right');await shot('right-collapsed',1440,1000,'Right panel explicitly collapsed; left panel stays open.');
  await toggle('left');await shot('both-collapsed',1440,1000,'Both panels explicitly collapsed.');
  const saved=await page.evaluate(()=>JSON.stringify(HeavenlyLayout.getState().preferences));
  await page.locator('#bm-universal-search').fill('Games');await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(HeavenlyLayout.getState().preferences)),saved);
  await shot('search-collapsed',1440,1000,'Unified central search for Games with both sidebars collapsed; saved layout remains unchanged.');
  await page.locator('#bm-universal-search').fill('');await page.locator('#reset-home-layout').click();
  const separator=page.locator('#left-resize');await separator.focus();await page.keyboard.press('Home');
  assert.equal(await separator.getAttribute('aria-valuenow'),'240');await shot('narrow-sidebar',1440,1000,'Left panel resized to its functional 240px minimum using the accessible separator.');
  await page.locator('#reset-home-layout').click();
 }
 await page.locator('#bm-universal-search').fill('Games');await shot('search',1440,1000,'Universal bookmark search for Games.');
 await page.locator('#bm-universal-search').fill('');await page.waitForTimeout(200);
 const show=page.locator('.show-more-btn').first();await show.scrollIntoViewIfNeeded();await show.click();await page.waitForTimeout(220);
 await shot('show-more',1440,1000,'First available Show More section expanded with built-in content.',false);
 await page.emulateMedia({reducedMotion:'reduce'});await shot('reduced-motion',1440,1000,'Reduced-motion presentation.');await page.emulateMedia({reducedMotion:'no-preference'});
 assert.deepEqual(errors,[],'uncaught browser errors');
 await ctx.close();
 // A separate continuous recording preserves pickup, intermediate frames and settling.
 const recording=await context({recordVideo:{dir:output,size:{width:1180,height:820}},viewport:{width:1180,height:820}});
 const dragPage=await recording.newPage();await dragPage.goto(origin,{waitUntil:'domcontentloaded'});await dragPage.waitForTimeout(1000);
 if(!before){
  await dragPage.locator('#reset-home-layout').click();await dragPage.waitForTimeout(250);
  const grip=await dragPage.locator('#left-resize').boundingBox();
  await dragPage.mouse.move(grip.x+grip.width/2,grip.y+60);await dragPage.mouse.down();
  await dragPage.mouse.move(grip.x+grip.width/2+45,grip.y+60,{steps:12});
  assert.equal(await dragPage.locator('#heavenly-drag-avatar').count(),0,'resizing cannot create a bookmark preview');
  await dragPage.screenshot({path:path.join(output,'after-resizing.png')});
  captures.push({id:'resizing',width:1180,height:820,file:'evidence/after-resizing.png',note:'Actual pressed mouse resize at the left inner divider. No bookmark drag preview was created.'});
  await dragPage.mouse.up();await dragPage.locator('#reset-home-layout').click();await dragPage.waitForTimeout(250);
 }
 const handle=dragPage.locator('#left-column .bookmark-card .drag-dots-handle').first();await handle.scrollIntoViewIfNeeded();
 const sourceCard=handle.locator('xpath=ancestor::*[contains(@class,"bookmark-card")][1]');const bookmarkId=await sourceCard.getAttribute('data-bm-id');
 const cards=dragPage.locator('#left-column .bookmark-card');const target=cards.nth(3);
 const a=await handle.boundingBox(),b=await target.boundingBox();assert(a&&b,'source and target must be visible');
 const order=()=>dragPage.evaluate(id=>{const d=loadBookmarkData(),bm=d.bookmarks.find(x=>x.id===id);return d.bookmarks.filter(x=>x.categoryId===bm.categoryId&&x.subSectionId===bm.subSectionId).sort((x,y)=>x.order-y.order).map(x=>x.id)},bookmarkId);
 const previous=await order();const cdp=await recording.newCDPSession(dragPage),point=(x,y)=>({id:1,x,y,radiusX:5,radiusY:5,force:1});
 const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height*.85;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});await dragPage.waitForTimeout(520);
 for(let i=1;i<=14;i++){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x+(tx-x)*i/14,y+(ty-y)*i/14)]});await dragPage.waitForTimeout(45);
  if(i===9)await dragPage.screenshot({path:path.join(output,phase+'-touch-drag.png')});
 }
 const ghost=await dragPage.locator('#heavenly-drag-avatar').count();if(!before)assert.equal(ghost,1,'actual touch stroke must activate preview');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await dragPage.waitForTimeout(350);
 await dragPage.screenshot({path:path.join(output,phase+'-drop.png')});const committed=await order();
 if(!before){assert.notDeepEqual(committed,previous,'drop must change saved ordering');await dragPage.reload({waitUntil:'domcontentloaded'});assert.deepEqual(await order(),committed,'drop must persist after reload');}
 const video=dragPage.video();await recording.close();const rawVideo=await video.path();const namedVideo=path.join(output,phase+'-touch-drag.webm');if(rawVideo!==namedVideo){fs.copyFileSync(rawVideo,namedVideo);fs.unlinkSync(rawVideo);}
 captures.push({id:'touch-drag',width:1180,height:820,file:'evidence/'+phase+'-touch-drag.png',note:'Actual Chromium CDP emulated continuous touch: 520ms hold followed by 14 incremental moves. Preview present: '+ghost+'. Built-in bookmark '+bookmarkId+'.'});
 captures.push({id:'drop',width:1180,height:820,file:'evidence/'+phase+'-drop.png',note:'Touch release and short settling interval. Saved before: '+previous.join(', ')+'. Saved after: '+committed.join(', ')+'.'});
 fs.writeFileSync(path.join(output,phase+'.json'),JSON.stringify({phase,base:before?'013cd07a36854c74b8feb8f29a8437f2c4daa72b':undefined,captured:new Date().toISOString(),browser:await browser.version(),externalRequests:'External fonts, images and stylesheets allowed. Proxy/navigation requests blocked; local assets unchanged.',captures,recording:'evidence/'+phase+'-touch-drag.webm',errors},null,2));
 console.log('PASS '+captures.length+' screenshots; actual continuous touch recording captured.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
