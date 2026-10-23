'use strict';
// Real mouse/keyboard input across browser engines. Continuous touch dragging
// is separately exercised by homepage_touch_drag.cjs in Chromium CDP.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium, firefox, webkit} = require('playwright');
const app = require('../../app');
const output = path.resolve(process.env.HEAVENLY_BROWSER_MATRIX || 'docs/homepage-overhaul/evidence/browser-matrix.json');
const summary = {executed:new Date().toISOString(),physicalDevices:[],continuousTouch:'Chromium CDP emulation only; Firefox/WebKit continuous touch injection is not exposed by Playwright',browsers:[]};
let server;
(async()=>{
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
  const origin='http://127.0.0.1:'+server.address().port;
  for (const [name,engine] of Object.entries({chromium,firefox,webkit})) {
    const record={engine:name,checks:[],errors:[],viewports:[]};summary.browsers.push(record);let browser,context;
    try {
      browser=await engine.launch(name==='chromium'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}:{ });
      record.version=await browser.version();
      context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:name==='chromium'});
      await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
      await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
      const page=await context.newPage();page.setDefaultTimeout(6000);page.on('pageerror',e=>record.errors.push(e.message));
      await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForTimeout(400);
      const pass=message=>{record.checks.push(message);console.log('PASS '+name+': '+message)};
      const state=()=>page.evaluate(()=>HeavenlyLayout.getState());
      const settle=()=>page.waitForTimeout(240);
      const toggle=side=>page.locator('[data-sidebar-toggle="'+side+'"]:visible').first().click();
      await page.locator('#reset-home-layout').click();await settle();
      assert((await state()).actual.left.open&&(await state()).actual.right.open);
      await toggle('left');await settle();assert.equal((await state()).actual.left.open,false);assert.equal((await state()).actual.right.open,true);
      await toggle('right');await settle();assert.equal((await state()).actual.right.open,false);
      await page.locator('#bm-universal-search').fill('Games');await page.waitForTimeout(50);
      assert(await page.locator('#bookmark-search-results').isVisible());assert(await page.locator('.bookmark-search-result').count()>0);
      assert.equal((await state()).actual.left.open,false);assert.equal((await state()).actual.right.open,false);
      await page.locator('#bm-universal-search').press('ArrowDown');assert(await page.locator('.bookmark-search-result').first().evaluate(n=>n===document.activeElement));
      await page.keyboard.press('Escape');assert.equal(await page.locator('#bm-universal-search').inputValue(),'');assert.equal((await state()).actual.left.open,false);
      pass('independent collapse controls, central search and keyboard results retain layout');
      await toggle('left');await settle();assert.equal((await state()).actual.left.open,true);assert.equal((await state()).actual.right.open,false);
      await page.locator('#left-resize').focus();await page.keyboard.press('ArrowRight');await settle();assert((await state()).preferences.left.width>256);
      await page.locator('#left-resize').press('Home');assert.equal((await state()).preferences.left.width,240);
      await page.locator('#left-resize').press('End');assert.equal((await state()).preferences.left.width,400);
      await toggle('right');await settle();
      await page.locator('#right-resize').focus();await page.keyboard.press('ArrowLeft');assert((await state()).preferences.right.width>256);await page.locator('#right-resize').hover();await settle();
      let grip=await page.locator('#right-resize').boundingBox(),start=(await state()).preferences.right.width;
      await page.mouse.move(grip.x+grip.width/2,grip.y+50);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2+45,grip.y+50,{steps:10});await page.mouse.up();await settle();
      assert((await state()).preferences.right.width<start);
      const pref=(await state()).preferences;await page.reload({waitUntil:'domcontentloaded'});await settle();assert.deepEqual((await state()).preferences,pref);
      pass('separator keyboard min/max, mouse resize and local persistence work independently');
      await page.locator('#reset-home-layout').click();await settle();
      for(const [label,width,height] of [['narrow-phone',320,740],['phone',390,844],['large-phone',430,932],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['chromebook',1366,768],['wide-desktop',1920,1080]]) {
        await page.setViewportSize({width,height});await settle();
        const metrics=await page.evaluate(()=>{const c=document.getElementById('center-container').getBoundingClientRect();const controls=['bm-universal-search','url','search-go-btn','search-newtab-btn'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return{id,x:b.x,right:b.right,width:b.width,height:b.height}});return{scrollWidth:document.documentElement.scrollWidth,innerWidth,center:{x:c.x,right:c.right,width:c.width},controls,state:HeavenlyLayout.getState()}});
        record.viewports.push({label,width,height,...metrics});
        assert(metrics.scrollWidth<=width,label+' page overflow');assert(metrics.center.x>=0&&metrics.center.right<=width,label+' center outside viewport');
        for(const c of metrics.controls){assert(c.width>=44&&c.height>=40,label+' '+c.id+' unusable');assert(c.x>=0&&c.right<=width,label+' '+c.id+' clipped')}
        if(width>=820)assert(metrics.center.width>=439,label+' center minimum width');
      }
      const intended=(await state()).preferences;await page.setViewportSize({width:820,height:1180});await settle();assert.equal((await state()).actual.right.open,false);await page.setViewportSize({width:1440,height:1000});await settle();assert.equal((await state()).actual.right.open,true);assert.deepEqual((await state()).preferences,intended);
      pass('seven representative viewports keep center controls usable without overflow; automatic collapse restores intent');
      await page.evaluate(()=>{const data=loadBookmarkData();data.categories.forEach(c=>c.hidden=true);data.categories.push({id:'matrix',title:'Cross-browser collection',side:'left',order:0,subSections:[{id:'daily',title:'Daily'},{id:'later',title:'Later'},{id:'reference',title:'Reference'}]});for(let i=0;i<5;i++)data.bookmarks.push({id:'matrix_'+i,title:'Browser bookmark '+i,url:'https://matrix.test/'+i,categoryId:'matrix',subSectionId:'daily',type:'bookmark',order:i,launchPreference:'direct'});saveBookmarkData(data);collapsedSubSections.matrix_daily=false;renderBookmarksUI()});
      const h=page.locator('[data-bm-id="matrix_0"] > .drag-dots-handle');await h.scrollIntoViewIfNeeded();const a=await h.boundingBox(), b=await page.locator('[data-bm-id="matrix_3"]').boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height*.85,{steps:18});await page.mouse.up();await page.waitForTimeout(100);
      let ids=await page.evaluate(()=>loadBookmarkData().bookmarks.filter(b=>b.categoryId==='matrix').sort((a,b)=>a.order-b.order).map(b=>b.id));assert(ids.indexOf('matrix_0')>ids.indexOf('matrix_3'));
      await page.reload({waitUntil:'domcontentloaded'});await settle();assert.deepEqual(await page.evaluate(()=>loadBookmarkData().bookmarks.filter(b=>b.categoryId==='matrix').sort((a,b)=>a.order-b.order).map(b=>b.id)),ids);
      await page.locator('[data-category-id="matrix"] > .section-header .drag-dots-handle').focus();await page.keyboard.press('Enter');await page.locator('#bar-edit').click();await page.waitForTimeout(200);assert(await page.locator('#add-modal').isVisible());
      await page.locator('.section-order-row .drag-dots-handle').first().focus();await page.keyboard.press('ArrowDown');await page.locator('#cat-submit-btn').click();await page.waitForTimeout(220);assert.deepEqual(await page.evaluate(()=>loadBookmarkData().categories.find(c=>c.id==='matrix').subSections.map(s=>s.id)),['later','daily','reference']);
      assert.equal(await page.locator('#heavenly-drag-avatar,.bookmark-card.dragging,.section-card.dragging').count(),0);
      pass('actual mouse bookmark drag persists after reload; keyboard subsection ordering saves through dialog');
      await page.locator('#open-share-btn').click();await page.waitForTimeout(120);assert(await page.locator('#share-modal').isVisible());await page.keyboard.press('Escape');await page.locator('#share-modal').waitFor({state:'hidden',timeout:1000});assert.equal(await page.locator('#share-modal').isVisible(),false);
      await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#open-share-btn').click();await page.waitForTimeout(30);assert(await page.locator('#share-modal').isVisible());await page.keyboard.press('Escape');await page.locator('#share-modal').waitFor({state:'hidden',timeout:1000});assert.equal(await page.locator('#share-modal').isVisible(),false);
      assert.deepEqual(record.errors,[]);assert.equal(context.pages().length,1);
      pass('dialogs and reduced-motion completion leave no page errors or accidental navigation');
      if(name==='webkit'){
        const tablet=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
        await tablet.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
        await tablet.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
        const ipad=await tablet.newPage();await ipad.goto(origin,{waitUntil:'domcontentloaded'});await ipad.waitForTimeout(300);
        await ipad.locator('#right-sidebar .sidebar-tab:visible').tap();await ipad.waitForTimeout(240);assert((await ipad.evaluate(()=>HeavenlyLayout.getState())).actual.right.open);
        await ipad.locator('#bm-universal-search').tap();await ipad.locator('#bm-universal-search').fill('Games');assert(await ipad.locator('.bookmark-search-result').count()>0);
        await ipad.setViewportSize({width:1180,height:820});await ipad.waitForTimeout(240);assert(await ipad.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await tablet.close();
        pass('WebKit iPad profile supports touch taps, central search and portrait/landscape adaptation');
      }
      record.status='passed';
    }catch(error){record.status='failed';record.failure=error.stack;console.error('FAIL '+name+': '+error.message);process.exitCode=1;}finally{await context?.close();await browser?.close();}
  }
})().catch(error=>{summary.failure=error.stack;process.exitCode=1;console.error(error)}).finally(async()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(summary,null,2));if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}});
