'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),playwright=require('playwright'),app=require('../../app');
const engine=process.env.HEAVENLY_BROWSER||'chromium';let browser,server,upstream,checks=0,reused=0,fallbacks=0;
const pass=s=>{checks++;console.log('PASS '+s)};
(async()=>{
 upstream=http.createServer((req,res)=>{res.writeHead(503,{'Content-Type':'text/html'});res.end('Controlled upstream failure')});await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port,remote='http://127.0.0.1:'+upstream.address().port;
 browser=await playwright[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:process.env.HEAVENLY_BROWSER_EXECUTABLE?{executablePath:process.env.HEAVENLY_BROWSER_EXECUTABLE}:{});
 const context=await browser.newContext({viewport:{width:1366,height:900},hasTouch:engine!=='firefox'});
 await context.addInitScript(()=>{sessionStorage.setItem('heavenly_decoy_unlocked','true');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__copied=value}})});
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&(!r.request().url().includes('/proxy/')||r.request().url().includes('/proxy/http://127.0.0.1:'))?r.continue():r.fulfill({contentType:'text/html',body:'<h1>Destination fixture</h1>'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('heavenly-loading-screen').style.display==='none');
 await page.evaluate(()=>{const data=loadBookmarkData();data.categories.forEach(c=>c.hidden=true);data.categories.push({id:'v2',title:'Mirror management',side:'left',subSections:[{id:'user',title:'Your Bookmarks'},{id:'empty',title:'Empty section'}]},{id:'grid',title:'Grid fixture',side:'bottom',subSections:[{id:'user',title:'Grid links'}]});
  for(let i=0;i<10;i++)data.bookmarks.push({id:'v2_'+i,title:'Site '+i,url:'https://original.test/'+i,categoryId:'v2',subSectionId:'user',order:i,personalNote:'Keep note',launchPreference:'ask',subBookmarks:i===0?[{id:'one',title:'One',url:'https://one.test/'},{id:'two',title:'Two',url:'https://two.test/',isUser:true},{id:'asset',title:'Explicitly excluded',url:'https://cdn.test/icon.svg',mirrorEligible:false}]:[]});
  for(let i=0;i<5;i++)data.bookmarks.push({id:'grid_'+i,title:'Grid '+i,url:'https://grid.test/'+i,categoryId:'grid',subSectionId:'user',order:i});saveBookmarkData(data);renderBookmarksUI();});
 const modal=page.locator('#builtin-test-modal'),active=modal.locator('.bookmark-mirror-card').first(),available=modal.locator('[data-mirror-section="Available Mirrors"]');
 const open=()=>page.evaluate(()=>openBuiltinTestModal('Site 0','https://original.test/0',location.origin+'/proxy/https://original.test/0',null,false,'v2_0'));
 const row=id=>available.locator('[data-mirror-identity="'+id+'"]');
 const action=async(row,label)=>{const button=row.getByRole('button',{name:label,exact:true});if(!await button.isVisible())await row.locator('.mirror-options').click();await button.click();await page.mouse.move(0,0);};
 await open();assert.match(await modal.innerText(),/ACTIVE SITE/);assert.equal(await modal.locator('.promoted-badge-btn').count(),0);await available.locator(':scope > summary').click();
 assert.equal(await available.locator('.bookmark-mirror-card').count(),3);await action(row('id:one'),'Set as Preferred');
 assert.equal(await modal.locator('.bookmark-active-url').innerText(),'https://one.test/');assert.equal(await row('id:one').getAttribute('data-preferred'),'true');
 await action(row('id:one'),'Move Up: One');
 assert.deepEqual(await available.locator('.bookmark-mirror-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.mirrorIdentity)),['main','id:one','id:two']);
 await page.keyboard.press('Escape');await page.reload({waitUntil:'domcontentloaded'});await open();await available.locator(':scope > summary').click();
 assert.equal(await modal.locator('.bookmark-active-url').innerText(),'https://one.test/');assert.equal(await row('id:one').getAttribute('data-preferred'),'true');
 pass('manual preference and order survive dialog close and full refresh; explicitly excluded links remain outside mirror candidates');
 await action(active,'Mark Broken');
 assert.equal(await modal.locator('.bookmark-active-url').innerText(),'https://original.test/0');assert.equal(await modal.locator('.promoted-badge-btn').count(),1);assert.equal(await modal.locator('.promoted-tooltip-box').count(),1);
 assert(await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='v2_0').mirrorPreferences.explained));
 await new Promise(r=>setTimeout(r,5000));assert.equal(await modal.locator('.promoted-badge-btn').count(),1);await page.waitForFunction(()=>!document.querySelector('#builtin-test-modal .promoted-badge-btn'));assert.equal(await modal.locator('.promoted-badge-btn').count(),0);assert.equal(await modal.locator('.promoted-tooltip-box').count(),1);
 await new Promise(r=>setTimeout(r,11000));await page.waitForFunction(()=>!document.querySelector('#builtin-test-modal .promoted-tooltip-box'));assert.equal(await modal.locator('.promoted-tooltip-box').count(),0);assert.equal(await modal.locator('.bookmark-active-url').innerText(),'https://original.test/0');
 await modal.locator('.mirror-info').click();assert.equal(await modal.locator('.promoted-tooltip-box').count(),1);await modal.getByRole('button',{name:'Dismiss',exact:true}).click();assert.equal(await modal.locator('.promoted-tooltip-box').count(),0);
 pass('fallback badge lasts seven seconds, first guidance lasts eighteen seconds, expiry never changes destination, and Info/Dismiss remain available');
 await modal.locator('.bookmark-personal-note summary').click();await modal.locator('textarea').fill('Unsaved draft');await modal.locator('.broken-mirrors-toggle').click();
 await action(modal.locator('.broken-mirrors [data-mirror-identity="id:one"]'),'Mark Working');
 assert.equal(await modal.locator('.bookmark-active-url').innerText(),'https://original.test/0');assert.equal(await modal.locator('textarea').inputValue(),'Unsaved draft');assert.equal(await modal.locator('.promoted-badge-btn').count(),0);
 await action(active,'Mark Broken');assert.equal(await modal.locator('.bookmark-active-url').innerText(),'https://one.test/');assert.equal(await modal.locator('.promoted-tooltip-box').count(),0);
 await page.keyboard.press('Escape');await open();assert.equal(await modal.locator('.promoted-badge-btn').count(),0);
 pass('restoration preserves active fallback, preferred site, order and note drafts; later fallback omits first-time guidance and reopening does not replay it');
 // Check actual launch/copy destinations using the active card.
 await active.locator('.url-copy-pill').click();assert.equal(await page.evaluate(()=>window.__copied),'https://one.test/');
 let popupPromise=context.waitForEvent('page');await active.getByRole('button',{name:'Test Direct Site',exact:true}).click();let popup=await popupPromise;await popup.waitForURL('https://one.test/');await popup.close();await open();
 popupPromise=context.waitForEvent('page');await active.getByRole('button',{name:'Open with Proxy',exact:true}).click();popup=await popupPromise;await popup.waitForURL(origin+'/proxy/https://one.test/');await popup.close();await open();
 assert.equal(await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='v2_0').url),'https://original.test/0');
 pass('header, Copy, Direct and Proxy agree on active URL while canonical storage remains unchanged');
 await page.keyboard.press('Escape');
 // A separate bookmark proves focus-safe first guidance and manual dismissal.
 await page.evaluate(()=>{const d=loadBookmarkData();const b=d.bookmarks.find(b=>b.id==='v2_1');b.subBookmarks=[{id:'focus-mirror',title:'Focus mirror',url:'https://focus.test/'}];saveBookmarkData(d);openBuiltinTestModal(b.title,b.url,location.origin+'/proxy/'+b.url,null,false,b.id)});
 await action(active,'Mark Broken');const guide=modal.locator('.promoted-tooltip-box');await guide.getByRole('button',{name:'Dismiss'}).focus();await new Promise(r=>setTimeout(r,19000));assert.equal(await guide.count(),1);await guide.getByRole('button',{name:'Dismiss'}).click();assert.equal(await guide.count(),0);await page.keyboard.press('Escape');
 pass('keyboard focus prevents guidance timeout; dismissal and closing clean up feedback');
 // Retained DOM and rapid accordion reversal.
 const category=page.locator('.section-card[data-category-id="v2"]'),divider=category.locator('.subsection-divider').first(),more=category.locator('.show-more-btn');
 await page.evaluate(()=>window.__retained=Array.from(document.querySelectorAll('.bookmark-card,.bookmark-icon')));
 await more.click();await more.click();await divider.click();await divider.click();await new Promise(r=>setTimeout(r,300));
 assert.equal(await divider.getAttribute('aria-expanded'),'true');assert(await page.evaluate(()=>window.__retained.every(n=>n.isConnected)));
 await divider.click();assert(await category.locator('.subsection-content').first().evaluate(n=>n.inert));await page.waitForFunction(()=>document.querySelector('.section-card[data-category-id="v2"] .subsection-content').hidden);assert(await category.locator('.subsection-content').first().evaluate(n=>n.hidden));await divider.click();await new Promise(r=>setTimeout(r,300));
 pass('Show More and rapid accordion changes animate while preserving cards, icons, aria-expanded and nonfocusable collapse');
 // Real mouse drop in a vertical list and geometric grid/cross-section releases.
 const before=await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='v2_0').launchPreference);
 let source=page.locator('[data-bm-id="v2_0"] .drag-dots-handle'),target=page.locator('[data-bm-id="v2_2"]');await source.scrollIntoViewIfNeeded();let a=await source.boundingBox(),b=await target.boundingBox();
 await page.mouse.move(a.x+8,a.y+8);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height*.85,{steps:12});b=await target.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height*.85);await page.mouse.move(b.x+b.width/2+1,b.y+b.height*.85);await page.waitForFunction(()=>document.querySelector('.bookmark-placement-indicator')?.dataset.target==='v2_2');
 assert.equal(await page.locator('.bookmark-placement-indicator').getAttribute('data-target'),'v2_2');assert.equal(await page.locator('.bookmark-placement-indicator').getAttribute('data-after'),'true');await page.mouse.up();
 let order=await page.evaluate(()=>loadBookmarkData().bookmarks.filter(b=>b.categoryId==='v2').sort((a,b)=>a.order-b.order).map(b=>b.id));assert(order.indexOf('v2_0')>order.indexOf('v2_2'));
 assert.equal(await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='v2_0').launchPreference),before);assert.equal(await page.locator('.bookmark-placement-indicator,#heavenly-drag-avatar').count(),0);
 await page.locator('[data-bm-id="grid_2"]').scrollIntoViewIfNeeded();
 let result=await page.evaluate(()=>{const n=document.querySelector('[data-bm-id="grid_2"]'),r=n.getBoundingClientRect();const p=resolveBookmarkPlacement(r.left+r.width*.85,r.top+r.height/2,'bookmark','grid_0');commitBookmarkPlacement('bookmark','grid_0',r.left+r.width*.85,r.top+r.height/2);return p});
 assert.equal(result.target,'grid_2');assert(result.after);assert(result.grid);
 const empty=category.locator('.subsection-content[data-subsection-id="empty"]');await empty.scrollIntoViewIfNeeded();b=await empty.boundingBox();await page.evaluate(({x,y})=>commitBookmarkPlacement('bookmark','grid_0',x,y),{x:b.x+b.width/2,y:b.y+b.height/2});
 assert.deepEqual(await page.evaluate(()=>{const b=loadBookmarkData().bookmarks.find(b=>b.id==='grid_0');return [b.categoryId,b.subSectionId]}),['v2','empty']);
 const snapshot=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));assert.equal(await page.evaluate(()=>commitBookmarkPlacement('bookmark','grid_1',-10,-10)),false);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),snapshot);
 pass('mouse indicator matches actual list insertion; grid row geometry, empty cross-category sections, invalid cancellation and launch preferences are preserved');
 // Responsive glass popup and shared accents.
 await page.emulateMedia({reducedMotion:'reduce'});await open();
 for(const size of [{width:820,height:1180},{width:1366,height:768},{width:320,height:740}]){await page.setViewportSize(size);await page.waitForTimeout(200);assert(await modal.locator('.modal-card').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 const add=page.locator('.category-actions .btn-add-bm-quick').first();assert.equal(await add.evaluate(n=>getComputedStyle(n).color),'rgb(56, 189, 248)');
 assert.equal(await page.locator('#quick-settings-info-btn').evaluate(n=>getComputedStyle(n).color),'rgb(192, 132, 252)');
 fs.mkdirSync('work/mirror-v2',{recursive:true});await page.screenshot({path:'work/mirror-v2/'+engine+'.png',fullPage:true});await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1366,height:900});
 pass('cyan Add and purple Info styling, reduced motion and desktop/Chromebook/iPad-sized layouts fit without horizontal overflow');
 // Return Home: real error page, manual fallback and script-opened launch modes.
 const marker=await page.evaluate(()=>{window.__homeState={kept:true};return true});assert(marker);
 for(const settings of [{openBookmarksInNewTab:true},{openBookmarksInAboutBlank:true},{openBookmarksInNewTab:true,showProxiedUrl:false}]){
  popupPromise=context.waitForEvent('page');await page.evaluate(({origin,remote,settings})=>HeavenlyNavigation.launch(window,origin+'/proxy/'+remote+'/failure',{kind:'bookmark',settings}),{origin,remote,settings});popup=await popupPromise;
  const wrapped=settings.openBookmarksInAboutBlank||settings.showProxiedUrl===false;
  const root=wrapped?popup.frameLocator('#heavenly-wrapper-frame'):popup;
  await root.getByText('Return to Heavenly Home',{exact:true}).click();
  if (!popup.isClosed()) await popup.waitForURL(origin+'/',{waitUntil:'domcontentloaded'}).catch(error=>{if(!popup.isClosed())throw error});
  if (popup.isClosed()) reused++; else fallbacks++;
  assert(await page.evaluate(()=>window.__homeState.kept));assert(context.pages().length<=2);if(!popup.isClosed())await popup.close();
 }
 const manual=await context.newPage();await manual.goto(origin+'/proxy/'+remote+'/manual',{waitUntil:'domcontentloaded'});await manual.getByText('Return to Heavenly Home',{exact:true}).click();await manual.waitForURL(origin+'/');assert.equal(context.pages().length,2);await manual.close();
 pass('script-opened proxy, about:blank and hosted-wrapper errors return safely; manual tabs navigate themselves without an extra homepage');
 console.log('Home return: '+reused+' existing-home reuses, '+fallbacks+' current-tab fallbacks in '+engine);
 assert.deepEqual(errors,[]);console.log(checks+' mirror-management V2 checks passed in '+engine);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();for(const srv of [server,upstream])if(srv){srv.closeAllConnections?.();await new Promise(r=>srv.close(r))}});
