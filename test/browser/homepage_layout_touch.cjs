'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),app=require('../../app');
let browser,server,checks=0;const pass=s=>{checks++;console.log('PASS '+s)};
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
 const page=await context.newPage();await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForTimeout(400);
 const cdp=await context.newCDPSession(page),point=(x,y,id=1)=>({x,y,id,radiusX:5,radiusY:5,force:1}),touch=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});

 const state=()=>page.evaluate(()=>HeavenlyLayout.getState());const bookmarks=()=>page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
 const original=await bookmarks();
 for(const side of ['left','right']){
  const handle=page.locator('#'+side+'-resize');await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox(),a=point(box.x+box.width/2,box.y+70),direction=side==='left'?1:-1;
  const start=(await state()).preferences[side].width;await touch('touchStart',[a]);
  assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'sidebar-resize');
  for(let i=1;i<=12;i++){await touch('touchMove',[point(a.x+direction*i*5,a.y)]);await page.waitForTimeout(16)}
  assert.equal(await page.locator('#heavenly-drag-avatar').count(),0);await touch('touchEnd');await page.waitForTimeout(80);
  assert((await state()).preferences[side].width>=start+50);assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'');
  assert.equal(await bookmarks(),original);
 }
 const persisted=(await state()).preferences;await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(250);assert.deepEqual((await state()).preferences,persisted);
 pass('continuous touch resizes each inner separator independently, saves widths and never starts a bookmark drag or writes bookmark data');
 for(const cancel of ['touchcancel','second finger','blur','rotation']){
  const h=page.locator('#left-resize'),box=await h.boundingBox(),a=point(box.x+box.width/2,box.y+70),before=(await state()).preferences.left.width;
  await touch('touchStart',[a]);await touch('touchMove',[point(a.x+24,a.y)]);await page.waitForTimeout(30);
  if(cancel==='touchcancel')await touch('touchCancel');
  else if(cancel==='second finger'){await touch('touchStart',[point(a.x+24,a.y),point(a.x+70,a.y,2)]);await touch('touchEnd')}
  else if(cancel==='blur'){await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await touch('touchEnd')}
  else{await page.setViewportSize({width:1180,height:820});await touch('touchEnd')}
  await page.waitForTimeout(230);assert.equal((await state()).preferences.left.width,before);assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'');assert.equal(await page.evaluate(()=>document.body.classList.contains('homepage-resizing')),false);
 }
 pass('touch cancellation, second contacts, lost focus and orientation changes restore the prior committed width and release input ownership');
 await page.locator('#reset-home-layout').click();await page.waitForTimeout(220);assert.equal((await state()).preferences.left.width,256);assert.equal((await state()).preferences.right.width,256);
 await page.setViewportSize({width:700,height:900});await page.waitForTimeout(220);
 assert((await state()).actual.compact);await page.locator('.layout-toolbar [data-sidebar-toggle="left"]').tap();await page.waitForTimeout(400);
  await page.waitForFunction(()=>HeavenlyLayout.getState().actual.left.open);assert((await state()).actual.left.open);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>HeavenlyLayout.getState().actual.left.open);assert((await state()).actual.left.open);
 await page.locator('.layout-toolbar [data-sidebar-toggle="right"]').tap();await page.waitForTimeout(400);assert((await state()).actual.right.open&&(await state()).actual.left.open);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 pass('intermediate widths reveal both panels through real touch controls and retain explicit compact visibility after reload');
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(220);await page.locator('#reset-home-layout').click();await page.waitForTimeout(220);
 await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.25});
 assert.equal(await page.evaluate(()=>visualViewport.scale),1.25);
 assert(await page.evaluate(()=>{const s=HeavenlyLayout.getState(),c=document.getElementById('center-container').getBoundingClientRect();return c.width>=440&&s.actual.left.open&&s.actual.right.open&&document.documentElement.scrollWidth<=innerWidth}));
 await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
 pass('Chromium125% page/pinch scale preserves layout constraints (this is pinch scaling, not native browser UI zoom)');
 assert.equal(await bookmarks(),original);assert.equal(context.pages().length,1);console.log(checks+' sidebar touch integration groups passed; emulated Chromium input only');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
