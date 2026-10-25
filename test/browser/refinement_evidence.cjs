'use strict';
// Real application captures. Baselines are served from immutable git archives.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const arg=name=>{const n=process.argv.indexOf('--'+name);return n<0?null:process.argv[n+1]};
const phase=arg('phase')||'refinement';
const source=path.resolve(arg('source')||path.join(__dirname,'../..'));
const output=path.resolve(__dirname,'../../docs/homepage-refinement/evidence');
const app=require(path.join(source,'app'));
const summary={phase,sourceCommit:arg('commit'),captured:new Date().toISOString(),physicalDevices:[],assetPolicy:'External fonts, stylesheets and images allowed; proxy navigation blocked.',captures:[],errors:[]};
let browser,server;
(async()=>{
 fs.mkdirSync(output,{recursive:true});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});summary.browser=await browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
 await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>(r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/'))||['image','font','stylesheet'].includes(r.request().resourceType())?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>summary.errors.push(e.message));page.setDefaultTimeout(7000);
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
 async function shot(id,width,height,note){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);
  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth,layout:window.HeavenlyLayout?.getState(),centerWidth:document.querySelector('#center-container').getBoundingClientRect().width}));
  if(phase!=='original')assert(metrics.scrollWidth<=width,id+' horizontal page overflow');
  const file=phase+'-'+id+'.png';await page.screenshot({path:path.join(output,file)});summary.captures.push({id,file:'evidence/'+file,width,height,note,...metrics});console.log('CAPTURE '+file);
 }
 for(const [id,width,height]of[['desktop',1440,1000],['wide',1920,1080],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['phone-small',320,740],['phone',390,844]])await shot(id,width,height,'Fresh installation; default layout.');
 await page.locator('#bm-universal-search').fill('Games');await shot('search',1440,1000,'Central bookmark search for Games.');
 await page.locator('#bm-universal-search').fill('');
 if(phase==='refinement'){
  const reset=async()=>{await page.locator('#layout-options-trigger').click();const r=page.locator('#reset-home-layout');if(await r.isEnabled())await r.click();else await page.keyboard.press('Escape');await page.waitForTimeout(120)};
  const toggle=side=>page.locator('[data-sidebar-toggle="'+side+'"]:visible').first().click();
  await reset();await shot('both-expanded',1440,1000,'Both sidebars expanded, default widths.');
  await toggle('left');await shot('left-collapsed',1440,1000,'Left sidebar collapsed.');
  await toggle('left');await toggle('right');await shot('right-collapsed',1440,1000,'Right sidebar collapsed.');
  await toggle('left');await shot('both-collapsed',1440,1000,'Both sidebars collapsed.');
  await page.locator('#bm-universal-search').fill('Games');await shot('search-collapsed',1440,1000,'Search includes bookmarks from both collapsed sidebars.');
  await page.locator('#bm-universal-search').fill('');await reset();
  await page.locator('.category-collapse-toggle').first().click();await shot('category-collapsed',1440,1000,'Individual category collapsed inside an expanded sidebar.');
  await page.locator('#layout-options-trigger').click();await shot('layout-options',1440,1000,'Layout options keeps the scoped reset out of the persistent toolbar.');await page.keyboard.press('Escape');await reset();
  await page.locator('#left-resize').focus();await page.keyboard.press('End');
  await page.evaluate(()=>{const d=loadBookmarkData();d.categories.filter(c=>c.side==='right').forEach(c=>c.side='left');saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});
  for(const control of await page.locator('#left-column .category-collapse-toggle').all())await control.click();
  await shot('category-rails',1440,1000,'Multiple real categories moved into one sidebar and collapsed into independent compact draggable headers.');
  for(const control of await page.locator('#left-column .category-collapse-toggle').all())await control.click();
  await page.evaluate(()=>{const d=loadBookmarkData();d.categories.filter(c=>c.side==='left').forEach(c=>c.side='right');saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});
  await shot('empty-left',1440,1000,'All left categories moved right: the empty side occupies no column or expansion rail.');
 }
 assert.deepEqual(summary.errors,[]);await context.close();
 fs.writeFileSync(path.join(output,phase+'.json'),JSON.stringify(summary,null,2));console.log('PASS '+phase+' '+summary.captures.length+' captures');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
