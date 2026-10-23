// Chromium native touch/mouse regression for mutually exclusive bookmark hold/drag actions.
const assert=require('node:assert/strict'),{chromium}=require('playwright'),app=require('../../app');let browser,server,checks=0;const pass=s=>{checks++;console.log('PASS '+s)};
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());const page=await context.newPage();page.setDefaultTimeout(7000);await page.goto(origin);await page.waitForTimeout(650);
 await page.evaluate(()=>{const d=loadBookmarkData();d.categories.forEach(c=>c.hidden=true);d.categories.push({id:'gesture',title:'Gesture fixtures',side:'left',order:0,subSections:[{id:'user',title:'Saved'}]});for(let i=0;i<9;i++)d.bookmarks.push({id:'gesture_'+i,title:'Gesture bookmark '+i,url:'https://example.test/'+i,categoryId:'gesture',subSectionId:'user',type:i===0?'folder_bookmark':'bookmark',launchPreference:'direct',order:i,subBookmarks:i===0?[{id:'gesture_child',title:'Nested page',url:'https://example.test/child'}]:[]});saveBookmarkData(d);expandedSubSections.gesture_user=true;expandedFolders.gesture_0=true;renderBookmarksUI()});
 const cdp=await context.newCDPSession(page),point=(x,y,id=1)=>({x,y,id,radiusX:3,radiusY:3,force:1});
 const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const preference=()=>page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='gesture_0').launchPreference);
 const reset=()=>page.evaluate(()=>{const d=loadBookmarkData();d.bookmarks.find(b=>b.id==='gesture_0').launchPreference='direct';saveBookmarkData(d);document.querySelectorAll('.modal-backdrop.active').forEach(e=>e.classList.remove('active'));closeReorderBar();renderBookmarksUI()});
 const handle=page.locator('[data-bm-id="gesture_0"] .drag-dots-handle'),body=page.locator('[data-bm-id="gesture_0"] .bookmark-title');
 await handle.scrollIntoViewIfNeeded();let a=await handle.boundingBox();await touch('touchStart',[point(a.x+a.width/2,a.y+a.height/2)]);await page.waitForTimeout(650);assert.equal(await preference(),'direct');assert.equal(await page.locator('.modal-backdrop.active').count(),0);assert.equal(await handle.evaluate(n=>n.classList.contains('heavenly-hold-ready')),true);assert.equal(await page.locator('#reorder-bar.active').count(),0);await touch('touchEnd');
 pass('holding the dedicated handle gives activation feedback without opening a modal or resetting launch preference');
 await reset();await body.scrollIntoViewIfNeeded();a=await body.boundingBox();await touch('touchStart',[point(a.x+12,a.y+a.height/2)]);await page.waitForTimeout(650);assert.equal(await preference(),'ask');assert.equal(await page.locator('#builtin-test-modal.active').count(),1);await touch('touchEnd');await page.keyboard.press('Escape');
 pass('holding the bookmark body still resets the preference and opens its existing launch interface');
 await reset();await body.scrollIntoViewIfNeeded();a=await body.boundingBox();await touch('touchStart',[point(a.x+12,a.y+8)]);await touch('touchMove',[point(a.x+12,a.y+28)]);await page.waitForTimeout(650);await touch('touchEnd');assert.equal(await preference(),'direct');assert.equal(await page.locator('.modal-backdrop.active').count(),0);
 pass('scroll movement cancels the body long press without navigation or preference changes');
 for(const cancel of ['touchCancel','second finger','blur','rerender']){
   await reset();await body.scrollIntoViewIfNeeded();a=await body.boundingBox();const p=point(a.x+12,a.y+8);await touch('touchStart',[p]);
   if(cancel==='touchCancel')await touch('touchCancel');
   else if(cancel==='second finger')await touch('touchStart',[p,point(p.x+40,p.y,2)]);
   else await page.evaluate(kind=>kind==='blur'?window.dispatchEvent(new Event('blur')):renderBookmarksUI(),cancel);
   await page.waitForTimeout(650);if(cancel!=='touchCancel')await touch('touchEnd');assert.equal(await preference(),'direct');assert.equal(await page.locator('.modal-backdrop.active').count(),0);
 }
 pass('touch cancellation, a second finger, blur and rerender cancel pending reset timers');
 await reset();await handle.scrollIntoViewIfNeeded();a=await handle.boundingBox();const target=await page.locator('[data-bm-id="gesture_3"]').boundingBox();let p=point(a.x+a.width/2,a.y+a.height/2);await touch('touchStart',[p]);await page.waitForTimeout(550);p=point(target.x+30,target.y+target.height*.8);await touch('touchMove',[p]);await page.waitForTimeout(650);assert.equal(await preference(),'direct');assert.equal(await page.locator('.modal-backdrop.active').count(),0);await touch('touchEnd');await page.waitForTimeout(150);
 assert.equal(context.pages().length,1);assert.equal(await page.locator('.drag-popout-avatar,.bookmark-drag-ghost,.bookmark-card.dragging').count(),0);
 const ordered=await page.evaluate(()=>loadBookmarkData().bookmarks.filter(b=>b.categoryId==='gesture').sort((a,b)=>a.order-b.order).map(b=>b.id));assert(ordered.indexOf('gesture_0')>ordered.indexOf('gesture_3'));
 pass('confirmed vertical touch drag persists its drop with no launch reset or accidental navigation');
 await reset();await page.evaluate(()=>{expandedFolders.gesture_0=true;renderBookmarksUI()});const child=page.locator('[data-note-bookmark-id="gesture_child"] .bookmark-title');await child.scrollIntoViewIfNeeded();a=await child.boundingBox();await touch('touchStart',[point(a.x+8,a.y+8)]);await touch('touchMove',[point(a.x+8,a.y+26)]);await page.waitForTimeout(650);await touch('touchEnd');assert.equal(await preference(),'direct');
 await child.scrollIntoViewIfNeeded();a=await child.boundingBox();await touch('touchStart',[point(a.x+8,a.y+8)]);await page.waitForTimeout(650);assert.equal(await preference(),'ask');await touch('touchEnd');await page.keyboard.press('Escape');
 pass('nested bookmarks distinguish scrolling from intentional body long presses');
 // Mouse pointer pickup cancels the body hold without handing the anchor to native dragging.
 await reset();await body.scrollIntoViewIfNeeded();a=await body.boundingBox();await page.mouse.move(a.x+8,a.y+8);await page.mouse.down();await page.mouse.move(a.x+35,a.y+40,{steps:5});await page.waitForTimeout(650);assert.equal(await preference(),'direct');assert.equal(await page.locator('.modal-backdrop.active').count(),0);await page.mouse.up();
 pass('mouse pointer dragging cancels the body reset timer');
 await reset();await body.hover();a=await body.boundingBox();await page.mouse.move(a.x+8,a.y+8);await page.mouse.down();await page.waitForTimeout(650);assert.equal(await preference(),'direct');assert.equal(await page.locator('.modal-backdrop.active').count(),0);await page.mouse.up();assert.equal(await preference(),'ask');assert.equal(await page.locator('#builtin-test-modal.active').count(),1);await page.keyboard.press('Escape');
 pass('stationary desktop holds retain their reset action on release, while delayed pickup stays safe');

 await handle.scrollIntoViewIfNeeded();await handle.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#reorder-bar.active').count(),1);assert.equal(context.pages().length,1);
 pass('keyboard management remains available after touch and mouse interactions');
 console.log(checks+' bookmark gesture conflict checks passed');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
