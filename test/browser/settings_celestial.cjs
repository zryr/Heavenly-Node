'use strict';
// Run against the real application. These checks exercise controls rather than
// replacing storage, dialogs, or navigation with visual mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let playwright; try { playwright = require('playwright'); } catch (_) { playwright = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
const output = process.env.HEAVENLY_EVIDENCE_DIR ? path.resolve(process.env.HEAVENLY_EVIDENCE_DIR) : path.resolve(__dirname, '../../docs/phase4-5/evidence');
const summary = { engine, captured: new Date().toISOString(), physicalDevices: [], groups: [], errors: [], screenshots: [] };
let browser, server;
const ids = ['set-disable-all-features','set-disable-all-widgets','set-auto-cloak','set-persistent-cloak','set-bookmarks-about-blank','set-search-about-blank','set-show-proxied-url','set-decoy-auto-timer','set-randomize-preset-session','pool-select-all-btn','pool-deselect-all-btn','preset-select','custom-preset-btn','custom-title','custom-icon','save-custom-preset-btn','delete-custom-preset-btn','reset-branding-btn','customize-quick-settings-btn','set-search-new-tab','set-merge-go-newtab','set-bookmark-count-mode','set-bookmark-initial-limit','set-bookmark-limit-section','set-bookmark-section-mode','set-bookmark-section-limit','reset-bookmark-section-limit','set-bookmarks-new-tab','reset-builtin-bookmarks-btn','set-panic-key-enable','set-panic-key','set-touch-panic','set-panic-url','set-show-scroll-lock','set-show-magnifier','set-show-nav-bookmark','set-show-nav-search','set-show-nav-home','set-use-widget-dock','set-dock-position','preview-dock-pos-select','reset-widget-pos-btn','open-export-modal-btn','open-import-modal-btn','close-export-modal-btn','export-select-all-btn','export-deselect-all-btn','download-export-btn','close-import-modal-btn','import-file-input','import-select-all-btn','import-deselect-all-btn','import-mode-select','apply-import-btn'];
async function group(name, fn) { await fn(); summary.groups.push(name); console.log('PASS ' + engine + ': ' + name); }
async function shown(page, selector) { await page.locator(selector).first().waitFor({ state: 'visible' }); }
async function reveal(page, id) {
  const summary = page.locator('#settings-group-' + id + ' > summary');
  if (!(await page.locator('#settings-group-' + id).getAttribute('open') !== null)) await summary.click();
}
async function capture(page, filename) {
  if (engine !== 'chromium') return;
  await page.waitForFunction(() => { const loader = document.getElementById('heavenly-loading-screen'); return !loader || loader.hidden || getComputedStyle(loader).display === 'none'; });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, filename) }); summary.screenshots.push(filename);
}
async function importFile(page, payload) {
  await reveal(page, 'backup'); await page.locator('#open-import-modal-btn').click();
  await page.locator('#import-file-input').setInputFiles({ name: 'heavenly-test-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
  await shown(page, '#apply-import-btn');
}
async function readDownload(download) { return JSON.parse(fs.readFileSync(await download.path(), 'utf8')); }
(async () => {
  fs.mkdirSync(output, { recursive: true });
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  summary.version = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', error => summary.errors.push(error.message));
  await page.goto(origin + '/settings.html', { waitUntil: 'domcontentloaded' });
  await shown(page, '#settings-category-nav a');
  await group('all 54 established controls survive; seven categories and no overflow', async () => {
    for (const id of ids) assert.equal(await page.locator('#' + id).count(), 1, id);
    assert.equal(await page.locator('.settings-group').count(), 7);
    assert.equal(await page.locator('.settings-nav-link').count(), 7);
    assert(await page.locator('#settings-group-bookmarks').getAttribute('open') !== null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.waitForFunction(() => document.getElementById('heavenly-loading-screen').hidden || getComputedStyle(document.getElementById('heavenly-loading-screen')).display === 'none');
    await capture(page, 'after-settings-desktop.png');
  });
  const sentinel = await page.evaluate(() => {
    const settings = loadSettings(); settings.phase45Unknown = 'preserved'; settings.autoCloak = false; settings.showMagnifier = true;
    localStorage.setItem('heavenly_settings', JSON.stringify(settings));
    const data = loadBookmarkData(); data.bookmarks[0].personalNote = 'Phase 4+5 preservation check'; data.bookmarks[0].hidden = true; saveBookmarkData(data, true);
    localStorage.setItem('heavenly_phase45_unrelated', 'leave-this-alone');
    return { bookmarkId: data.bookmarks[0].id, note: data.bookmarks[0].personalNote };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await group('desktop category navigation and stored toggle across reloads and tabs', async () => {
    await page.locator('.settings-nav-link[href="#tab-cloaking"]').click();
    assert(await page.locator('#set-auto-cloak').isVisible());
    const other = await context.newPage(); await other.goto(origin + '/settings.html#tab-cloaking', { waitUntil: 'domcontentloaded' });
    await page.locator('#set-auto-cloak').check();
    await other.waitForFunction(() => document.getElementById('set-auto-cloak').checked);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#set-auto-cloak').isChecked(), true);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).phase45Unknown), 'preserved');
    await other.close();
  });
  await group('search actual name, alias, description, ranked results and empty state', async () => {
    await page.locator('#settings-search').fill('dock');
    await shown(page, '#set-use-widget-dock');
    const positions = await page.evaluate(() => ({ dock: document.getElementById('set-use-widget-dock').getBoundingClientRect().top, magnifier: document.getElementById('set-show-magnifier').getBoundingClientRect().top }));
    assert(positions.dock < positions.magnifier, 'exact dock card must lead category-only results');
    assert.equal(await page.locator('.settings-result-category:visible').first().textContent(), 'Widgets & dock');
    await page.evaluate(() => scrollTo(0,0));
    await capture(page, 'after-settings-search.png');
    for (const [query, target] of [['bookmark count','#set-bookmark-count-mode'],['cloaking','#set-auto-cloak'],['keyboard shortcut','#set-panic-key-enable'],['zoom dimensions','#set-show-magnifier'],['fixed count','#set-bookmark-count-mode']]) {
      await page.locator('#settings-search').fill(query); await shown(page, target);
    }
    await page.locator('#settings-search').fill('no-such-setting-987654321');
    assert(await page.locator('#settings-search-empty').isVisible());
    assert.equal(await page.locator('.settings-group:visible').count(), 0);
    await page.locator('#settings-empty-clear').click();
    assert.equal(await page.locator('.settings-group:visible').count(), 7);
  });
  await group('search restores category, every disclosure, scroll, focus, preferences and control identity', async () => {
    await reveal(page, 'bookmarks'); await reveal(page, 'widgets');
    await page.locator('#set-auto-cloak').focus();
    await page.evaluate(() => document.getElementById('set-auto-cloak').dataset.preservation = 'same-node');
    const before = await page.evaluate(() => ({ details: Array.from(document.querySelectorAll('.settings-sections details')).map(node => node.open), selected: document.querySelector('.settings-nav-link[aria-current]').getAttribute('href'), saved: localStorage.getItem('heavenly_settings'), scroll: scrollY }));
    await page.locator('#settings-search').fill('dock');
    await page.locator('#settings-search').fill('panic');
    await page.locator('#settings-search-clear').click();
    const after = await page.evaluate(() => ({ details: Array.from(document.querySelectorAll('.settings-sections details')).map(node => node.open), selected: document.querySelector('.settings-nav-link[aria-current]').getAttribute('href'), saved: localStorage.getItem('heavenly_settings'), scroll: scrollY, focus: document.activeElement.id, identity: document.getElementById('set-auto-cloak').dataset.preservation }));
    assert.deepEqual(after.details, before.details); assert.equal(after.selected, before.selected); assert.equal(after.saved, before.saved);
    assert.equal(after.focus, 'set-auto-cloak'); assert.equal(after.identity, 'same-node'); assert(Math.abs(after.scroll - before.scroll) <= 2, 'scroll restored '+before.scroll+' -> '+after.scroll);
  });
  await group('keyboard result navigation, Enter to setting, Escape restoration', async () => {
    await page.locator('#settings-search').fill('bookmark count');
    await page.locator('#settings-search').press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'bookmark-display-settings');
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.id), 'set-bookmark-count-mode');
    await page.locator('#settings-search').focus(); await page.keyboard.press('Escape'); assert.equal(await page.locator('#settings-search').inputValue(), '');
  });
  await group('all established deep links reveal target and support Back/Forward', async () => {
    for (const id of ['tab-cloaking','panic-controls','widget-settings','master-controls','bookmark-updates']) {
      await page.goto(origin + '/settings.html#' + id, { waitUntil: 'domcontentloaded' });
      await shown(page, '#' + id);
      await page.waitForFunction(id => document.activeElement.id === id, id);
    }
    await page.locator('.settings-nav-link[href="#panic-controls"]').click();
    await page.waitForFunction(() => location.hash === '#panic-controls' && document.activeElement.id === 'panic-controls');
    await page.goBack({ waitUntil: 'commit' }); await page.waitForFunction(() => location.hash === '#bookmark-updates'); await shown(page, '#bookmark-updates');
    await page.goForward({ waitUntil: 'commit' }); await page.waitForFunction(() => location.hash === '#panic-controls'); await shown(page, '#set-panic-key-enable');
  });
  await group('master gating is semantic, explained, synchronized, and preserves individual choices', async () => {
    await reveal(page, 'features'); await page.locator('#set-disable-all-widgets').check();
    await reveal(page, 'widgets'); assert(await page.locator('#set-show-magnifier').isDisabled()); assert(await page.locator('#set-show-magnifier').isChecked()); assert(await page.locator('#settings-widget-gating').isVisible());
    await page.locator('#set-disable-all-widgets').uncheck();
    await page.locator('#set-disable-all-features').check();
    await reveal(page, 'cloaking'); assert(await page.locator('#set-auto-cloak').isDisabled()); assert(await page.locator('#set-auto-cloak').isChecked());
    await reveal(page, 'panic'); assert(await page.locator('#set-panic-key-enable').isDisabled());
    await page.locator('#set-disable-all-features').uncheck(); assert(await page.locator('#set-auto-cloak').isEnabled());
    await reveal(page, 'widgets'); await page.locator('#set-use-widget-dock').uncheck(); assert(await page.locator('#set-dock-position').isDisabled());
    await page.locator('#set-use-widget-dock').check(); await page.locator('#set-dock-position').selectOption('left');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).dockPosition), 'left');
  });
  await group('new-tab prerequisites and advanced pool are discoverable without changing preferences', async () => {
    await reveal(page, 'cloaking'); await page.locator('#set-search-about-blank').check();
    await reveal(page, 'bookmarks'); assert(await page.locator('#set-search-new-tab').isDisabled()); assert(await page.locator('#settings-newtab-gating').isVisible());
    await page.locator('#settings-search').fill('merge'); await shown(page, '#set-merge-go-newtab'); assert(await page.locator('#set-merge-go-newtab').isDisabled());
    await page.locator('#settings-search-clear').click();
    await page.locator('#set-search-about-blank').uncheck();
    await page.locator('#settings-search').fill('randomizer pool'); await shown(page, '#random-pool-container');
    assert(await page.locator('#pool-select-all-btn').isDisabled());
    await page.locator('#settings-search-clear').click();
  });
  let backup;
  await group('real backup download, focus trap, focus restoration, notes and unknown preferences', async () => {
    await reveal(page, 'backup'); await page.locator('#open-export-modal-btn').click();
    await page.waitForFunction(() => document.getElementById('settings-page').inert);
    await page.locator('#close-export-modal-btn').focus(); await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'download-export-btn');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'close-export-modal-btn');
    const pending = page.waitForEvent('download'); await page.locator('#download-export-btn').click(); backup = await readDownload(await pending);
    assert.equal(backup.settings.phase45Unknown, 'preserved'); assert.equal(backup.bookmarks.find(item => item.id === sentinel.bookmarkId).personalNote, sentinel.note);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open-export-modal-btn'); assert.equal(await page.evaluate(() => document.getElementById('settings-page').inert), false);
  });
  await group('granular import and overwrite confirmation preserve unrelated data and saved preferences', async () => {
    await importFile(page, { version:'2.0', settings:{ panicKey:'x', phase45Imported:'ok' }, categories:[], bookmarks:[] });
    await page.locator('#apply-import-btn').click(); await page.locator('#import-modal').waitFor({ state:'hidden' });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).panicKey), 'x');
    const preserved = await page.evaluate(id => ({ unrelated:localStorage.getItem('heavenly_phase45_unrelated'), unknown:JSON.parse(localStorage.getItem('heavenly_settings')).phase45Unknown, bookmark:loadBookmarkData().bookmarks.find(item => item.id === id) }), sentinel.bookmarkId);
    assert.equal(preserved.unrelated,'leave-this-alone'); assert.equal(preserved.unknown,'preserved'); assert.equal(preserved.bookmark.personalNote,sentinel.note); assert.equal(preserved.bookmark.hidden,true);
    await importFile(page, { version:'2.0', settings:{ panicKey:'z' }, categories:[], bookmarks:[] });
    await page.locator('#import-mode-select').selectOption('overwrite');
    const before = await page.evaluate(() => localStorage.getItem('heavenly_settings'));
    page.once('dialog', async dialog => { assert.equal(dialog.type(),'confirm'); assert.match(dialog.message(),/Overwrite/); await dialog.dismiss(); });
    await page.locator('#apply-import-btn').click(); assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_settings')),before);
    page.once('dialog', dialog => dialog.accept()); await page.locator('#apply-import-btn').click();
    await page.locator('#import-modal').waitFor({ state:'hidden' }); assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).panicKey),'z');
  });
  await group('storage write failure reports failure and retains actual stored value', async () => {
    await reveal(page, 'cloaking');
    const before = await page.evaluate(() => { window.__settingsOriginalWrite = Storage.prototype.setItem; Storage.prototype.setItem = function(key,value) { if (key === 'heavenly_settings') throw new DOMException('Quota exceeded','QuotaExceededError'); return window.__settingsOriginalWrite.call(this,key,value); }; return localStorage.getItem('heavenly_settings'); });
    await page.locator('#set-auto-cloak').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_settings')),before); assert.match(await page.locator('#settings-save-status').textContent(),/could not be saved/); assert(await page.locator('#set-auto-cloak').isChecked());
    await page.evaluate(() => { Storage.prototype.setItem = window.__settingsOriginalWrite; delete window.__settingsOriginalWrite; });
  });
  await group('malformed stored settings survive toggles and recovery export byte-for-byte', async () => {
    const malformed = '{"unfinished';
    await page.evaluate(value => localStorage.setItem('heavenly_settings',value), malformed);
    await page.reload({ waitUntil:'domcontentloaded' }); await reveal(page,'cloaking'); await page.locator('#set-auto-cloak').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_settings')),malformed); assert.match(await page.locator('#settings-save-status').textContent(),/left untouched/);
    await reveal(page,'backup'); await page.locator('#open-export-modal-btn').click();
    const pending = page.waitForEvent('download'); await page.locator('#download-export-btn').click(); const recovery = await readDownload(await pending);
    assert.equal(recovery.version,'recovery'); assert.equal(recovery.recoverySettingsRaw,malformed);
    await page.evaluate(settings => localStorage.setItem('heavenly_settings',JSON.stringify(settings)), backup.settings);
    await page.reload({waitUntil:'domcontentloaded'});
  });
  await group('injected markup in backup titles stays inert in preview and saved manager', async () => {
    const title = '<img src=x onerror="window.__settingsTitleExecuted=true">';
    const importedCategory = 'phase45-title-"]-safety';
    await importFile(page, { version:'2.0', categories:[{id:importedCategory,title,side:'left',order:100,builtIn:false}], bookmarks:[{id:'phase45-child-safety',categoryId:importedCategory,title:'Saved child',url:'https://example.com/',type:'link',builtIn:false,order:1}] });
    await page.locator('.import-cat-cb').uncheck(); assert.equal(await page.locator('.import-bm-cb').isChecked(),false,'punctuation in a stable category ID must not break child selection');
    await page.locator('.import-cat-cb').check(); assert.equal(await page.locator('.import-bm-cb').isChecked(),true);
    assert.equal(await page.locator('#import-mode-select').inputValue(),'merge','new backup must default to merge after an earlier overwrite');
    assert.equal(await page.evaluate(() => window.__settingsTitleExecuted),undefined); assert(await page.locator('#import-tree-container').textContent().then(text => text.includes(title)));
    await page.locator('#apply-import-btn').click(); await page.locator('#import-modal').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(() => window.__settingsTitleExecuted),undefined); assert.equal(await page.locator('#bookmark-mgr-container img[src=x]').count(),0);
  });
  await group('reset actions require intent and failed position writes roll back', async () => {
    await reveal(page,'widgets');
    const positions = await page.evaluate(() => { ['heavenly_scroll_lock_pos','heavenly_magnifier_pos','heavenly_nav_pos','heavenly_lens_pos'].forEach((key,index) => localStorage.setItem(key,JSON.stringify({left:index+11,top:index+22}))); return ['heavenly_scroll_lock_pos','heavenly_magnifier_pos','heavenly_nav_pos','heavenly_lens_pos'].map(key => localStorage.getItem(key)); });
    page.once('dialog',dialog=>dialog.dismiss()); await page.locator('#reset-widget-pos-btn').click();
    assert.deepEqual(await page.evaluate(() => ['heavenly_scroll_lock_pos','heavenly_magnifier_pos','heavenly_nav_pos','heavenly_lens_pos'].map(key => localStorage.getItem(key))),positions);
    await page.evaluate(() => { window.__settingsOriginalWrite=Storage.prototype.setItem; let fail=true; Storage.prototype.setItem=function(key,value) { if (key==='heavenly_nav_pos' && fail) { fail=false; throw new DOMException('Quota','QuotaExceededError'); } return window.__settingsOriginalWrite.call(this,key,value); }; });
    page.once('dialog',dialog=>dialog.accept()); await page.locator('#reset-widget-pos-btn').click();
    assert.deepEqual(await page.evaluate(() => ['heavenly_scroll_lock_pos','heavenly_magnifier_pos','heavenly_nav_pos','heavenly_lens_pos'].map(key => localStorage.getItem(key))),positions);
    assert.match(await page.locator('#settings-save-status').textContent(),/Original positions were restored/);
    await page.evaluate(() => { Storage.prototype.setItem=window.__settingsOriginalWrite; delete window.__settingsOriginalWrite; });
    await reveal(page,'bookmarks'); const manager=page.locator('#reset-builtin-bookmarks-btn');
    await manager.evaluate(node=>{ let ancestor=node.parentElement; while(ancestor){if(ancestor.tagName==='DETAILS')ancestor.open=true;ancestor=ancestor.parentElement;} });
    const before=await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks'));
    page.once('dialog',dialog=>dialog.dismiss()); await manager.click(); assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_bookmarks')),before);
  });
  await group('phone/tablet searchable accordion, portrait/landscape, and reduced motion', async () => {
    for (const [width,height,name] of [[820,1180,'tablet'],[1180,820,'tablet-landscape'],[390,844,'phone'],[320,740,'phone-small']]) {
      await page.setViewportSize({width,height}); await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name);
      if(width<=850){ assert.equal(await page.locator('.settings-sidebar').isVisible(),false); assert.equal(await page.locator('.settings-group[open]').count(),0); }
      if(name==='tablet'||name==='phone')await capture(page,'after-settings-'+name+'.png');
      await page.locator('#settings-group-widgets > summary').click(); await shown(page,'#set-show-magnifier');
      await page.locator('#settings-search').fill('panic'); await shown(page,'#set-panic-key-enable'); await page.locator('#settings-search-clear').click();
      assert(await page.locator('#set-show-magnifier').isVisible());
    }
    await page.emulateMedia({reducedMotion:'reduce'}); await page.locator('#settings-search').fill('dock'); await shown(page,'#set-use-widget-dock');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.settings-group-chevron')).transitionDuration),'0s');
    await page.locator('#settings-search-clear').click();
  });
  await page.setViewportSize({width:1440,height:1000}); await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settings-group-bookmarks > summary').click(); await page.evaluate(()=>scrollTo(0,0)); await capture(page,'after-settings-collapsed.png');
  await page.locator('#settings-group-cloaking > summary').click(); await page.evaluate(()=>scrollTo(0,0)); await capture(page,'after-settings-expanded.png');
  assert.deepEqual(summary.errors,[]);
  await context.close();
  fs.writeFileSync(path.join(output,engine+'-settings-results.json'),JSON.stringify(summary,null,2));
  console.log('PASS '+engine+': '+summary.groups.length+' Settings interaction groups; no page errors.');
})().catch(error=>{console.error(error);summary.failure=String(error.stack || error).slice(0,3000);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,engine+'-settings-results.json'),JSON.stringify(summary,null,2));process.exitCode=1;}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}});
