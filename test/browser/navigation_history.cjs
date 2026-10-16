// Optional cross-browser checks: HEAVENLY_BROWSER=chromium|firefox|webkit node test/browser/navigation_history.cjs
// Requires Playwright and its selected browser in the test environment; adds no production dependency.
const assert = require('node:assert/strict');
const http = require('node:http');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => { server.closeAllConnections?.(); server.close(resolve); });
let browser, server, fixture;
let checks = 0;
function pass(message) { checks++; console.log('PASS ' + message); }
(async () => {
  fixture = http.createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/first' }); res.end(); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><title>Fixture ${req.url}</title></head><body>
      <h1>Fixture ${req.url}</h1><a id="next" href="/second">Next page</a>
      <button id="spa" onclick="history.pushState({page:2}, '', '/spa?q=1#part')">URL-only navigation</button>
      <button id="state" onclick="history.pushState({stateOnly:1}, '')">State only</button>
      <button id="replace" onclick="history.replaceState({replaced:1}, '', '/replaced')">Replace URL</button>
      <button id="title" onclick="document.title='Updated fixture title'">Change title</button>
      <button id="hash" onclick="location.hash='section'">Section</button>
    </body></html>`);
  });
  await listen(fixture);
  server = app.listen();
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const remote = 'http://127.0.0.1:' + fixture.address().port;
  const proxied = path => origin + '/proxy/' + remote + path;
  const errors = [];
  const options = engine === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] } : { headless: true };
  browser = await playwright[engine].launch(options);
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true });
  await context.addInitScript(() => { try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); } catch {} });
  context.on('page', page => page.on('pageerror', e => { errors.push(e.message); console.error('PAGE ERROR', e.message); }));
  await context.route('**/*', route => {
    const url = route.request().url();
    return url.startsWith(remote) || (url.startsWith(origin) && (!url.includes('/proxy/') || url.includes('/proxy/client/') || url.startsWith(origin + '/proxy/' + remote))) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const history = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_history') || '[]'));
  const waitHistory = async url => page.waitForFunction(url => JSON.parse(localStorage.getItem('heavenly_history') || '[]')[0]?.url === url, url);
  async function home(settings) {
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    if (settings) {
      await page.evaluate(settings => {
        localStorage.setItem('heavenly_settings', JSON.stringify(settings));
        localStorage.setItem('heavenly_quick_settings_expanded', 'true');
      }, settings);
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
    await page.waitForFunction(() => !!document.getElementById('pill-proxy-url').onclick);
    await page.waitForFunction(() => document.getElementById('heavenly-loading-screen').style.display === 'none');
  }
  async function search(path, popup = false) {
    await page.locator('#url').fill(remote + path);
    const opened = popup ? page.waitForEvent('popup') : null;
    await page.locator('#search-go-btn').click();
    return opened ? await opened : page;
  }
  async function child(target, path) {
    await target.waitForFunction(() => !!document.getElementById('heavenly-wrapper-frame'));
    const frame = target.frameLocator('#heavenly-wrapper-frame');
    await frame.locator('h1').waitFor();
    const actual = target.frames().find(frame => frame.url().startsWith(origin + '/proxy/'));
    if (path) assert.equal(actual.url(), proxied(path));
    return { frame, actual };
  }

  const saved = { panicKeyEnable: true, panicKey: 'p', dockPosition: 'right', futureSetting: { enabled: true }, openBookmarksInNewTab: false };
  await home(saved);
  const dataBefore = await page.evaluate(() => {
    localStorage.setItem('heavenly_tabs', JSON.stringify(['saved tab']));
    return localStorage.getItem('heavenly_bookmarks');
  });
  await page.locator('#pill-bm-blank').click();
  assert(await page.locator('#pill-bm-newtab').isDisabled());
  assert.equal(await page.locator('#pill-search-newtab').isDisabled(), false);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')));
  assert.deepEqual(after, { ...saved, openBookmarksInAboutBlank: true });
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_bookmarks')), dataBefore);
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_tabs')), '["saved tab"]');
  assert.equal(await page.locator('#bookmark-select-btn, #bookmark-selection-bar, #bar-select-multiple, .bookmark-select-checkbox').count(), 0);
  pass('grouped Quick Settings retain unrelated preferences, bookmarks and tabs; multi-selection is absent');

  await search('/first');
  await page.waitForURL(proxied('/first'));
  await page.locator('#spa').waitFor();
  await waitHistory(remote + '/first');
  assert.equal((await history())[0].title, 'Fixture /first');
  await page.locator('#spa').click();
  await page.waitForURL(proxied('/spa?q=1#part'));
  await waitHistory(remote + '/spa?q=1#part');
  assert.equal(await page.locator('#dock-search-input').inputValue(), remote + '/spa?q=1#part');
  const count = (await history()).length;
  await page.locator('#state').click();
  assert.deepEqual(await page.evaluate(() => history.state), { stateOnly: 1 });
  assert.equal((await history()).length, count);
  await page.goBack();
  await page.waitForURL(proxied('/spa?q=1#part'));
  await page.goBack();
  await page.waitForURL(proxied('/first'));
  await waitHistory(remote + '/first');
  await page.goForward();
  await page.waitForURL(proxied('/spa?q=1#part'));
  await waitHistory(remote + '/spa?q=1#part');
  await page.locator('#replace').click();
  await waitHistory(remote + '/replaced');
  await page.locator('#title').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('heavenly_history'))[0].title === 'Updated fixture title');
  await page.locator('#hash').click();
  await waitHistory(remote + '/replaced#section');
  assert.equal(new Set((await history()).map(item => item.url)).size, (await history()).length);
  pass('native proxy path, displayed URL, URL-only SPA navigation, state-only calls, replaceState, titles, fragments and browser back/forward');

  await home();
  await page.locator('#url').focus();
  const beforeDelete = (await history()).length;
  await page.locator('.history-delete-btn').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(page.url(), origin + '/');
  assert.equal((await history()).length, beforeDelete - 1);
  await page.locator('.history-card').first().click();
  await page.waitForURL(url => url.href.startsWith(proxied('/')));
  await home();
  assert((await history()).length > 0);
  await page.locator('#url').focus();
  await page.locator('.history-clear-btn').click();
  assert.deepEqual(await history(), []);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.deepEqual(await history(), []);
  pass('history reopening, keyboard deletion without navigation, refresh persistence and clearing');

  await home({ openInAboutBlank: true, openSearchInAboutBlank: false, openBookmarksInNewTab: false });
  assert.equal(await page.locator('#pill-bm-blank').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#pill-search-blank').getAttribute('aria-pressed'), 'false');
  await page.goto(origin + '/settings.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.getElementById('set-search-about-blank').onchange);
  assert(await page.locator('#set-bookmarks-about-blank').isChecked());
  assert.equal(await page.locator('#set-search-about-blank').isChecked(), false);
  await page.evaluate(() => HeavenlyNavigation.updateSettings(localStorage, { futureSetting: 'preserved', dockPosition: 'left' }));
  await page.locator('label[for="set-search-about-blank"]').click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).futureSetting), 'preserved');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).dockPosition), 'left');
  pass('legacy about:blank preferences split independently and Settings preserves unrelated fields');

  await home({ openSearchInAboutBlank: true, openSearchInNewTab: false, showProxiedUrl: true });
  const blank = await search('/redirect', true);
  const framed = await child(blank, '/first');
  assert.equal(blank.url(), 'about:blank');
  assert.equal(await blank.evaluate(() => location.href), 'about:blank');
  await waitHistory(remote + '/first');
  await framed.frame.locator('#spa').click();
  await waitHistory(remote + '/spa?q=1#part');
  await blank.waitForFunction(url => document.getElementById('heavenly-wrapper-recovery').href === url, proxied('/spa?q=1#part'));
  assert.equal(await framed.frame.locator('#dock-search-input').inputValue(), remote + '/spa?q=1#part');
  assert.equal(await blank.locator('#heavenly-wrapper-status').textContent(), '/proxy/' + remote + '/spa?q=1#part');
  await page.locator('#url').fill('');
  await page.locator('.history-clear-btn').click();
  await framed.frame.locator('#title').click();
  await blank.waitForTimeout(80);
  assert.deepEqual(await history(), []);
  await framed.frame.locator('#next').click();
  await waitHistory(remote + '/second');
  await blank.locator('#heavenly-wrapper-recovery').click();
  await blank.waitForURL(proxied('/second'));
  await blank.close();
  pass('about:blank remains blank, redirects and in-frame navigation update history/URL, clearing stays cleared, recovery opens the current page');

  await home({ showProxiedUrl: false, openSearchInNewTab: false });
  await search('/first');
  await page.waitForURL(url => url.pathname === '/browse.html');
  const hosted = await child(page, '/first');
  assert.equal(page.url().includes(remote), false);
  assert.equal(await page.locator('#heavenly-wrapper-status').textContent(), 'Browsing website');
  await hosted.frame.locator('#next').click();
  await page.waitForFunction(url => document.getElementById('heavenly-wrapper-recovery').href === url, proxied('/second'));
  await page.locator('#heavenly-wrapper-bar button').filter({ hasText: 'Back' }).click();
  await page.waitForFunction(url => document.getElementById('heavenly-wrapper-recovery').href === url, proxied('/first'));
  await waitHistory(remote + '/first');
  await page.locator('#heavenly-wrapper-bar button').filter({ hasText: 'Forward' }).click();
  await page.waitForFunction(url => document.getElementById('heavenly-wrapper-recovery').href === url, proxied('/second'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await child(page, '/second');
  await waitHistory(remote + '/second');
  await page.locator('#heavenly-wrapper-recovery').click();
  await page.waitForURL(proxied('/second'));
  pass('hidden URL mode uses a stable Heavenly page, follows navigation, restores on refresh and preserves recovery');

  await home({ showProxiedUrl: false, openSearchInNewTab: true });
  const hostedTab = await search('/first', true);
  await hostedTab.waitForURL(url => url.pathname === '/browse.html');
  await child(hostedTab, '/first');
  await page.locator('#pill-proxy-url').click();
  await hostedTab.waitForURL(proxied('/first'));
  await hostedTab.close();
  pass('hidden URL New Tab sessions restore independently and enabling Show Proxied URL returns existing hosted sessions to native navigation');

  await home({ openBookmarksInAboutBlank: true, openBookmarksInNewTab: true, openSearchInAboutBlank: false });
  await page.evaluate(remote => {
    const data = loadBookmarkData();
    data.categories.push({ id: 'navigation_test', title: 'Navigation test', side: 'left', order: -1, subSections: [{ id: 'user', title: 'Bookmarks' }] });
    data.bookmarks.push({ id: 'test_proxy', title: 'Proxied fixture', url: remote + '/first', categoryId: 'navigation_test', subSectionId: 'user', order: 0, launchPreference: 'proxy' });
    data.bookmarks.push({ id: 'test_direct', title: 'Direct fixture', url: remote + '/first', categoryId: 'navigation_test', subSectionId: 'user', order: 1, launchPreference: 'direct' });
    saveBookmarkData(data); expandedCategories.navigation_test = true; renderBookmarksUI();
  }, remote);
  let openedPromise = page.waitForEvent('popup');
  await page.locator('[data-bm-id="test_proxy"] .bookmark-title').click();
  const bookmarkTab = await openedPromise;
  await child(bookmarkTab, '/first');
  assert.equal(bookmarkTab.url(), 'about:blank');
  await bookmarkTab.close();
  openedPromise = page.waitForEvent('popup');
  await page.locator('[data-bm-id="test_direct"] .bookmark-title').click();
  const directTab = await openedPromise;
  await directTab.waitForURL(remote + '/first');
  assert.equal(directTab.frames().length, 1);
  await directTab.close();
  pass('ordinary bookmarks honor independent about:blank settings; Direct bookmarks stay direct and use normal navigation');

  await page.locator('[data-bm-id="test_proxy"] .bookmark-title').click({ button: 'left', delay: 600 });
  // A long hold on the card opens the established launch prompt, not a popup.
  await page.locator('#builtin-test-modal.active').waitFor();
  const launchButton = page.locator('#builtin-test-modal button.long-press-btn:visible').filter({ hasText: 'Open with Proxy' }).first();
  await launchButton.scrollIntoViewIfNeeded();
  const box = await launchButton.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  const pagesBeforeRelease = context.pages().length;
  openedPromise = page.waitForEvent('popup');
  await page.mouse.up();
  const longPressTab = await openedPromise;
  await child(longPressTab, '/first');
  assert.equal(context.pages().length, pagesBeforeRelease + 1);
  await longPressTab.close();
  pass('long-press launch opens exactly one tab on release while a user gesture is available');

  await home({ showProxiedUrl: true, openSearchInAboutBlank: true });
  await page.evaluate(() => { window.open = () => null; window.confirm = () => false; });
  await search('/first');
  assert.equal(page.url(), origin + '/');
  await page.evaluate(() => { window.confirm = () => true; });
  await search('/first');
  await page.waitForURL(proxied('/first'));
  pass('popup blockers offer a usable current-tab fallback and preserve the page when declined');

  await home({ showProxiedUrl: false });
  await context.route(proxied('/blocked'), route => route.fulfill({ status: 200, headers: { 'content-type': 'text/html', 'content-security-policy': "frame-ancestors 'none'" }, body: '<h1>Recovered page</h1>' }));
  await search('/blocked');
  await page.locator('#heavenly-wrapper-status').filter({ hasText: /Choose Open normally/ }).waitFor();
  assert(page.url().includes('/browse.html#'));
  await page.locator('#heavenly-wrapper-recovery').click();
  await page.waitForURL(proxied('/blocked'));
  assert.equal(await page.locator('h1').textContent(), 'Recovered page');
  pass('frame restrictions keep the wrapper visible with explicit normal-navigation recovery');

  await home({ persistentCloak: true, selectedPreset: 'docs', openSearchInAboutBlank: true });
  const cloaked = await search('/first', true);
  const cloakedFrame = await child(cloaked, '/first');
  await waitHistory(remote + '/first');
  assert.equal(await cloaked.title(), 'Google Docs');
  assert.equal(await cloakedFrame.actual.title(), 'Google Docs');
  assert.equal((await history())[0].title, 'Fixture /first');
  await cloakedFrame.frame.locator('#title').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('heavenly_history'))[0].title === 'Updated fixture title');
  assert.equal(await cloakedFrame.actual.title(), 'Google Docs');
  await cloaked.close();
  pass('persistent cloaking keeps its preset while history retains the real initial and changing website title');

  await home({ disableAllFeatures: true, showProxiedUrl: true });
  await search('/first');
  await page.locator('#spa').click();
  await waitHistory(remote + '/spa?q=1#part');
  assert.equal(await page.locator('#heavenly-dock-root').count(), 0);
  pass('history works independently of the feature/widget switches');

  await home();
  await page.evaluate(() => localStorage.setItem('heavenly_history', '{}'));
  await page.locator('#url').focus();
  assert.equal(await page.locator('.history-empty').textContent(), 'No browsing history yet');
  assert.deepEqual(errors, []);
  pass('malformed history is recoverable and the browser reports no uncaught application errors');
  await page.screenshot({ path: '/tmp/heavenly-quick-settings-' + engine + '.png', fullPage: false });
  const storageDenied = await context.newPage();
  await storageDenied.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage access denied', 'SecurityError'); } });
  });
  await storageDenied.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await storageDenied.waitForFunction(() => !!document.getElementById('pill-proxy-url').onclick);
  await storageDenied.locator('#url').fill(remote + '/first');
  await storageDenied.locator('#search-go-btn').click();
  await storageDenied.waitForURL(proxied('/first'));
  await storageDenied.locator('#spa').click();
  await storageDenied.waitForURL(proxied('/spa?q=1#part'));
  await storageDenied.close();
  assert.deepEqual(errors, []);
  pass('navigation and controls remain usable when the browser denies storage access');
  console.log(`${checks} browser checks passed (${engine}; emulated touch viewport, no physical device verification)`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await close(server);
  if (fixture) await close(fixture);
});
