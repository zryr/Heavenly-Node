// Contextual settings regressions using real engines and emulated device dimensions.
const assert = require('node:assert/strict');
const playwright = require('playwright');
const app = require('../../app');
const model = require('../../public/assets/quick-settings-model');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let browser, server, checks = 0;
function pass(message) { checks++; console.log('PASS ' + message); }
(async () => {
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'], headless: true } : { headless: true });
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 820, height: 1180 } });
  await context.addInitScript(() => { try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); localStorage.setItem('heavenly_quick_settings_expanded', 'true'); } catch {} });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  async function ready(target) { await target.locator('#qs-context-editor').waitFor({ state: 'attached' }); await target.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none'); }
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings') || '{}'));
  const values = () => page.evaluate(() => ['heavenly_bookmarks', 'heavenly_tabs', 'heavenly_history', 'heavenly_scroll_lock_pos', 'heavenly_magnifier_pos', 'heavenly_nav_pos', 'heavenly_panic_pos', 'heavenly_save_widget_pos', 'heavenly_lens_pos'].map(key => localStorage.getItem(key)));
  const initial = { autoCloak: false, persistentCloak: false, selectedPreset: 'classroom', useWidgetDock: true, dockPosition: 'left', showMagnifier: true, disableAllWidgets: false, futureFlag: { keep: true }, customPresets: { custom: { title: 'Custom Study Tab', icon: '/assets/heavenly-logo.png' } }, quickSettings: { order: ['pill-widgets', 'pill-widget-dock', ...model.layout({}).order.filter(id => !['pill-widgets', 'pill-widget-dock'].includes(id))], visible: [...model.layout({}).visible, 'pill-widgets', 'pill-widget-dock', 'pill-persistent-cloak'], showInfoIcons: false } };
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await ready(page);
  await page.evaluate(initial => {
    localStorage.setItem('heavenly_settings', JSON.stringify(initial));
    localStorage.setItem('heavenly_tabs', '["saved tab"]'); localStorage.setItem('heavenly_history', '[{"url":"https://example.com/","title":"Saved"}]');
    ['heavenly_scroll_lock_pos', 'heavenly_magnifier_pos', 'heavenly_nav_pos', 'heavenly_panic_pos', 'heavenly_save_widget_pos', 'heavenly_lens_pos'].forEach(key => localStorage.setItem(key, '{"left":30,"top":70}'));
  }, initial);
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
  let dataBefore = await values();
  assert.equal(await page.locator('#pill-tab-cloak').count(), 0);
  assert.equal(await page.locator('#quick-settings-info-btn').isVisible(), true);
  assert.equal(await page.locator('#quick-settings-tray .qs-help-button:visible').count(), 0);
  await page.locator('#quick-settings-edit-btn').tap(); await page.locator('#qs-editor-info-icons').check();
  assert.equal(await page.locator('#quick-settings-info-btn').isVisible(), false);
  assert.equal(await page.locator('#quick-settings-tray .qs-help-button:visible').count(), 8);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#quick-settings-info-btn').isVisible(), true);
  assert.deepEqual(await saved(), initial);
  await page.locator('#quick-settings-edit-btn').click(); await page.locator('#qs-editor-info-icons').check(); await page.locator('#qs-editor-save').click();
  assert.equal(await page.locator('#quick-settings-info-btn').isVisible(), false);
  await page.locator('#pill-proxy-url-info').tap(); await page.locator('#qs-help-popover.is-open').waitFor(); await page.keyboard.press('Escape');
  pass('individual and centralized information modes are exclusive, preview immediately, and Cancel restores the saved mode');

  const other = await context.newPage(); other.setDefaultTimeout(15000);
  await other.goto(origin + '/settings.html', { waitUntil: 'domcontentloaded' }); await ready(other);
  // Existing page-load migrations finish before testing unrelated preference writes.
  dataBefore = await values();
  await other.locator('#customize-quick-settings-btn').click(); await other.locator('#qs-editor-info-icons').uncheck(); await other.locator('#qs-editor-save').click();
  await page.bringToFront(); await page.waitForFunction(() => !document.getElementById('quick-settings-info-btn').hidden);
  assert.equal(await page.locator('#quick-settings-tray .qs-help-button:visible').count(), 0);
  await page.locator('#quick-settings-info-btn').tap(); await page.locator('#qs-help-popover.is-open').waitFor(); await page.keyboard.press('Escape');
  pass('saved info-mode changes synchronize across tabs and keep both help systems functional');

  async function open(mode, target = page, method = 'click') {
    await target.bringToFront();
    const trigger = target.locator(target === page ? mode === 'widgets' ? '#qs-widgets-config-btn' : '#pill-tab-cloak-config' : '[data-qs-config="' + mode + '"]');
    await trigger[method](); await target.locator('#qs-context-editor').waitFor({ state: 'visible' });
  }
  async function cancel(target = page) { await target.keyboard.press('Escape'); await target.locator('#qs-context-editor').waitFor({ state: 'hidden' }); }
  async function save(target = page) { await target.locator('#qs-context-save').click(); await target.locator('#qs-context-editor').waitFor({ state: 'hidden' }); }
  assert.equal(await page.locator('#quick-settings-tray [data-qs-config="widgets"]').count(), 1);
  await open('widgets', page, 'tap');
  const beforeWidget = await saved();
  await page.locator('#qs-config-useWidgetDock').uncheck(); await page.locator('#qs-config-dockPosition').selectOption('right'); await page.locator('#qs-config-showMagnifier').uncheck();
  await cancel(); assert.deepEqual(await saved(), beforeWidget);
  await open('widgets'); await page.locator('#qs-config-useWidgetDock').uncheck(); await page.locator('#qs-config-dockPosition').selectOption('right'); await page.locator('#qs-config-showMagnifier').uncheck(); await save();
  assert.equal((await saved()).useWidgetDock, false); assert.equal((await saved()).dockPosition, 'right'); assert.equal((await saved()).showMagnifier, false);
  assert.equal((await saved()).showScrollLock, undefined); // untouched defaults are not written
  assert.deepEqual((await saved()).quickSettings, beforeWidget.quickSettings); assert.deepEqual(await values(), dataBefore);
  await other.bringToFront(); await other.waitForFunction(() => document.getElementById('set-dock-position').value === 'right');
  assert.equal(await other.locator('#set-show-magnifier').isChecked(), false);
  assert.equal(await other.locator('#preview-dock-pos-select').inputValue(), 'right');
  pass('one widget gear opens staged existing controls; Save synchronizes Settings and retains positions, layout and untouched defaults');

  await other.locator('#set-dock-position').selectOption('top');
  await open('widgets'); assert.equal(await page.locator('#qs-config-dockPosition').inputValue(), 'top');
  await page.locator('#qs-config-dockPosition').selectOption('left');
  await other.bringToFront(); await other.locator('#set-dock-position').selectOption('bottom');
  await other.locator('label.switch-toggle:has(#set-show-nav-home)').click();
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('qs-context-save').disabled);
  assert.equal(await page.locator('#qs-config-dockPosition').inputValue(), 'left');
  assert.equal(await page.locator('#qs-config-showNavHome').isChecked(), false);
  await page.locator('#qs-context-keep').click(); await save();
  assert.equal((await saved()).dockPosition, 'left'); assert.equal((await saved()).showNavHome, false);
  await open('widgets'); await page.locator('#qs-config-dockPosition').selectOption('right');
  await other.bringToFront(); await other.locator('#set-dock-position').selectOption('top');
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('qs-context-save').disabled);
  await page.locator('#qs-context-load').click(); assert.equal(await page.locator('#qs-config-dockPosition').inputValue(), 'top');
  await cancel(); assert.equal((await saved()).dockPosition, 'top');
  await other.bringToFront(); await other.locator('#set-dock-position').selectOption('left');
  pass('external contextual changes retain edited fields, adopt untouched fields, and require explicit conflict resolution');

  await open('widgets'); await page.locator('#qs-config-disableAllWidgets').uncheck();
  assert(await page.locator('#qs-config-useWidgetDock').isDisabled()); await save();
  assert.equal((await saved()).disableAllWidgets, true);
  assert.equal((await saved()).useWidgetDock, false);
  await open('widgets'); await page.locator('#qs-config-disableAllWidgets').check(); await save();
  await open('widgets'); await page.locator('#qs-config-showScrollLock').uncheck();
  await other.bringToFront(); await other.locator('details:has(#set-disable-all-features) > summary').click(); await other.locator('label.switch-toggle:has(#set-disable-all-features)').click();
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('qs-config-showScrollLock').disabled);
  await page.locator('#qs-context-save').click(); assert(await page.locator('#qs-context-error').isVisible());
  assert.equal((await saved()).showScrollLock, true); await cancel();
  await other.bringToFront(); await other.locator('label.switch-toggle:has(#set-disable-all-features)').click();
  pass('widget master controls disable dependent inputs, preserve choices and prevent stale drafts from bypassing an external master');

  await page.bringToFront(); await page.locator('#quick-settings-edit-btn').click(); await page.locator('#qs-editor-more summary').click(); await page.locator('[data-visibility="pill-tab-cloak"]').click(); await page.locator('#qs-editor-save').click();
  assert.equal(await page.locator('#pill-tab-cloak').getAttribute('aria-pressed'), 'false');
  const addedLayout = (await saved()).quickSettings;
  await page.locator('#pill-tab-cloak').tap(); assert.equal((await saved()).autoCloak, true);
  await other.bringToFront(); await other.waitForFunction(() => document.getElementById('set-auto-cloak').checked);
  await page.bringToFront(); assert.equal(await page.locator('#pill-tab-cloak-config').count(), 1);
  assert.equal(await page.locator('#pill-persistent-cloak-config').count(), 0);
  pass('Tab Cloaking is opt-in, controls existing Auto Cloak, synchronizes Settings and has its own gear without duplicating Persistent gear');

  await open('cloaking', page, 'tap');
  const beforeCloak = await saved();
  await page.locator('#qs-config-selectedPreset').selectOption('custom');
  assert.equal(await page.locator('#qs-context-preview-title').innerText(), 'Custom Study Tab');
  assert.equal((await saved()).selectedPreset, 'classroom'); await cancel(); assert.deepEqual(await saved(), beforeCloak);
  await open('cloaking'); await page.locator('#qs-config-selectedPreset').selectOption('custom'); await save();
  assert.equal((await saved()).autoCloak, true); assert.equal((await saved()).persistentCloak, false); assert.equal((await saved()).selectedPreset, 'custom');
  assert.deepEqual((await saved()).quickSettings, addedLayout);
  await page.locator('#pill-persistent-cloak').click(); assert.equal(await page.title(), 'Custom Study Tab');
  await open('cloaking'); assert.equal(await page.locator('#qs-config-persistentCloak').isChecked(), true);
  await page.locator('#qs-config-selectedPreset').selectOption('google'); await save();
  assert.equal((await saved()).persistentCloak, true); assert.equal(await page.title(), 'Google');
  await other.bringToFront(); await other.waitForFunction(() => document.getElementById('preset-select').value === 'google');
  assert.equal(await other.locator('#set-persistent-cloak').isChecked(), true);
  await page.bringToFront(); await open('cloaking'); await page.locator('#qs-config-persistentCloak').uncheck(); await save();
  assert.equal(await page.locator('#pill-persistent-cloak').getAttribute('aria-pressed'), 'false');
  pass('saved/custom presets preview without writing; selecting presets never changes cloak toggles and both Persistent interfaces synchronize');

  await page.locator('#quick-settings-edit-btn').click();
  await page.locator('[data-visibility="pill-widgets"]').click(); await page.locator('[data-visibility="pill-widget-dock"]').click(); await page.locator('[data-visibility="pill-tab-cloak"]').click(); await page.locator('#qs-editor-save').click();
  assert.equal(await page.locator('#qs-widgets-config-btn').count(), 0); assert.equal(await page.locator('#pill-tab-cloak-config').count(), 0);
  await open('widgets', other); assert.equal(await other.locator('#qs-config-dockPosition').inputValue(), 'left'); await cancel(other);
  await open('cloaking', other); assert.equal(await other.locator('#qs-config-selectedPreset').inputValue(), 'google'); await cancel(other);
  assert.equal((await saved()).autoCloak, true);
  pass('hiding groups removes their gears without changing values; both contextual editors remain accessible in Settings');

  for (const [name, width, height] of [['phone', 320, 740], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['Chromebook', 1366, 768], ['desktop', 1920, 1080]]) {
    await other.setViewportSize({ width, height });
    for (const mode of ['widgets', 'cloaking']) {
      await open(mode, other, 'tap');
      const box = await other.locator('#qs-context-editor [role="dialog"]').boundingBox();
      assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
      assert(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await other.locator('#qs-context-save').focus(); await other.keyboard.press('Tab');
      assert(await other.locator('#qs-context-editor .qs-editor-header [data-dialog-close]').evaluate(node => node === document.activeElement));
      await other.keyboard.press('Shift+Tab'); assert(await other.locator('#qs-context-save').evaluate(node => node === document.activeElement));
      if (width === 820) await other.screenshot({ path: '/tmp/heavenly-context-' + engine + '-' + mode + '.png' });
      await cancel(other);
    }
    pass(name + ' contextual editors fit without overflow and support touch, trapped keyboard focus and Escape');
  }
  await other.emulateMedia({ reducedMotion: 'reduce' }); await open('cloaking', other);
  assert.equal(await other.locator('#qs-context-editor .qs-editor-card').evaluate(node => getComputedStyle(node).animationName), 'none');
  const advanced = await other.locator('#qs-context-advanced').getAttribute('href'); assert.equal(advanced, '/settings.html#tab-cloaking');
  await other.locator('#qs-context-advanced').click(); await other.locator('#qs-context-editor').waitFor({ state: 'hidden' });
  assert.equal(new URL(other.url()).hash, '#tab-cloaking');
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
  assert.equal((await saved()).selectedPreset, 'google'); assert.equal((await saved()).dockPosition, 'left'); assert.deepEqual(await values(), dataBefore);
  assert.deepEqual((await saved()).futureFlag, { keep: true }); assert.deepEqual(errors, []);
  pass('refresh persistence, advanced links, reduced motion, user-data preservation and absence of browser script errors');
  console.log(checks + ' contextual checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => { server.closeAllConnections?.(); server.close(resolve); }); });
