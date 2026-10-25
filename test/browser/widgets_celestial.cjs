'use strict';
// Deterministic host page; real mouse, keyboard and Chromium CDP touch input.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
const output = path.resolve(__dirname, '../../docs/phase4-5/evidence');
const fixture = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Widget interaction fixture</title>
<style>body{margin:0;background:#eaf0f7;color:#1b3148;font:16px system-ui;min-height:2800px;padding:40px;box-sizing:border-box}main{max-width:720px}button,input{padding:12px}h1{font-weight:650}section{height:650px;border-top:1px solid #bbcbdc;padding:25px 0}</style>
<script src="/proxy/client/unblocker-client.js"></script><script>unblockerInit({prefix:'/proxy/',url:'https://widgets.heavenly.test/fixture'},window)</script>
<main><h1>A host page with Heavenly tools</h1><p>Ordinary site content stays separate from the floating controls.</p><button id="host-button" onclick="this.textContent='Host click works'">Host button</button><input aria-label="Host input" placeholder="Host input"><section><h2>Page content</h2><p>Scroll the document while the dock remains available.</p></section><section><h2>More content</h2></section></main>`;
let server, browser, checks = 0;
const results = { engine, physicalDevices: [], input: ['mouse', 'keyboard'], groups: [], screenshots: [] };
const pass = name => { checks++; results.groups.push(name); console.log('PASS ' + name); };
(async () => {
  fs.mkdirSync(output, { recursive: true });
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  results.version = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  await context.addInitScript(() => {
    sessionStorage.setItem('heavenly_decoy_unlocked', 'true');
    if (!localStorage.getItem('heavenly_settings')) localStorage.setItem('heavenly_settings', JSON.stringify({ useWidgetDock: true, touchPanic: false, futureFeature: 'preserved' }));
  });
  await context.route('**/*', route => {
    if (route.request().url().startsWith(origin + '/proxy/https://widgets.heavenly.test/')) return route.fulfill({ contentType: 'text/html', body: fixture });
    return route.request().url().startsWith(origin) ? route.continue() : route.abort();
  });
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const url = origin + '/proxy/https://widgets.heavenly.test/fixture';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const dock = page.locator('#heavenly-dock-root');
  const pull = dock.locator('.pull-tab');
  await pull.waitFor();
  const bounded = async locator => {
    const box = await locator.boundingBox(); assert(box, 'visible element');
    const viewport = page.viewportSize();
    assert(box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, JSON.stringify({ box, viewport }));
    return box;
  };
  const shot = async name => {
    if (engine !== 'chromium') return;
    const file = 'after-widgets-' + name + '.png';
    await page.screenshot({ path: path.join(output, file) }); results.screenshots.push(file);
  };
  await bounded(pull); assert((await pull.boundingBox()).height >= 44);
  assert.equal(await dock.locator('#dock-home-btn').isVisible(), false);
  await shot('collapsed');
  await pull.focus(); await page.keyboard.press('Enter');
  assert.equal(await pull.getAttribute('aria-expanded'), 'true');
  await bounded(dock.locator('.dock-bar'));
  await shot('dock');
  await page.locator('#host-button').click(); assert.equal(await page.locator('#host-button').innerText(), 'Host click works');
  const hostPadding = await page.locator('#host-button').evaluate(el => getComputedStyle(el).paddingTop);
  assert.equal(hostPadding, '12px');
  await dock.locator('#dock-scroll-btn').click(); assert.equal(await dock.locator('#dock-scroll-btn').getAttribute('aria-pressed'), 'true');
  await page.locator('h1').click(); await page.keyboard.press('PageDown'); assert.equal(await page.evaluate(() => scrollY), 0);
  await dock.locator('#dock-search-input').fill('a b'); await page.keyboard.press('Home'); await page.keyboard.type('x');
  assert.equal(await dock.locator('#dock-search-input').inputValue(), 'xa b');
  await dock.locator('#dock-scroll-btn').click(); await page.locator('h1').click(); await page.keyboard.press('PageDown');
  await page.waitForFunction(() => scrollY > 0); await page.waitForTimeout(400); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  pass('Fully visible restore button, accessible collapse, host CSS/click isolation and Scroll Lock preserves input editing');

  await dock.locator('#dock-mag-btn').click();
  const lens = page.locator('#heavenly-magnifier-root .lens-frame'); await bounded(lens);
  await dock.locator('#dock-zoom-in').click();
  assert.equal(await dock.locator('#dock-zoom-label').innerText(), '2.5x');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_lens_pos')).zoom), 2.5);
  const mirrorAlignment = await lens.locator('#lens-view').evaluate(view => {
    const rect = view.getBoundingClientRect();
    const mirror = view.shadowRoot.querySelector('.lens-mirror');
    return { actualLeft: parseFloat(mirror.style.left), actualTop: parseFloat(mirror.style.top),
      expectedLeft: rect.width / 2 - (rect.left + rect.width / 2 + scrollX) * 2.5,
      expectedTop: rect.height / 2 - (rect.top + rect.height / 2 + scrollY) * 2.5 };
  });
  assert(Math.abs(mirrorAlignment.actualLeft - mirrorAlignment.expectedLeft) < 1);
  assert(Math.abs(mirrorAlignment.actualTop - mirrorAlignment.expectedTop) < 1);
  const oldLens = await lens.boundingBox(); await lens.locator('.lens-header').focus(); await page.keyboard.press('ArrowRight');
  assert((await lens.boundingBox()).x > oldLens.x);
  await lens.locator('.lens-header').focus();
  for (let step = 0; step < 12; step++) await page.keyboard.press('Shift+ArrowLeft');
  for (let step = 0; step < 6; step++) await page.keyboard.press('Shift+ArrowUp');
  await shot('active');
  const lensStart = await lens.boundingBox();
  let lensHandle = await lens.locator('.lens-header').boundingBox();
  await page.mouse.move(lensHandle.x + 24, lensHandle.y + 15); await page.mouse.down();
  await page.mouse.move(lensHandle.x + 99, lensHandle.y + 70, { steps: 8 }); await page.mouse.up();
  assert((await lens.boundingBox()).x > lensStart.x);
  const beforeResize = await lens.boundingBox();
  let resizeCorner = await lens.locator('.resize-handle-se').boundingBox();
  await page.mouse.move(resizeCorner.x + 5, resizeCorner.y + 5); await page.mouse.down();
  await page.mouse.move(resizeCorner.x + 45, resizeCorner.y + 35, { steps: 8 }); await page.mouse.up();
  assert((await lens.boundingBox()).width > beforeResize.width);
  const savedLens = await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_lens_pos')));
  // Escape while a gesture owns global move listeners must retire that gesture
  // before its DOM disappears, and must not commit the interrupted position.
  await lens.locator('.lens-header').focus(); lensHandle = await lens.locator('.lens-header').boundingBox();
  await page.mouse.move(lensHandle.x + 24, lensHandle.y + 15); await page.mouse.down();
  await page.mouse.move(lensHandle.x + 60, lensHandle.y + 45, { steps: 5 });
  await page.keyboard.press('Escape'); await page.mouse.move(500, 300); await page.mouse.up();
  assert.equal(await lens.count(), 0);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_lens_pos'))), savedLens);
  await dock.locator('#dock-mag-btn').click(); await lens.waitFor();
  await lens.locator('.lens-header').focus(); resizeCorner = await lens.locator('.resize-handle-se').boundingBox();
  await page.mouse.move(resizeCorner.x + 5, resizeCorner.y + 5); await page.mouse.down();
  await page.mouse.move(resizeCorner.x + 35, resizeCorner.y + 25, { steps: 5 });
  await page.keyboard.press('Escape'); await page.mouse.move(500, 300); await page.mouse.up();
  assert.equal(await lens.count(), 0);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_lens_pos'))), savedLens);
  pass('Magnifier activation, persisted zoom, keyboard/mouse lens movement and resize, interrupted-gesture cleanup and close');

  let from = await pull.boundingBox(); await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(1415, 450, { steps: 12 }); await page.mouse.up();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('heavenly_settings')).dockPosition === 'right');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).futureFeature), 'preserved');
  await bounded(pull); await bounded(dock.locator('.dock-bar'));
  await pull.focus(); await page.keyboard.press('Alt+ArrowDown'); await bounded(dock.locator('.dock-bar'));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).dockPosition), 'bottom');
  await dock.locator('#dock-search-input').focus(); await page.keyboard.press('Escape');
  assert.equal(await pull.getAttribute('aria-expanded'), 'false');
  await pull.press('Enter');
  await page.setViewportSize({ width: 390, height: 844 }); await bounded(pull); await bounded(dock.locator('.dock-bar'));
  assert((await dock.locator('#dock-search-input').boundingBox()).width >= 140);
  await shot('mobile');
  pass('Real mouse dock edge drag, keyboard edge placement, Escape focus return and usable phone search');

  if (engine === 'chromium') {
    const cdp = await context.newCDPSession(page); results.input.push('Chromium CDP continuous touch');
    const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
    await page.evaluate(() => scrollTo(0, 0));
    await touch('touchStart', 60, 600);
    for (let y = 580; y >= 180; y -= 30) { await touch('touchMove', 60, y); await page.waitForTimeout(16); }
    await touch('touchEnd'); await page.waitForFunction(() => scrollY > 0);
    from = await pull.boundingBox();
    await touch('touchStart', from.x + from.width / 2, from.y + from.height / 2);
    for (let n = 1; n <= 10; n++) await touch('touchMove', from.x + from.width / 2 + (22 - from.x - from.width / 2) * n / 10, from.y + from.height / 2 + (400 - from.y - from.height / 2) * n / 10);
    await shot('gesture-during');
    await touch('touchCancel');
    await shot('gesture-cancelled');
    assert.equal(await dock.locator('.dock-drag-ghost').count(), 0);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).dockPosition), 'bottom');
    await touch('touchStart', from.x + from.width / 2, from.y + from.height / 2);
    for (let n = 1; n <= 10; n++) await touch('touchMove', from.x + from.width / 2 + (22 - from.x - from.width / 2) * n / 10, from.y + from.height / 2 + (400 - from.y - from.height / 2) * n / 10);
    await touch('touchEnd');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('heavenly_settings')).dockPosition === 'left');
    await bounded(pull); await bounded(dock.locator('.dock-bar'));
    await cdp.detach();
    pass('Continuous touch scroll outside widgets, touch dock drag and cancellation without saved-position changes or ghosts');
  }

  const control = await context.newPage(); await control.goto(origin + '/html-viewer.html', { waitUntil: 'domcontentloaded' });
  const setPreferences = async patch => control.evaluate(patch => {
    const settings = JSON.parse(localStorage.getItem('heavenly_settings') || '{}');
    localStorage.setItem('heavenly_settings', JSON.stringify({ ...settings, ...patch }));
  }, patch);
  await setPreferences({ useWidgetDock: false });
  await dock.waitFor({ state: 'detached' });
  const widgets = page.locator('.heavenly-widget'); await widgets.first().waitFor();
  assert.equal(await widgets.count(), 3);
  for (const mini of await page.locator('.mini-icon').all()) await bounded(mini);
  await shot('floating');
  const nav = page.locator('#heavenly-nav-root');
  await nav.locator('.mini-icon').focus(); await page.keyboard.press('Enter');
  await bounded(nav.locator('.heavenly-widget')); assert.equal(await nav.locator('.heavenly-widget').evaluate(el => el.classList.contains('minimized')), false);
  const handle = nav.locator('.drag-handle'); await handle.focus(); const originalNav = await nav.boundingBox();
  await page.keyboard.press('ArrowLeft'); assert((await nav.boundingBox()).x < originalNav.x);
  await page.keyboard.press('Escape'); assert.equal(await nav.locator('.mini-icon').evaluate(el => el === el.getRootNode().activeElement), true);
  const circle = await nav.locator('.mini-icon').boundingBox();
  await page.mouse.move(circle.x + 22, circle.y + 22); await page.mouse.down(); await page.mouse.move(50, 300, { steps: 10 }); await page.mouse.up();
  const savedPosition = await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_nav_pos')));
  assert(savedPosition.left < 90); assert.equal(await nav.locator('.heavenly-widget').evaluate(el => el.classList.contains('minimized')), true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await nav.locator('.mini-icon').waitFor();
  const restored = await nav.boundingBox(); assert(Math.abs(restored.x - savedPosition.left) < 1); assert(Math.abs(restored.y - savedPosition.top) < 1);
  if (engine === 'chromium') {
    await page.bringToFront();
    const cdp = await context.newCDPSession(page);
    const circle = await nav.locator('.mini-icon').boundingBox();
    const touch = async (type, x, y) => Promise.race([cdp.send('Input.dispatchTouchEvent', { type, touchPoints: ['touchEnd', 'touchCancel'].includes(type) ? [] : [{ x, y, id: 1 }] }), new Promise((_, reject) => setTimeout(() => reject(Error('Touch protocol stalled: ' + type)), 5000))]);
    await touch('touchStart', circle.x + 21, circle.y + 21); await page.waitForTimeout(450);
    for (let step = 1; step <= 12; step++) { await touch('touchMove', circle.x + 21 + step * 8, circle.y + 21 + step * 7); await page.waitForTimeout(25); }
    await shot('floating-drag');
    await touch('touchCancel');
    assert.equal(await nav.locator('.heavenly-widget').evaluate(el => el.classList.contains('dragging')), false);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_nav_pos'))), savedPosition);
    const next = await nav.locator('.mini-icon').boundingBox();
    await touch('touchStart', next.x + 21, next.y + 21); await page.waitForTimeout(450);
    for (let step = 1; step <= 12; step++) { await touch('touchMove', next.x + 21 - step * 6, next.y + 21 - step * 4); await page.waitForTimeout(25); }
    await touch('touchEnd');
    assert.equal(await nav.locator('.heavenly-widget').evaluate(el => el.classList.contains('minimized')), true);
    assert.notDeepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_nav_pos'))), savedPosition);
    await bounded(nav.locator('.mini-icon')); await shot('floating-drag-settled');
    await cdp.detach();
    pass('Long-press continuous floating touch drag, touch cancellation, saved-position commit and no accidental expansion');
  }
  await nav.locator('.mini-icon').click(); await bounded(nav.locator('.heavenly-widget'));
  await page.setViewportSize({ width: 844, height: 390 }); await bounded(nav.locator('.heavenly-widget'));
  await page.setViewportSize({ width: 320, height: 740 }); await bounded(nav.locator('.heavenly-widget'));
  await page.setViewportSize({ width: 1440, height: 900 }); await page.evaluate(() => scrollTo(0, 0));
  await shot('floating-expanded');
  await page.addScriptTag({ url: origin + '/proxy/client/unblocker-client.js' });
  await page.evaluate(() => { if (window.unblockerInit) unblockerInit({ prefix: '/proxy/', url: 'https://widgets.heavenly.test/fixture' }, window); });
  assert.equal(await page.locator('#heavenly-nav-root').count(), 1); assert.equal(await page.locator('.heavenly-widget').count(), 3);
  await page.clock.install();
  await nav.locator('.drag-handle').focus(); await page.clock.runFor(10050);
  assert.equal(await nav.locator('.heavenly-widget').evaluate(el => el.classList.contains('minimized')), false);
  await page.locator('input[aria-label="Host input"]').focus(); await page.clock.runFor(10050);
  assert.equal(await nav.locator('.heavenly-widget').evaluate(el => el.classList.contains('minimized')), true);
  pass('Live settings switch to floating, keyboard expand/move/minimize, real mouse drag, reload preference, rotation bounds and duplicate initializer guard and focus-aware auto-minimize');

  await setPreferences({ disableAllWidgets: true }); await page.locator('#heavenly-nav-root').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.heavenly-widget').count(), 0);
  await setPreferences({ disableAllWidgets: false, showMagnifier: false }); await page.locator('#heavenly-nav-root').waitFor();
  assert.equal(await page.locator('#heavenly-magnifier-root').count(), 0);
  await setPreferences({ showNavBookmark: false, showNavSearch: false, showNavHome: false });
  await page.locator('#heavenly-nav-root').waitFor({ state: 'detached' });
  await setPreferences({ showNavSearch: true }); await nav.locator('.mini-icon').waitFor();
  await nav.locator('.mini-icon').click();
  assert.equal(await nav.locator('#nav-bm-btn').count(), 0);
  assert.equal(await nav.locator('#nav-home-btn').count(), 0);
  assert.equal(await nav.locator('.nav-input').isVisible(), true);
  await page.locator('main').evaluate(el => { const note = document.createElement('p'); note.textContent = 'Host content changed dynamically'; el.appendChild(note); });
  await bounded(nav.locator('.heavenly-widget'));
  await setPreferences({ disableAllFeatures: true }); await page.locator('#heavenly-nav-root').waitFor({ state: 'detached' });
  await setPreferences({ disableAllFeatures: false, useWidgetDock: true, dockPosition: 'bottom', showMagnifier: true, showNavBookmark: true, showNavHome: true }); await pull.waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await pull.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).futureFeature), 'preserved');
  const validSettings = await page.evaluate(() => localStorage.getItem('heavenly_settings'));
  await control.evaluate(() => localStorage.setItem('heavenly_settings', '[]'));
  await pull.waitFor();
  await pull.focus(); await page.keyboard.press('Alt+ArrowLeft');
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_settings')), '[]');
  assert.match(await pull.getAttribute('title'), /could not be saved/);
  await control.evaluate(value => localStorage.setItem('heavenly_settings', value), validSettings);
  await pull.waitFor();
  assert.deepEqual(errors, []);
  pass('Cross-tab master gates and individual visibility resume correctly, preferences survive, unreadable settings remain untouched, reduced motion and no page errors');
  results.checks = checks;
  fs.writeFileSync(path.join(output, engine + '-widgets-results.json'), JSON.stringify(results, null, 2));
  console.log(checks + ' celestial widget groups passed in ' + engine);
  await context.close();
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});
