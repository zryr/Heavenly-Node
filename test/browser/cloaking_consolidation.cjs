// Shared cloaking editor and legacy layout migration in native engines, emulated devices.
const assert = require('node:assert/strict');
const playwright = require('playwright');
const app = require('../../app');
const model = require('../../public/assets/quick-settings-model');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let browser, server, checks = 0;
const pass = message => { checks++; console.log('PASS ' + message); };
(async () => {
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 820, height: 1180 } });
  await context.addInitScript(() => { try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); localStorage.setItem('heavenly_quick_settings_expanded', 'true'); } catch {} });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const errors = []; context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const ready = async target => { await target.locator('#qs-context-editor').waitFor({ state: 'attached' }); await target.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none'); };
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await ready(page);
  const initial = { persistentCloak: true, autoCloak: false, randomizePresetEachSession: false, selectedPreset: 'google', randomPool: ['google', 'custom', 'unavailable'], customPresets: { custom: { title: 'Study Custom', icon: '/assets/heavenly-logo.png' } }, futurePreference: { keep: true }, panicKey: 'F8', quickSettings: { order: ['pill-panic-settings', 'pill-persistent-cloak', 'pill-proxy-url', 'pill-tab-cloak', 'pill-bm-blank', 'future-shortcut'], visible: ['pill-panic-settings', 'pill-persistent-cloak', 'pill-proxy-url', 'pill-bm-blank', 'future-shortcut'], futureLayout: true, showInfoIcons: false } };
  const patch = async (target, values) => target.evaluate(values => { const settings = JSON.parse(localStorage.getItem('heavenly_settings') || '{}'); Object.assign(settings, values); localStorage.setItem('heavenly_settings', JSON.stringify(settings)); dispatchEvent(new CustomEvent('heavenly:settings-change')); }, values);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')));
  await patch(page, initial);
  assert.equal(await page.locator('#pill-persistent-cloak').count(), 0); assert.equal(await page.locator('#pill-tab-cloak').count(), 1);
  assert.equal(await page.locator('#pill-tab-cloak').getAttribute('aria-pressed'), 'false'); assert.equal(await page.locator('#pill-tab-cloak').getAttribute('aria-label'), 'Auto Tab Cloaking'); assert(await page.locator('#pill-tab-cloak').evaluate(node => node.classList.contains('active')));
  assert.equal(await page.locator('#pill-tab-cloak .qs-required').innerText(), 'Persistent'); assert.deepEqual(await saved(), initial);
  await page.locator('#pill-tab-cloak').tap(); assert.equal((await saved()).autoCloak, true); assert.equal((await saved()).persistentCloak, true); assert.equal(await page.locator('#pill-tab-cloak .qs-required').innerText(), 'Auto + Persistent');
  await page.locator('#pill-tab-cloak').tap(); assert.equal((await saved()).autoCloak, false); assert.equal(await page.title(), 'Google');
  await page.locator('#quick-settings-edit-btn').click(); assert.equal(await page.locator('[data-visibility="pill-persistent-cloak"]').count(), 0);
  assert.deepEqual(await page.locator('#qs-editor-visible > li').evaluateAll(nodes => nodes.map(node => node.dataset.shortcut)), ['pill-panic-settings', 'pill-tab-cloak', 'pill-proxy-url', 'pill-bm-blank']);
  await page.locator('#qs-editor-save').click(); const migrated = (await saved()).quickSettings;
  assert(!migrated.order.includes('pill-persistent-cloak')); assert(migrated.order.includes('future-shortcut')); assert(migrated.visible.includes('future-shortcut')); assert.equal(migrated.futureLayout, true);
  assert.deepEqual(migrated.order.slice(0, 4), ['pill-panic-settings', 'pill-tab-cloak', 'pill-proxy-url', 'pill-bm-blank']);
  pass('visible legacy shortcut migrates in place; one pill toggles Auto while accurately showing independent Persistent state');

  const other = await context.newPage(); other.setDefaultTimeout(15000); await other.goto(origin + '/settings.html', { waitUntil: 'domcontentloaded' }); await ready(other);
  assert.equal(await other.locator('[data-qs-config="cloaking"]').count(), 0); assert(await other.locator('#set-persistent-cloak').isChecked()); assert.equal(await other.locator('#preset-select').inputValue(), 'google');
  pass('redundant Settings Configure action is removed while full Persistent, preset and randomization controls remain');
  const open = async () => { await page.bringToFront(); await page.locator('#pill-tab-cloak-config').tap(); await page.locator('#qs-context-editor').waitFor({ state: 'visible' }); };
  const save = async () => { await page.locator('#qs-context-save').click(); await page.locator('#qs-context-editor').waitFor({ state: 'hidden' }); };
  const cancel = async () => { await page.keyboard.press('Escape'); await page.locator('#qs-context-editor').waitFor({ state: 'hidden' }); };
  const chip = key => page.locator('#qs-context-pool-chips [data-pool-preset="' + key + '"]');
  await open(); assert.equal(await page.locator('#qs-context-pool').evaluate(node => node.open), false); assert.equal(await page.locator('#qs-context-pool-count').innerText(), '2 selected'); assert.equal(await page.locator('#qs-context-pool-chips button').count(), 0);
  assert(await page.locator('#qs-config-persistentCloak').isChecked()); assert.equal(await page.locator('#qs-config-randomizePresetEachSession').isChecked(), false);
  await page.locator('#qs-config-selectedPreset').selectOption('custom'); assert.equal(await page.locator('#qs-context-preview-title').innerText(), 'Study Custom');
  await page.locator('#qs-config-randomizePresetEachSession').check(); await page.locator('#qs-context-pool summary').click(); await chip('google').click();
  assert.equal(await page.locator('#qs-context-save').isDisabled(), false); assert.equal(await chip('google').getAttribute('aria-pressed'), 'false'); assert.equal(await chip('custom').getAttribute('aria-pressed'), 'true');
  assert((await page.locator('#qs-context-pool-note').innerText()).includes('unavailable entries are kept')); const beforeCancel = await saved(); await cancel(); assert.deepEqual(await saved(), beforeCancel);
  pass('behavior/identity/pool edits stay staged, custom preview works and Cancel preserves every saved field');

  await open(); await page.locator('#qs-context-pool summary').click(); await chip('google').tap(); await save();
  assert.deepEqual((await saved()).randomPool, ['custom', 'unavailable']); assert.equal((await saved()).randomizePresetEachSession, false); assert.equal((await saved()).selectedPreset, 'google');
  await open(); await page.locator('#qs-config-randomizePresetEachSession').check(); await save();
  assert.equal(await page.title(), 'Study Custom'); assert.equal((await saved()).selectedPreset, 'google'); assert.equal((await saved()).persistentCloak, true); assert.equal((await saved()).autoCloak, false);
  await other.bringToFront(); await other.waitForFunction(() => document.getElementById('set-randomize-preset-session').checked); assert.equal(await other.locator('#random-pool-chips [data-pool-preset="custom"]').getAttribute('aria-pressed'), 'true');
  pass('pool is editable while randomization is off; enabling reuses existing session rules and synchronizes Settings without changing manual identity or cloak modes');
  await open(); await page.locator('#qs-config-selectedPreset').selectOption('docs'); await save(); assert.equal((await saved()).selectedPreset, 'docs'); assert.equal(await page.title(), 'Study Custom');
  await open(); await page.locator('#qs-config-randomizePresetEachSession').uncheck(); await save(); assert.equal(await page.title(), 'Google Docs'); assert.deepEqual((await saved()).randomPool, ['custom', 'unavailable']);
  pass('manual presets are remembered during randomization and return when it is disabled; the pool remains unchanged');

  await open(); await page.locator('#qs-context-pool summary').click(); await page.locator('#qs-context-pool-all').click(); assert.equal(await chip('custom').getAttribute('aria-pressed'), 'true');
  await save(); assert((await saved()).randomPool.includes('unavailable')); assert((await saved()).randomPool.includes('custom'));
  await open(); await page.locator('#qs-context-pool summary').click(); await page.locator('#qs-context-pool-none').click(); assert.equal(await page.locator('#qs-context-pool-count').innerText(), '0 selected'); assert((await page.locator('#qs-context-pool-note').innerText()).includes('uses all available presets')); await save(); assert.deepEqual((await saved()).randomPool, []);
  await open(); await page.locator('#qs-config-randomizePresetEachSession').check(); await save();
  assert.equal((await saved()).selectedPreset, 'docs'); assert.deepEqual((await saved()).randomPool, []); assert(await page.evaluate(() => !!sessionStorage.getItem('heavenly_session_preset')));
  pass('Select All retains saved unavailable/custom entries; Deselect All preserves the existing empty-pool fallback and never resets manual selection');

  await open(); await page.locator('#qs-context-pool summary').click(); await chip('google').click();
  await other.bringToFront(); await other.locator('#pool-select-all-btn').click(); await other.locator('label.switch-toggle:has(#set-auto-cloak)').click();
  await page.bringToFront(); await page.waitForFunction(() => document.getElementById('qs-context-save').disabled);
  assert.equal(await chip('google').getAttribute('aria-pressed'), 'true'); assert.equal(await chip('custom').getAttribute('aria-pressed'), 'false'); assert(await page.locator('#qs-config-autoCloak').isChecked());
  await page.locator('#qs-context-keep').click(); await save(); assert.deepEqual((await saved()).randomPool, ['google']); assert.equal((await saved()).autoCloak, true);
  await open(); await page.locator('#qs-context-pool summary').click(); await chip('custom').click(); await patch(other, { randomPool: ['docs'] });
  await page.waitForFunction(() => document.getElementById('qs-context-save').disabled); await page.locator('#qs-context-load').click(); assert.equal(await chip('docs').getAttribute('aria-pressed'), 'true'); assert.equal(await chip('custom').getAttribute('aria-pressed'), 'false'); await cancel();
  pass('array conflicts retain pool drafts, adopt untouched external toggles and require explicit Keep or Load');

  for (const [name, width, height] of [['phone', 320, 740], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['Chromebook', 1366, 768], ['desktop', 1920, 1080]]) {
    await page.setViewportSize({ width, height }); await open(); await page.locator('#qs-context-pool summary').tap();
    const dialog = await page.locator('#qs-context-editor [role="dialog"]').boundingBox(); assert(dialog.x >= 0 && dialog.y >= 0 && dialog.x + dialog.width <= width && dialog.y + dialog.height <= height);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#qs-context-editor .qs-editor-body').hover(); await page.mouse.wheel(0, 300); await page.waitForFunction(() => document.querySelector('#qs-context-editor .qs-editor-body').scrollTop > 0);
    await page.locator('#qs-context-save').focus(); await page.keyboard.press('Tab'); assert(await page.locator('#qs-context-editor .qs-editor-header [data-dialog-close]').evaluate(node => node === document.activeElement));
    if (engine === 'chromium' && [820, 1180].includes(width)) await page.screenshot({ path: '/tmp/heavenly-consolidated-cloak-' + width + '.png' });
    await cancel(); pass(name + ' expanded pool uses native scrolling, fits the viewport and keeps footer/keyboard navigation usable');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(); assert.equal(await page.locator('#qs-context-editor .qs-editor-card').evaluate(node => getComputedStyle(node).animationName), 'none'); await cancel();
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page); assert.equal((await saved()).persistentCloak, true); assert.deepEqual((await saved()).futurePreference, { keep: true }); assert.equal((await saved()).panicKey, 'F8'); assert.deepEqual((await saved()).quickSettings, migrated);
  assert.deepEqual(errors, []); pass('reload, reduced motion, preserved customization/data and browser scripts remain reliable');
  console.log(checks + ' cloaking consolidation checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.closeAllConnections?.(); if (server) await new Promise(resolve => server.close(resolve)); });
