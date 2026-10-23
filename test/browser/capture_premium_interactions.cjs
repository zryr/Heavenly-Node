'use strict';
// Optional visual capture harness. No real user data or external destinations.
// HEAVENLY_REFERENCE_ROOT=/checkout node test/browser/capture_premium_interactions.cjs before output-dir
const assert=require('node:assert/strict'),{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const phase=process.argv[2]||'after',directory=path.resolve(process.argv[3]||'work/premium/captures/'+phase);
const app=require(process.env.HEAVENLY_REFERENCE_ROOT?path.resolve(process.env.HEAVENLY_REFERENCE_ROOT,'app'): '../../app');
let browser,server;
(async()=>{
 fs.mkdirSync(directory,{recursive:true});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1366,height:900},hasTouch:true});
 await context.addInitScript(()=>{sessionStorage.setItem('heavenly_decoy_unlocked','true');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__copied=value}})});
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(12000);
 await page.goto(origin,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelector('#heavenly-loading-screen').style.display==='none');
 const shot=name=>page.screenshot({path:path.join(directory,name+'.png')});
 const modal=page.locator('#builtin-test-modal'),row=id=>modal.locator('.available-mirror-list [data-mirror-identity="'+id+'"]');
 const open=()=>page.evaluate(()=>{const b=loadBookmarkData().bookmarks.find(b=>b.id==='bm_aether');openBuiltinTestModal(b.title,b.url,location.origin+'/proxy/'+b.url,null,false,b.id)});
 async function settle(){await page.waitForTimeout(240);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 async function pausedMotion(name,time){
  const samples=await page.evaluate(time=>Array.from(document.querySelectorAll('.mirror-menu-panel,.mirror-row-actions')).flatMap(n=>n.getAnimations().map(a=>{const sample={rail:n.classList.contains('mirror-move-rail'),frames:a.effect.getKeyframes().map(f=>f.transform),duration:a.effect.getTiming().duration};a.pause();a.currentTime=time;return sample})),time);
  if(phase==='after'){
   assert.equal(samples.length,2,'Both external surfaces must animate');
   const closing=name.endsWith('closing'),index=closing?1:0;
   assert(samples.every(sample=>sample.duration===(closing?165:210)));
   assert.match(samples.find(sample=>sample.rail).frames[index],/translate\(18px/);
   assert.match(samples.find(sample=>!sample.rail).frames[index],/translate\(-18px/);
  }
  await shot(name);
  await page.evaluate(()=>document.querySelectorAll('.mirror-menu-panel,.mirror-row-actions').forEach(n=>n.getAnimations().forEach(a=>a.play())));
 }
 await open();await settle();await shot('active-idle');
 const broken=modal.getByRole('button',{name:'Mark as Broken',exact:true});
 for(const scale of [1,1.25,1.5]){await broken.locator('svg').evaluate((n,scale)=>n.style.zoom=scale,scale);await broken.screenshot({path:path.join(directory,'broken-icon-'+scale+'.png')});}
 await broken.locator('svg').evaluate(n=>n.style.zoom='');await broken.click();await shot('broken-confirmation');await modal.getByRole('button',{name:'Cancel',exact:true}).click();
 await modal.locator('.available-mirror-list > summary').click();await settle();await shot('desktop-menu-closed');
 await row('id:sub_aether_1').locator('.mirror-options').click();await pausedMotion('desktop-menu-opening',90);await settle();await shot('desktop-menu-open');
 const arrow=phase==='before'?'Move Down: Dogestudy Mirror':'Move Dogestudy Mirror down';await row('id:sub_aether_1').getByRole('button',{name:arrow,exact:true}).click();await settle();await shot('desktop-menu-moved');
 await row('id:sub_aether_1').locator('.mirror-options').click();await settle();await page.keyboard.press('Escape');await pausedMotion('desktop-menu-closing',80);await settle();
 for(const size of [{width:1366,height:768},{width:1180,height:820},{width:820,height:1180},{width:390,height:844}]){
  await page.setViewportSize(size);await settle();await row('main').locator('.mirror-options').click();await settle();await shot('menu-'+size.width);await page.keyboard.press('Escape');await settle();
 }
 await page.keyboard.press('Escape');await settle();await page.setViewportSize({width:1366,height:900});
 const source=page.locator('[data-bm-id="bm_miruro"] .bookmark-title'),target=page.locator('[data-bm-id="bm_anidb"]');
 await source.scrollIntoViewIfNeeded();await settle();await shot('drag-idle');let a=await source.boundingBox(),b=await target.boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2+10,a.y+a.height/2+9,{steps:3});await shot('drag-pickup');
 await page.mouse.move(b.x+40,b.y+b.height*.8,{steps:12});b=await target.evaluate(n=>HeavenlyDrag.rect(n));await page.mouse.move(b.left+41,b.top+b.height*.8);await page.waitForTimeout(80);await shot('drag-moving');await page.mouse.up();await settle();await shot('drag-dropped');
 // A delayed mouse pickup reproduces the previous long-press/native conflict.
 await page.evaluate(()=>{const d=loadBookmarkData();d.bookmarks.find(b=>b.id==='bm_miruro').launchPreference='direct';saveBookmarkData(d);renderBookmarksUI()});await source.scrollIntoViewIfNeeded();await settle();a=await source.boundingBox();b=await target.boundingBox();
 await page.mouse.move(a.x+12,a.y+8);await page.mouse.down();await page.waitForTimeout(650);await shot('delayed-held');await page.mouse.move(b.x+40,b.y+b.height*.2,{steps:12});await shot('delayed-moving');await page.mouse.up();await settle();await shot('delayed-dropped');
 console.log('Captured '+phase+' actual browser states in '+directory);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections();server.close()}});
