// Owned UI and proxy fixtures. No live Coolmath game downloads.
const assert = require('node:assert/strict');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let server, browser, checks = 0;
const pass = message => { checks++; console.log('PASS ' + message); };
(async () => {
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.on('listening', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, hasTouch: true });
  await context.addInitScript(() => { try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); } catch {} });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/proxy/https://www.coolmathgames.com')) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><head><title>Coolmath fixture</title><script src="/proxy/client/unblocker-client.js"></script><script>unblockerInit({prefix:"/proxy/",url:"' + url.slice((origin + '/proxy/').length) + '"},window)</script></head><body><h1>Coolmath fixture</h1><a id="next-game" href="/0-next-game?q=1#play">Next game</a><button id="spa" onclick="history.pushState({},\'\',\'/0-spa-game?level=2#play\')">SPA game</button></body>' });
    return url.startsWith(origin) && (!url.includes('/proxy/') || url.endsWith('/proxy/client/unblocker-client.js')) ? route.continue() : route.abort();
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(650);
  const openCoolmath = () => page.evaluate(() => openBuiltinTestModal('Coolmath Games','https://www.coolmathgames.com/',location.origin+'/proxy/https://www.coolmathgames.com/',null,false,'bm_coolmath'));
  const data = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_bookmarks')));
  await openCoolmath();
  assert.equal(await page.locator('#coolmath-compatibility strong').innerText(), 'Not all Coolmath Games work through Heavenly.');
  assert.equal(await page.locator('#coolmath-save-btn').count(), 0); assert.equal(await page.locator('#coolmath-launch-modal .bookmark-personal-note').count(), 0);
  const before = (await data()).bookmarks.length;
  await page.locator('label[for="coolmath-quick-save-toggle"]').click();
  assert.equal((await data()).bookmarks.find(b=>b.id==='bm_coolmath').disableQuickSaveWidget,true);
  await page.keyboard.press('Escape'); await openCoolmath(); assert.equal(await page.locator('#coolmath-quick-save-toggle').isChecked(), false);
  await page.locator('label[for="coolmath-quick-save-toggle"]').click(); assert.equal((await data()).bookmarks.length, before);
  assert.equal(await page.locator('#coolmath-launch-modal .bookmark-personal-note').count(),0);
  pass('Coolmath replaces Save with the real persisted Quick Save preference and excludes notes');
  const popupPromise = context.waitForEvent('page'); await page.locator('#coolmath-proxy-btn').click(); const blank = await popupPromise; blank.setDefaultTimeout(10000);
  const frame = blank.frameLocator('#heavenly-wrapper-frame'); await frame.locator('#heavenly-folder-save-root').waitFor();
  assert.equal(blank.url(), 'about:blank'); assert.equal(await frame.locator('#heavenly-folder-save-root').count(),1);
  await openCoolmath(); await page.locator('label[for="coolmath-quick-save-toggle"]').click(); await frame.locator('#heavenly-folder-save-root').waitFor({state:'detached'});
  await page.locator('label[for="coolmath-quick-save-toggle"]').click(); await frame.locator('#heavenly-folder-save-root').waitFor();
  for(const flag of ['disableAllWidgets','disableAllFeatures']) {
    await page.evaluate(flag=>{const s=loadSettings();s[flag]=true;localStorage.setItem('heavenly_settings',JSON.stringify(s))},flag);
    await frame.locator('#heavenly-folder-save-root').waitFor({state:'detached'});
    await page.evaluate(flag=>{const s=loadSettings();s[flag]=false;localStorage.setItem('heavenly_settings',JSON.stringify(s))},flag);
    await frame.locator('#heavenly-folder-save-root').waitFor();
    assert.equal(await frame.locator('#heavenly-folder-save-root').count(),1);
  }
  await page.keyboard.press('Escape');
  pass('existing Quick Save widget responds to bookmark/global settings without duplicate widgets or wrappers');
  const count = context.pages().length; await frame.locator('#next-game').click(); await frame.locator('#heavenly-folder-save-root').waitFor();
  await frame.locator('#spa').click();
  const child = blank.frames().find(f=>f.url().includes('/0-spa-game?level=2#play')); assert(child);
  assert.equal(context.pages().length,count); assert.equal(await frame.locator('#coolmath-launch-modal').count(),0);
  blank.on('dialog',d=>d.accept('Saved game'));
  await frame.locator('#heavenly-folder-save-root .save-btn').click(); await blank.waitForURL(origin+'/');
  const saved = (await data()).bookmarks.find(b=>b.id==='bm_coolmath');
  assert.equal(saved.type,'bookmark'); assert.equal(saved.subBookmarks.length,1); assert.equal(saved.subBookmarks[0].url,'https://www.coolmathgames.com/0-spa-game?level=2#play');
  await blank.close();
  pass('about:blank and internal navigation remain single-launch; the existing widget saves the current SPA game URL');
  await page.reload({waitUntil:'domcontentloaded'}); await page.evaluate(()=>{expandedSubSections.cat_games_builtin=true;expandedFolders.bm_coolmath=true;renderBookmarksUI()});
  assert.equal(await page.locator('[data-bm-id="bm_coolmath"] .folder-expand-btn').count(),1);
  assert.equal(await page.locator('a[href$="/0-spa-game?level=2#play"]').count(),1);
  pass('Coolmath quick-saved children remain accessible and survive reconciliation');
  await openCoolmath(); await context.route('https://www.coolmathgames.com/**',r=>r.fulfill({body:'<h1>Original site fixture</h1>',contentType:'text/html'}));
  const directPromise=context.waitForEvent('page');await page.locator('#coolmath-direct-btn').click();const direct=await directPromise;await direct.waitForURL('https://www.coolmathgames.com/');assert.equal(await direct.locator('#heavenly-wrapper-frame').count(),0);await direct.close();
  pass('Open Directly bypasses the proxy');
  assert.equal(await page.locator('[data-bm-id="bm_fmhy_movies"], [data-bm-id="bm_fmhy_anime"], [data-bm-id="bm_everythingmoe"]').count(),0);
  for(const category of ['cat_movies','cat_anime']) {
    await page.locator('[data-category-id="'+category+'"] .special-links-btn').click();
    const expected=category==='cat_movies'?['FMHY: Movies']:['EverythingMoe','FMHY: Anime'];
    assert.deepEqual(await page.locator('#special-links-list strong').allTextContents(),expected);
    for(const row of await page.locator('.special-link-row').all()) {
      const icon=await row.locator('.bookmark-icon,.bookmark-icon-svg').boundingBox(),label=await row.locator('strong').boundingBox();assert(label.x-icon.x-icon.width<18);
    }
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-category-id="cat_anime"] .special-links-btn').click(); await page.locator('.special-link-row').nth(1).click();
  assert.equal(await page.locator('.modal-backdrop.active').count(),1);assert(await page.locator('#everythingmoe-modal').evaluate(e=>e.classList.contains('active')));await page.keyboard.press('Escape');
  await page.locator('#bm-universal-search').fill('FMHY');await page.locator('#bm-universal-search').dispatchEvent('input');assert.equal(await page.locator('[data-bm-id="bm_fmhy_anime"]').count(),1);await page.locator('#bm-universal-search').fill('');await page.locator('#bm-universal-search').dispatchEvent('input');
  pass('Special Links aligns icons/names/domains for one or two entries and retains launch notices/search');
  for(const [width,height] of [[320,740],[390,844],[820,1180],[1180,820],[1366,1000]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(350);
    const row = page.locator('[data-category-id="cat_anime"] .section-header');
    const title=await row.locator('.category-title').boundingBox(),actions=await row.locator('.category-actions').boundingBox();assert(Math.abs(title.y+title.height/2-actions.y-actions.height/2)<2,JSON.stringify({width,title,actions}));
    assert.equal(await row.locator('.category-actions button').count(),3);
    assert(await row.locator('.category-title').evaluate(e=>e.scrollWidth<=e.clientWidth),'Full category title fits at '+width);
    const names=await row.locator('.category-actions button').evaluateAll(es=>es.map(e=>e.className));assert(names[0].includes('syshi-notes'));assert(names[1].includes('special-links'));
    await openCoolmath();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert(await page.locator('#coolmath-launch-modal .modal-card').evaluate(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight}));
    for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('#coolmath-launch-modal')))}
    await page.keyboard.press('Escape');
  }
  pass('coordinated Notes/Special Links/Add headers and accessible dialogs fit phone, iPad and desktop viewports');
  assert.deepEqual(errors,[]); console.log(checks+' bookmark experience checks passed in '+engine);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
