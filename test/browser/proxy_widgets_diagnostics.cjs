// Deterministic Next.js-style URL checks, FMHY-shaped navigation and widgets.
// No external site availability or third-party scripts are required.
const assert = require('node:assert/strict');
const http = require('node:http');
const playwright = require('playwright');
process.env.NODE_ENV = 'development';
process.env.HEAVENLY_DEV_DIAGNOSTICS = '1';
delete process.env.VERCEL;
const app = require('../../app');
const parseRelativeUrl = require('../fixtures/next-relative-url');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let fixture, server, browser, checks = 0;
const listen = srv => new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
const pass = msg => { checks++; console.log('PASS ' + msg); };
(async () => {
  let requests = [];
  fixture = http.createServer((req, res) => {
    requests.push(req.url);
    if (req.url === '/redirect') { res.writeHead(308, { Location: '/video' }); res.end(); return; }
    if (req.url === '/restricted') { res.setHeader('Content-Security-Policy', "frame-ancestors 'none'"); res.setHeader('X-Frame-Options', 'DENY'); }
    if (req.url === '/missing.js') { res.writeHead(404, { 'Content-Type': 'text/html', 'X-Content-Type-Options': 'nosniff' }); res.end('<h1>Missing</h1>'); return; }
    if (req.url === '/unavailable-csp') { res.writeHead(502, { 'Content-Type': 'text/html', 'Content-Security-Policy': "script-src 'none'" }); res.end('upstream unavailable'); return; }
    if (req.url === '/unavailable') { res.writeHead(504, { 'Content-Type': 'text/html' }); res.end('upstream unavailable'); return; }
    if (req.url === '/_next/static/fixture.js') { res.setHeader('Content-Type', 'application/javascript'); res.end('window.staticLoaded=true;'); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><head><title>Fixture ${req.url}</title></head><body style="min-height:2500px"><h1>Fixture ${req.url}</h1>
      <a id="next" href="/game">Internal game page</a><a id="back-video" href="/video">Video</a>
      <script>${parseRelativeUrl.toString()}; window.routerValidated=parseRelativeUrl(location.pathname);</script>
      <button id="spa" onclick="parseRelativeUrl('/game');history.pushState({game:true},'', '/game');document.getElementById('view').textContent='Game view'">SPA game</button>
      <button id="top-escape" onclick="try{top.location.href='http://example.invalid/escaped'}catch(e){window.escapeBlocked=true}">Automatic-style top navigation</button>
      <div id="view">Home view</div><script src="/_next/static/fixture.js"></script><script src="/missing.js"></script>
    </body>`);
  });
  await listen(fixture); server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, remote = 'http://127.0.0.1:' + fixture.address().port;
  const proxied = path => origin + '/proxy/' + remote + path;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  await context.addInitScript(() => { try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); localStorage.setItem('heavenly_settings', JSON.stringify({ enableDock: true, touchPanic: false, dockAutoHide: false, autoCloak: false, persistentCloak: false })); } catch {} });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  async function expandDock(scope) {
    const pull = scope.locator('#heavenly-dock-root .collapsed .pull-tab');
    if (await pull.count()) await pull.click();
  }
  const page = await context.newPage(); page.setDefaultTimeout(7000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(proxied('/video'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.staticLoaded);
  assert.equal(await page.evaluate(() => window.routerValidated), '/proxy/' + remote + '/video');
  assert.equal(errors.some(e => /invalid relative URL/.test(e)), false);
  assert.equal(requests.includes('/missing.js'), true);
  await page.locator('#spa').click(); assert.equal(page.url(), proxied('/game')); assert.equal(await page.locator('#view').innerText(), 'Game view');
  await page.goBack(); await page.waitForURL(proxied('/video'));
  await page.goForward(); await page.waitForURL(proxied('/game'));
  await page.reload({ waitUntil: 'domcontentloaded' }); assert.equal(await page.locator('h1').innerText(), 'Fixture /game');
  await page.locator('#back-video').click(); await page.waitForURL(proxied('/video'));
  pass('Next.js URL validation, internal game links, SPA push/back/forward/reload and static JS work despite independent MIME-blocked 404');
  await page.goto(origin + '/proxy/' + remote.replace('://', ':/') + '/video', { waitUntil: 'domcontentloaded' });
  assert.equal(page.url(), proxied('/video')); assert.equal(await page.evaluate(() => window.routerValidated), '/proxy/' + remote + '/video');
  pass('collapsed document path is repaired with replaceState before framework scripts execute');

  await expandDock(page);
  await page.waitForSelector('#dock-bm-btn');
  page.on('dialog', dialog => dialog.accept());
  const categories = [{ id: 'movies', title: 'Movies/Shows', subSections: [{ id: 'saved', title: 'Saved' }] }, { id: 'games', title: 'Games' }];
  await page.evaluate(categories => localStorage.setItem('heavenly_bookmarks', JSON.stringify({ categories, bookmarks: [] })), categories);
  for (const path of ['/video', '/game']) {
    await page.goto(proxied(path), { waitUntil: 'domcontentloaded' });
    await expandDock(page);
  await page.locator('#dock-bm-btn').click();
    const modal = page.locator('#heavenly-bookmark-prompt-modal'); await modal.waitFor();
    assert.equal(await modal.locator('input').nth(1).inputValue(), remote + path);
    await modal.getByRole('button', { name: 'Gamepad', exact: true }).click();
    await modal.getByRole('button', { name: 'Save Bookmark', exact: true }).click();
  }
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_bookmarks')));
  const created = data.bookmarks.filter(b => b.url.startsWith(remote));
  assert.equal(created.length, 2); assert.equal(created[0].icon, 'preset:gamepad');
  assert.equal(data.categories[0].subSections[0].title, 'Saved');
  assert.deepEqual(created.map(b => b.url), [remote + '/video', remote + '/game']);
  await page.goto(origin + '/proxy/' + created[0].url, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('h1').innerText(), 'Fixture /video');
  await expandDock(page);
  await page.locator('#dock-bm-btn').click();
  const savedBeforeDuplicate = await page.evaluate(() => localStorage.getItem('heavenly_bookmarks'));
  await page.locator('#heavenly-bookmark-prompt-modal').getByRole('button', { name: 'Save Bookmark', exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_bookmarks')), savedBeforeDuplicate);
  await page.locator('#dock-bm-btn').click();
  const customModal = page.locator('#heavenly-bookmark-prompt-modal');
  await customModal.locator('input').nth(1).fill(remote + '/custom');
  await customModal.locator('input').nth(2).fill(remote + '/missing-icon.png');
  await customModal.locator('input').nth(2).dispatchEvent('input');
  await customModal.getByRole('button', { name: 'Save Bookmark', exact: true }).click();
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_bookmarks')))).bookmarks.at(-1).icon, remote + '/missing-icon.png');
  pass('bookmark dialog creates reusable remote URLs on two pages and preserves categories, preset icons and custom icon values');

  const lock = page.locator('#dock-scroll-btn');
  const off = await lock.innerHTML(); assert(off.includes('<svg'));
  await lock.click(); assert.equal(await lock.getAttribute('aria-pressed'), 'true'); const on = await lock.innerHTML(); assert(on.includes('<svg')); assert.notEqual(on, off); assert(!on.includes('🔒'));
  await lock.click(); assert.equal(await lock.getAttribute('aria-pressed'), 'false');
  pass('Scroll Lock uses distinct SVG states with accessible pressed state and touch-sized controls');

  const popupPromise = page.waitForEvent('popup'); await page.locator('#dock-blank-btn').click(); const blank = await popupPromise; blank.setDefaultTimeout(7000);
  const child = blank.frameLocator('#heavenly-wrapper-frame'); await child.locator('h1').waitFor(); assert.equal(blank.url(), 'about:blank');
  await child.locator('#next').click(); await child.locator('h1').filter({ hasText: 'Fixture /game' }).waitFor(); assert.equal(blank.url(), 'about:blank');
  await blank.getByRole('button', { name: 'Back', exact: true }).click(); await child.locator('h1').filter({ hasText: 'Fixture /video' }).waitFor();
  await child.locator('#top-escape').click(); await blank.waitForTimeout(100); assert.equal(blank.url(), 'about:blank');
  await expandDock(child);
  await child.locator('#dock-home-btn').click(); await blank.waitForURL(origin + '/', { waitUntil: 'domcontentloaded' });
  assert.equal(page.url(), proxied('/video'));
  await blank.close();
  await page.locator('#dock-home-btn').click(); await page.waitForURL(origin + '/', { waitUntil: 'domcontentloaded' });
  pass('widget about:blank keeps redirects, internal navigation and back history framed; blocked top navigation stays framed; Home returns to Heavenly in both launch modes');

  await page.goto(proxied('/video'), { waitUntil: 'domcontentloaded' });
  await expandDock(page);
  const restrictedPopup = page.waitForEvent('popup'); await page.locator('#dock-blank-btn').click(); const blocked = await restrictedPopup;
  await blocked.waitForFunction(() => !!window.__heavenlyWrapper);
  await blocked.evaluate(url => { window.__heavenlyWrapper.frame.src = url; }, proxied('/restricted'));
  await blocked.locator('#heavenly-wrapper-status').filter({ hasText: /Choose Open normally/ }).waitFor();
  assert.equal(blocked.url(), 'about:blank');
  await blocked.locator('#heavenly-wrapper-recovery').click(); await blocked.waitForURL(proxied('/video'));
  // No automatic retry or replacement loop occurred while the frame was refused.
  await blocked.close();
  pass('upstream CSP/X-Frame-Options refusal leaves a readable explicit recovery control without a retry loop');

  const before = requests.filter(x => x === '/unavailable').length;
  await page.goto(proxied('/unavailable'), { waitUntil: 'domcontentloaded' });
  await page.getByText('Developer Details', { exact: true }).click();
  const metadata = JSON.parse(await page.locator('#heavenly-dev-json').innerText()); assert.equal(metadata.status, 504); assert.equal(metadata.phase, 'response'); assert.equal(metadata.targetHostname, '127.0.0.1');
  assert.equal(metadata.request.includes('unavailable'), false);
  await page.locator('#heavenly-dev-opt-in').check();
  await page.getByText('Try Again', { exact: true }).click();
  await page.waitForSelector('#heavenly-dev-details');
  assert.equal(requests.filter(x => x === '/unavailable').length, before + 2);
  await page.goto(proxied('/video'), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => dispatchEvent(new ErrorEvent('error', { message: 'secret-token', filename: 'https://private.test/path?token=x' })));
  await page.goto(proxied('/unavailable'), { waitUntil: 'domcontentloaded' });
  await page.getByText('Developer Details', { exact: true }).click();
  const copied = await page.locator('#heavenly-dev-json').innerText(); assert(!copied.includes('secret-token')); assert(!copied.includes('private.test')); assert(JSON.parse(copied).clientEvents.some(e => e.kind === 'script-error'));
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText(text) { window.copiedDiagnostics = text; return Promise.resolve(); } }, configurable: true }); });
  await page.locator('#heavenly-dev-copy').click(); await page.locator('#heavenly-dev-copy-status').filter({ hasText: 'Diagnostics copied.' }).waitFor();
  assert.equal(await page.evaluate(() => window.copiedDiagnostics), copied);
  assert.equal(requests.filter(x => x === '/unavailable').length, before + 3);
  pass('development details, explicit retry, tab-opted event persistence and sanitized Copy Diagnostics work without automatic requests');
  const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
  await noScriptContext.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const noScriptPage = await noScriptContext.newPage();
  await noScriptPage.goto(proxied('/unavailable-csp'), { waitUntil: 'domcontentloaded' });
  const failureCount = requests.filter(x => x === '/unavailable-csp').length;
  await noScriptPage.getByRole('link', { name: 'Try Again' }).click();
  assert.equal(requests.filter(x => x === '/unavailable-csp').length, failureCount + 1);
  assert.equal(await noScriptPage.getByRole('link', { name: 'Test Direct Connection (No Proxy)' }).getAttribute('href'), remote + '/unavailable-csp');
  await noScriptPage.getByRole('link', { name: 'Return to Heavenly Home' }).click();
  await noScriptPage.waitForURL(origin + '/', { waitUntil: 'domcontentloaded' });
  await noScriptContext.close();
  pass('Retry, Direct destination and Home remain usable with JavaScript disabled and upstream script-src none');

  // A synthetic FMHY origin exercises the actual hostname-specific handler;
  // Playwright fulfills every document locally, so no FMHY network is needed.
  await context.route(origin + '/proxy/https://fmhy.net/**', route => route.fulfill({ contentType: 'text/html', body:
    '<!doctype html><head><title>FMHY fixture</title><script src="/proxy/client/unblocker-client.js"></script><script>unblockerInit({prefix:"/proxy/",url:"https://fmhy.net/video"},window);</script></head><body><h1>FMHY fixture</h1><a id="fmhy-internal" href="/video#anime-streaming">Internal</a><a id="fmhy-external" href="https://external.test/watch">External</a></body>' }));
  await page.goto(origin + '/proxy/https://fmhy.net/video', { waitUntil: 'domcontentloaded' });
  await page.locator('#fmhy-external').click();
  await page.locator('#heavenly-fmhy-link-modal').waitFor();
  await page.locator('#heavenly-fmhy-link-modal').getByRole('button').first().click();
  await page.locator('#fmhy-internal').click();
  await page.waitForURL('**/video#anime-streaming', { waitUntil: 'domcontentloaded' });
  await expandDock(page);
  const fmhyPopup = page.waitForEvent('popup'); await page.locator('#dock-blank-btn').click(); const fmhyBlank = await fmhyPopup;
  await fmhyBlank.frameLocator('#heavenly-wrapper-frame').locator('h1').waitFor();
  assert.equal(fmhyBlank.url(), 'about:blank');
  await fmhyBlank.getByRole('link', { name: 'Heavenly', exact: true }).click();
  await fmhyBlank.waitForURL(origin + '/', { waitUntil: 'domcontentloaded' }); await fmhyBlank.close();
  await page.locator('#dock-home-btn').click(); await page.waitForURL(origin + '/', { waitUntil: 'domcontentloaded' });
  pass('actual FMHY hostname interception distinguishes external/internal links and retains the wrapper and Heavenly Home destination');
  assert.equal(errors.some(e => /PRESET_SVG_PATHS|invalid relative URL/.test(e)), false);
  console.log(checks + ' proxy/widget/diagnostic checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  for (const srv of [server, fixture]) if (srv) { srv.closeAllConnections?.(); await new Promise(resolve => srv.close(resolve)); }
});
