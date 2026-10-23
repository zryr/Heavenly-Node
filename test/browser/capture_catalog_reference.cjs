'use strict';
// Capture the actual pre-change checkout; catalog fixtures contain no private data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(process.env.HEAVENLY_REFERENCE_ROOT||'work/reference-catalog'),app=require(root+'/app'),catalog=require('../../public/assets/heavenly-catalog');
let browser,server;
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.fulfill({body:'fixture',contentType:'text/plain'}));
 const data=require('../fixtures/catalog-previous.cjs')().fixture;
 await context.addInitScript(data=>{sessionStorage.setItem('heavenly_decoy_unlocked','true');localStorage.setItem('heavenly_bookmarks',JSON.stringify(data));},data);
 const page=await context.newPage();page.setDefaultTimeout(10000);const dir='work/catalog/before';fs.mkdirSync(dir,{recursive:true});const shot=name=>page.screenshot({path:dir+'/'+name+'.png'});
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#heavenly-loading-screen').style.display==='none');await shot('home');await page.locator('[data-category-id="cat_anime"]').screenshot({path:dir+'/custom-order.png'});
 assert(await page.evaluate(()=>loadBookmarkData().bookmarks.some(b=>b.id==='bm_coolmath')));
 await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});await page.locator('#open-export-modal-btn').scrollIntoViewIfNeeded();await shot('settings');
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#heavenly-loading-screen').style.display==='none');
 await page.evaluate(()=>{const b=loadBookmarkData().bookmarks.find(b=>b.id==='bm_aether');openBuiltinTestModal(b.title,b.url,location.origin+'/proxy/'+b.url,null,false,b.id);});
 await page.waitForTimeout(300);await shot('mirror');await page.locator('.mirror-mark-broken').click();await shot('confirmation');await page.locator('.mirror-confirm-broken').click();
 const rowAnimations=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-mirror-identity]')).flatMap(n=>n.getAnimations()).filter(a=>a instanceof Animation&&!(a instanceof CSSAnimation)).length);assert.equal(rowAnimations,0);await shot('broken');
 await page.evaluate(()=>{closeBuiltinTestModal();for(const a of document.getAnimations())if(a.effect&&a.effect.target.closest('#builtin-test-modal')&&Number.isFinite(a.effect.getComputedTiming().endTime))a.pause();});await page.waitForTimeout(350);
 const closing=await page.locator('#builtin-test-modal').evaluate(n=>n.classList.contains('modal-closing'));assert.equal(closing,false);
 fs.writeFileSync(dir+'/reproduction.json',JSON.stringify({revision:'ae29d2c',missingCoolmathSilentlyAdded:true,mirrorStateWAAPIAnimations:rowAnimations,pausedCloseRemovedBeforeAnimationFinished:!closing},null,2));
 console.log('PASS baseline reproduces silent catalog reconciliation, zero mirror state transitions, and premature paused-dialog cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}});
