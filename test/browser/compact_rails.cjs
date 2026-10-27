'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const playwright=require('playwright'),app=require('../../app');
const engine=process.env.HEAVENLY_BROWSER||'chromium';
const output=process.env.HEAVENLY_EVIDENCE_DIR?path.resolve(process.env.HEAVENLY_EVIDENCE_DIR):path.resolve(__dirname,'../../docs/phase4-5/evidence');
let server,browser;
const result={engine,executed:new Date().toISOString(),physicalDevices:[],checks:[],transitions:[]};
const pass=message=>{result.checks.push(message);console.log('PASS '+message)};
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await playwright[engine].launch(engine==='chromium'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}:{});result.version=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:engine!=='firefox'});
 await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 const state=()=>page.evaluate(()=>HeavenlyLayout.getState());
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const settle=async()=>{await frame();await page.waitForFunction(()=>!document.querySelector('.app-layout').getAnimations().some(a=>a.playState==='running')&&!Array.from(document.querySelectorAll('.category-content')).some(n=>n.__accordionAnimation));await frame()};
 const card=id=>page.locator('.section-card[data-category-id="'+id+'"]');
 const collapse=id=>card(id).locator('.category-collapse-toggle');
 const center=()=>page.locator('#center-container').evaluate(n=>n.getBoundingClientRect().width);
 const shot=async name=>{if(engine==='chromium'){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,name+'.png')})}};
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HeavenlyLayout?.getState);await settle();
 await page.evaluate(()=>{
  const data=loadBookmarkData();data.categories.forEach(c=>c.hidden=true);
  for(const [id,title,side]of[['rail_a','Movies & shows','left'],['rail_b','Anime & manga','left'],['rail_c','Useful websites','right']]){
   data.categories.push({id,title,side,order:data.categories.length,subSections:[{id:'saved',title:'Saved links',icon:'globe'}]});
   for(let i=0;i<4;i++)data.bookmarks.push({id:id+'_'+i,title:'Practice '+id+' '+i,url:'https://example.test/'+id+'/'+i,categoryId:id,subSectionId:'saved',order:i,notes:'Preserved note'});
  }
  saveBookmarkData(data);renderBookmarksUI();HeavenlyLayout.refresh();window.__railA=document.querySelector('[data-category-id="rail_a"]');
 });await settle();
 const baseCenter=await center(),savedWidth=(await state()).preferences.left.width;
 await collapse('rail_a').click();await settle();assert.equal((await state()).actual.left.categoryCompact,false);assert(Math.abs(await center()-baseCenter)<2);assert(await card('rail_b').locator('.category-content').isVisible());await shot('after-rail-mixed');
 pass('one collapsed among expanded categories retains a usable full-width panel');
 await shot('rail-transition-0');
 await page.evaluate(()=>{window.__compactTransition=[];const sample=()=>{window.__compactTransition.push({time:performance.now(),center:document.querySelector('#center-container').getBoundingClientRect().width,track:document.querySelector('#left-sidebar').getBoundingClientRect().width});if(window.__compactTransition.length<45)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 await collapse('rail_b').click();
 await page.waitForFunction(()=>document.querySelector('#left-sidebar').dataset.collapse==='categories');
 await shot('rail-transition-middle');
 await settle();await shot('rail-transition-settled');
 await page.waitForFunction(()=>window.__compactTransition.length===45);
 const transition=await page.evaluate(()=>window.__compactTransition);
 for(let i=1;i<transition.length;i++)assert(transition[i].center>=transition[i-1].center-1,'category rail transition must not oscillate');
 result.compactTransition=transition.map(f=>({...f,time:Math.round(f.time-transition[0].time)}));
 const rail=await state();assert.equal(rail.actual.left.categoryCompact,true);assert.equal(await page.locator('#left-sidebar').getAttribute('data-collapse'),'categories');assert.equal(rail.preferences.left.width,savedWidth);assert.equal(rail.preferences.left.collapsed,false);assert.equal(rail.preferences.left.compactOpen,false);assert(await center()>baseCenter+40);assert(await page.locator('#left-resize').isHidden());assert.equal(await page.locator('#left-resize').getAttribute('aria-disabled'),'true');
 assert(await page.evaluate(()=>window.__railA===document.querySelector('[data-category-id="rail_a"]')));
 for(const id of ['rail_a','rail_b']){assert(await collapse(id).isVisible());assert(await card(id).locator('.category-title').isVisible());assert(await card(id).locator('.drag-dots-handle').first().isVisible());assert((await collapse(id).boundingBox()).height>=44)}
 await shot('after-rail-all-collapsed');pass('all collapsed categories reclaim real center width, keep stable named controls, and disable resizing without changing saved intent');
 const beforeSearch=JSON.stringify((await state()).preferences),beforeBookmarks=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
 await page.locator('#bm-universal-search').fill('Practice rail_a 3');assert.equal(await page.locator('.bookmark-search-result').count(),1);await page.locator('#bm-search-clear-btn').click();assert.equal(JSON.stringify((await state()).preferences),beforeSearch);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),beforeBookmarks);
 pass('universal bookmark search still finds hidden category contents without changing saved state');
 const source=await card('rail_a').locator('.section-header .drag-dots-handle').boundingBox(),target=await card('rail_b').boundingBox();
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height*.9,{steps:18});await page.mouse.up();await settle();
 assert.deepEqual(await page.evaluate(()=>loadBookmarkData().categories.filter(c=>c.side==='left'&&!c.hidden).sort((a,b)=>a.order-b.order).map(c=>c.id)),['rail_b','rail_a']);
 pass('real mouse dragging reorders independently collapsed category rail headers');
 await collapse('rail_b').focus();await page.keyboard.press('Enter');await settle();assert.equal((await state()).actual.left.categoryCompact,false);assert.equal((await state()).actual.left.width,savedWidth);assert(await page.locator('#left-resize').isVisible());assert(await collapse('rail_b').evaluate(n=>n===document.activeElement));
 await page.locator('#left-resize').focus();await page.keyboard.press('End');await settle();const userWidth=(await state()).preferences.left.width;assert(userWidth>savedWidth);
 await collapse('rail_b').click();await settle();await collapse('rail_b').click();await settle();assert.equal((await state()).actual.left.width,userWidth);
 pass('keyboard expansion restores saved width and focus; separator remains usable after reopening');
 await collapse('rail_b').click();await settle();const persisted=(await state()).preferences;
 await page.reload({waitUntil:'domcontentloaded'});await settle();assert.deepEqual((await state()).preferences,persisted);assert.equal((await state()).actual.left.categoryCompact,true);
 await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='rail_b').side='right';saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});await settle();assert.equal((await state()).actual.left.categoryCompact,true);assert.equal(await page.locator('#right-column [data-category-id="rail_b"] .category-collapse-toggle').getAttribute('aria-expanded'),'false');
 await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='rail_a').hidden=true;saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});await settle();assert.equal((await state()).actual.left.empty,true);assert.equal(await page.locator('#left-sidebar').getAttribute('data-collapse'),'empty');assert.equal(await page.locator('.app-layout').evaluate(n=>n.style.getPropertyValue('--left-track')),'0px');
 await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='rail_a').hidden=false;saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});await settle();assert.equal((await state()).actual.left.categoryCompact,true);assert.equal((await state()).preferences.left.width,userWidth);
 pass('stable category collapse survives reload, moves, last-category hide and restore without replacing manual layout preferences');
 await page.locator('#left-sidebar .sidebar-heading [data-sidebar-toggle="left"]').click();await settle();assert.equal(await page.locator('#left-sidebar').getAttribute('data-collapse'),'manual');await page.locator('#left-sidebar .sidebar-tab').click();await settle();assert.equal(await page.locator('#left-sidebar').getAttribute('data-collapse'),'categories');
 pass('manual whole-sidebar collapse remains distinct from temporary category compaction');
 for(const [width,height]of[[1366,768],[820,1180],[1180,820],[390,844],[844,390],[1440,1000]]){
  await page.setViewportSize({width,height});await settle();const metric=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,center:document.querySelector('#center-container').getBoundingClientRect().width,actual:HeavenlyLayout.getState().actual}));assert(metric.scrollWidth<=width);assert(metric.center>=Math.min(300,width-32));result.transitions.push(metric);
  if((await state()).actual.compact){const toggle=page.locator('.layout-toolbar [data-sidebar-toggle="left"]');if(!(await state()).actual.left.open){if(engine==='firefox')await toggle.click();else await toggle.tap();await settle()}assert(await collapse('rail_a').isVisible());assert((await collapse('rail_a').boundingBox()).height>=44);assert((await card('rail_a').boundingBox()).width>140)}
 }
 await shot('after-rail-restored-desktop');pass('Chromebook, iPad portrait/landscape and narrow portrait/landscape emulation retain reachable full-label category controls without overflow');
 await page.evaluate(()=>{window.__railFrames=[];const sample=()=>{const s=HeavenlyLayout.getState();window.__railFrames.push({track:parseFloat(document.querySelector('.app-layout').style.getPropertyValue('--left-track')),width:document.documentElement.scrollWidth,inner:innerWidth});if(window.__railFrames.length<60)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 for(let i=0;i<8;i++){await collapse('rail_a').click();await page.waitForTimeout(25)}await settle();await page.waitForFunction(()=>window.__railFrames.length===60);const frames=await page.evaluate(()=>window.__railFrames);assert(frames.every(f=>Number.isFinite(f.track)&&f.width<=f.inner));assert.equal((await state()).actual.left.categoryCompact,true);assert.equal((await state()).preferences.left.width,userWidth);assert.equal(await page.evaluate(()=>document.querySelectorAll('#heavenly-drag-avatar').length),0);
 await page.emulateMedia({reducedMotion:'reduce'});await collapse('rail_a').click();await settle();assert.equal((await state()).actual.left.width,userWidth);await collapse('rail_a').click();await settle();assert.equal((await state()).actual.left.categoryCompact,true);
 pass('rapid reversals and reduced motion settle to the last requested state without width drift, overflow or gesture residue');
 assert.deepEqual(errors,[]);result.pageErrors=errors;result.finalState=await state();fs.writeFileSync(path.join(output,'compact-rails-'+engine+'.json'),JSON.stringify(result,null,2));
 console.log(result.checks.length+' compact-rail interaction groups passed in '+engine);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
