'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),playwright=require('playwright'),app=require('../../app');
const engine=process.env.HEAVENLY_BROWSER||'chromium',output=path.resolve(process.env.HEAVENLY_EVIDENCE_DIR||'docs/phase8/evidence');
let browser,server;const results={engine,checks:[],physicalDevices:[],errors:[]};
const pass=text=>{results.checks.push(text);console.log('PASS '+text)};
(async()=>{
 fs.mkdirSync(output,{recursive:true});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await playwright[engine].launch(engine==='chromium'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}:{});results.version=browser.version();
 const context=await browser.newContext({viewport:{width:1366,height:912},hasTouch:engine!=='firefox'});
 await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>results.errors.push(e.message));page.setDefaultTimeout(10000);
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HeavenlyLayout?.getState);
 await page.evaluate(()=>{
  const d=loadBookmarkData();d.categories.forEach(c=>c.hidden=true);
  for(const [id,title]of[['width_a','Research & learning resources'],['width_b','Saved project references']]) {
   d.categories.push({id,title,side:'bottom',order:d.categories.length,subSections:[{id:'links',title:'Useful links'}]});
   for(let i=0;i<7;i++)d.bookmarks.push({id:id+'_'+i,title:'Long but readable reference '+i,url:'https://example.test/'+id+'/'+i,categoryId:id,subSectionId:'links',order:i,personalNote:'Keep my note'});
  }
  saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh();
 });await settle();
 const a=page.locator('[data-category-id="width_a"]'),handle=a.locator('.category-resize'),prefs=()=>page.evaluate(()=>HeavenlyLayout.getState().preferences),collection=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
 const width=()=>a.evaluate(n=>n.getBoundingClientRect().width);
 const columns=()=>a.locator('.subsection-content').first().evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length);
 await handle.focus();await page.keyboard.press('Home');await settle();assert.equal((await prefs()).categoryWidths.width_a,260);assert.equal(await columns(),1);
 for(let i=0;i<6;i++)await page.keyboard.press('ArrowRight',{delay:20});await settle();
 assert.equal((await prefs()).categoryWidths.width_a,404);assert.equal(await columns(),1);
 await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.press('ArrowRight',{delay:20});await page.keyboard.press('ArrowRight',{delay:20});await settle();
 assert.equal((await prefs()).categoryWidths.width_a,500);assert.equal(await columns(),2);
 assert.equal(await handle.getAttribute('aria-valuenow'),'500');assert((await handle.boundingBox()).height>=44);
 pass('keyboard separators adapt the actual category container from one to two bookmark columns with a 44px target');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HeavenlyLayout?.getState);await settle();assert.equal((await prefs()).categoryWidths.width_a,500);assert(Math.abs(await width()-500)<1);
 await page.setViewportSize({width:320,height:740});await settle();assert(await width()<=320);assert.equal((await prefs()).categoryWidths.width_a,500);assert.equal(await columns(),1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await a.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,engine+'-bottom-phone.png')});
 await page.setViewportSize({width:1366,height:912});await settle();assert(Math.abs(await width()-500)<1);
 pass('refresh, phone pressure and return preserve the intentional width and avoid horizontal overflow');
 await handle.scrollIntoViewIfNeeded();let box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+70,box.y+box.height/2,{steps:12});await page.mouse.up();await settle();assert((await prefs()).categoryWidths.width_a>=560);assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'');
 let saved=(await prefs()).categoryWidths.width_a;box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-40,box.y+box.height/2);await page.keyboard.press('Escape');await page.mouse.up();await settle();assert.equal((await prefs()).categoryWidths.width_a,saved);assert(!await page.locator('body').evaluate(n=>n.classList.contains('homepage-resizing')));
 pass('mouse resizing commits on release; Escape cancels the draft width and cleans ownership');
 if(engine==='chromium') {
  const cdp=await context.newCDPSession(page),point=(x,y,id=1)=>({x,y,id,radiusX:5,radiusY:5,force:1}),touch=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  await handle.scrollIntoViewIfNeeded();box=await handle.boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  await touch('touchStart',[point(x,y)]);assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'category-resize');await touch('touchMove',[point(x+55,y)]);await touch('touchEnd');await settle();assert((await prefs()).categoryWidths.width_a>saved+40);saved=(await prefs()).categoryWidths.width_a;
  for(const interrupt of ['touchCancel','blur','second contact']) {
   box=await handle.boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
   await touch('touchStart',[point(x,y)]);await touch('touchMove',[point(x-30,y)]);
   if(interrupt==='touchCancel')await touch('touchCancel');else if(interrupt==='blur'){await page.evaluate(()=>dispatchEvent(new Event('blur')));await touch('touchEnd')}else{await touch('touchStart',[point(x-30,y),point(x+35,y,2)]);await touch('touchEnd')}
   await settle();assert.equal((await prefs()).categoryWidths.width_a,saved);assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'');
  }
  pass('genuine Chromium TouchEvent stream resizes locally and cancels on touchcancel, blur and second contact');
 }
 for(const [w,h]of[[768,1024],[1024,768],[1366,768],[390,844]]){await page.setViewportSize({width:w,height:h});await settle();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal((await prefs()).categoryWidths.width_a,saved)}
 assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),collection);
 await page.setViewportSize({width:1366,height:912});await settle();await a.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,engine+'-bottom-desktop.png')});
 const source=await a.locator('.section-header .drag-dots-handle').boundingBox(),b=page.locator('[data-category-id="width_b"]');await b.scrollIntoViewIfNeeded();
 // Real management interaction still exposes functional move choices.
 await a.locator('.section-header .drag-dots-handle').click();assert(await page.locator('#reorder-bar').isVisible());assert((await page.locator('#bar-close').boundingBox()).height>=44);assert.equal(await page.locator('#reorder-bar').evaluate(n=>getComputedStyle(n).backdropFilter),'none');await page.locator('#bar-close').click();
 pass('iPad-like portrait/landscape, Chromebook and phone widths retain state; four-dot management stays legible and usable');
 await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='width_a').side='left';saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});await settle();assert.equal((await prefs()).categoryWidths.width_a,saved);assert.equal(await page.locator('#left-column [data-category-id="width_a"] .category-resize').count(),0);
 await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='width_a').side='bottom';saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});await settle();assert(Math.abs(await width()-saved)<1);
 pass('moving a category to a side and back retains its width identity without exposing bottom-only controls on the side');

 await a.locator('.category-width-fit').click();await settle();assert.equal((await prefs()).categoryWidths.width_a,undefined);assert(await a.locator('.category-width-fit').isDisabled());assert(await width()>saved);
 pass('Fit width restores automatic sizing without touching bookmarks or category order');
 assert.deepEqual(results.errors,[]);
})().catch(e=>{results.failure=e.stack;console.error(e);process.exitCode=1}).finally(async()=>{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'layout-'+engine+'.json'),JSON.stringify(results,null,2)+'\n');await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
