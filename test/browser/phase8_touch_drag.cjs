'use strict';
// Chromium's native touch input crosses the browser gesture recognizer. Synthetic
// PointerEvents cannot detect the pre-hold touch-action regression reproduced here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const app = require('../../app');
const baseline = process.argv.includes('--baseline');
const artifacts = path.resolve(process.env.HEAVENLY_PHASE8_TOUCH_ARTIFACTS || 'docs/phase8/evidence/touch');
const summary = {executed:new Date().toISOString(), baseline, baselineCommit:'2725f32369bb609bcd0cf8c8d51e272f9a420009', input:'Chromium CDP native touch emulation', physicalDevices:[], viewports:[], errors:[]};
let server, browser;
(async () => {
  fs.mkdirSync(artifacts, {recursive:true});
  server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
  summary.browserVersion = browser.version();
  for (const [name,width,height] of [['portrait',820,1180],['landscape',1180,820]]) {
    const record = {name,width,height,checks:[]}; summary.viewports.push(record);
    const context = await browser.newContext({viewport:{width,height}, hasTouch:true, isMobile:true, deviceScaleFactor:2, ...(!baseline && name==='portrait' && process.env.HEAVENLY_TOUCH_VIDEO ? {recordVideo:{dir:path.resolve('work/phase8-touch-video'),size:{width:820,height:1180}}} : {})});
    await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked','true'));
    await context.route('**/*', r => r.request().url().startsWith(origin) && !r.request().url().includes('/proxy/') ? r.continue() : r.abort());
    const page = await context.newPage(); page.setDefaultTimeout(8000); page.on('pageerror', e => summary.errors.push(e.message));
    if (baseline) {
      const html = execFileSync('git',['show',summary.baselineCommit+':public/index.html'],{encoding:'utf8'});
      await page.route(origin+'/',r => r.fulfill({contentType:'text/html',body:html}));
      await page.route(origin+'/assets/**',r => {
        const assetPath=new URL(r.request().url()).pathname;
        try {
          const body=execFileSync('git',['show',summary.baselineCommit+':public'+assetPath]);
          return r.fulfill({contentType:require('mime').lookup(assetPath),body});
        } catch(error) { return r.fulfill({status:404,body:''}); }
      });
    }
    await page.goto(origin,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(350);
    await page.evaluate(() => {
      const d=loadBookmarkData();d.categories.forEach(c=>c.hidden=true);
      d.categories.push({id:'phase8_touch',title:'Touch collection',side:'bottom',order:0,subSections:[{id:'daily',title:'Daily',defaultCollapsed:false}]});
      for(let i=0;i<12;i++)d.bookmarks.push({id:'phase8_'+i,title:'Touch bookmark '+i,url:'https://touch.test/'+i,categoryId:'phase8_touch',subSectionId:'daily',type:'bookmark',order:i,launchPreference:'direct'});
      saveBookmarkData(d);collapsedSubSections.phase8_touch_daily=false;expandedSubSections.phase8_touch_daily=true;renderBookmarksUI();
      document.body.style.minHeight='3400px';
    });
    await page.waitForTimeout(200);
    const cdp=await context.newCDPSession(page);
    const point=(x,y,id=1)=>({id,x,y,radiusX:5,radiusY:5,force:.7});
    const touch=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    const center=async locator=>{const b=await locator.boundingBox();assert(b);return point(b.x+b.width/2,b.y+b.height/2)};
    const stroke=async(a,b)=>{for(let i=1;i<=12;i++){await touch('touchMove',[point(a.x+(b.x-a.x)*i/12,a.y+(b.y-a.y)*i/12)]);await page.waitForTimeout(20)}};
    const grip=page.locator('[data-bm-id="phase8_0"] > .drag-dots-handle');
    const clean=async()=>{
      assert.equal(await page.locator('#heavenly-drag-avatar,.bookmark-placement-indicator,.heavenly-hold-pending,.heavenly-hold-ready,.bookmark-card.dragging,.section-card.dragging').count(),0);
      assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'');
    };
    const stableScroll=async()=>{
      let previous=-1,stable=0;
      for(let i=0;i<30 && stable<4;i++){await page.waitForTimeout(50);const y=await page.evaluate(()=>scrollY);stable=Math.abs(y-previous)<1?stable+1:0;previous=y;}
    };
    const prepare=async locator=>{await stableScroll();await locator.scrollIntoViewIfNeeded();await stableScroll();return center(locator)};
    const pass=s=>{record.checks.push(s);console.log('PASS '+name+': '+s)};
    // A swipe beginning on the grip must scroll instead of freezing the page.
    let a=await prepare(grip);let before=await page.evaluate(()=>scrollY);
    await touch('touchStart',[a]);await stroke(a,point(a.x,Math.max(30,a.y-180)));await touch('touchEnd');await page.waitForTimeout(140);
    let delta=await page.evaluate(y=>scrollY-y,before);record.preHoldScrollDelta=delta;
    if(baseline) {
      assert.equal(delta,0,'merged baseline must reproduce the reserved-handle scrolling defect');
      pass('merged baseline reproduces blocked pre-hold handle scrolling');
      await page.screenshot({path:path.join(artifacts,'baseline-'+name+'.png')});
      await context.close();continue;
    }
    assert(delta>20,'pre-hold grip swipe must scroll the actual page; delta='+delta);await clean();
    pass('bookmark grip swipe before hold yields to native page scroll without reorder');
    await page.screenshot({path:path.join(artifacts,'scroll-fixed-'+name+'.png')});
    const categoryGrip=page.locator('[data-category-id="phase8_touch"] > .section-header .drag-dots-handle').first();
    a=await prepare(categoryGrip);before=await page.evaluate(()=>scrollY);
    await touch('touchStart',[a]);await stroke(a,point(a.x,Math.max(30,a.y-160)));await touch('touchEnd');await page.waitForTimeout(130);
    delta=await page.evaluate(y=>scrollY-y,before);record.categoryScrollDelta=delta;assert(delta>15,JSON.stringify({kind:'category',a,before,delta}));await clean();pass('category grip early swipe also scrolls');
    // Compact tabs live in side panels; bottom category content stays expanded.
    await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='phase8_touch').side='left';saveBookmarkData(d);renderBookmarksUI();scrollTo(0,0)});
    await page.waitForTimeout(200);
    await page.locator('[data-category-id="phase8_touch"] .category-collapse-toggle').tap();await page.waitForTimeout(240);
    a=await prepare(categoryGrip);before=await page.evaluate(()=>scrollY);
    await touch('touchStart',[a]);await stroke(a,point(a.x,Math.max(30,a.y-150)));await touch('touchEnd');await page.waitForTimeout(130);
    delta=await page.evaluate(y=>scrollY-y,before);record.tabScrollDelta=delta;assert(delta>15,JSON.stringify({kind:'tab',a,before,delta}));await clean();pass('collapsed category tab grip early swipe scrolls');
    await page.locator('[data-category-id="phase8_touch"] .category-collapse-toggle').tap();await page.waitForTimeout(240);
    await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='phase8_touch').side='bottom';saveBookmarkData(d);renderBookmarksUI()});
    const stored=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
    for(const mode of ['Escape','blur','pagehide','popstate','touchcancel','pointercancel','second contact','source removal']) {
      await page.evaluate(()=>{closeReorderBar();renderBookmarksUI()});
      a=await prepare(grip);await touch('touchStart',[a]);await page.waitForTimeout(440);
      assert(await grip.evaluate(n=>n.classList.contains('heavenly-hold-ready')));
      if(mode==='Escape')await page.keyboard.press('Escape');
      else if(mode==='touchcancel')await touch('touchCancel');
      else if(mode==='pointercancel')await grip.dispatchEvent('pointercancel',{pointerType:'touch',pointerId:1});
      else if(mode==='second contact')await touch('touchStart',[a,point(a.x+50,a.y,2)]);
      else if(mode==='source removal')await grip.evaluate(n=>n.closest('[data-bm-id]').remove());
      else await page.evaluate(type=>window.dispatchEvent(new Event(type)),mode);
      await page.waitForTimeout(30);if(mode!=='touchcancel')await touch('touchEnd');await page.waitForTimeout(30);await clean();
      assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),stored,mode+' persists no aborted reorder');
    }
    pass('held input cancels on Escape, blur, pagehide, history navigation, touchcancel, pointercancel, multitouch and source removal');
    await page.evaluate(()=>renderBookmarksUI());
    a=await prepare(grip);const target=page.locator('[data-bm-id="phase8_2"]');const b=await center(target);b.y+=10;
    await touch('touchStart',[a]);await page.waitForTimeout(440);await stroke(a,b);
    assert.equal(await page.locator('#heavenly-drag-avatar').count(),1);
    await page.screenshot({path:path.join(artifacts,'held-'+name+'.png')});
    const destination=await page.locator('.bookmark-placement-indicator').getAttribute('data-target');
    const after=await page.locator('.bookmark-placement-indicator').getAttribute('data-after');
    await touch('touchEnd');await clean();
    const ids=await page.evaluate(()=>loadBookmarkData().bookmarks.filter(b=>b.categoryId==='phase8_touch').sort((a,b)=>a.order-b.order).map(b=>b.id));
    assert.equal(ids.indexOf('phase8_0'),ids.indexOf(destination)+(after==='true'?1:-1));
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(()=>loadBookmarkData().bookmarks.filter(b=>b.categoryId==='phase8_touch').sort((a,b)=>a.order-b.order).map(b=>b.id)),ids);
    pass('deliberate touch hold and native stroke reorder to the shown target and persist after refresh');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await context.close();
    if(page.video())await page.video().saveAs(path.join(artifacts,'touch-portrait.webm'));
  }
  assert.deepEqual(summary.errors,[]);
  summary.status='passed';
})().catch(e=>{summary.status='failed';summary.failure=e.stack;process.exitCode=1;console.error(e)}).finally(async()=>{
  fs.mkdirSync(artifacts,{recursive:true});fs.writeFileSync(path.join(artifacts,baseline?'baseline-results.json':'results.json'),JSON.stringify(summary,null,2)+'\n');
  await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}
});
