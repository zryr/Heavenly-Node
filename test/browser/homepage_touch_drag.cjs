'use strict';
// Native Chromium input (CDP), never synthetic HTML DragEvents. Fixtures retain
// the catalog model and intentionally include built-in and personal entries.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../../app');
let browser, server, checks = 0;
const pass = message => { checks++; console.log('PASS ' + message); };
(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const context = await browser.newContext({viewport: {width:1440, height:1000}, hasTouch:true});
  await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked','true'));
  await context.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().includes('/proxy/') ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const d = loadBookmarkData(); d.categories.forEach(c => c.hidden = true);
    for (const [id,side] of [['touch_left','left'],['touch_right','right']]) {
      d.categories.push({id,title:id==='touch_left'?'Saved discoveries':'Reading collection',side,order:0,subSections:[{id:'alpha',title:'Daily',defaultCollapsed:false},{id:'beta',title:'Research',defaultCollapsed:false},{id:'gamma',title:'Later',defaultCollapsed:false}]});
      for(const section of ['alpha','beta','gamma']) {
        collapsedSubSections[id+'_'+section]=false;
        for(let i=0;i<3;i++) d.bookmarks.push({id:id+'_'+section+'_'+i,title:(section==='alpha'?'Daily':'Research')+' bookmark '+i,url:'https://gesture.test/'+id+'/'+section+'/'+i,categoryId:id,subSectionId:section,type:'bookmark',order:i,launchPreference:'direct'});
      }
    }
    // Test the built-in through the identical path, retaining its real metadata.
    const builtin=d.bookmarks.find(b=>b.id==='bm_ng');
    builtin.categoryId='touch_left'; builtin.subSectionId='alpha'; builtin.order=0; builtin.launchPreference='direct';
    saveBookmarkData(d); renderBookmarksUI();
  });
  await page.waitForTimeout(250);
  const cdp = await context.newCDPSession(page);
  const point = (x,y,id=1) => ({x,y,id,radiusX:5,radiusY:5,force:.7});
  const touch = (type,points=[]) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const grip = id => page.locator('[data-bm-id="'+id+'"] > .drag-dots-handle');
  const card = id => page.locator('[data-bm-id="'+id+'"]');
  const saved = () => page.evaluate(() => localStorage.getItem('heavenly_bookmarks'));
  const clean = async () => {
    assert.equal(await page.locator('#heavenly-drag-avatar,.bookmark-placement-indicator,.bookmark-card.dragging,.section-card.dragging,.heavenly-hold-ready,.heavenly-hold-pending').count(),0);
    assert.equal(await page.evaluate(()=>HeavenlyGestures.owner),'');
  };
  const center = async locator => { const b=await locator.boundingBox();assert(b);return point(b.x+b.width/2,b.y+b.height/2); };
  const begin = async locator => {
    await locator.scrollIntoViewIfNeeded();
    const p=await center(locator); await touch('touchStart',[p]);
    // Real fingers drift a few pixels during the deliberate hold.
    await page.waitForTimeout(130); await touch('touchMove',[point(p.x+2,p.y+2)]);
    await page.waitForTimeout(340);
    assert.equal(await locator.evaluate(n=>n.classList.contains('heavenly-hold-ready')),true);
    return p;
  };
  const stroke = async (a,b) => {
    for(let i=1;i<=14;i++) {
      await touch('touchMove',[point(a.x+(b.x-a.x)*i/14,a.y+(b.y-a.y)*i/14)]);
      await page.waitForTimeout(16);
    }
  };
  const order = (cat,sub) => page.evaluate(({cat,sub})=>loadBookmarkData().bookmarks.filter(b=>b.categoryId===cat&&b.subSectionId===sub).sort((a,b)=>a.order-b.order).map(b=>b.id),{cat,sub});
  const aId='touch_left_alpha_0', bId='touch_left_alpha_2';
  await grip(aId).evaluate(n=>{window.__handleTapClicks=0;n.addEventListener('click',()=>window.__handleTapClicks++);});
  const tap=await center(grip(aId));await touch('touchStart',[tap]);await page.waitForTimeout(70);await touch('touchEnd');await page.waitForTimeout(40);
  assert.equal(await page.evaluate(()=>window.__handleTapClicks),1);assert.equal(await page.locator('#reorder-bar.active').count(),1);
  await page.evaluate(()=>closeReorderBar());await clean();pass('a quick handle tap invokes its existing management action exactly once');
  let a=await begin(grip(aId)), b=await center(card(bId)); b.y+=12;
  await stroke(a,b);
  const destination=await page.locator('.bookmark-placement-indicator').getAttribute('data-target');
  const after=await page.locator('.bookmark-placement-indicator').getAttribute('data-after');
  const artifactDir=process.env.HEAVENLY_GESTURE_ARTIFACTS;
  if(artifactDir){fs.mkdirSync(artifactDir,{recursive:true});await page.screenshot({path:path.join(artifactDir,'touch-active.png')});}
  await touch('touchEnd'); await clean();
  let ids=await order('touch_left','alpha');
  assert.equal(ids.indexOf(aId),ids.indexOf(destination)+(after==='true'?1:-1));
  pass('slow finger strokes reorder a bookmark to the displayed insertion destination');
  if(artifactDir)await page.screenshot({path:path.join(artifactDir,'touch-dropped.png')});
  a=await begin(grip('bm_ng')); b=await center(card('touch_left_beta_1'));b.y+=12;await stroke(a,b);await touch('touchEnd');
  assert.equal(await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='bm_ng').subSectionId),'beta');
  assert.equal(await page.evaluate(()=>loadBookmarkData().bookmarks.find(b=>b.id==='bm_ng').launchPreference),'direct');
  await clean(); pass('built-in bookmarks move between subsections without changing launch preferences');
  a=await begin(grip(aId)); b=await center(card('touch_right_beta_1'));b.y+=12;await stroke(a,b);await touch('touchEnd');
  assert.equal(await page.evaluate(id=>loadBookmarkData().bookmarks.find(b=>b.id===id).categoryId,aId),'touch_right');
  await clean();pass('touch dragging moves a personal bookmark across categories and columns');
  const persisted=await order('touch_right','beta');await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(200);
  assert.deepEqual(await order('touch_right','beta'),persisted);pass('cross-category drop and order survive reload');
  for (const mode of ['early release','early movement','pending second finger','pending Escape','touchcancel','second finger','blur','viewport','source removal','rerender','outside']) {
    await page.evaluate(()=>{closeReorderBar();renderBookmarksUI();scrollTo(0,0)});
    const before=await saved(); const h=grip('touch_left_alpha_1');await h.scrollIntoViewIfNeeded();a=await center(h);
    await touch('touchStart',[a]);
    if(mode==='early release')await touch('touchEnd');
    else if(mode==='early movement'){await touch('touchMove',[point(a.x,a.y+25)]);await touch('touchEnd');}
    else if(mode==='pending second finger'){await touch('touchStart',[a,point(a.x+55,a.y,2)]);await touch('touchEnd');}
    else if(mode==='pending Escape'){await page.keyboard.press('Escape');await touch('touchEnd');}
    else {
      await page.waitForTimeout(470);await touch('touchMove',[point(a.x+12,a.y+25)]);await page.waitForTimeout(30);
      if(mode==='touchcancel')await touch('touchCancel');
      else if(mode==='second finger'){await touch('touchStart',[point(a.x+12,a.y+25),point(a.x+55,a.y+25,2)]);await touch('touchEnd');}
      else if(mode==='blur'){await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await touch('touchEnd');}
      else if(mode==='viewport'){await page.setViewportSize({width:1430,height:990});await touch('touchEnd');await page.setViewportSize({width:1440,height:1000});}
      else if(mode==='source removal'){await h.evaluate(n=>n.closest('[data-bm-id]').remove());await page.waitForTimeout(50);await touch('touchEnd');}
      else if(mode==='rerender'){await page.evaluate(()=>renderBookmarksUI());await touch('touchEnd');}
      else {await touch('touchMove',[point(700,50)]);await touch('touchEnd');}
    }
    await page.waitForTimeout(40);await clean();assert.equal(await saved(),before,mode+' must not alter stored bookmarks');if(mode!=='early release')assert.equal(await page.locator('#reorder-bar.active').count(),0,mode+' must not trigger the handle click');
  }
  pass('early release/movement, cancel, multitouch, blur, resize, removed sources, rerender and invalid drops clean up without saving');
  await page.evaluate(()=>{renderBookmarksUI();scrollTo(0,0)});
  const previous=await saved();
  await page.evaluate(()=>HeavenlyGestures.acquire('sidebar-resize',()=>{}));
  a=await center(grip('touch_left_alpha_1'));await touch('touchStart',[a]);await page.waitForTimeout(500);await touch('touchMove',[point(a.x,a.y+100)]);await touch('touchEnd');
  assert.equal(await page.locator('#heavenly-drag-avatar').count(),0);assert.equal(await saved(),previous);
  await page.evaluate(()=>HeavenlyGestures.release('sidebar-resize'));pass('sidebar gesture ownership excludes bookmark pickup');
  // Body movement must retain the browser's native scroll, without reserving a drag.
  await page.evaluate(()=>{document.body.style.minHeight='2600px';scrollTo(0,0)});
  const body=card('touch_left_alpha_1').locator('.bookmark-title');await body.scrollIntoViewIfNeeded();a=await center(body);
  await touch('touchStart',[a]);await stroke(a,point(a.x,Math.max(30,a.y-220)));await touch('touchEnd');
  assert.equal(await page.locator('#heavenly-drag-avatar').count(),0);assert(await page.evaluate(()=>scrollY>0));
  pass('ordinary bookmark-body touch scrolling remains native');
  await page.evaluate(()=>{scrollTo(0,0);openCategoryEditModal('touch_left')});await page.waitForTimeout(300);
  let rows=page.locator('.section-order-row');const firstId=await rows.first().getAttribute('data-section-id');
  a=await begin(rows.first().locator('.drag-dots-handle'));b=await center(rows.last());b.y+=9;await stroke(a,b);await touch('touchEnd');
  assert.equal(await rows.last().getAttribute('data-section-id'),firstId);await page.locator('#cat-submit-btn').click();await page.waitForTimeout(250);await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>loadBookmarkData().categories.find(c=>c.id==='touch_left').subSections.at(-1).id),firstId);
  pass('subsection handle touch reorder is saved by its management interface and survives reload');
  await page.evaluate(()=>openCategoryEditModal('touch_left'));await page.waitForTimeout(250);
  const keyboardHandle=page.locator('.section-order-row').last().locator('.drag-dots-handle');await keyboardHandle.focus();await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('.section-order-row').nth(1).getAttribute('data-section-id'),firstId);await page.keyboard.press('Escape');
  pass('keyboard subsection ordering remains available');
  await page.evaluate(()=>{scrollTo(0,0);renderBookmarksUI()});
  const categoryGrip=page.locator('[data-category-id="touch_left"] > .section-header .drag-dots-handle').first();
  a=await begin(categoryGrip);b=await center(page.locator('[data-category-id="touch_right"] > .section-header').first());await stroke(a,b);await touch('touchEnd');
  assert.equal(await page.evaluate(()=>loadBookmarkData().categories.find(c=>c.id==='touch_left').side),'right');await clean();
  pass('category touch pickup moves a section between supported columns');
  const mouseSource=grip('touch_right_beta_0');await mouseSource.scrollIntoViewIfNeeded();a=await center(mouseSource);b=await center(card('touch_right_beta_2'));b.y+=10;
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:18});await page.mouse.up();await clean();
  ids=await order('touch_right','beta');assert(ids.indexOf('touch_right_beta_0')>ids.indexOf('touch_right_beta_2'));
  assert.equal(context.pages().length,1);assert.deepEqual(errors,[]);pass('hybrid mouse dragging still persists ordering without extra navigation or page errors');
  console.log(checks+' real-input gesture checks passed (Chromium emulation; no physical iPad claim)');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}});
