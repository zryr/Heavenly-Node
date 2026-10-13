// Native engines and simulated viewports; no physical-device verification.
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
  const errors = [], page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none');
  const ids = model.items.map(item => item.id), missing = 'pill-panic-settings';
  const initial = { autoCloak: false, persistentCloak: false, panicKeyEnable: true, panicKey: 'F8', panicUrl: 'https://classroom.google.com', touchPanic: false, dockPosition: 'right', futurePreference: { keep: true }, quickSettings: { order: [...ids].reverse(), visible: ids.filter(id => id !== missing), showInfoIcons: false, futureLayout: true } };
  await page.evaluate(settings => { localStorage.setItem('heavenly_settings', JSON.stringify(settings)); dispatchEvent(new CustomEvent('heavenly:settings-change')); }, initial);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')));
  const editor = page.locator('#qs-editor'), more = page.locator('#qs-editor-more');
  const open = async () => { await page.locator('#quick-settings-edit-btn').tap(); await editor.waitFor({ state: 'visible' }); };
  await open(); assert(await more.isVisible()); await more.locator('summary').click();
  assert.equal(await page.locator('#qs-editor-available > li').count(), 1);
  await page.locator('[data-visibility="' + missing + '"]').click();
  assert.equal(await more.isVisible(), false); assert.equal(await more.evaluate(node => node.open), false);
  assert.equal(await page.locator('#qs-editor-available > li').count(), 0);
  assert(await page.locator('#qs-editor-visible [data-visibility="' + missing + '"]').evaluate(node => node === document.activeElement));
  assert.deepEqual(await saved(), initial);
  pass('adding the final catalog shortcut closes/hides the empty section immediately, keeps focus and stages values');
  await page.locator('[data-visibility="pill-tab-cloak"]').click(); assert(await more.isVisible()); assert.equal(await more.evaluate(node => node.open), false);
  assert(await more.locator('summary').evaluate(node => node === document.activeElement));
  await page.keyboard.press('Enter'); await page.locator('[data-visibility="pill-tab-cloak"]').tap(); assert.equal(await more.isVisible(), false);
  await page.keyboard.press('Escape'); assert.deepEqual(await saved(), initial);
  await open(); assert(await more.isVisible()); await more.locator('summary').click(); await page.locator('[data-visibility="' + missing + '"]').click(); await page.locator('#qs-editor-save').click();
  const current = await saved(); assert.deepEqual(current.quickSettings.order, initial.quickSettings.order); assert.equal(current.quickSettings.futureLayout, true);
  assert.deepEqual(Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'quickSettings')), Object.fromEntries(Object.entries(initial).filter(([key]) => key !== 'quickSettings')));
  await open(); assert.equal(await more.isVisible(), false); await page.locator('[data-visibility="pill-widgets"]').click(); assert(await more.isVisible()); await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none'); await open(); assert.equal(await more.isVisible(), false); await page.keyboard.press('Escape');
  pass('Hide restores available shortcuts; Cancel, Save, reopening and refresh preserve ordering, preferences and catalog-derived visibility');

  const gears = ['#qs-widgets-config-btn', '#pill-tab-cloak-config', '#pill-panic-settings-config'];
  const shapes = await Promise.all(gears.map(selector => page.locator(selector + ' svg').innerHTML())); assert(shapes.every(shape => shape === shapes[0])); assert(shapes[0].includes('M19.4 15')); assert(shapes[0].includes('circle'));
  const original = await saved();
  for (const [selector, title] of [[gears[0], 'Widget settings'], [gears[1], 'Tab Cloaking'], [gears[2], 'Panic Controls']]) {
    await page.locator(selector).focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('#qs-context-title').innerText(), title); await page.keyboard.press('Escape');
    assert(await page.locator(selector).evaluate(node => node === document.activeElement)); assert.deepEqual(await saved(), original);
  }
  pass('one familiar gear glyph opens each correct editor by keyboard without toggling preferences, and restores focus');

  async function scrollbar(selector) {
    await page.mouse.move(1, 1);
    const styles = await page.locator(selector).evaluate(node => { const css = getComputedStyle(node); return { scheme: css.colorScheme, width: css.scrollbarWidth, colors: css.scrollbarColor, overflow: css.overflowY, thumb: css.getPropertyValue('--qs-scroll-thumb').trim() }; });
    assert.equal(styles.scheme, 'dark'); assert.equal(styles.thumb, '#64748b'); assert.equal(styles.overflow, 'auto');
    if (await page.evaluate(() => CSS.supports('scrollbar-width', 'thin'))) {
      // Firefox may resolve thin to none for touch-mode native overlay scrollbars.
      if (engine === 'firefox' && styles.width === 'none') assert(await page.evaluate(() => Array.from(document.styleSheets).filter(sheet => sheet.href && sheet.href.endsWith('/assets/quick-settings.css')).some(sheet => Array.from(sheet.cssRules).some(rule => rule.selectorText && rule.selectorText.includes('.qs-editor-body,') && rule.style.scrollbarWidth === 'thin'))));
      else assert.equal(styles.width, 'thin');
    }
    if (await page.evaluate(() => CSS.supports('scrollbar-color', '#64748b transparent'))) assert(styles.colors.includes('100, 116, 139'));
    const overflows = await page.locator(selector).evaluate(node => { node.scrollTop = 0; return node.scrollHeight > node.clientHeight; });
    if (overflows) {
      await page.locator(selector).hover(); await page.mouse.wheel(0, 160);
      await page.waitForFunction(selector => document.querySelector(selector).scrollTop > 0, selector);
    }
    await page.locator(selector).evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert(await page.locator(selector).evaluate(node => node.scrollHeight <= node.clientHeight || node.scrollTop > 0));
  }
  for (const [name, width, height] of [['phone', 320, 740], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['Chromebook', 1366, 768], ['desktop', 1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const label = await page.locator('[aria-label="Widgets shortcuts"] .qs-group-label').boundingBox(), gear = await page.locator(gears[0]).boundingBox();
    assert(Math.abs(label.y + label.height / 2 - gear.y - gear.height / 2) < 1);
    assert(gear.x - label.x - label.width >= 0 && gear.x - label.x - label.width <= 5);
    for (const selector of gears) { const box = await page.locator(selector).boundingBox(); assert(box.width >= 43.999 && box.height >= 43.999); }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#quick-settings-info-btn').tap(); await page.waitForTimeout(180);
    const guide = await page.locator('#qs-help-popover').boundingBox(); assert(guide.x >= 0 && guide.y >= 0 && guide.x + guide.width <= width && guide.y + guide.height <= height);
    await scrollbar('#qs-help-text');
    if (engine === 'chromium' && [820, 1366].includes(width)) await page.screenshot({ path: '/tmp/heavenly-polish-guide-' + width + '.png' });
    await page.keyboard.press('Escape'); await open(); await scrollbar('#qs-editor .qs-editor-body');
    if (engine === 'chromium' && width === 820) await page.screenshot({ path: '/tmp/heavenly-polish-editor.png' });
    await page.keyboard.press('Escape'); await page.locator(gears[0]).tap(); assert.equal(await page.locator('#qs-context-title').innerText(), 'Widget settings'); await page.keyboard.press('Escape');
    pass(name + ': heading-adjacent 44px gears, native dark scrollbars, scrolling and responsive dialogs');
  }
  await open(); await page.locator('#qs-editor-info-icons').focus(); assert.equal(await page.locator('#qs-editor .qs-editor-body').evaluate(node => getComputedStyle(node).getPropertyValue('--qs-scroll-thumb').trim()), '#38bdf8'); await page.keyboard.press('Escape');
  assert.deepEqual(await saved(), original); assert.deepEqual(errors, []);
  pass('focus provides cyan scrollbar feedback without changing settings or causing script errors');
  console.log(checks + ' polish checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.closeAllConnections?.(); if (server) await new Promise(resolve => server.close(resolve)); });
