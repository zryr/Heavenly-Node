'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let browser, server, checks = 0;
const passedChecks = [];
const pass = message => { checks++; passedChecks.push(message); console.log('PASS ' + message); };
const evidence = process.env.HEAVENLY_PHASE3_EVIDENCE || '/tmp/heavenly-phase3-public-' + engine;
const withoutLayout = input => {
  const data = JSON.parse(JSON.stringify(input));
  function entry(value) { delete value.order; (value.subBookmarks || []).forEach(entry); }
  data.bookmarks.forEach(entry); data.bookmarks.sort((a,b) => a.id.localeCompare(b.id));
  data.categories.forEach(category => { delete category.order; delete category.side; category.subSections.sort((a,b) => a.id.localeCompare(b.id)); });
  data.categories.sort((a,b) => a.id.localeCompare(b.id)); return data;
};
(async () => {
  fs.mkdirSync(evidence, { recursive:true });
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const launch = engine === 'chromium' ? { executablePath:'/usr/bin/chromium', args:['--no-sandbox'] } : process.env.HEAVENLY_BROWSER_EXECUTABLE ? { executablePath:process.env.HEAVENLY_BROWSER_EXECUTABLE } : {};
  browser = await playwright[engine].launch(launch);
  const context = await browser.newContext({ viewport:{ width:1366, height:900 }, hasTouch:engine !== 'firefox' });
  await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked', 'true'));
  await context.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().includes('/proxy/') ? route.continue() : route.abort());
  const page = await context.newPage(), errors = []; page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(700);
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_bookmarks')));
  const popup = page.locator('#builtin-test-modal');
  const openNewgrounds = () => page.evaluate(() => { const bookmark = loadBookmarkData().bookmarks.find(entry => entry.id === 'bm_ng'); openBuiltinTestModal(bookmark.title, bookmark.url, location.origin + '/proxy/' + bookmark.url, null, false, bookmark.id); });
  const shot = async (name, node) => { await page.waitForTimeout(230); await (node || page).screenshot({ path:path.join(evidence, name + '.png') }); };

  for (const [id, exactUrl] of [
    ['bm_history_minds', 'https://historyminds.com/activities'],
    ['bm_dancing_bunny', 'https://cdn.jsdelivr.net/gh/ltorl/dancing-bunny/index.svg']
  ]) {
    await page.evaluate(id => { const bookmark = loadBookmarkData().bookmarks.find(entry => entry.id === id); openBuiltinTestModal(bookmark.title, bookmark.url, location.origin + '/proxy/' + bookmark.url, null, false, bookmark.id); }, id);
    const destination = await page.evaluate(() => ({ raw:pendingBuiltinUrls.rawUrl, proxy:pendingBuiltinUrls.proxiedUrl }));
    assert.deepEqual(destination, { raw:exactUrl, proxy:origin + '/proxy/' + exactUrl });
    assert.equal(await popup.locator('#builtin-test-modal-summary .bookmark-active-url').innerText(), exactUrl);
    assert.equal(await popup.getByRole('button', { name:'Open with Proxy', exact:true }).isVisible(), true);
    assert.equal(await popup.getByRole('button', { name:'Test Direct Site', exact:true }).isVisible(), true);
    const description = await popup.locator('#builtin-modal-desc').innerText();
    if (id === 'bm_dancing_bunny') { assert.match(description, /browser blocks its automatic window/); assert.match(description, /click here/); }
    else assert.doesNotMatch(description, /automatic window|click here/);
    await shot(id === 'bm_dancing_bunny' ? 'dancing-bunny-popup' : 'history-minds-popup', popup);
    await page.evaluate(() => closeBuiltinTestModal());
  }
  pass('new game popups preserve exact direct/proxy destinations including the SVG; only Dancing Bunny receives the verified launcher hint');

  await openNewgrounds();
  assert.equal(await popup.locator('.available-mirror-list,.mirror-add-form').count(), 0);
  assert.equal(await popup.getByText('Your Mirrors', { exact:true }).count(), 0);
  assert.equal(await popup.locator('.heavenly-picks-entry').count(), 1);
  await shot('newgrounds-streamlined', popup);
  await popup.locator('.heavenly-picks-entry').click();
  const picks = page.locator('#heavenly-picks-modal.active'); await picks.waitFor();
  assert.equal(await picks.locator('.heavenly-pick').count(), 0); assert.match(await picks.innerText(), /Coming Soon/);
  assert.equal(await popup.evaluate(node => node.inert), true);
  const closePicks = picks.getByRole('button', { name:'Close Heavenly Picks', exact:true }); await closePicks.focus();
  await page.keyboard.press('Shift+Tab'); assert.equal(await picks.getByRole('button', { name:'Back to Newgrounds', exact:true }).evaluate(node => document.activeElement === node), true);
  await page.keyboard.press('Tab'); assert.equal(await closePicks.evaluate(node => document.activeElement === node), true);
  await shot('picks-coming-soon', picks);
  await page.keyboard.press('Escape'); await picks.waitFor({ state:'detached' });
  assert.equal(await popup.evaluate(node => node.inert), false);
  assert.equal(await popup.locator('.heavenly-picks-entry').evaluate(node => document.activeElement === node), true);
  pass('Newgrounds has a targeted streamlined popup; empty Picks opens, traps focus, returns with Escape and contains no invented cards');

  await page.evaluate(() => {
    closeBuiltinTestModal(); const data = loadBookmarkData(), bookmark = data.bookmarks.find(entry => entry.id === 'bm_ng');
    bookmark.subBookmarks.push({ id:'phase3-saved-ng', title:'Saved Newgrounds destination', url:'https://www.newgrounds.com/portal/view/phase3-owned-fixture', personalNote:'Keep this note', isUser:true });
    data._catalog.migrations = data._catalog.migrations || {};
    data._catalog.migrations.newgrounds = { schema:1, originals:[{ fingerprint:'test', record:{ id:'bm_user_ng', personalNote:'Complete original note', subBookmarks:[{ id:'old-child', url:'https://example.test/old' }] } }] };
    saveBookmarkData(data);
  });
  await openNewgrounds(); const recovery = popup.locator('.heavenly-saved-links'); await recovery.locator(':scope > summary').click();
  assert.equal(await popup.locator('.mirror-add-form').count(), 0);
  const downloadPromise = page.waitForEvent('download'); await recovery.getByRole('button', { name:'Download pre-consolidation data' }).click();
  const download = await downloadPromise, recovered = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(recovered.migration.originals[0].record.personalNote, 'Complete original note');
  assert(recovered.currentBookmark.subBookmarks.some(entry => entry.id === 'phase3-saved-ng'));
  await shot('newgrounds-saved-links-recovery', popup);
  await recovery.getByRole('button', { name:'Manage saved links', exact:true }).click();
  await page.locator('#add-modal.active').waitFor(); assert.match(await page.locator('#sub-bookmarks-list').innerText(), /Saved Newgrounds destination/);
  await page.locator('#close-modal-btn').click();
  await page.evaluate(() => { const b = loadBookmarkData().bookmarks.find(entry => entry.id === 'bm_aether'); openBuiltinTestModal(b.title,b.url,'',null,false,b.id); });
  assert.equal(await popup.locator('.available-mirror-list,.mirror-add-form').count(), 2); await page.evaluate(() => closeBuiltinTestModal());
  await page.evaluate(() => {
    const data = loadBookmarkData(), bookmark = { id:'phase3-personal-newgrounds', title:'My Newgrounds bookmark', url:'https://newgrounds.com', type:'folder_bookmark', builtIn:false, categoryId:'cat_games', subSectionId:'user', order:1000, subBookmarks:[] };
    data.bookmarks.push(bookmark); saveBookmarkData(data);
    openBuiltinTestModal(bookmark.title, bookmark.url, location.origin + '/proxy/' + bookmark.url, null, false, bookmark.id);
  });
  assert.equal(await popup.locator('.heavenly-picks-entry').count(), 0);
  assert.equal(await popup.locator('.available-mirror-list,.mirror-add-form').count(), 2);
  await page.evaluate(() => closeBuiltinTestModal());
  pass('saved Newgrounds children have a nonintrusive manager and complete private recovery download; other sites retain normal mirror management');

  await page.evaluate(() => {
    window.phase3Launches = []; HeavenlyPicksUI.configure({ launch:(url, mode) => { phase3Launches.push({ url, mode }); return true; } });
    HeavenlyPicksUI.open({ preview:true, items:[
      { id:'owned-preview', title:'Owned browser fixture', url:'https://www.newgrounds.com/portal/view/phase3-owned-fixture', description:'Local preview only.', thumbnail:'https://invalid.test/fixture.png', order:0, enabled:true },
      { id:'owned-preview', title:'Duplicate', url:'https://example.test', enabled:true },
      { id:'disabled', title:'Disabled', url:'https://example.test', enabled:false },
      { id:'invalid', title:'Unsafe', url:'javascript:alert(1)', enabled:true }
    ] });
  });
  assert.equal(await picks.locator('.heavenly-pick').count(), 1); assert.match(await picks.innerText(), /Local draft preview/);
  await picks.getByRole('button', { name:/Open with Proxy:/ }).click(); await picks.getByRole('button', { name:/Open Direct:/ }).click();
  const launches = await page.evaluate(() => phase3Launches); assert.deepEqual(launches.map(entry => entry.mode), ['proxy', 'direct']); assert(launches.every(entry => entry.url === 'https://www.newgrounds.com/portal/view/phase3-owned-fixture'));
  assert.equal(await picks.locator('img').count(), 0); assert.equal(await picks.locator('.heavenly-pick-image-fallback').isVisible(), true);
  await page.evaluate(() => HeavenlyPicksUI.configure({ launch:() => { throw new Error('Owned launch failure'); } }));
  await picks.getByRole('button', { name:/Open Direct:/ }).click(); assert.match(await picks.locator('[role=status]').innerText(), /could not be opened/);
  await shot('picks-isolated-preview', picks); await page.keyboard.press('Escape'); await picks.waitFor({ state:'detached' });
  await page.evaluate(() => HeavenlyPicksUI.open()); assert.equal(await picks.locator('.heavenly-pick').count(), 0); assert.equal(await page.evaluate(() => HeavenlyPicks.items.length), 0);
  await page.keyboard.press('Escape'); await picks.waitFor({ state:'detached' });
  pass('draft preview stays isolated; unsafe/duplicate/disabled cards are excluded, media fails gracefully, and cards offer direct/proxy launches with failure feedback');

  const op = page.locator('[data-category-id="cat_op_websites"]');
  async function checkIcons() {
    for (const icon of ['globe','file-text']) {
      const svg = op.locator('.subsection-preset-icon[data-icon="' + icon + '"] svg'); assert.equal(await svg.count(),1);
      const size = await svg.boundingBox(); assert(size.width >= 12 && size.width <= 16 && size.height >= 12 && size.height <= 16);
    }
  }
  await checkIcons();
  for (const name of ['Browser/Games','Docs/Games']) { const header = op.locator('.subsection-divider').filter({ hasText:name }); await header.click(); await checkIcons(); await header.click(); await checkIcons(); }
  await page.evaluate(() => { const data = loadBookmarkData(), category = data.categories.find(entry => entry.id === 'cat_op_websites'); category.side = 'bottom'; category.order = 40; saveBookmarkData(data); renderBookmarksUI(); });
  await checkIcons(); await shot('op-subsection-icons', op);
  await page.evaluate(() => openCategoryEditModal('cat_op_websites'));
  assert.equal(await page.locator('#cat-sections-list .subsection-preset-icon').count() >= 2, true);
  await shot('subsection-icons-management', page.locator('#add-modal')); await page.locator('#close-modal-btn').click();
  pass('real globe/document SVGs retain bounded dimensions through expanded/collapsed, moved category and section management views');

  await page.evaluate(() => {
    const data = loadBookmarkData(), games = data.categories.find(entry => entry.id === 'cat_games'); games.order = 999; games.side = 'left';
    data.bookmarks.find(entry => entry.id === 'bm_dancing_bunny').order = 500;
    const ng = data.bookmarks.find(entry => entry.id === 'bm_ng'); ng.hidden = true; ng.personalNote = 'Personal note must survive'; ng.mirrorPreferences = { preferred:'id:phase3-saved-ng', active:'id:phase3-saved-ng' };
    const moved = data.bookmarks.find(entry => entry.id === 'bm_history_minds'); moved.categoryId = 'cat_anime'; moved.subSectionId = 'user'; moved.order = 777;
    data.bookmarks.push({ id:'phase3-personal', title:'Personal fixture', url:'https://example.test/personal', categoryId:'cat_games', subSectionId:'builtin', builtIn:false, order:1.75, personalNote:'Custom content stays' });
    data.bookmarks = data.bookmarks.filter(entry => entry.id !== 'bm_gamebois');
    saveBookmarkData(data); renderBookmarksUI(); openCategoryEditModal('cat_games');
  });
  const before = await read();
  await page.getByRole('button', { name:'Restore official order in Built-In', exact:true }).click();
  const restore = page.locator('#heavenly-restore-modal.active'); await restore.waitFor(); assert.match(await restore.innerText(), /Scope: Games \/ Built-In/);
  await page.waitForFunction(() => document.activeElement && document.activeElement.textContent === 'Cancel' && document.activeElement.closest('#heavenly-restore-modal'));
  assert.equal(await restore.getByRole('button', { name:'Cancel', exact:true }).evaluate(node => document.activeElement === node), true);
  await shot('restore-section-confirmation', restore);
  await restore.getByRole('button', { name:'Cancel', exact:true }).click(); await restore.waitFor({ state:'detached' }); assert.deepEqual(await read(),before);
  await page.getByRole('button', { name:'Restore official order in Built-In', exact:true }).click(); await restore.getByRole('button', { name:'Restore Official Order', exact:true }).click(); await restore.waitFor({ state:'detached' });
  const sectionRestored = await read(); assert.deepEqual(withoutLayout(sectionRestored),withoutLayout(before));
  assert.deepEqual(sectionRestored.bookmarks.filter(entry => entry.categoryId !== 'cat_games'), before.bookmarks.filter(entry => entry.categoryId !== 'cat_games'));
  assert.equal(sectionRestored.categories.find(entry => entry.id === 'cat_games').order,999);
  await page.locator('#close-modal-btn').click();
  pass('section restoration previews accepted ordering, focuses Cancel, cancels without writes and preserves all personal data and unrelated layout when confirmed');

  await page.evaluate(() => openAddModal('bookmark'));
  await page.locator('#add-modal > .modal-card > .heavenly-saved-links > summary').click();
  await page.locator('#restore-all-official-order').click(); await restore.waitFor(); await shot('restore-all-confirmation', restore);
  const globalBefore = await read(); await restore.getByRole('button', { name:'Cancel', exact:true }).click(); await restore.waitFor({ state:'detached' }); assert.deepEqual(await read(), globalBefore);
  await page.locator('#restore-all-official-order').click(); await restore.getByRole('button', { name:'Restore Official Order', exact:true }).click(); await restore.waitFor({ state:'detached' });
  const globalRestored = await read(); assert.deepEqual(withoutLayout(globalRestored),withoutLayout(globalBefore));
  assert.equal(globalRestored.bookmarks.find(entry => entry.id === 'bm_ng').hidden,true);
  assert.equal(globalRestored.bookmarks.find(entry => entry.id === 'bm_history_minds').categoryId,'cat_anime');
  assert.equal(globalRestored.bookmarks.some(entry => entry.id === 'bm_gamebois'),false);
  assert.match(await page.locator('#heavenly-order-status').innerText(), /personal content and preferences were preserved/);
  pass('global confirmation and cancellation preserve hidden states, moved built-ins, custom bookmarks, notes, mirrors and catalog decisions');

  await page.evaluate(() => {
    const data = loadBookmarkData(); data.bookmarks.find(entry => entry.id === 'bm_dancing_bunny').order = 999; saveBookmarkData(data);
    HeavenlyRestoreUI.open({ categoryId:'cat_games' });
    const original = Storage.prototype.setItem; window.phase3RestoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) { if (key === 'heavenly_bookmarks') throw new Error('Owned write failure'); return original.call(this,key,value); };
  });
  const beforeFailure = await read(); await restore.getByRole('button', { name:'Restore Official Order', exact:true }).click();
  assert.match(await restore.locator('[role=status]').last().innerText(), /could not be saved/); assert.deepEqual(await read(),beforeFailure);
  await page.evaluate(() => phase3RestoreStorage()); await restore.getByRole('button', { name:'Cancel', exact:true }).click(); await restore.waitFor({ state:'detached' });
  pass('a real localStorage write failure leaves the exact previous collection intact and offers useful recovery feedback');

  await page.locator('#close-modal-btn').click();
  for (const viewport of [{ width:768,height:1024 }, { width:390,height:844 }]) {
    const activate = control => engine === 'firefox' ? control.click() : control.tap();
    await page.setViewportSize(viewport); await openNewgrounds(); await activate(popup.locator('.heavenly-picks-entry'));
    assert.equal(await picks.locator('.modal-card').evaluate(node => node.scrollWidth <= node.clientWidth),true);
    await shot('picks-' + viewport.width, picks);
    await activate(picks.getByRole('button', { name:viewport.width === 768 ? 'Back to Newgrounds' : 'Close Heavenly Picks', exact:true }));
    await picks.waitFor({ state:'detached' }); assert.equal(await popup.evaluate(node => node.inert), false);
    await page.evaluate(() => closeBuiltinTestModal());
  }
  pass('tablet and narrow phone empty-state layouts fit without overflow; return/close controls work with ' + (engine === 'firefox' ? 'mouse input' : 'emulated touch'));
  await page.setViewportSize({ width:1366,height:900 });
  await page.waitForFunction(() => !document.querySelector('.modal-backdrop.active,.modal-backdrop.modal-closing'));
  await page.evaluate(() => { window.phase3PriorOverflow = document.body.style.overflow; });
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion });
    for (const id of ['heavenly-picks-modal', 'heavenly-restore-modal']) {
      await page.locator('#bm-universal-search').focus();
      await page.evaluate(id => {
        const open = () => id === 'heavenly-picks-modal' ? HeavenlyPicksUI.open() : HeavenlyRestoreUI.open({ categoryId:'cat_games' });
        for (let repeat = 0; repeat < 3; repeat++) { open(); document.querySelector('#' + id + ' .modal-close-btn').click(); }
        open();
      }, id);
      const dialog = page.locator('#' + id + '.active'); await dialog.waitFor();
      assert.equal(await page.locator('#' + id).count(), 1);
      assert.equal(await page.locator('#' + id + '-title').count(), 1);
      assert.equal(await dialog.locator('[role=dialog]').getAttribute('aria-labelledby'), id + '-title');
      await page.waitForFunction(id => document.activeElement && document.activeElement.closest('#' + id + '.active'), id);
      await page.keyboard.press('Escape'); await dialog.waitFor({ state:'detached' });
      await page.waitForFunction(() => document.body.style.overflow === phase3PriorOverflow);
      assert.equal(await page.locator('#bm-universal-search').evaluate(node => document.activeElement === node), true);
    }
  }
  await page.emulateMedia({ reducedMotion:'no-preference' });
  pass('rapid Picks/Restore close and reopen keeps one dialog/title identity, current focus and normal body scrolling with default and reduced motion');
  await page.goto(origin + '/settings.html', { waitUntil:'domcontentloaded' });
  await page.locator('summary').filter({ hasText:'Restore & Toggle Built-in Bookmarks' }).click();
  const settingsGames = page.locator('#bookmark-mgr-container [data-category-id="cat_games"]'); await settingsGames.locator(':scope > summary').click();
  await settingsGames.getByRole('button', { name:'Restore official order in Games', exact:true }).click(); await restore.waitFor();
  const settingsBefore = await read(); await restore.getByRole('button', { name:'Cancel', exact:true }).click(); await restore.waitFor({ state:'detached' }); assert.deepEqual(await read(),settingsBefore);
  assert.equal(await settingsGames.getByRole('button', { name:'Restore official order in Games', exact:true }).evaluate(node => document.activeElement === node),true);
  await page.locator('#settings-official-order-summary').click(); await page.locator('#settings-restore-all-order').click(); await restore.waitFor();
  await shot('settings-restore-all-confirmation', restore); await restore.getByRole('button', { name:'Restore Official Order', exact:true }).click(); await restore.waitFor({ state:'detached' });
  assert.deepEqual(withoutLayout(await read()),withoutLayout(settingsBefore)); assert.equal(await page.locator('#settings-official-order-summary').evaluate(node => document.activeElement === node),true);
  pass('Settings bookmark management exposes both scoped and global confirmation, with cancellation and useful restored focus');
  assert.deepEqual(errors,[]);
  if (process.env.HEAVENLY_PHASE3_RESULTS) fs.writeFileSync(process.env.HEAVENLY_PHASE3_RESULTS, JSON.stringify({
    executed:new Date().toISOString(), physicalDevices:[],
    browsers:[{ engine, checks:passedChecks, errors, version:browser.version(), status:'passed' }]
  }, null, 2) + '\n');
  console.log(checks + ' Phase 3 public collection groups passed in ' + engine + '; screenshots: ' + evidence);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); } });
