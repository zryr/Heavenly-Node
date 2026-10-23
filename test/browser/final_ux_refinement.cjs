'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),playwright=require('playwright'),app=require('../../app');
const engine=process.env.HEAVENLY_BROWSER||'chromium';let browser,server,checks=0;
const pass=s=>{checks++;console.log('PASS '+s)};
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await playwright[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:process.env.HEAVENLY_BROWSER_EXECUTABLE?{executablePath:process.env.HEAVENLY_BROWSER_EXECUTABLE}:{});
 const context=await browser.newContext({viewport:{width:1366,height:900},hasTouch:engine!=='firefox'});
 await context.addInitScript(()=>{sessionStorage.setItem('heavenly_decoy_unlocked','true');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__copied=value}})});
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.fulfill({contentType:'text/html',body:'<h1>Controlled destination</h1>'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#heavenly-loading-screen').style.display==='none');
 const dir=process.env.HEAVENLY_CAPTURE_DIR||'work/premium/'+engine;fs.mkdirSync(dir,{recursive:true});const shot=async name=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return page.screenshot({path:dir+'/'+name+'.png'})};
 const modal=page.locator('#builtin-test-modal'),available=modal.locator('.available-mirror-list');
 const open=()=>page.evaluate(()=>{const b=loadBookmarkData().bookmarks.find(b=>b.id==='bm_aether');openBuiltinTestModal(b.title,b.url,location.origin+'/proxy/'+b.url,null,false,b.id)});
 const row=id=>available.locator('.mirror-destination-row[data-mirror-identity="'+id+'"]');
 async function expand(){if(await available.locator(':scope > summary').getAttribute('aria-expanded')!=='true')await available.locator(':scope > summary').click();await page.waitForFunction(()=>{const n=document.querySelector('.mirror-disclosure-body');return n&&!n.hidden&&!n.__accordionAnimation});}
 async function mouseDrag(source,target,after=true,offset){await source.scrollIntoViewIfNeeded();for(const element of [source,target])await element.evaluate(async n=>{const category=n.closest('.section-card');if(category)await Promise.all(category.getAnimations().map(a=>a.finished.catch(()=>{})))});await source.hover();let a=await source.boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+(offset?offset.x:a.width/2),a.y+(offset?offset.y:a.height/2));await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height*(after?.8:.2),{steps:12});b=await target.evaluate(n=>HeavenlyDrag.rect(n));await page.mouse.move(b.left+b.width/2+1,b.top+b.height*(after?.8:.2));await page.waitForFunction(()=>{const n=document.querySelector('#heavenly-drag-avatar');return n&&getComputedStyle(n).visibility==='visible'});}
 const clean=()=>page.locator('#heavenly-drag-avatar,.bookmark-card.dragging,.section-card.dragging,.bookmark-placement-indicator').count();
 // Exercise real rendered sources with mouse input, recording persistence and ownership.
 const catalog=await page.evaluate(()=>JSON.stringify(loadBookmarkData()));
 if(engine==='chromium')await context.tracing.start({screenshots:true,snapshots:false});
 async function fixture(){await page.evaluate(catalog=>{const d=JSON.parse(catalog);d.categories.forEach(c=>c.hidden=true);
  for(const [id,title,order] of [['desk_a','Alpha',0],['desk_b','Beta',1]]){d.categories.push({id,title,order,side:'left',subSections:[{id:'user',title:'Saved'}]});for(let i=0;i<4;i++)d.bookmarks.push({id:id+i,title:title+' '+i,categoryId:id,subSectionId:'user',url:'https://example.test/'+id+i,order:i,icon:'/assets/heavenly-logo.png',launchPreference:'ask'});expandedCategories[id]=true;expandedSubSections[id+'_user']=true}saveBookmarkData(d);renderBookmarksUI();scrollTo(0,0);window.__nativeStarts=0;document.addEventListener('dragstart',()=>window.__nativeStarts++,{once:true});},catalog);await page.waitForTimeout(250);}
 for(const [name,selector,kind,offset] of [
  ['bookmark-handle','[data-bm-id="desk_a0"] .drag-dots-handle','bookmark'],
  ['bookmark-title','[data-bm-id="desk_a0"] .bookmark-title','bookmark'],
  ['bookmark-icon','[data-bm-id="desk_a0"] .bookmark-icon','bookmark'],
  ['bookmark-padding','[data-bm-id="desk_a0"]','bookmark',{x:3,y:18}],
  ['category-handle','[data-category-id="desk_b"] .section-header .drag-dots-handle','category'],
  ['category-title','[data-category-id="desk_b"] .category-title','category'],
  ['category-padding','[data-category-id="desk_b"]','category',{x:3,y:85}]
 ]){
  await fixture();const destination=kind==='bookmark'?page.locator('[data-bm-id="desk_a3"]'):page.locator('[data-category-id="desk_a"] .section-header');
  await mouseDrag(page.locator(selector),destination,false,offset);
  assert.equal(await page.locator('#heavenly-drag-avatar').getAttribute('data-kind'),kind);
  assert(await page.evaluate(()=>bookmarkMouseDrag.source.hasPointerCapture(bookmarkMouseDrag.pointer)));
  await shot(name+'-moving');await page.mouse.up();assert.equal(await clean(),0);
  assert.equal(await page.evaluate(()=>__nativeStarts),0,'Mouse movement must not hand off to browser-native anchor dragging');
  const d=await page.evaluate(()=>loadBookmarkData());
  if(kind==='bookmark'){assert(d.bookmarks.find(b=>b.id==='desk_a0').order<d.bookmarks.find(b=>b.id==='desk_a3').order);assert(d.bookmarks.find(b=>b.id==='desk_a0').order>d.bookmarks.find(b=>b.id==='desk_a2').order);assert.equal(d.bookmarks.find(b=>b.id==='desk_a0').launchPreference,'ask');}
  else assert(d.categories.find(c=>c.id==='desk_b').order<d.categories.find(c=>c.id==='desk_a').order);
 }
 pass('real mouse handle, title, icon, padding and category body/header drags capture the pointer, persist precise order and never invoke native anchor dragging');
 await fixture();await page.evaluate(()=>scrollTo(0,180));await shot('desktop-drag-idle');
 await mouseDrag(page.locator('[data-bm-id="desk_a0"] .bookmark-title'),page.locator('[data-bm-id="desk_b2"]'),false);await shot('desktop-cross-category-moving');await page.mouse.up();
 assert.equal(await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='desk_a0').categoryId),'desk_b');await shot('desktop-cross-category-dropped');
 pass('a real mouse cross-category drop from a scrolled page persists the indicated category without navigation');
 await fixture();await page.evaluate(()=>{const d=loadBookmarkData();d.bookmarks.find(b=>b.id==='desk_a0').launchPreference='direct';saveBookmarkData(d);renderBookmarksUI()});const delayed=page.locator('[data-bm-id="desk_a0"] .bookmark-title');await delayed.scrollIntoViewIfNeeded();let held=await delayed.boundingBox();await page.mouse.move(held.x+8,held.y+8);await page.mouse.down();await page.waitForTimeout(650);assert.equal(await page.locator('.modal-backdrop.active').count(),0);held=await page.locator('[data-bm-id="desk_a3"]').boundingBox();await page.mouse.move(held.x+40,held.y+held.height*.8,{steps:12});await page.mouse.up();assert.equal(await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='desk_a0').launchPreference),'direct');assert.equal(await page.locator('.modal-backdrop.active').count(),0);assert.equal(await clean(),0);
 pass('a delayed mouse pickup does not launch a dialog or reset preference before the drag; touch long presses remain independent');

 for(const cancel of ['Escape','outside','lost capture']){
  await fixture();const storage=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
  await mouseDrag(page.locator('[data-bm-id="desk_a0"] .bookmark-title'),page.locator('[data-bm-id="desk_a3"]'));
  if(cancel==='Escape')await page.keyboard.press('Escape');else if(cancel==='outside')await page.mouse.move(700,10);else await page.evaluate(()=>bookmarkMouseDrag.source.releasePointerCapture(bookmarkMouseDrag.pointer));
  await page.mouse.up();assert.equal(await clean(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),storage);
  await page.locator('[data-bm-id="desk_a0"] .bookmark-title').click();assert(await modal.evaluate(n=>n.classList.contains('active')));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.modal-closing'));
  await mouseDrag(page.locator('[data-bm-id="desk_a0"] .drag-dots-handle'),page.locator('[data-bm-id="desk_a3"]'));await page.mouse.up();assert.equal(await clean(),0);
 }
 pass('Escape, invalid release and lost pointer capture cancel without storage changes; immediate clicks and consecutive handle drags remain usable');
 if(engine==='chromium')await context.tracing.stop({path:dir+'/desktop-interactions.zip'});
 await page.evaluate(catalog=>{saveBookmarkData(JSON.parse(catalog));renderBookmarksUI();scrollTo(0,0)},catalog);await page.waitForTimeout(250);
 const title=page.locator('[data-bm-id="bm_miruro"] .bookmark-title'),target=page.locator('[data-bm-id="bm_anidb"]');
 await mouseDrag(title,target);await shot('bookmark-body-drag');await page.mouse.up();await page.waitForFunction(()=>loadBookmarkData().bookmarks.find(b=>b.id==='bm_miruro').order>loadBookmarkData().bookmarks.find(b=>b.id==='bm_anidb').order);assert.equal(await clean(),0);
 pass('actual bookmark body drag persists the indicated destination and clears source, preview and placement');
 await mouseDrag(title,page.locator('[data-bm-id="bm_aniclover"]'));await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await clean(),0);
 await title.click();assert(await modal.evaluate(n=>n.classList.contains('active')));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#builtin-test-modal').classList.contains('modal-closing'));
 const header=page.locator('[data-category-id="cat_movies"] .category-title'),anime=page.locator('[data-category-id="cat_anime"]');
 await mouseDrag(header,anime,false);await shot('category-body-drag');await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await clean(),0);
 pass('category title drag and Escape remain responsive; a normal bookmark click still opens its launch dialog');
 // Rejected interactive starts must not run the source dragstart handler.
 if(engine==='chromium'){
  const cdp=await context.newCDPSession(page),button=page.locator('[data-category-id="cat_movies"] .btn-add-bm-quick');await button.scrollIntoViewIfNeeded();let box=await button.boundingBox();
  for(const [type,x,y] of [['mouseMoved',box.x+10,box.y+10],['mousePressed',box.x+10,box.y+10],['mouseMoved',box.x+80,box.y+55],['mouseReleased',box.x+80,box.y+55]])await cdp.send('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'?'none':'left',buttons:type==='mouseReleased'?0:1,clickCount:type==='mouseMoved'?0:1});
  assert.equal(await clean(),0);assert.equal(await page.locator('.modal-backdrop.active').count(),0);
 }
 const snapshot=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
 await mouseDrag(title,target,false);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();assert.equal(await clean(),0);assert.equal(await page.locator('.modal-backdrop.active').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),snapshot);
 await mouseDrag(title,target,false);await page.evaluate(()=>renderBookmarksUI());await page.mouse.up();assert.equal(await clean(),0);assert.equal(await page.locator('.modal-backdrop.active').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),snapshot);
 await mouseDrag(title,target,false);await page.mouse.move(700,20);await page.mouse.up();assert.equal(await clean(),0);
 for(let i=0;i<3;i++){const box=await title.boundingBox();await page.mouse.move(box.x+10,box.y+5);await page.mouse.down();await page.mouse.up();if(await modal.evaluate(n=>n.classList.contains('active')))await page.keyboard.press('Escape');}
 assert.equal(await clean(),0);
 pass('interactive controls reject native starts without stale feedback; blur, invalid release and rapid gestures leave no write or frozen state');
 await open();await expand();await shot('active-and-mirrors');
 const mirror=row('id:sub_aether_1');const scroll=await available.locator('.mirror-destination-list').evaluate(n=>n.scrollTop);
 await mirror.locator('.mirror-options').click();const menu=mirror.locator('.mirror-row-actions');assert.equal(await mirror.locator('.mirror-options').getAttribute('aria-expanded'),'true');assert.equal(await available.locator('.mirror-destination-list').evaluate(n=>n.scrollTop),scroll);
 await page.waitForFunction(()=>[...document.querySelectorAll('.mirror-menu-panel')].every(n=>!n.getAnimations().some(a=>a.playState==='running')));assert.equal(await menu.getAttribute('data-layout'),'dual');assert(await menu.evaluate(n=>{const card=document.querySelector('#builtin-test-modal .modal-card').getBoundingClientRect(),left=n.querySelector('.mirror-move-rail').getBoundingClientRect(),right=n.querySelector('.mirror-command-list').getBoundingClientRect();return left.right<card.left&&right.left>card.right&&left.left>=0&&right.right<=innerWidth}));assert(await menu.locator('button').evaluateAll(ns=>ns.every(n=>n.querySelector('svg'))));assert.equal(await menu.getByRole('button',{name:'Move Dogestudy Mirror up',exact:true}).innerText(),'');
 await shot('desktop-menu');await page.keyboard.press('Escape');assert(await mirror.locator('.mirror-options').evaluate(n=>n===document.activeElement));
 await mirror.locator('.mirror-options').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');assert(await menu.locator('button:not(:disabled)').last().evaluate(n=>n===document.activeElement));await page.keyboard.press('Escape');
 pass('icon menu and arrow rail escape list clipping, retain scroll, fit the viewport and support keyboard focus');
 // Fit is measured from both outer dialog edges, independent of breakpoints.
 await mirror.locator('.mirror-options').click();
 const fitting=async expected=>{
  await page.waitForFunction(({id,expected})=>document.getElementById(id).dataset.layout===expected,{id:await menu.getAttribute('id'),expected});
  assert.equal(await menu.getAttribute('data-layout'),expected);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const surfaces=expected==='dual'?menu.locator('.mirror-menu-panel'):menu;
  assert(await surfaces.evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect(),v=visualViewport;return r.left>=v.offsetLeft&&r.right<=v.offsetLeft+v.width+.5&&r.top>=v.offsetTop&&r.bottom<=v.offsetTop+v.height+.5})));
 };
 await page.waitForTimeout(230);await fitting('dual');
 await page.setViewportSize({width:820,height:1180});await fitting('compact');assert(await menu.locator('.mirror-command-list').evaluate(n=>!n.inert));
 const arrows=menu.locator('.mirror-move-rail button');const sizes=await arrows.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));assert.equal(sizes[0].width,sizes[1].width);assert.equal(sizes[0].height,sizes[1].height);assert.equal(sizes[0].top,sizes[1].top);assert(sizes[0].height>=44&&sizes[1].left>sizes[0].right);
 await menu.getByRole('button',{name:'Copy URL',exact:true}).click();assert.equal(await page.evaluate(()=>__copied),'https://dogestudy.aether.samirchand.com.np/');await mirror.locator('.mirror-options').click();
 await page.setViewportSize({width:1180,height:820});await fitting('dual');await shot('ipad-landscape-dual');
 await page.setViewportSize({width:1366,height:900});await modal.locator('.modal-card').evaluate(n=>n.style.transform='translateX(250px)');await page.evaluate(()=>dispatchEvent(new Event('resize')));await fitting('compact');
 await modal.locator('.modal-card').evaluate(n=>n.style.transform='');await page.evaluate(()=>dispatchEvent(new Event('resize')));await fitting('dual');
 await page.keyboard.press('Escape');assert(await menu.locator('.mirror-command-list').evaluate(n=>n.inert));await page.waitForTimeout(200);
 pass('two external surfaces adapt across portrait/landscape and off-center dialogs; compact reorder buttons have identical 44px targets and closing surfaces are inert');
 // A modern browser can lack the Popover API (or have it disabled): test both portals.
 await menu.evaluate(n=>{n.showPopover=undefined;n.hidePopover=undefined});await mirror.locator('.mirror-options').click();await page.waitForTimeout(230);
 const portals=modal.locator(':scope > .mirror-menu-panel');assert.equal(await portals.count(),2);assert(await portals.evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().width>0)));
 const first=modal.locator('.modal-close-btn');await first.focus();await page.keyboard.press('Shift+Tab');assert(await portals.evaluateAll(nodes=>nodes.some(n=>n.contains(document.activeElement))));await page.keyboard.press('Tab');assert(await first.evaluate(n=>n===document.activeElement));
 await portals.getByRole('button',{name:'Move Dogestudy Mirror down',exact:true}).click();assert.equal(await mirror.locator('.mirror-options').getAttribute('aria-expanded'),'false');await mirror.locator('.mirror-options').click();
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#builtin-test-modal > .mirror-menu-panel'));assert.equal(await portals.count(),0);assert(await mirror.locator('.mirror-options').evaluate(n=>n===document.activeElement));await menu.evaluate(n=>{delete n.showPopover;delete n.hidePopover});
 pass('both external panels have a portal fallback and participate in the parent dialog Tab loop without a separate focus trap');
 const active=modal.locator('.mirror-active-card');if(await active.locator('.mirror-options').isVisible())await active.locator('.mirror-options').click();assert.equal(await active.getByRole('button',{name:'Copy URL',exact:true}).count(),0);assert.equal(await active.getByRole('button',{name:'Mark Broken',exact:true}).count(),0);if(await active.locator('.mirror-row-actions').isVisible())await page.keyboard.press('Escape');
 const broken=active.getByRole('button',{name:'Mark as Broken',exact:true}),before=await page.evaluate(()=>localStorage.getItem('heavenly_broken_links'));
 for(const scale of [1,1.25,1.5]){
  const svg=broken.locator('svg');await svg.evaluate((n,scale)=>n.style.zoom=scale,scale);
  assert(await svg.evaluate(n=>{const b=n.getBBox(),stroke=Number(n.getAttribute('stroke-width'))/2;return b.x-stroke>=0&&b.y-stroke>=0&&b.x+b.width+stroke<=24&&b.y+b.height+stroke<=24}));
  await broken.screenshot({path:dir+'/broken-icon-'+scale+'.png'});
 }
 await broken.locator('svg').evaluate(n=>n.style.zoom='');
 pass('the complete unlink drawing and stroke fit inside the SVG viewport at 100%, 125% and 150% rendered scale');
 await broken.click();assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_broken_links')),before);await active.getByRole('button',{name:'Cancel',exact:true}).click();assert(await broken.evaluate(n=>n===document.activeElement));
 await broken.click();await modal.locator('.modal-header').click();assert(await broken.isVisible());
 await broken.click();await page.waitForFunction(()=>document.querySelector('.mirror-broken-confirm').hidden,{},{timeout:8000});assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_broken_links')),before);
 await broken.click();await active.getByRole('button',{name:'Confirm broken',exact:true}).click();assert.equal(await modal.locator('.mirror-active-card').getAttribute('data-mirror-identity'),'id:sub_aether_2');assert.equal(await modal.locator('.promoted-badge-btn').count(),1);assert.equal(await modal.locator('.promoted-tooltip-box').getAttribute('data-help-kind'),'promotion');await shot('confirmed-fallback');
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
 await fallbackRow.locator('.mirror-options').click();const fallbackMenu=page.locator('#'+fallbackMenuId);assert(await fallbackMenu.isVisible());assert(await fallbackMenu.evaluate(n=>n.parentElement.id==='builtin-test-modal'));await fallbackMenu.getByRole('button',{name:'Move AetherK12 S3 Mirror 1 down',exact:true}).click();assert.equal(await fallbackRow.locator('.mirror-options').getAttribute('aria-expanded'),'false');await fallbackRow.locator('.mirror-options').click();await page.keyboard.press('Escape');assert(await fallbackRow.locator('.mirror-options').evaluate(n=>n===document.activeElement));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.modal-closing'));assert.equal(await page.locator('#builtin-test-modal > .mirror-row-actions').count(),0);
 pass('a portal fallback without the Popover API escapes clipping, reorders, restores focus and removes temporary menus on close');
 await page.emulateMedia({reducedMotion:'reduce'});await open();await expand();assert.equal(await page.evaluate(()=>[...document.querySelectorAll('#builtin-test-modal,#builtin-test-modal *')].flatMap(n=>n.getAnimations()).filter(a=>a.playState==='running').length),0);await page.keyboard.press('Escape');assert.equal(await page.locator('.modal-closing').count(),0);assert.deepEqual(errors,[]);
 pass('Chromebook-sized, iPad-sized and narrow menus remain usable without overflow; reduced motion skips modal and accordion motion');
 console.log(checks+' final UX refinement checks passed in '+engine);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
