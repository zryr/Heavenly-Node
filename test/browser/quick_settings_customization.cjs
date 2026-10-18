// Shared-editor, conflict and device interaction checks. No physical devices are used.
const assert = require('node:assert/strict');
const playwright = require('playwright');
const app = require('../../app');
const model = require('../../public/assets/quick-settings-model');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let browser, server, checks = 0;
const pass = message => { checks++; console.log('PASS ' + message); };
(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'], headless: true } : { headless: true });
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 820, height: 1180 } });
  await context.addInitScript(() => { try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); localStorage.setItem('heavenly_quick_settings_expanded', 'true'); } catch {} });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const ready = async target => {
    await target.locator('#qs-editor').waitFor({ state: 'attached' });
    await target.waitForFunction(() => !document.getElementById('heavenly-loading-screen') || document.getElementById('heavenly-loading-screen').style.display === 'none');
  };
  const settings = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings') || '{}'));
  const layoutIds = target => target.locator('#quick-settings-tray .qs-pill-chip').evaluateAll(nodes => nodes.map(node => node.id));
  const draftIds = target => target.locator('#qs-editor-visible > li').evaluateAll(nodes => nodes.map(node => node.dataset.shortcut));
  const open = async target => { await target.bringToFront(); await target.locator(target === page ? '#quick-settings-edit-btn' : '#customize-quick-settings-btn').click(); await target.locator('#qs-editor').waitFor({ state: 'visible' }); };
  const save = async target => { await target.locator('#qs-editor-save').click(); await target.locator('#qs-editor').waitFor({ state: 'hidden' }); };
  const cancel = async target => { await target.locator('#qs-editor-footer [data-editor-close], .qs-editor-footer [data-editor-close]').click(); await target.locator('#qs-editor').waitFor({ state: 'hidden' }); };
  const visibility = (target, id) => target.locator('[data-visibility="' + id + '"]');
  const initial = { openBookmarksInNewTab: false, openSearchInNewTab: false, showProxiedUrl: true, persistentCloak: false, touchPanic: true, useWidgetDock: true, dockPosition: 'left', panicKeyEnable: true, panicKey: 'p', panicUrl: 'https://classroom.google.com', skipBuiltinTestPrompt: true, futureSetting: { keep: true } };
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await ready(page);
  await page.evaluate(initial => { localStorage.setItem('heavenly_settings', JSON.stringify(initial)); localStorage.setItem('heavenly_tabs', '["retained tab"]'); localStorage.setItem('heavenly_history', '[{"url":"https://example.com/","title":"Retained"}]'); ['heavenly_scroll_lock_pos', 'heavenly_magnifier_pos', 'heavenly_nav_pos', 'heavenly_panic_pos', 'heavenly_save_widget_pos', 'heavenly_lens_pos'].forEach(key => localStorage.setItem(key, '{"left":35,"top":80}')); }, initial);
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
  const data = () => page.evaluate(() => ['heavenly_bookmarks', 'heavenly_tabs', 'heavenly_history', 'heavenly_scroll_lock_pos', 'heavenly_magnifier_pos', 'heavenly_nav_pos', 'heavenly_panic_pos', 'heavenly_save_widget_pos', 'heavenly_lens_pos'].map(key => localStorage.getItem(key)));
  const before = await data();
  assert.deepEqual(await layoutIds(page), model.layout({}).visible);
  assert.equal(await page.locator('#quick-settings-tray .qs-help-button:visible').count(), 0);
  await page.locator('#quick-settings-info-btn').tap();
  await page.locator('#qs-help-popover.is-open').waitFor();
  assert.equal(await page.locator('#qs-help-text summary').count(), 5);
  assert(!(await page.locator('#qs-help-text').innerText()).includes('Widget Dock'));
  await page.keyboard.press('Escape');
  assert(await page.locator('#quick-settings-info-btn').evaluate(node => node === document.activeElement));
  pass('upgrades retain preferences, five default pills and centralized help with individual icons off');

  await open(page); await visibility(page, 'pill-bm-newtab').click(); await page.locator('#qs-editor-info-icons').check(); await cancel(page);
  assert.deepEqual(await settings(), initial);
  pass('Cancel discards staged visibility and info-icon changes without touching settings');
  await open(page); await visibility(page, 'pill-bm-newtab').click();
  await page.locator('#qs-editor-more summary').click(); await visibility(page, 'pill-tab-cloak').click();
  await page.locator('#qs-editor-info-icons').check();
  for (let i = 0; i < 4; i++) { await page.locator('[data-handle="pill-tab-cloak"]').focus(); await page.keyboard.press('ArrowUp'); }
  assert.equal((await draftIds(page))[0], 'pill-tab-cloak');
  await save(page);
  assert.equal((await layoutIds(page))[0], 'pill-tab-cloak');
  assert(!(await layoutIds(page)).includes('pill-bm-newtab'));
  assert.equal((await settings()).openBookmarksInNewTab, false);
  assert.equal((await settings()).persistentCloak, false);
  assert.deepEqual(await data(), before);
  pass('visibility, keyboard ordering and optional icons persist without changing hidden feature values or user data');
  await page.locator('#pill-tab-cloak-config').click(); await page.locator('#qs-config-persistentCloak').check(); await page.locator('#qs-context-save').click();
  assert.equal((await settings()).persistentCloak, true); assert.equal(await page.title(), 'Google Classroom');
  await page.locator('#pill-tab-cloak').click(); assert.equal((await settings()).autoCloak, true); assert.equal((await settings()).persistentCloak, true);
  await page.locator('#pill-tab-cloak').click(); assert.equal((await settings()).autoCloak, false); assert.equal(await page.locator('#pill-tab-cloak .qs-required').innerText(), 'Persistent');
  await page.locator('#pill-tab-cloak-config').click(); await page.locator('#qs-config-persistentCloak').uncheck(); await page.locator('#qs-context-save').click();
  assert.equal((await settings()).persistentCloak, false); assert.equal(await page.title(), 'Heavenly');
  pass('unified cloaking toggles Auto independently and configures Persistent without losing the original title');

  const other = await context.newPage(); other.setDefaultTimeout(15000);
  await other.goto(origin + '/settings.html', { waitUntil: 'domcontentloaded' }); await ready(other);
  assert.equal(await other.locator('#set-show-builtin-prompt').count(), 0);
  assert.equal(await other.locator('#set-panic-key').inputValue(), 'p');
  await open(other); assert.deepEqual(await draftIds(other), await layoutIds(page)); await cancel(other);
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
  assert.equal((await layoutIds(page))[0], 'pill-tab-cloak');
  pass('Settings and homepage use the same saved editor; removal of the prompt control retains panic and legacy values');

  await open(page); await visibility(page, 'pill-search-blank').click();
  const draft = await draftIds(page);
  await other.locator('label.switch-toggle:has(#set-touch-panic)').click();
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('qs-editor-conflict').textContent.includes('Other settings changed'));
  assert.deepEqual(await draftIds(page), draft);
  await save(page);
  assert.equal((await settings()).touchPanic, false);
  assert.equal((await settings()).skipBuiltinTestPrompt, true);
  pass('external feature changes preserve an open draft and are retained on layout Save');

  await open(page); await visibility(page, 'pill-search-newtab').click(); const keptDraft = await draftIds(page);
  await open(other); await other.locator('#qs-editor-reset').click(); await save(other);
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('qs-editor-save').disabled);
  assert.deepEqual(await draftIds(page), keptDraft);
  await page.locator('#qs-editor-keep').click(); await save(page);
  assert.deepEqual(await layoutIds(page), keptDraft);
  assert.equal((await settings()).touchPanic, false);
  await open(page); await visibility(page, 'pill-proxy-url').click();
  await open(other); await other.locator('#qs-editor-more summary').click(); await visibility(other, 'pill-search-blank').click(); await save(other);
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('qs-editor-save').disabled);
  await page.locator('#qs-editor-load').click();
  const loaded = await settings();
  assert.deepEqual(await draftIds(page), loaded.quickSettings.order.filter(id => loaded.quickSettings.visible.includes(id)));
  await cancel(page);
  pass('external layout conflicts retain drafts and require explicit Keep or Load before saving');

  await open(page); await page.locator('#qs-editor-reset').click(); await cancel(page);
  const savedBeforeReset = await settings();
  await open(page); await page.locator('#qs-editor-reset').click(); await save(page);
  assert.deepEqual(await layoutIds(page), model.layout({}).visible);
  const savedAfterReset = await settings(); delete savedBeforeReset.quickSettings; delete savedAfterReset.quickSettings;
  assert.deepEqual(savedAfterReset, savedBeforeReset);
  pass('Reset is staged and restores only default layout and info-icon preference');

  await open(page); await page.locator('#qs-editor-more summary').click();
  for (const id of ['pill-panic-settings', 'pill-touch-panic', 'pill-widget-dock', 'pill-widgets']) await visibility(page, id).click();
  await save(page);
  const beforePanic = await settings();
  await page.locator('#pill-panic-settings').click();
  assert.equal((await settings()).panicKeyEnable, !beforePanic.panicKeyEnable);
  assert.equal((await settings()).panicKey, 'p');
  assert.equal(page.url(), origin + '/');
  await page.locator('#pill-panic-settings-config').click();
  assert.equal(await page.locator('#qs-config-panicKey').inputValue(), 'p');
  await page.keyboard.press('Escape');
  pass('Panic Key toggles existing activation and its gear configures without redirecting or changing the saved key');

  const positions = await data();
  await page.locator('#pill-widgets').click();
  assert.equal((await settings()).disableAllWidgets, true);
  assert(await page.locator('#pill-widget-dock').isDisabled());
  assert.equal(await page.locator('#pill-widget-dock .qs-required').innerText(), 'Paused');
  assert.equal((await settings()).useWidgetDock, true);
  await page.locator('#pill-widgets').click(); await page.locator('#pill-widget-dock').click();
  assert.equal((await settings()).useWidgetDock, false);
  assert.equal((await settings()).dockPosition, 'left');
  assert.deepEqual(await data(), positions);
  await other.locator('details:has(#set-disable-all-features) > summary').click();
  await other.locator('label.switch-toggle:has(#set-disable-all-features)').click();
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('pill-touch-panic').disabled);
  assert(await page.locator('#pill-widgets').isDisabled());
  await other.locator('label.switch-toggle:has(#set-disable-all-features)').click();
  await page.bringToFront(); await page.waitForFunction(() => !document.getElementById('pill-touch-panic').disabled);
  pass('widget toggles preserve positions/preferences, distinguish master overrides, and sync between tabs');

  await page.locator('#pill-bm-blank').click();
  assert.equal((await settings()).showProxiedUrl, true);
  assert.equal(await page.locator('#pill-proxy-url').getAttribute('aria-pressed'), 'true');
  assert((await page.locator('#qs-panel-status').innerText()).includes('Bookmarks'));
  assert.equal(await page.locator('#pill-search-newtab').isDisabled(), false);
  await page.locator('#quick-settings-info-btn').tap();
  await page.locator('[data-help-entry="pill-proxy-url"] summary').click();
  assert((await page.locator('#qs-help-text').innerText()).includes('address bar stays about:blank'));
  await page.locator('[data-help-entry="pill-widgets"] summary').click();
  assert((await page.locator('#qs-help-text').innerText()).includes('Refresh an already open proxied website'));
  await page.keyboard.press('Escape');
  pass('about:blank explains contextual URL presentation without disabling the independent URL setting');

  for (const [name, width, height] of [['phone', 320, 740], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['Chromebook', 1366, 768], ['desktop', 1920, 1080]]) {
    await page.setViewportSize({ width, height }); await open(page);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const box = await page.locator('#qs-editor .qs-editor-card').boundingBox();
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
    await page.locator('#qs-editor-save').focus(); await page.keyboard.press('Tab');
    assert(await page.locator('.qs-editor-header [data-editor-close]').evaluate(node => node === document.activeElement));
    await page.keyboard.press('Shift+Tab'); assert(await page.locator('#qs-editor-save').evaluate(node => node === document.activeElement));
    if (width === 820 || width === 320) await page.screenshot({ path: '/tmp/heavenly-custom-modal-' + engine + '-' + width + '.png' });
    await page.keyboard.press('Escape');
    await page.locator('#quick-settings-info-btn').tap(); await page.waitForTimeout(180);
    const help = await page.locator('#qs-help-popover').boundingBox();
    assert(help.x >= 0 && help.y >= 0 && help.x + help.width <= width && help.y + help.height <= height);
    await page.keyboard.press('Escape');
    pass(name + ' editor and info fit the viewport; keyboard focus is contained and Escape dismisses');
  }

  await page.setViewportSize({ width: 820, height: 1180 }); await open(page);
  const source = page.locator('[data-handle="pill-proxy-url"]'), target = page.locator('#qs-editor-visible [data-shortcut="pill-bm-newtab"]');
  const from = await source.boundingBox(), to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + 5, { steps: 8 }); await page.mouse.up();
  assert.equal((await draftIds(page))[0], 'pill-proxy-url');
  await page.locator('[data-id="pill-proxy-url"][data-move="down"]').click(); assert.equal((await draftIds(page))[1], 'pill-proxy-url');
  await page.locator('[data-id="pill-proxy-url"][data-move="up"]').click(); assert.equal((await draftIds(page))[0], 'pill-proxy-url');
  assert(await source.evaluate(node => node === document.activeElement));
  await cancel(page);
  pass('mouse handle drag and Move buttons change the draft order and Cancel preserves saved order');

  await open(page); const touchBefore = await draftIds(page);
  const interrupted = await source.boundingBox();
  await page.mouse.move(interrupted.x + 20, interrupted.y + 20); await page.mouse.down();
  await page.keyboard.press('Escape'); await page.mouse.up();
  await open(page); assert.deepEqual(await draftIds(page), touchBefore); await cancel(page);
  pass('interrupted handle gestures do not reorder or save shortcuts');
  if (engine === 'chromium') {
    await open(page);
    const cdp = await context.newCDPSession(page), a = await source.boundingBox(), b = await target.boundingBox();
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
    await touch('touchStart', a.x + 20, a.y + 20); await page.waitForTimeout(450);
    await touch('touchMove', b.x + 20, b.y + 5); await touch('touchEnd');
    assert.equal((await draftIds(page))[0], 'pill-proxy-url'); await cancel(page);
    await open(page); const scroll = page.locator('#qs-editor .qs-editor-body'); const s = await scroll.boundingBox();
    const beforeScrollOrder = await draftIds(page);
    await touch('touchStart', s.x + 35, s.y + s.height - 35); await touch('touchMove', s.x + 35, s.y + 45); await touch('touchEnd');
    assert.deepEqual(await draftIds(page), beforeScrollOrder); await cancel(page);
    pass('native Chromium emulated touch handle drag works; row scrolling does not reorder');
    for (const held of [false, true]) {
      await open(page); const beforeMultiTouch = await draftIds(page);
      const handleBox = await source.boundingBox(), targetBox = await target.boundingBox();
      const point = { x: handleBox.x + 20, y: handleBox.y + 20, id: 1, radiusX: 3, radiusY: 3, force: 1 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      if (held) {
        await page.waitForTimeout(450);
        point.x = targetBox.x + 20; point.y = targetBox.y + 5;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
        assert(await source.evaluate(node => node.classList.contains('is-dragging')));
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point, { ...point, id: 2, x: point.x + 35 }] });
      await page.waitForTimeout(450);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.deepEqual(await draftIds(page), beforeMultiTouch);
      assert.equal(await page.locator('.is-dragging, .qs-drop-before, .qs-drop-after').count(), 0);
      await cancel(page);
      pass('second finger cancels ' + (held ? 'active shortcut dragging' : 'pending shortcut hold') + ' without reordering');
    }
    await cdp.detach();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  assert.equal(await page.locator('#qs-editor .qs-editor-card').evaluate(node => getComputedStyle(node).animationName), 'none'); await cancel(page);
  await page.screenshot({ path: '/tmp/heavenly-custom-' + engine + '.png' });
  const blocked = await context.newPage(); blocked.setDefaultTimeout(15000);
  await blocked.addInitScript(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'heavenly_settings') throw new Error('Storage blocked'); return original.call(this, key, value); }; });
  await blocked.goto(origin, { waitUntil: 'domcontentloaded' }); await ready(blocked); await blocked.locator('#quick-settings-edit-btn').click();
  const blockedBefore = await settings(); await blocked.locator('#qs-editor-visible [data-visibility]').first().click();
  await blocked.locator('#qs-editor-save').click(); assert(await blocked.locator('#qs-editor-error').isVisible());
  assert(await blocked.locator('#qs-editor').isVisible()); assert.deepEqual(await settings(), blockedBefore);
  await blocked.keyboard.press('Escape'); await blocked.close();
  pass('failed storage writes keep the draft open, report the failure and preserve saved preferences');
  assert.deepEqual(errors, []);
  pass('reduced motion is respected and browsers report no script errors');
  console.log(checks + ' customization checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => { server.closeAllConnections?.(); server.close(resolve); }); });
