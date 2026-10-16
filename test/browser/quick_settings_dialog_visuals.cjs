// Native browser engines with simulated screens; no physical-device claims.
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
  // Desktop mode deliberately retains Firefox's non-overlay viewport scrollbar.
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); localStorage.setItem('heavenly_quick_settings_expanded', 'true'); });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage(), errors = []; page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none');
  const initial = { autoCloak: false, persistentCloak: false, randomizePresetEachSession: false, panicKeyEnable: true, panicKey: 'F8', panicUrl: 'https://classroom.google.com', touchPanic: false, unrelated: { keep: true }, quickSettings: { order: model.items.map(item => item.id), visible: model.items.map(item => item.id), showInfoIcons: false } };
  await page.evaluate(settings => { localStorage.setItem('heavenly_settings', JSON.stringify(settings)); dispatchEvent(new CustomEvent('heavenly:settings-change')); }, initial);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')));
  async function switchGeometry() {
    const rows = await page.locator('#qs-context-controls input[type=checkbox]').evaluateAll(inputs => inputs.map(input => {
      const box = input.getBoundingClientRect(), label = input.closest('label').getBoundingClientRect(), track = input.nextElementSibling, css = getComputedStyle(track), knob = getComputedStyle(track, '::before');
      return { role: input.getAttribute('role'), label: input.labels.length, width: box.width, height: box.height, inside: box.left >= label.left && box.right <= label.right && box.top >= label.top && box.bottom <= label.bottom, target: label.height, radius: css.borderRadius, knob: knob.width, transform: knob.transform, checked: input.checked };
    }));
    assert(rows.length); for (const row of rows) { assert.equal(row.role, 'switch'); assert(row.label); assert(Math.abs(row.width - 48) < .01); assert(Math.abs(row.height - 26) < .01); assert(row.inside); assert(row.target >= 48); assert.equal(row.radius, '30px'); assert.equal(row.knob, '18px'); }
  }
  const root = await page.evaluate(() => { const css = getComputedStyle(document.documentElement); return { color: css.scrollbarColor, width: css.scrollbarWidth, scheme: css.colorScheme }; });
  assert.equal(root.scheme, 'dark'); if (root.color) assert(root.color.includes('71, 85, 105')); if (root.width && root.width !== 'none') assert.equal(root.width, 'thin');
  assert(await page.evaluate(() => Array.from(document.styleSheets).filter(sheet => sheet.href && sheet.href.endsWith('/assets/quick-settings.css')).some(sheet => Array.from(sheet.cssRules).some(rule => rule.selectorText === 'html.qs-homepage' && rule.style.scrollbarWidth === 'thin'))));
  // Force deterministic overflow independently of the user's saved bookmarks.
  await page.evaluate(() => { const fixture = document.createElement('div'); fixture.id = 'scroll-fixture'; fixture.style.cssText = 'height:1800px;width:1px;flex-shrink:0'; document.body.appendChild(fixture); });
  await page.mouse.move(15, 400); await page.mouse.wheel(0, 300); await page.waitForFunction(() => scrollY > 0);
  await page.evaluate(() => { scrollTo(0, 0); document.activeElement.blur(); }); await page.keyboard.press('PageDown'); await page.waitForFunction(() => scrollY > 0);
  await page.evaluate(() => { document.getElementById('scroll-fixture').remove(); scrollTo(0, 0); });
  pass('desktop homepage uses dark native viewport colors and retains wheel/keyboard page scrolling');
  await page.locator('#quick-settings-info-btn').click(); await page.waitForTimeout(180);
  await page.mouse.move(1, 1);
  assert.equal(await page.locator('#qs-help-text').evaluate(node => getComputedStyle(node).getPropertyValue('--qs-scroll-thumb').trim()), '#8975a5');
  await page.locator('#qs-help-text summary').first().focus();
  assert.equal(await page.locator('#qs-help-text').evaluate(node => getComputedStyle(node).getPropertyValue('--qs-scroll-thumb').trim()), '#c084fc');
  await page.keyboard.press('Enter'); assert(await page.locator('#qs-help-text details').first().evaluate(node => node.open)); await page.keyboard.press('Escape');
  pass('purple guide scrollbars have purple focus feedback and preserve accordion/dismissal behavior');
  for (const [mode, selector] of [['cloaking', '#pill-tab-cloak-config'], ['panic', '#pill-panic-settings-config'], ['widgets', '#qs-widgets-config-btn']]) {
    await page.locator(selector).click(); await switchGeometry(); await page.keyboard.press('Escape'); assert.deepEqual(await saved(), initial);
  }
  pass('all contextual dialogs have labelled full-size switches inside touch targets; dismissal leaves settings untouched');
  await page.locator('#pill-tab-cloak-config').click();
  const auto = page.locator('#qs-config-autoCloak'); await page.bringToFront(); await auto.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Space'); assert(await auto.isChecked());
  await page.waitForFunction(() => getComputedStyle(document.getElementById('qs-config-autoCloak').nextElementSibling, '::before').transform === 'matrix(1, 0, 0, 1, 22, 0)');
  assert.equal(await auto.evaluate(input => getComputedStyle(input.nextElementSibling).outlineStyle), 'solid');
  assert.equal(await auto.evaluate(input => getComputedStyle(input.nextElementSibling, '::before').transform), 'matrix(1, 0, 0, 1, 22, 0)');
  assert.deepEqual(await saved(), initial); await page.locator('#qs-context-save').click(); assert.equal((await saved()).autoCloak, true); assert.equal((await saved()).persistentCloak, false); assert.deepEqual((await saved()).unrelated, initial.unrelated);
  await page.locator('#pill-tab-cloak-config').click(); await auto.click(); assert.equal(await auto.isChecked(), false); await page.keyboard.press('Escape'); assert.equal((await saved()).autoCloak, true);
  pass('keyboard and pointer switch states/focus work, Save patches existing preferences and Cancel discards drafts');
  await page.evaluate(() => { const settings = JSON.parse(localStorage.getItem('heavenly_settings')); settings.disableAllFeatures = true; localStorage.setItem('heavenly_settings', JSON.stringify(settings)); dispatchEvent(new CustomEvent('heavenly:settings-change')); });
  await page.locator('#pill-tab-cloak-config').click(); assert(await auto.isDisabled()); assert.equal(await auto.evaluate(input => getComputedStyle(input.nextElementSibling).opacity), '0.5'); await page.keyboard.press('Escape');
  await page.evaluate(() => { const settings = JSON.parse(localStorage.getItem('heavenly_settings')); delete settings.disableAllFeatures; localStorage.setItem('heavenly_settings', JSON.stringify(settings)); dispatchEvent(new CustomEvent('heavenly:settings-change')); });
  pass('master-paused switches remain disabled and visibly unavailable without altering feature state');
  const edit = page.locator('#quick-settings-edit-btn'), info = page.locator('#qs-editor-info-icons');
  const beforeInfo = await saved(); await edit.click(); await info.scrollIntoViewIfNeeded(); await info.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Space');
  assert(await info.isChecked()); assert.equal(await info.evaluate(node => node.getAttribute('role')), 'switch');
  assert.equal(await info.evaluate(node => getComputedStyle(node.nextElementSibling).outlineStyle), 'solid');
  assert.deepEqual(await saved(), beforeInfo); await page.keyboard.press('Escape');
  await edit.click(); assert.equal(await info.isChecked(), false); await info.check(); await page.locator('#qs-editor-save').click();
  assert.equal((await saved()).quickSettings.showInfoIcons, true); assert.equal(await page.locator('#quick-settings-info-btn').isVisible(), false);
  await edit.click(); await info.uncheck(); await page.locator('#qs-editor-save').click(); assert.deepEqual(await saved(), beforeInfo);
  pass('customization uses the same labelled switch, keyboard focus and staged Save/Cancel without changing unrelated settings');
  for (const [width, height] of [[320,740], [820,1180], [1180,820], [1366,768], [1920,1080]]) {
    await page.setViewportSize({ width, height });
    await edit.click(); await info.scrollIntoViewIfNeeded();
    const geometry = await info.evaluate(input => { const box=input.getBoundingClientRect(), label=input.closest('label').getBoundingClientRect();return { width:box.width,height:box.height,inside:box.left>=label.left&&box.right<=label.right&&box.top>=label.top&&box.bottom<=label.bottom,target:label.height }; });
    assert(Math.abs(geometry.width-48)<.01);assert(Math.abs(geometry.height-26)<.01);assert(geometry.inside);assert(geometry.target>=48);
    if (engine === 'firefox' && width === 820) await page.screenshot({path:'/tmp/heavenly-fixed-info-firefox.png',animations:'disabled'});
    await page.keyboard.press('Escape');
    for (const selector of ['#pill-tab-cloak-config', '#pill-panic-settings-config', '#qs-widgets-config-btn']) {
      await page.locator(selector).click(); await switchGeometry();
      if (selector.includes('cloak')) {
        if (width === 820) await page.screenshot({ path: '/tmp/heavenly-dialog-' + engine + '-collapsed-820.png', animations: 'disabled' });
        await page.locator('#qs-context-pool summary').click();
      }
      const card = await page.locator('.qs-context-card').boundingBox(), save = await page.locator('#qs-context-save').boundingBox();
      assert(card.x >= 0 && card.y >= 0 && card.x + card.width <= width && card.y + card.height <= height); assert(save.y + save.height <= height);
      assert(await page.locator('.qs-context-card').evaluate(node => node.scrollWidth <= node.clientWidth));
      const body = page.locator('#qs-context-editor .qs-editor-body');
      if (await body.evaluate(node => node.scrollHeight > node.clientHeight)) { await body.hover(); await page.mouse.wheel(0, 180); await page.waitForFunction(() => document.querySelector('#qs-context-editor .qs-editor-body').scrollTop > 0); }
      if (engine === 'firefox' && width === 820 && selector.includes('cloak')) await page.screenshot({ path: '/tmp/heavenly-dialog-firefox-820.png' });
      await page.keyboard.press('Escape');
    }
    pass(width + 'px: all editors fit, switch labels remain aligned and footers stay reachable during native scrolling');
  }
  if (engine === 'chromium') {
    await page.setViewportSize({ width: 820, height: 1180 });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    async function tap(selector) {
      await page.locator(selector).scrollIntoViewIfNeeded(); const box = await page.locator(selector).boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await tap('#pill-tab-cloak-config'); await page.locator('#qs-context-editor').waitFor({ state: 'visible' });
    const before = await page.locator('#qs-config-persistentCloak').isChecked(); await tap('#qs-config-persistentCloak');
    assert.equal(await page.locator('#qs-config-persistentCloak').isChecked(), !before); assert.equal((await saved()).persistentCloak, false);
    await page.locator('#qs-context-pool summary').click();
    const body = page.locator('#qs-context-editor .qs-editor-body'); await body.evaluate(node => { node.scrollTop = 0; });
    const box = await body.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height * .8;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 30 }] }); await page.waitForTimeout(25); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => document.querySelector('#qs-context-editor .qs-editor-body').scrollTop > 0);
    assert(await page.locator('#qs-context-save').isVisible()); await page.keyboard.press('Escape');
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await cdp.detach();
    pass('Chromium emulated touch toggles staged switches and swipes long modal content with the footer accessible');
  }
  await page.goto(origin + '/settings.html', { waitUntil: 'domcontentloaded' }); await page.locator('#set-auto-cloak').waitFor({ state: 'attached' });
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('qs-homepage')), false);
  await page.locator('[data-qs-config="panic"]').click(); await switchGeometry(); await page.keyboard.press('Escape');
  pass('shared switches render on Settings too, with homepage scrollbar styling kept scoped');
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('#pill-tab-cloak-config').click(); assert.equal(await page.locator('.qs-switch-track').first().evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  if (engine === 'chromium') { await page.emulateMedia({ forcedColors: 'active' }); assert.equal(await auto.evaluate(node => getComputedStyle(node).opacity), '1'); assert.equal(await auto.evaluate(node => getComputedStyle(node.nextElementSibling).display), 'none'); }
  await page.keyboard.press('Escape'); assert.deepEqual(errors, []);
  pass('reduced motion and error-free controls' + (engine === 'chromium' ? ', including native forced-colors fallback' : ''));
  console.log(checks + ' visual checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.closeAllConnections?.(); if (server) await new Promise(resolve => server.close(resolve)); });
