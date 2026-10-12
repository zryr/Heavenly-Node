// Optional real-engine checks with emulated device dimensions, not physical-device verification.
const assert = require('node:assert/strict');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let browser, server, checks = 0;
function pass(message) { checks++; console.log('PASS ' + message); }
(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'], headless: true } : { headless: true });
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 820, height: 1180 } });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const initial = { openBookmarksInNewTab: false, openSearchInNewTab: false, openBookmarksInAboutBlank: false, openSearchInAboutBlank: false, showProxiedUrl: true, futureOption: { keep: true }, panicKey: 'p' };
  await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked', 'true'));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.evaluate(initial => {
    localStorage.setItem('heavenly_settings', JSON.stringify(initial));
    localStorage.setItem('heavenly_quick_settings_expanded', 'true');
    localStorage.setItem('heavenly_tabs', '["retained"]');
    localStorage.setItem('heavenly_history', '[{"url":"https://example.com/","title":"Retained"}]');
  }, initial);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none');
  const snapshot = () => page.evaluate(() => ['heavenly_settings', 'heavenly_bookmarks', 'heavenly_tabs', 'heavenly_history'].map(key => localStorage.getItem(key)));
  const original = await snapshot();
  const popover = page.locator('#qs-help-popover');
  const ids = ['pill-bm-newtab', 'pill-bm-blank', 'pill-search-newtab', 'pill-search-blank', 'pill-proxy-url'];
  const help = id => page.locator('[data-qs-help="' + id + '"]');
  async function visible() {
    await page.waitForFunction(() => document.getElementById('qs-help-popover').classList.contains('is-open'));
    // Check the settled surface, including any queued touch/scroll events.
    await page.waitForTimeout(180);
    assert(await popover.evaluate(node => node.classList.contains('is-open')));
  }
  async function closed() { await page.waitForFunction(() => !document.getElementById('qs-help-popover').classList.contains('is-open')); }
  async function insideViewport() {
    const box = await popover.boundingBox();
    const size = page.viewportSize();
    assert(box.x >= 9 && box.y >= 9 && box.x + box.width <= size.width - 9 && box.y + box.height <= size.height - 9, JSON.stringify(box));
  }
  for (const id of ids) {
    await help(id).tap(); await visible();
    assert.equal(await help(id).getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.qs-help-button[aria-expanded="true"]').count(), 1);
    assert((await popover.innerText()).length > 70);
    await insideViewport();
    await page.keyboard.press('Escape'); await closed();
    assert.equal(await help(id).evaluate(node => node === document.activeElement), true);
    assert.deepEqual(await snapshot(), original);
  }
  pass('all five touch help buttons open accessible explanations without modifying settings or user data');
  await help(ids[0]).focus(); await page.keyboard.press('Enter'); await visible();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.qs-help-close').evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Enter'); await closed();
  await page.keyboard.press('Space'); await visible();
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await closed();
  pass('keyboard Enter/Space, close button, Escape focus restoration and Tab dismissal work');
  await help(ids[0]).click(); await visible();
  await help(ids[1]).click(); await visible();
  assert.equal(await help(ids[0]).getAttribute('aria-expanded'), 'false');
  await page.locator('#url').tap(); await closed();
  pass('only one popover opens; outside touch closes it');
  for (const [blank, tab, pref] of [['pill-bm-blank', 'pill-bm-newtab', 'openBookmarksInNewTab'], ['pill-search-blank', 'pill-search-newtab', 'openSearchInNewTab']]) {
    await page.locator('#' + blank).click();
    assert(await page.locator('#' + tab).isDisabled());
    assert.equal(await page.locator('#' + tab).getAttribute('aria-pressed'), 'true');
    assert(await page.locator('#' + tab + ' .qs-required').isVisible());
    await help(tab).tap(); await visible();
    assert((await popover.innerText()).includes('currently required'));
    assert.equal(await page.evaluate(pref => JSON.parse(localStorage.getItem('heavenly_settings'))[pref], pref), false);
    await page.keyboard.press('Escape');
    await page.locator('#' + blank).click();
    assert.equal(await page.locator('#' + tab).getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#' + tab).isDisabled(), false);
  }
  pass('about:blank visibly requires New Tab while retaining both saved false preferences and accessible help');
  const prefs = ['openBookmarksInNewTab', 'openBookmarksInAboutBlank', 'openSearchInNewTab', 'openSearchInAboutBlank', 'showProxiedUrl'];
  for (let i = 0; i < ids.length; i++) {
    await page.locator('#' + ids[i]).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.getElementById('pill-proxy-url').onclick);
    assert.equal(await page.evaluate(pref => JSON.parse(localStorage.getItem('heavenly_settings'))[pref], prefs[i]), !initial[prefs[i]]);
  }
  const final = await snapshot();
  assert.deepEqual(final.slice(1), original.slice(1));
  assert.deepEqual(JSON.parse(final[0]).futureOption, initial.futureOption);
  pass('all five toggles persist through reloads and preserve unrelated settings, bookmarks, tabs and history');
  for (const [name, width, height] of [['phone', 320, 740], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['Chromebook', 1366, 768], ['desktop', 1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.locator('#quick-settings-tray').scrollIntoViewIfNeeded();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const id of ids) {
      const button = await help(id).boundingBox();
      const pill = await page.locator('#' + id).boundingBox();
      // Firefox's DOMRect subtraction can report 43.999969 for a 44px box.
      assert(button.width >= 43.999 && button.height >= 43.999 && pill.height >= 43.999, JSON.stringify({ name, id, button, pill }));
      await help(id).tap(); await visible(); await insideViewport();
      if (width === 820 && id === 'pill-proxy-url') await page.screenshot({ path: '/tmp/heavenly-qs-' + engine + '-help.png' });
      await page.keyboard.press('Escape');
    }
    await page.screenshot({ path: '/tmp/heavenly-qs-' + engine + '-' + width + '.png' });
    pass(name + ' wraps without overflow; every help surface stays inside the viewport');
  }
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.evaluate(() => {
    const panel = document.querySelector('.container'); panel.style.overflow = 'hidden';
    window.scrollTo(0, document.querySelector('[data-qs-help]').getBoundingClientRect().top + window.scrollY - 12);
  });
  await help(ids[0]).click(); await visible(); await insideViewport();
  assert.equal(await popover.evaluate(node => node.parentElement === document.body), true);
  const anchor = await help(ids[0]).boundingBox(), box = await popover.boundingBox();
  assert(box.y >= anchor.y + anchor.height);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, 0));
  await help(ids[0]).click(); await visible();
  const upper = await popover.boundingBox(), lower = await help(ids[0]).boundingBox();
  assert(upper.y + upper.height <= lower.y);
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForFunction(() => { const box = document.getElementById('qs-help-popover').getBoundingClientRect(); return !document.getElementById('qs-help-popover').classList.contains('is-open') || box.bottom <= innerHeight - 9; });
  if (await popover.evaluate(node => node.classList.contains('is-open'))) await insideViewport();
  else { await help(ids[0]).click(); await visible(); await insideViewport(); }
  await page.locator('#quick-settings-toggle-btn').click(); await closed();
  pass('body portal avoids parent clipping, flips below near the top, opens above with room, repositions or dismisses offscreen help on rotation, closes on collapse');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await popover.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  assert.deepEqual(errors, []);
  pass('reduced motion is respected and no browser script errors occur');
  console.log(checks + ' Quick Settings checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => { server.closeAllConnections?.(); server.close(resolve); });
});
