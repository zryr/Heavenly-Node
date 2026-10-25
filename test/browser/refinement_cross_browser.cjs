'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),playwright=require('playwright'),app=require('../../app');
const output=process.env.HEAVENLY_REFINEMENT_MATRIX ? path.resolve(process.env.HEAVENLY_REFINEMENT_MATRIX) : path.resolve(__dirname,'../../docs/homepage-refinement/evidence/browser-matrix.json');
const summary={executed:new Date().toISOString(),physicalDevices:[],touchScope:'Continuous gestures use the separate Chromium CDP suite; WebKit here is Linux engine emulation.',browsers:[]};
let server;
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 for(const engine of (process.env.HEAVENLY_BROWSER?[process.env.HEAVENLY_BROWSER]:['chromium','firefox','webkit'])){
  const result={engine,checks:[],viewports:[],errors:[]};summary.browsers.push(result);let browser,context;
  try{
   browser=await playwright[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{});result.version=await browser.version();
   context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:engine!=='firefox'});
   await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
   await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
   const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>result.errors.push(e.message));
   // Wait for the browser's render cycle and owned motion, rather than a wall
   // clock delay: Linux WebKit can deliver resize/animation callbacks later on
   // a busy machine, after the geometry itself is already readable.
   const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const settle=async()=>{
    await frame();
    await page.waitForFunction(()=>{
     const layout=document.querySelector('.app-layout');
     return !layout.classList.contains('layout-viewport-changing') &&
      !layout.getAnimations().some(a=>a.playState==='running') &&
      !Array.from(document.querySelectorAll('.category-content,.subsection-content')).some(n=>n.__accordionAnimation);
    });
    await frame();
   },state=()=>page.evaluate(()=>HeavenlyLayout.getState());
   const pass=message=>{result.checks.push(message);console.log('PASS '+engine+' '+message)};
   const toggle=side=>page.locator('[data-sidebar-toggle="'+side+'"]:visible').first().click();
   const reset=async()=>{await page.locator('#layout-options-trigger').click();const button=page.locator('#reset-home-layout');if(await button.isEnabled())await button.click();else await page.keyboard.press('Escape');await settle()};
   await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HeavenlyLayout?.getState&&window.bookmarkSearchController);await settle();
   assert(await page.locator('#reset-home-layout').isHidden());await page.locator('#layout-options-trigger').focus();await page.keyboard.press('Enter');assert(await page.locator('#layout-options-menu').isVisible());assert(await page.locator('#reset-home-layout').isDisabled());await page.keyboard.press('Escape');assert(await page.locator('#layout-options-menu').isHidden());assert(await page.locator('#layout-options-trigger').evaluate(n=>n===document.activeElement));
   for(const [left,right]of[[true,true],[false,true],[false,false],[true,false],[true,true]]){
    for(const [side,open]of[['left',left],['right',right]])if((await state()).actual[side].open!==open){await toggle(side);await settle()}
    const preferences=JSON.stringify((await state()).preferences);await page.locator('#bm-universal-search').fill('Games');assert(await page.locator('.bookmark-search-result').count()>0);await page.locator('#bm-search-clear-btn').click();assert.equal(JSON.stringify((await state()).preferences),preferences);
   }
   pass('keyboard Layout options closes to its trigger; reset is disabled at defaults; search preserves all four panel states');
   await page.locator('#left-resize').focus();await page.keyboard.press('ArrowRight');assert((await state()).preferences.left.width>256);await page.keyboard.press('Home');assert.equal((await state()).preferences.left.width,240);await reset();
   await page.evaluate(()=>{
    window.__originalCategory=document.querySelector('#left-column .section-card');
    window.__viewportAudit={samples:[],frame:0};
    addEventListener('resize',()=>{
     const audit=window.__viewportAudit;
     cancelAnimationFrame(audit.frame);audit.samples=[];
     const sample=()=>{
      audit.samples.push({width:innerWidth,scrollWidth:document.documentElement.scrollWidth});
      if(audit.samples.length<12)audit.frame=requestAnimationFrame(sample);
     };
     audit.frame=requestAnimationFrame(sample);
    });
   });
   for(const [label,width,height]of[['desktop',1440,1000],['wide',1920,1080],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['phone-small',320,740],['phone',390,844]]){
    const previous=page.viewportSize();
    await page.setViewportSize({width,height});await settle();
    if(previous.width!==width||previous.height!==height)await page.waitForFunction(()=>window.__viewportAudit.samples.length===12);
    const frames=await page.evaluate(()=>window.__viewportAudit.samples);
    for(const frame of frames)assert(frame.scrollWidth<=frame.width,label+' overflow during resize paint');
    const metrics=await page.evaluate(()=>{const center=document.getElementById('center-container').getBoundingClientRect();return{scrollWidth:document.documentElement.scrollWidth,innerWidth,center:{x:center.x,right:center.right,width:center.width},controls:['bm-universal-search','url','search-go-btn','search-newtab-btn'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return{id,x:b.x,right:b.right,width:b.width,height:b.height}}),sameCategory:window.__originalCategory===document.querySelector('#left-column .section-card'),state:HeavenlyLayout.getState()}});
    result.viewports.push({label,width,height,frames,...metrics});assert(metrics.scrollWidth<=width,label+' overflow');assert(metrics.center.x>=0&&metrics.center.right<=width,label+' clipped center');assert(metrics.sameCategory,label+' replaced category DOM');for(const c of metrics.controls){assert(c.width>=44&&c.height>=40,label+' unusable '+c.id);assert(c.x>=0&&c.right<=width,label+' clipped '+c.id)}
   }
   await page.setViewportSize({width:1440,height:1000});await settle();await reset();
   pass('six required viewport sizes retain the same category DOM and usable center controls; 12 resize paint frames stay within the viewport; keyboard resize remains functional');
   await page.evaluate(()=>{
    const data=loadBookmarkData();data.categories.forEach(c=>c.hidden=true);
    for(const [id,side]of[['qa_left_a','left'],['qa_left_b','left'],['qa_right','right'],['qa_bottom','bottom']]){
     data.categories.push({id,title:id==='qa_left_a'?'A':id==='qa_left_b'?'B':'Research '+id,side,order:data.categories.length,subSections:[{id:'saved',title:'Research links',icon:'globe'}]});
     for(let i=0;i<(side==='bottom'?14:9);i++)data.bookmarks.push({id:id+'_'+i,title:'Research '+id+' '+i,url:'https://research.test/'+id+'/'+i,categoryId:id,subSectionId:'saved',order:i,notes:'Keep this note',launchPreference:'direct'});
    }
    saveBookmarkData(data);renderBookmarksUI();HeavenlyLayout.refresh();window.__qaFirst=document.querySelector('[data-category-id="qa_left_a"]');
   });await settle();
   const card=id=>page.locator('.section-card[data-category-id="'+id+'"]'),collapse=id=>card(id).locator('.category-collapse-toggle');
   assert.equal(await card('qa_left_a').locator('.bookmark-card:visible').count(),5);
   const more=card('qa_left_a').locator('.show-more-btn');await more.focus();await page.keyboard.press('Enter');await page.waitForTimeout(35);await page.keyboard.press('Enter');await settle();assert.equal(await card('qa_left_a').locator('.bookmark-card:visible').count(),5);assert(await more.evaluate(n=>n===document.activeElement));
   await collapse('qa_left_a').click();await page.waitForTimeout(45);await collapse('qa_left_a').click();await settle();assert.equal(await collapse('qa_left_a').getAttribute('aria-expanded'),'true');assert(await card('qa_left_a').locator('.category-content').isVisible());
   await collapse('qa_left_a').click();await settle();
   assert.equal(await collapse('qa_left_a').getAttribute('aria-expanded'),'false');assert.equal(await collapse('qa_left_b').getAttribute('aria-expanded'),'true');assert(await card('qa_left_a').locator('.category-content').isHidden());assert((await card('qa_left_a').boundingBox()).height<110);assert(await card('qa_left_a').locator('.drag-dots-handle').first().isVisible());assert(await card('qa_left_a').locator('.category-title').first().isVisible());assert.equal((await state()).actual.left.open,true);
   const before=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));await page.locator('#bm-universal-search').fill('Research qa_left_a 8');assert.equal(await page.locator('.bookmark-search-result').count(),1);await page.locator('#bm-search-clear-btn').click();assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),before);assert(await page.evaluate(()=>window.__qaFirst===document.querySelector('[data-category-id="qa_left_a"]')));
   await collapse('qa_left_b').click();await settle();
   const source=await card('qa_left_a').locator('.section-header .drag-dots-handle').boundingBox(),target=await card('qa_left_b').boundingBox();assert(target.y>source.y,'compact category rail keeps separate stacked headers');
   await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height*.9,{steps:16});await page.mouse.up();await settle();
   const order=await page.evaluate(()=>loadBookmarkData().categories.filter(c=>!c.hidden&&c.side==='left').sort((a,b)=>a.order-b.order).map(c=>c.id));assert.deepEqual(order,['qa_left_b','qa_left_a'],'vertical rail drag must reorder collapsed category headers');await collapse('qa_left_b').click();await settle();
   await page.reload({waitUntil:'domcontentloaded'});await settle();assert.equal(await collapse('qa_left_a').getAttribute('aria-expanded'),'false');
   await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='qa_left_a').side='right';saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});await settle();assert.equal(await page.locator('#right-column [data-category-id="qa_left_a"] .category-collapse-toggle').getAttribute('aria-expanded'),'false');assert.equal((await state()).actual.left.empty,false);
   await page.evaluate(()=>{const d=loadBookmarkData();d.categories.find(c=>c.id==='qa_left_b').side='right';saveBookmarkData(d);renderBookmarksUI();HeavenlyLayout.refresh()});await settle();
   assert.equal((await state()).actual.left.empty,true);assert.equal((await state()).actual.left.open,false);assert.equal(await page.locator('.app-layout').evaluate(n=>n.style.getPropertyValue('--left-track')),'0px');assert.equal(await page.locator('[data-sidebar-toggle="left"]:visible').count(),0);assert(await page.locator('#left-resize').isHidden());assert.equal(await page.locator('#left-sidebar').getAttribute('data-collapse'),'empty');
   pass('rapid Show More/category reversal preserve focus/final state; independent collapsed rail headers support real vertical mouse reorder; stable IDs survive move/reload; empty side has no track/control');
   const preserved=await page.evaluate(()=>{localStorage.setItem('heavenly_settings',JSON.stringify({bookmarkInitialLimit:7,bookmarkSectionLimits:{'["qa_right","saved"]':3},customKeep:'unchanged'}));return{bookmarks:localStorage.getItem('heavenly_bookmarks'),settings:localStorage.getItem('heavenly_settings'),subsections:localStorage.getItem('heavenly_collapsed_subsections')}});
   await reset();assert.deepEqual((await state()).preferences.categoryCollapsed,{});assert.equal((await state()).preferences.right.width,256);assert.equal((await state()).actual.left.empty,true);
   assert.deepEqual(await page.evaluate(()=>({bookmarks:localStorage.getItem('heavenly_bookmarks'),settings:localStorage.getItem('heavenly_settings'),subsections:localStorage.getItem('heavenly_collapsed_subsections')})),preserved);
   pass('Reset layout only restores widths and panel/category collapse; bookmark placement, notes, Show More and Settings data remain intact');
   await page.reload({waitUntil:'domcontentloaded'});await settle();assert.equal(await card('qa_bottom').locator('.bookmark-card:visible').count(),7);assert.equal(await card('qa_right').locator('.bookmark-card:visible').count(),3);
   await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});assert.equal(await page.locator('#set-bookmark-count-mode').inputValue(),'custom');assert.equal(await page.locator('#set-bookmark-initial-limit').inputValue(),'7');await page.locator('#set-bookmark-count-mode').selectOption('auto');await page.locator('#set-bookmark-limit-section').selectOption(JSON.stringify(['qa_bottom','saved']));await page.locator('#set-bookmark-section-mode').selectOption('custom');await page.locator('#set-bookmark-section-limit').fill('4');await page.locator('#set-bookmark-section-limit').press('Tab');
   await page.goto(origin,{waitUntil:'domcontentloaded'});await settle();assert.equal(await card('qa_bottom').locator('.bookmark-card:visible').count(),4);
   await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});await page.locator('#set-bookmark-limit-section').selectOption(JSON.stringify(['qa_bottom','saved']));await page.locator('#set-bookmark-section-mode').selectOption('auto');await page.goto(origin,{waitUntil:'domcontentloaded'});await settle();
   for(const [width,height]of[[1920,1080],[820,1180],[390,844],[320,740],[1440,1000]]){
    await page.setViewportSize({width,height});await settle();const row=card('qa_bottom').locator('.subsection-content');const detail=await row.evaluate(n=>({width:n.clientWidth,limit:Number(n.dataset.initialLimit)}));const expected=Math.max(1,Math.min(30,Math.floor((detail.width+10)/210)));assert.equal(detail.limit,expected,'Auto must match actual row width at '+width);assert.equal(await row.locator('.bookmark-card:visible').count(),expected);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   const bottomMore=card('qa_bottom').locator('.show-more-btn');await bottomMore.click();await settle();assert.equal(await card('qa_bottom').locator('.bookmark-card:visible').count(),14);await page.setViewportSize({width:390,height:844});await settle();assert.equal(await card('qa_bottom').locator('.bookmark-card:visible').count(),14);await bottomMore.click();await settle();assert.equal(await card('qa_bottom').locator('.bookmark-card:visible').count(),Number(await card('qa_bottom').locator('.subsection-content').getAttribute('data-initial-limit')));
   await page.setViewportSize({width:1440,height:1000});await settle();assert.equal(await page.evaluate(()=>HeavenlyNavigation.readSettings(localStorage).bookmarkInitialLimit),7);assert.equal(await card('qa_right').locator('.bookmark-card:visible').count(),3);
   pass('legacy fixed counts remain Custom; Settings Auto/Custom/section overrides work; Auto bottom counts follow actual measured rows across five widths');
   assert.deepEqual(result.errors,[]);assert.equal(context.pages().length,1);result.status='passed';
  }catch(e){result.status='failed';result.failure=e.stack;process.exitCode=1;console.error('FAIL '+engine+' '+e.stack)}finally{await context?.close();await browser?.close()}
 }
})().catch(e=>{summary.failure=e.stack;process.exitCode=1;console.error(e)}).finally(async()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(summary,null,2));if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
