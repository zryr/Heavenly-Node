'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),playwright=require('playwright'),app=require('../../app');
const engine=process.env.HEAVENLY_BROWSER||'chromium';let browser,server,checks=0;
const pass=s=>{checks++;console.log('PASS '+s)};
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await playwright[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:process.env.HEAVENLY_BROWSER_EXECUTABLE?{executablePath:process.env.HEAVENLY_BROWSER_EXECUTABLE}:{});
 const context=await browser.newContext({viewport:{width:1366,height:900},hasTouch:engine!=='firefox'});
 await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.fulfill({contentType:'text/html',body:'<h1>Controlled destination</h1>'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#heavenly-loading-screen').style.display==='none');
 const dir='work/final-ux/'+engine;fs.mkdirSync(dir,{recursive:true});const shot=name=>page.screenshot({path:dir+'/'+name+'.png'});
 const modal=page.locator('#builtin-test-modal'),available=modal.locator('.available-mirror-list');
 const open=()=>page.evaluate(()=>{const b=loadBookmarkData().bookmarks.find(b=>b.id==='bm_aether');openBuiltinTestModal(b.title,b.url,location.origin+'/proxy/'+b.url,null,false,b.id)});
 const row=id=>available.locator('.mirror-destination-row[data-mirror-identity="'+id+'"]');
 async function expand(){if(await available.locator(':scope > summary').getAttribute('aria-expanded')!=='true')await available.locator(':scope > summary').click();await page.waitForFunction(()=>{const n=document.querySelector('.mirror-disclosure-body');return n&&!n.hidden&&!n.__accordionAnimation});}
 async function nativeDrag(source,target,after=true){await source.scrollIntoViewIfNeeded();await page.waitForTimeout(180);let a=await source.boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height*(after?.8:.2),{steps:12});b=await target.evaluate(n=>HeavenlyDrag.rect(n));await page.mouse.move(b.left+b.width/2+1,b.top+b.height*(after?.8:.2));await page.waitForFunction(()=>!!document.querySelector('#heavenly-drag-avatar'));}
 const clean=()=>page.locator('#heavenly-drag-avatar,.bookmark-card.dragging,.section-card.dragging,.bookmark-placement-indicator').count();
 const title=page.locator('[data-bm-id="bm_miruro"] .bookmark-title'),target=page.locator('[data-bm-id="bm_anidb"]');
 await nativeDrag(title,target);await shot('bookmark-body-drag');await page.mouse.up();await page.waitForFunction(()=>loadBookmarkData().bookmarks.find(b=>b.id==='bm_miruro').order>loadBookmarkData().bookmarks.find(b=>b.id==='bm_anidb').order);assert.equal(await clean(),0);
 pass('actual bookmark body drag persists the indicated destination and clears source, preview and placement');
 await nativeDrag(title,page.locator('[data-bm-id="bm_aniclover"]'));await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await clean(),0);
 await title.click();assert(await modal.evaluate(n=>n.classList.contains('active')));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#builtin-test-modal').classList.contains('modal-closing'));
 const header=page.locator('[data-category-id="cat_movies"] .category-title'),anime=page.locator('[data-category-id="cat_anime"]');
 await nativeDrag(header,anime,false);await shot('category-body-drag');await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await clean(),0);
 pass('category title drag and Escape remain responsive; a normal bookmark click still opens its launch dialog');
 // Rejected interactive starts must not run the source dragstart handler.
 if(engine==='chromium'){
  const cdp=await context.newCDPSession(page),button=page.locator('[data-category-id="cat_movies"] .btn-add-bm-quick');await button.scrollIntoViewIfNeeded();let box=await button.boundingBox();
  for(const [type,x,y] of [['mouseMoved',box.x+10,box.y+10],['mousePressed',box.x+10,box.y+10],['mouseMoved',box.x+80,box.y+55],['mouseReleased',box.x+80,box.y+55]])await cdp.send('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'?'none':'left',buttons:type==='mouseReleased'?0:1,clickCount:type==='mouseMoved'?0:1});
  assert.equal(await clean(),0);assert.equal(await page.locator('.modal-backdrop.active').count(),0);
 }
 const snapshot=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
 await nativeDrag(title,target,false);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();assert.equal(await clean(),0);assert.equal(await page.locator('.modal-backdrop.active').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),snapshot);
 await nativeDrag(title,target,false);await page.evaluate(()=>renderBookmarksUI());await page.mouse.up();assert.equal(await clean(),0);assert.equal(await page.locator('.modal-backdrop.active').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),snapshot);
 await nativeDrag(title,target,false);await page.mouse.move(700,20);await page.mouse.up();assert.equal(await clean(),0);
 for(let i=0;i<3;i++){const box=await title.boundingBox();await page.mouse.move(box.x+10,box.y+5);await page.mouse.down();await page.mouse.up();if(await modal.evaluate(n=>n.classList.contains('active')))await page.keyboard.press('Escape');}
 assert.equal(await clean(),0);
 pass('interactive controls reject native starts without stale feedback; blur, invalid release and rapid gestures leave no write or frozen state');
 await open();await expand();await shot('active-and-mirrors');
 const mirror=row('id:sub_aether_1');const scroll=await available.locator('.mirror-destination-list').evaluate(n=>n.scrollTop);
 await mirror.locator('.mirror-options').click();const menu=mirror.locator('.mirror-row-actions');assert(await menu.isVisible());assert.equal(await available.locator('.mirror-destination-list').evaluate(n=>n.scrollTop),scroll);
 assert(await menu.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));assert(await menu.locator('button').evaluateAll(ns=>ns.every(n=>n.querySelector('svg'))));assert.equal(await menu.getByRole('button',{name:'Move Up: Dogestudy Mirror',exact:true}).innerText(),'');
 await shot('desktop-menu');await page.keyboard.press('Escape');assert(await mirror.locator('.mirror-options').evaluate(n=>n===document.activeElement));
 await mirror.locator('.mirror-options').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');assert(await menu.locator('button:not(:disabled)').last().evaluate(n=>n===document.activeElement));await page.keyboard.press('Escape');
 pass('icon menu and arrow rail escape list clipping, retain scroll, fit the viewport and support keyboard focus');
 const active=modal.locator('.mirror-active-card');if(await active.locator('.mirror-options').isVisible())await active.locator('.mirror-options').click();assert.equal(await active.getByRole('button',{name:'Copy URL',exact:true}).count(),0);assert.equal(await active.getByRole('button',{name:'Mark Broken',exact:true}).count(),0);if(await active.locator('.mirror-row-actions').isVisible())await page.keyboard.press('Escape');
 const broken=active.getByRole('button',{name:'Mark as Broken',exact:true}),before=await page.evaluate(()=>localStorage.getItem('heavenly_broken_links'));
 await broken.click();assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_broken_links')),before);await active.getByRole('button',{name:'Cancel',exact:true}).click();assert(await broken.evaluate(n=>n===document.activeElement));
 await broken.click();await modal.locator('.modal-header').click();assert(await broken.isVisible());
 await broken.click();await page.waitForFunction(()=>document.querySelector('.mirror-broken-confirm').hidden,{},{timeout:8000});assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_broken_links')),before);
 await broken.click();await active.getByRole('button',{name:'Confirm broken',exact:true}).click();assert.equal(await modal.locator('.mirror-active-card').getAttribute('data-mirror-identity'),'id:sub_aether_1');assert.equal(await modal.locator('.promoted-badge-btn').count(),1);assert.equal(await modal.locator('.promoted-tooltip-box').getAttribute('data-help-kind'),'promotion');await shot('confirmed-fallback');
 pass('active options omit duplicates; first broken activation, Cancel, outside dismissal and expiry do not write, while explicit confirmation falls back');
 await modal.getByRole('button',{name:'Dismiss',exact:true}).click();const info=modal.locator('.mirror-info');
 for(let i=0;i<3;i++){if(engine==='firefox')await info.click();else await info.tap();assert.equal(await modal.locator('.promoted-tooltip-box li').count(),4);if(engine==='firefox')await info.click();else await info.tap();assert.equal(await info.getAttribute('aria-expanded'),'false');if(engine==='firefox')await page.mouse.move(0,0);assert.equal(await info.evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');}
 await page.keyboard.press('Tab');await info.focus();assert(await info.evaluate(n=>n.matches(':focus-visible')));await info.click();await shot('plain-info');await info.click();
 pass('general Info is a four-point list; repeated touch toggles clear the expanded highlight while keyboard focus remains visible');
 const retained=await row('id:sub_aether_2').evaluate(n=>{window.__retainedMirror=n;return true});assert(retained);
 const summary=available.locator(':scope > summary');await summary.click();assert(await available.locator('.mirror-disclosure-body').evaluate(n=>n.inert));await summary.click();await summary.click();await summary.click();await expand();assert(await row('id:sub_aether_2').evaluate(n=>n===window.__retainedMirror));
 pass('rapid accordion reversal retains mirror nodes, animates height and makes collapsed controls inert');
 await page.keyboard.press('Escape');assert(await modal.evaluate(n=>!n.classList.contains('active')&&n.classList.contains('modal-closing')&&n.inert));await open();await page.waitForTimeout(260);assert(await modal.evaluate(n=>n.classList.contains('active')&&!n.inert));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.modal-backdrop.active,.modal-closing'));
 for(const [fn,id] of [['openSyshisNotesModal','syshis-notes-modal'],['openOpWebsitesNotesModal','op-websites-notes-modal'],['openDistroseaInfoModal','distrosea-info-modal']]){
  await page.evaluate(fn=>window[fn](),fn);await shot(id);const popup=page.locator('#'+id);assert(await popup.evaluate(n=>getComputedStyle(n).display==='flex'));if(id!=='distrosea-info-modal')assert(await popup.locator('ul.heavenly-notes-list > li').count()>1);await page.keyboard.press('Escape');assert(await popup.evaluate(n=>n.inert&&n.classList.contains('modal-closing')));await page.waitForFunction(id=>!document.getElementById(id).classList.contains('modal-closing'),id);
 }
 await page.evaluate(()=>openSpecialLinksModal('cat_anime'));await shot('special-links');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.modal-closing'));assert.notEqual(await page.locator('body').evaluate(n=>n.style.overflow),'hidden');
 pass('modal exits stay visible but inert, rapid reopening survives stale completion, notes use semantic lists and closing restores page scrolling');
 for(const size of [{width:1366,height:768},{width:820,height:1180},{width:390,height:844}]){
  await page.setViewportSize(size);await open();await expand();await row('id:sub_aether_3').locator('.mirror-options').click();await shot('menu-'+size.width);
  assert(await row('id:sub_aether_3').locator('.mirror-row-actions').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.modal-closing'));
 }
 await page.setViewportSize({width:820,height:1180});await open();await expand();
 const fallbackRow=row('id:sub_aether_2'),fallbackMenuId=await fallbackRow.locator('.mirror-options').getAttribute('aria-controls');
 await fallbackRow.locator('.mirror-row-actions').evaluate(n=>{n.showPopover=undefined;n.hidePopover=undefined});
 await fallbackRow.locator('.mirror-options').click();const fallbackMenu=page.locator('#'+fallbackMenuId);assert(await fallbackMenu.isVisible());assert(await fallbackMenu.evaluate(n=>n.parentElement.id==='builtin-test-modal'));await fallbackMenu.getByRole('button',{name:'Move Down: AetherK12 S3 Mirror 1',exact:true}).click();assert.equal(await fallbackRow.locator('.mirror-options').getAttribute('aria-expanded'),'false');await fallbackRow.locator('.mirror-options').click();await page.keyboard.press('Escape');assert(await fallbackRow.locator('.mirror-options').evaluate(n=>n===document.activeElement));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.modal-closing'));assert.equal(await page.locator('#builtin-test-modal > .mirror-row-actions').count(),0);
 pass('a portal fallback without the Popover API escapes clipping, reorders, restores focus and removes temporary menus on close');
 await page.emulateMedia({reducedMotion:'reduce'});await open();await expand();assert.equal(await page.evaluate(()=>[...document.querySelectorAll('#builtin-test-modal,#builtin-test-modal *')].flatMap(n=>n.getAnimations()).filter(a=>a.playState==='running').length),0);await page.keyboard.press('Escape');assert.equal(await page.locator('.modal-closing').count(),0);assert.deepEqual(errors,[]);
 pass('Chromebook-sized, iPad-sized and narrow menus remain usable without overflow; reduced motion skips modal and accordion motion');
 console.log(checks+' final UX refinement checks passed in '+engine);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
