'use strict';
// Run normally against the implementation, or --baseline to reproduce the two
// observed lifecycle defects at the exact pre-overhaul main commit.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const app=require('../../app');
const baseline=process.argv.includes('--baseline');
const base='013cd07a36854c74b8feb8f29a8437f2c4daa72b';
let browser,server;
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
 await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
 const page=await context.newPage();
 if(baseline){const html=execFileSync('git',['show',base+':public/index.html'],{encoding:'utf8'});await page.route(origin+'/',r=>r.fulfill({contentType:'text/html',body:html}));}
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForTimeout(400);
 const cdp=await context.newCDPSession(page),point=(x,y)=>({id:1,x,y,radiusX:5,radiusY:5,force:1});
 const touch=(type,p=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p});
 const results=[];
 for(const kind of ['removed source','viewport change']){
  await page.evaluate(()=>{const d=loadBookmarkData();d.categories.forEach(c=>c.hidden=true);d.categories=d.categories.filter(c=>c.id!=='interrupt');d.bookmarks=d.bookmarks.filter(b=>b.categoryId!=='interrupt');d.categories.push({id:'interrupt',title:'Touch lifecycle fixture',side:'left',order:0,subSections:[{id:'user',title:'Saved',defaultCollapsed:false}]});for(let i=0;i<4;i++)d.bookmarks.push({id:'interrupted_'+i,title:'Saved item '+i,url:'https://lifecycle.test/'+i,categoryId:'interrupt',subSectionId:'user',order:i});saveBookmarkData(d);expandedSubSections.interrupt_user=true;renderBookmarksUI();scrollTo(0,0)});
  const h=page.locator('[data-bm-id="interrupted_0"] .drag-dots-handle');await h.scrollIntoViewIfNeeded();const a=await h.boundingBox(),b=await page.locator('[data-bm-id="interrupted_2"]').boundingBox();
  await touch('touchStart',[point(a.x+a.width/2,a.y+a.height/2)]);await page.waitForTimeout(550);await touch('touchMove',[point(b.x+35,b.y+b.height*.8)]);await page.waitForTimeout(60);assert.equal(await page.locator('#heavenly-drag-avatar').count(),1);
  if(kind==='removed source')await h.evaluate(n=>n.closest('[data-bm-id]').remove());
  else await page.setViewportSize({width:1430,height:990});
  await page.waitForTimeout(100);
  const stale=await page.locator('#heavenly-drag-avatar').count();
  assert.equal(stale,baseline?1:0,kind+' should '+(baseline?'reproduce the stale baseline preview':'cancel and clean up immediately'));
  results.push({case:kind,stalePreview:!!stale});
  await touch('touchCancel');await page.setViewportSize({width:1440,height:1000});
 }
 console.log(JSON.stringify({mode:baseline?'baseline':'implementation',baseCommit:base,browser:'Chromium CDP touch input (emulated)',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}});
