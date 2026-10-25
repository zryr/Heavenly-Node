'use strict';
// Genuine browser captures plus independent integration checks. No external requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const pw = require('playwright');
const express = require('express');
const app = require('../../app');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'docs/phase3/evidence');
const baselineRoot = process.env.HEAVENLY_PHASE3_BASELINE || '/workspace/Heavenly-Node';
const baselineRef = process.env.HEAVENLY_PHASE3_BASELINE_REF;
const result = { captured:new Date().toISOString(), physicalDevices:[], network:'Only local application requests; external and proxy requests blocked.', captures:[], browsers:[] };
const servers = [];
const read = name => JSON.parse(fs.readFileSync(path.join(output, name), 'utf8'));
async function serve(application) { const server=application.listen(0,'127.0.0.1'); servers.push(server); await new Promise(r=>server.on('listening',r)); return 'http://127.0.0.1:'+server.address().port; }
async function launch(engine) { return pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{}); }
async function context(browser, origin, options={}) {
  const ctx=await browser.newContext({ viewport:{width:1440,height:1000}, acceptDownloads:true, ...options });
  await ctx.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
  await ctx.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
  return ctx;
}
async function ready(page, origin) { await page.goto(origin,{waitUntil:'domcontentloaded'}); await page.locator('[data-bm-id="bm_ng"]').waitFor({state:'attached'}); await page.waitForTimeout(350); }
async function shot(page,id,title,note,target) {
  await page.waitForTimeout(220);
  const file='phase3-'+id+'.png'; await (target||page).screenshot({path:path.join(output,file)});
  result.captures.push({id,title,note,file,width:page.viewportSize().width,height:page.viewportSize().height});
  console.log('CAPTURE '+id);
}
async function openNewgrounds(page) { await page.evaluate(()=>{const b=loadBookmarkData().bookmarks.find(x=>x.id==='bm_ng');openBuiltinTestModal(b.title,b.url,location.origin+'/proxy/'+b.url,null,false,b.id);}); await page.locator('#builtin-test-modal.active').waitFor(); }
async function openHQ(page) { await page.locator('#url').fill('codex');await page.locator('#url').press('Enter');await page.locator('#codex-dev-modal.active').waitFor(); }
async function capture(origin) {
  // Snapshot the real pre-Phase3 public files so concurrent Phase1+2 work cannot change captures.
  const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'heavenly-pre-phase3-'));
  if(baselineRef){const archive=cp.execFileSync('git',['-C',baselineRoot,'archive',baselineRef,'public'],{maxBuffer:64*1024*1024});cp.execFileSync('tar',['-x','--strip-components=1','-C',snapshot],{input:archive});}
  else fs.cpSync(path.join(baselineRoot,'public'),snapshot,{recursive:true});
  const hash=crypto.createHash('sha256');for(const f of ['index.html','assets/heavenly-catalog.js','assets/heavenly-bookmarks.js'])hash.update(fs.readFileSync(path.join(snapshot,f)));
  result.baseline={source:baselineRoot,head:cp.execFileSync('git',['-C',baselineRoot,'rev-parse',baselineRef||'HEAD'],{encoding:'utf8'}).trim(),publicSHA256:hash.digest('hex'),description:baselineRef?'Immutable archive of the final Phase1+2 commit public application before Phase3. No mock UI or reconstructed screenshots.':'Snapshot of the existing Phase1+2 worktree public application before Phase3. No mock UI or reconstructed screenshots.'};
  const oldApp=express();oldApp.use(express.static(snapshot));const beforeOrigin=await serve(oldApp);
  const browser=await launch('chromium');result.captureBrowser='Chromium '+browser.version();let ctx;
  try {
    ctx=await context(browser,beforeOrigin);let page=await ctx.newPage();await ready(page,beforeOrigin);
    const oldData=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
    result.baseline.catalogVersion=await page.evaluate(()=>HeavenlyCatalog.release.version);
    assert.equal(await page.locator('[data-bm-id="bm_user_ng"]').count(),1);
    const oldGames=page.locator('[data-category-id="cat_games"]');await oldGames.locator('.show-more-btn').first().click();await shot(page,'games-before','Games before the additions','Actual expanded pre-Phase3 Games with the two original Newgrounds records.',oldGames);
    await page.locator('#bm-universal-search').fill('Newgrounds');await shot(page,'newgrounds-before','Newgrounds before consolidation','Actual pre-Phase3 unified search shows the two original official/default identities.');await page.locator('#bm-universal-search').fill('');
    await openNewgrounds(page);await shot(page,'newgrounds-popup-before','Newgrounds popup before consolidation','Actual pre-Phase3 Syshi popup, including the generic mirror controls.',page.locator('#builtin-test-modal'));
    await ctx.close();

    ctx=await context(browser,origin);page=await ctx.newPage();await ready(page,origin);
    result.catalogVersion=await page.evaluate(()=>HeavenlyCatalog.release.version);
    const games=page.locator('[data-category-id="cat_games"]');
    await games.locator('.show-more-btn').first().click();
    await shot(page,'games-after','Games after the additions','Fresh expanded collection: History Minds and Dancing Bunny are installed; Newgrounds has one official identity.',games);
    const order=await games.locator('[data-subsection-id="builtin"] > div > [data-bm-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.bmId));
    assert.equal(order.indexOf('bm_gamebois'),order.indexOf('bm_dancing_bunny')+1);
    await page.setViewportSize({width:390,height:844});
    const pair=games.locator('[data-bm-id="bm_dancing_bunny"]');await pair.scrollIntoViewIfNeeded();
    const pairBox=await pair.boundingBox();await page.evaluate(y=>window.scrollBy(0,y-250),pairBox.y);
    await shot(page,'bunny-before-gamebois','Dancing Bunny directly above Gamebois','Fresh default order in a 390-pixel single-column layout, asserted from adjacent real bookmark rows. The exact SVG destination remains intact.');
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('#bm-universal-search').fill('Newgrounds');await shot(page,'newgrounds-after','One official Newgrounds result','Fresh collection search returns one official Newgrounds bookmark.');
    assert.equal(await page.locator('#bookmark-search-results [data-bookmark-id="bm_ng"]').count(),1);
    assert.equal(await page.locator('[data-bm-id="bm_user_ng"]').count(),0);
    await page.locator('#bm-universal-search').fill('');
    await openNewgrounds(page);assert.equal(await page.locator('#builtin-test-modal').getByText('Your Mirrors',{exact:true}).count(),0);
    await shot(page,'newgrounds-popup-after','Newgrounds without unnecessary mirror controls','The normal popup contains Heavenly Picks and the existing launch options.',page.locator('#builtin-test-modal'));
    await page.locator('#builtin-test-modal .heavenly-picks-entry').click();await page.locator('#heavenly-picks-modal.active').waitFor();
    assert.equal(await page.locator('#heavenly-picks-modal .heavenly-pick').count(),0);
    await shot(page,'picks-coming-soon','Heavenly Picks · Coming Soon','The published collection is empty. No recommendation fixtures are shown as published content.',page.locator('#heavenly-picks-modal'));
    await page.keyboard.press('Escape');await page.locator('#heavenly-picks-modal').waitFor({state:'detached'});await page.evaluate(()=>closeBuiltinTestModal());
    const op=page.locator('[data-category-id="cat_op_websites"]');await shot(page,'subsection-icons','Browser/Games and Docs/Games icons','Real globe and document SVGs in the built-in OP Websites subsection headers.',op);
    await openHQ(page);await shot(page,'hq-overview','Codex Developer HQ','The codex command opens a local draft and QA workspace; publishing stays in GitHub.');
    await page.locator('#hq-tab-rankings').click();await page.locator('#hq-rank-category').selectOption('cat_games');await page.locator('#hq-rank-section').selectOption('builtin');
    await page.locator('[data-hq-select="bookmark:bm_gamebois"]').click();await page.locator('#hq-rank-top').click();
    await shot(page,'ranking-editor','Official ranking editor','Actual local draft: Gamebois moved to the top. Personal bookmark storage remains unchanged.');
    await page.locator('#hq-rank-preview-btn').click();await shot(page,'ranking-preview','Official layout preview','Exact draft preview highlights changed default positions. This is a local draft, not a published ranking.');
    await page.locator('#hq-tab-picks').click();await page.locator('#hq-pick-new').click();await page.locator('#hq-pick-title').fill('Evidence-only local draft');await page.locator('#hq-pick-url').fill('https://www.newgrounds.com/portal/view/1');await page.locator('#hq-pick-description').fill('Browser evidence fixture. Not an official recommendation.');await page.locator('#hq-pick-tags').fill('Local draft');await page.locator('#hq-pick-save').click();
    await shot(page,'picks-editor','Heavenly Picks developer editor','An explicitly labeled, disabled local fixture demonstrates the real editor. Public recommendations remain empty.');
    assert.equal(await page.evaluate(()=>HeavenlyPicks.items.length),0);
    await page.locator('#hq-tab-changes').click();await shot(page,'review-export','Reviewed source exports','The local workshop exports repository-compatible sources after validation and review.');
    await page.locator('#codex-close').click();await page.evaluate(()=>openCategoryEditModal('cat_games'));
    await page.getByRole('button',{name:'Restore official order in Built-In',exact:true}).click();await page.locator('#heavenly-restore-modal.active').waitFor();
    await shot(page,'restore-section','Restore this section’s official order','Confirmation is scoped to Games / Built-In. Cancel is initially focused.',page.locator('#heavenly-restore-modal'));
    await page.locator('#heavenly-restore-modal').getByRole('button',{name:'Cancel',exact:true}).click();await page.locator('#heavenly-restore-modal').waitFor({state:'detached'});await page.locator('#close-modal-btn').click();
    await page.evaluate(()=>openAddModal('bookmark'));await page.locator('#add-modal > .modal-card > .heavenly-saved-links > summary').click();await page.locator('#restore-all-official-order').click();await page.locator('#heavenly-restore-modal.active').waitFor();
    await shot(page,'restore-all','Restore all official ordering','Global ordering confirmation explicitly preserves personal content and preferences.',page.locator('#heavenly-restore-modal'));
    await page.locator('#heavenly-restore-modal').getByRole('button',{name:'Cancel',exact:true}).click();await page.locator('#heavenly-restore-modal').waitFor({state:'detached'});await page.locator('#close-modal-btn').click();
    await ctx.close();

    // An actual saved pre-Phase3 collection, rather than a hand-authored pending update.
    ctx=await context(browser,origin);await ctx.addInitScript(value=>localStorage.setItem('heavenly_bookmarks',value),oldData);page=await ctx.newPage();await ready(page,origin);await page.evaluate(()=>HeavenlyCatalogUI.show());await page.locator('#catalog-update-modal.active').waitFor();
    await shot(page,'bookmark-update','Existing collection · official update review','Real pre-Phase3 saved collection offers the optional additions through Apply Update, Maybe Later and Skip This Version.',page.locator('#catalog-update-modal'));
    assert.match(await page.locator('#catalog-update-modal').innerText(),/History Minds/);await ctx.close();

    ctx=await context(browser,origin,{viewport:{width:820,height:1180},hasTouch:true,isMobile:true});page=await ctx.newPage();await ready(page,origin);await openHQ(page);await page.locator('#hq-tab-rankings').click();await shot(page,'tablet-hq','Tablet · official rankings','820 × 1180 Chromium viewport with emulated touch/mobile flags. No physical iPad was tested.');
    await page.locator('#codex-close').click();await openNewgrounds(page);await page.locator('#builtin-test-modal .heavenly-picks-entry').click();await shot(page,'tablet-picks','Tablet · Heavenly Picks','Actual Coming Soon panel in an emulated tablet viewport.');await ctx.close();
    ctx=await context(browser,origin,{viewport:{width:390,height:844},hasTouch:true,isMobile:true});page=await ctx.newPage();await ready(page,origin);await openHQ(page);await page.locator('#hq-tab-picks').click();await shot(page,'phone-hq','Phone · recommendation drafts','390 × 844 Chromium viewport with touch emulation. Draft forms remain scrollable.');await page.locator('#codex-close').click();await openNewgrounds(page);await page.locator('#builtin-test-modal .heavenly-picks-entry').click();await shot(page,'phone-picks','Phone · Heavenly Picks','Narrow Coming Soon panel with a visible return action.');await ctx.close();

    // Short actual rendered interaction recording; source video is renamed after context flush.
    const videoDir=fs.mkdtempSync(path.join(os.tmpdir(),'heavenly-phase3-video-'));
    ctx=await context(browser,origin,{viewport:{width:1280,height:900},recordVideo:{dir:videoDir,size:{width:1280,height:900}}});page=await ctx.newPage();await ready(page,origin);const video=page.video();
    await openHQ(page);await page.waitForTimeout(400);await page.locator('#hq-tab-rankings').click();await page.locator('#hq-rank-category').selectOption('cat_games');await page.locator('[data-hq-select="bookmark:bm_gamebois"]').click();await page.locator('#hq-rank-up').click();await page.locator('#hq-rank-preview-btn').click();await page.waitForTimeout(500);await page.locator('#codex-close').click();await openNewgrounds(page);await page.locator('#builtin-test-modal .heavenly-picks-entry').click();await page.waitForTimeout(500);await page.keyboard.press('Escape');await ctx.close();
    result.recording='phase3-workshop-and-picks.webm';await video.saveAs(path.join(output,result.recording));
  } finally { await ctx?.close().catch(()=>{});await browser.close();fs.rmSync(snapshot,{recursive:true,force:true}); }
}
async function smoke(origin,engine) {
  const row={engine,checks:[],errors:[],viewports:[]};result.browsers.push(row);let browser,ctx;
  const pass=s=>{row.checks.push(s);console.log('PASS '+engine+' '+s);};
  try {
    browser=await launch(engine);row.version=browser.version();ctx=await context(browser,origin,{reducedMotion:'reduce'});const page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>row.errors.push(e.message));await ready(page,origin);
    const personal=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));await openHQ(page);assert.equal(await page.locator('#codex-close').evaluate(n=>n===document.activeElement),true);
    await page.locator('#codex-close').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#codex-dev-modal').evaluate(n=>n.contains(document.activeElement)),true);await page.keyboard.press('Tab');assert.equal(await page.locator('#codex-close').evaluate(n=>n===document.activeElement),true);pass('codex command and keyboard focus trap');
    await page.locator('#hq-tab-overview').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#hq-tab-qa').getAttribute('aria-selected'),'true');await page.locator('[data-hq-action="reset-bookmarks"]').click();await page.locator('#hq-confirm-cancel').click();assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),personal);pass('arrow-key tab navigation and safe QA cancellation');
    await page.locator('#hq-tab-rankings').click();await page.locator('#hq-rank-category').selectOption('cat_games');await page.locator('[data-hq-select="bookmark:bm_gamebois"]').click();await page.locator('[data-hq-select="bookmark:bm_gamebois"]').focus();await page.keyboard.press('Alt+ArrowUp');await page.locator('#hq-rank-preview-btn').click();assert(await page.locator('#hq-rank-preview .hq-changed').count()>0);assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),personal);pass('keyboard ranking move and real preview keep personal storage unchanged');
    await page.locator('#hq-tab-changes').click();await page.locator('#hq-reviewed').check();const downloading=page.waitForEvent('download');await page.locator('#hq-export-order').click();const download=await downloading;const source=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(source.schema,1);assert(source.bookmarks.find(x=>x.id==='bm_gamebois'));pass('reviewed repository source download decodes');
    for(const viewport of [{width:1366,height:768},{width:820,height:1180},{width:390,height:844}]) {
      await page.setViewportSize(viewport);await page.locator('#hq-tab-rankings').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('#codex-dev-modal .modal-card').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);assert(await page.locator('#codex-close').isVisible());row.viewports.push(viewport);
    }pass('Chromebook, tablet and narrow phone widths avoid horizontal overflow');
    await page.locator('#codex-close').click();assert.equal(await page.locator('#url').evaluate(n=>n===document.activeElement),true);await openNewgrounds(page);await page.locator('#builtin-test-modal .heavenly-picks-entry').click();const picks=page.locator('#heavenly-picks-modal.active');await picks.waitFor();assert.match(await picks.innerText(),/Coming Soon/);assert.equal(await picks.locator('.heavenly-pick').count(),0);assert.equal(await picks.locator('.modal-card').evaluate(n=>n.scrollWidth<=n.clientWidth),true);await page.keyboard.press('Escape');await picks.waitFor({state:'detached'});assert.equal(await page.locator('#builtin-test-modal .heavenly-picks-entry').evaluate(n=>n===document.activeElement),true);pass('empty Picks, nested modal return and focus restoration at narrow width');
    assert.deepEqual(row.errors,[]);row.status='passed';
  }catch(e){row.status='failed';row.failure=e.stack;process.exitCode=1;console.error(engine+' '+e.stack);}finally{await ctx?.close();await browser?.close();}
}
async function verifyReport() {
  const report=path.join(root,'docs/phase3/comparison.html'),browser=await launch('chromium');
  try {
    const reportApp=express();reportApp.use(express.static(path.dirname(report)));const reportOrigin=await serve(reportApp);
    const page=await browser.newPage({acceptDownloads:true});await page.goto(reportOrigin+'/comparison.html');await page.locator('img[data-capture]').first().waitFor();
    const images=await page.locator('img[data-capture]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.capture,loaded:n.complete&&n.naturalWidth>0,width:n.naturalWidth,height:n.naturalHeight})));
    assert(images.every(x=>x.loaded));assert(images.length>=16);
    const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).filter(h=>h&&!h.startsWith('data:')));
    for(const href of links){if(href.startsWith('#'))assert(await page.locator(href).count());else assert(fs.existsSync(path.resolve(path.dirname(report),href)),'Missing report link: '+href);}
    const captures=read('phase3-visual-results.json').captures,downloads=[];
    for(const capture of captures){
      const trigger=page.locator('.capture-open[data-capture="'+capture.id+'"]');await trigger.click();await page.locator('#image-viewer[open]').waitFor();
      await page.waitForFunction(()=>{const n=document.getElementById('viewer-image');return n.complete&&n.naturalWidth>0;});
      assert.equal(await page.locator('#viewer-image').evaluate(n=>n.getBoundingClientRect().width===n.naturalWidth),true,'Viewer must show original pixels: '+capture.id);
      const downloading=page.waitForEvent('download');await page.locator('#viewer-download').click();const download=await downloading;
      assert(fs.readFileSync(await download.path()).equals(fs.readFileSync(path.join(output,capture.file))),'Downloaded PNG differs: '+capture.id);downloads.push({id:capture.id,filename:download.suggestedFilename(),identical:true});
      await page.keyboard.press('Escape');assert.equal(await page.locator('#image-viewer').evaluate(n=>n.open),false);assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);
    }
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const first=page.locator('.capture-open').first();await first.click();await page.locator('#image-viewer[open]').waitFor();await page.keyboard.press('Escape');assert.equal(await first.evaluate(n=>n===document.activeElement),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const video=page.locator('video');await video.scrollIntoViewIfNeeded();await video.evaluate(async n=>{n.muted=true;n.currentTime=0;await n.play();});await page.waitForFunction(()=>{const n=document.querySelector('video');return !n.paused&&n.currentTime>.3;});assert(await video.evaluate(n=>Number.isFinite(n.duration)&&n.duration>0));
    const verification={verified:new Date().toISOString(),report:'comparison.html',openedVia:'local HTTP because this executor Chromium policy blocks file URLs',images,localLinks:links,downloads,phone:{width:390,height:844,horizontalOverflow:false,keyboardDismissal:'Escape restores trigger focus'},video:{readyState:await video.evaluate(n=>n.readyState),duration:await video.evaluate(n=>n.duration),playedTo:await video.evaluate(n=>n.currentTime)},viewer:'All screenshots open at original pixel width, download byte-identical PNGs, and close with Escape',externalResources:await page.locator('[src^="http"]').count()};
    assert.equal(verification.externalResources,0);fs.writeFileSync(path.join(output,'phase3-report-verification.json'),JSON.stringify(verification,null,2));
    console.log('Report verified: '+images.length+' images decode, open at original width and download unchanged; links exist; video plays; phone layout and keyboard dismissal work.');
  } finally { await browser.close(); }
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});if(process.argv.includes('--verify-report'))return verifyReport();
  const origin=await serve(app);if(!process.argv.includes('--smoke-only'))await capture(origin);
  for(const engine of (process.env.HEAVENLY_ENGINES||'chromium,firefox,webkit').split(','))await smoke(origin,engine);
  if(process.argv.includes('--smoke-only')){const old=read('phase3-visual-results.json');old.browsers=old.browsers.filter(b=>!result.browsers.some(r=>r.engine===b.engine)).concat(result.browsers);old.smokeCaptured=result.captured;fs.writeFileSync(path.join(output,'phase3-visual-results.json'),JSON.stringify(old,null,2));}
  else fs.writeFileSync(path.join(output,'phase3-visual-results.json'),JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{for(const server of servers){server.closeAllConnections?.();await new Promise(r=>server.close(r));}});
