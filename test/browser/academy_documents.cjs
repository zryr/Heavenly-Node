'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const app = require('../../app');
const out = path.resolve(__dirname, '../../docs/phase6-7/evidence');
const pages = Object.keys(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../academy/pages.json'), 'utf8')));
const sizes = [['desktop',1440,1000],['chromebook',1366,768],['tablet-portrait',820,1180],['tablet-landscape',1180,820],['phone',390,844],['narrow-phone',320,740]];
const report = { executed: new Date().toISOString(), scope: 'Linux Playwright mouse/keyboard; CSS zoom is not native browser zoom. Chromium CDP page scale is a separate emulated pinch scale. No physical devices or Apple Safari tested.', browsers: [] };
const selected = process.env.HEAVENLY_BROWSER ? [process.env.HEAVENLY_BROWSER] : ['chromium','firefox','webkit'];
let server;
async function paint(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function fit(page, label) {
  const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.getBoundingClientRect().width, scale: visualViewport ? visualViewport.scale : 1 }));
  assert(metrics.scrollWidth <= metrics.width + 1, label + ' overflow ' + JSON.stringify(metrics));
  assert.equal(await page.locator('#url,#codex-dev-modal,#heavenly-home').count(), 0, label + ' contains application');
  return metrics;
}
(async function () {
  fs.mkdirSync(path.join(out, 'academy'), { recursive: true });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const route = name => origin + (name === 'home' ? '/academy' : '/academy/' + name);
  for (const engine of selected) {
    const result = { engine, checks: [], layouts: [], inventory: [], errors: [] };
    report.browsers.push(result);
    let browser, context;
    const pass = label => { result.checks.push(label); console.log('PASS ' + engine + ' ' + label); };
    try {
      browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
      result.version = browser.version();
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
      await context.route('**/*', async intercepted => {
        const url = new URL(intercepted.request().url());
        if (url.origin === origin || !/^https?:$/.test(url.protocol)) return intercepted.continue();
        // A real click reaches the original external URL. A deterministic local
        // fixture verifies navigation without claiming provider availability.
        await intercepted.fulfill({ contentType: 'text/html', body: '<!doctype html><title>External resource fixture</title><h1 id="external-fixture">External resource fixture</h1>' });
      });
      context.on('page', page => { page.setDefaultTimeout(10000); page.on('pageerror', error => result.errors.push({ url: page.url(), message: error.message })); });
      const page = await context.newPage();
      const requests = [];
      page.on('request', request => requests.push(new URL(request.url()).pathname));
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(route('home'));
      await page.locator('#academy-main h1').waitFor();
      assert.equal(await page.evaluate(() => sessionStorage.getItem('heavenly_decoy_unlocked')), null);
      result.entryRequests = requests.slice();
      assert.equal(await page.locator('#url').count(), 0);
      pass('fresh homepage entry redirects to a standalone Academy document with no underlying application UI');
      if (process.env.HEAVENLY_ONLY !== 'flow') {
      for (const name of pages) {
        await page.goto(route(name), { waitUntil: 'load' });
        for (const [label, width, height] of sizes) {
          await page.setViewportSize({ width, height }); await paint(page);
          result.layouts.push({ page: name, label, ...await fit(page, name + ' ' + label) });
          assert(await page.locator('#academy-main h1').isVisible());
        }
        for (const zoom of [2, .67]) {
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.evaluate(value => { document.documentElement.style.zoom = value; }, zoom); await paint(page);
          result.layouts.push({ page: name, label: 'CSS zoom ' + zoom, ...await fit(page, name + ' CSS zoom ' + zoom) });
        }
        await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      }
      pass('all 12 documents fit six portrait/landscape viewports and CSS zoom 200%/67%');
      for (const [name,label,width,height] of [['home','home-desktop',1440,1000],['home','home-phone',390,844],['programs','programs-tablet-landscape',1180,820],['terms','terms-phone',390,844]]) {
        await page.setViewportSize({ width, height }); await page.goto(route(name)); await paint(page);
        if (engine === 'chromium') await page.screenshot({ path: path.join(out, 'academy', label + '.png'), fullPage: true });
      }
      if (engine === 'chromium') {
        await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(route('home'));
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
        assert.equal(await page.evaluate(() => visualViewport.scale), 2);
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }); await cdp.detach();
        pass('Chromium CDP page scale 2 and reset execute without replacing the document');
      }
      // Chromium clicks every anchor occurrence in every page, including shared
      // header/footer duplicates. Other engines click each distinct href once.
      const seen = new Set(); let clicks = 0, downloads = 0, disclosures = 0;
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const name of pages) {
        await page.goto(route(name));
        const entries = await page.locator('a[href]').evaluateAll(nodes => nodes.map((node, index) => ({ index, label: node.textContent.trim() || node.getAttribute('aria-label'), href: node.getAttribute('href'), download: node.hasAttribute('download') })));
        result.inventory.push({ page: name, controls: entries });
        for (const entry of entries) {
          if (engine !== 'chromium' && seen.has(entry.href)) continue;
          seen.add(entry.href);
          await page.goto(route(name));
          const link = page.locator('a[href]').nth(entry.index);
          if (entry.href.startsWith('#')) await link.focus();
          if (entry.download) {
            const download = page.waitForEvent('download'); await link.click();
            assert((await download).suggestedFilename().endsWith('.csv')); downloads++;
          } else {
            const expected = new URL(entry.href, route(name));
            await link.click();
            try { await page.waitForURL(expected.origin === origin && expected.pathname === '/' ? origin + '/' : expected.href, { waitUntil: 'domcontentloaded' }); }
            catch (error) { error.message += '\nInventory source ' + name + ', href ' + entry.href + ', actual ' + page.url(); throw error; }
            if (expected.origin !== origin) assert(await page.locator('#external-fixture').isVisible());
            else if (expected.pathname === '/') await page.locator('#url').waitFor();
            else {
              await page.locator('#academy-main h1').waitFor();
              if (expected.hash) assert(await page.locator(expected.hash).isVisible());
            }
          }
          clicks++;
        }
        await page.goto(route(name));
        const count = await page.locator('summary').count();
        for (let index = 0; index < count; index++) {
          const summary = page.locator('summary').nth(index);
          await summary.click(); assert(await summary.evaluate(node => node.parentElement.open));
          await summary.focus(); await page.keyboard.press('Enter'); assert.equal(await summary.evaluate(node => node.parentElement.open), false); disclosures++;
        }
        console.log('INVENTORY ' + engine + ' ' + name + ' checked; ' + clicks + ' anchor clicks so far');
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      result.clicks = clicks; result.downloads = downloads; result.disclosures = disclosures;
      pass(clicks + ' real anchor clicks, ' + downloads + ' CSV download(s), ' + disclosures + ' disclosures; external destinations verified with explicit fixtures');
      }
      await page.setViewportSize({ width: 390, height: 844 }); await page.goto(route('home'));
      const menu = page.locator('#academy-menu-toggle');
      await menu.focus(); await page.keyboard.press('Enter'); assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape'); assert.equal(await menu.getAttribute('aria-expanded'), 'false'); assert(await menu.evaluate(node => node === document.activeElement));
      await menu.click(); await page.locator('#academy-nav a[href="/academy/programs"]').click(); await page.waitForURL(route('programs'));
      await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(route('home'));
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await paint(page);
      const previousScroll = await page.evaluate(() => scrollY);
      await page.locator('.footer-links a[href="/academy/programs"]').click(); await page.waitForURL(route('programs'));
      await page.goBack(); await page.waitForURL(route('home'));
      try { await page.waitForFunction(value => Math.abs(scrollY - value) < 25, previousScroll); }
      catch (error) { error.message += '\nExpected prior scroll ' + previousScroll + '; actual ' + JSON.stringify(await page.evaluate(() => ({ scrollY, height: document.documentElement.scrollHeight }))); throw error; }
      pass('keyboard/mobile menu, real guide navigation and browser Back restore the prior document and scroll');
      // Existing user storage is preserved while reading launch preferences.
      await page.evaluate(() => localStorage.setItem('heavenly_settings', JSON.stringify({ openSearchInNewTab: true, future: 'preserve' })));
      let popupPromise = page.waitForEvent('popup'); await page.locator('.footer-legal a[href="/academy/privacy"]').click(); let popup = await popupPromise;
      await popup.waitForURL(route('privacy')); await popup.locator('#academy-main h1').waitFor();
      assert.equal(await popup.evaluate(() => opener), null); assert.equal(await popup.title(), 'Privacy & local preferences · Morrowfield Academy'); await popup.close();
      assert.equal(page.url(), route('home'));
      await page.evaluate(() => localStorage.setItem('heavenly_settings', JSON.stringify({ openSearchInAboutBlank: true, future: 'preserve' })));
      popupPromise = page.waitForEvent('popup'); await page.locator('.footer-legal a[href="/academy/privacy"]').click(); popup = await popupPromise;
      const infoFrame = () => popup.frameLocator('#academy-information-frame');
      const nativeHistory = direction => popup.evaluate(value => history[value](), direction);
      result.informationHistory = [];
      const recordInformation = async label => {
        const entry = await popup.evaluate(() => {
          const child = document.querySelector('#academy-information-frame').contentWindow;
          return { address: location.href, document: child.location.pathname + child.location.hash, entry: child.history.state.index, title: document.title };
        });
        result.informationHistory.push({ label, ...entry });
        assert.equal(entry.address, 'about:blank');
        return entry;
      };
      await infoFrame().locator('#academy-main h1').waitFor();
      assert.equal(popup.url(), 'about:blank'); assert.equal(await popup.evaluate(() => opener), null);
      assert.equal(await popup.title(), 'Privacy & local preferences · Morrowfield Academy');
      assert.equal(await infoFrame().locator('#url').count(), 0);
      await infoFrame().locator('.footer-links a[href="/academy/about"]').click();
      await popup.waitForFunction(() => document.title === 'Our approach · Morrowfield Academy');
      await infoFrame().locator('.side-nav a[href="#principles"]').click();
      await popup.waitForFunction(() => document.querySelector('iframe').contentWindow.location.hash === '#principles');
      // The native history entry belongs to the iframe. Page.goBack waits for
      // top-level DOMContentLoaded, which a child-only traversal does not emit.
      await nativeHistory('back');
      await popup.waitForFunction(() => document.querySelector('iframe').contentWindow.location.href.endsWith('/academy/about'));
      await recordInformation('native Back removes same-document hash');
      await nativeHistory('forward');
      await popup.waitForFunction(() => document.querySelector('iframe').contentWindow.location.hash === '#principles');
      await recordInformation('native Forward restores same-document hash');
      await popup.locator('nav button').click();
      await popup.waitForFunction(() => document.querySelector('iframe').contentWindow.location.href.endsWith('/academy/about'));
      // A -> B -> A is three entries even though the first and third URL match.
      await infoFrame().locator('.footer-legal a[href="/academy/privacy"]').click();
      await popup.waitForFunction(() => document.title === 'Privacy & local preferences · Morrowfield Academy');
      await popup.locator('nav button').click();
      await popup.waitForFunction(() => document.title === 'Our approach · Morrowfield Academy');
      await nativeHistory('back');
      await popup.waitForFunction(() => document.title === 'Privacy & local preferences · Morrowfield Academy');
      await nativeHistory('forward');
      await popup.waitForFunction(() => document.title === 'Our approach · Morrowfield Academy');
      await popup.locator('nav button').click();
      await popup.waitForFunction(() => document.title === 'Privacy & local preferences · Morrowfield Academy');
      await popup.locator('nav button').click(); await popup.waitForURL(route('home'));
      assert.equal(await popup.locator('#academy-information-frame').count(), 0); await popup.close();
      popupPromise = page.waitForEvent('popup'); await page.locator('.footer-legal a[href="/academy/terms"]').click(); popup = await popupPromise;
      await infoFrame().locator('#academy-main h1').waitFor();
      const firstTerms = await recordInformation('first Terms entry');
      await infoFrame().locator('.footer-legal a[href="/academy/privacy"]').click();
      await popup.waitForFunction(() => document.title === 'Privacy & local preferences · Morrowfield Academy');
      await recordInformation('Privacy after Terms');
      await infoFrame().locator('.footer-legal a[href="/academy/terms"]').click();
      await popup.waitForFunction(() => document.title === 'Terms of Service · Morrowfield Academy');
      const repeatedTerms = await recordInformation('repeated Terms entry');
      assert.notEqual(firstTerms.entry, repeatedTerms.entry);
      await nativeHistory('back');
      await popup.waitForFunction(() => document.title === 'Privacy & local preferences · Morrowfield Academy');
      await recordInformation('native Back from repeated Terms returns Privacy');
      await nativeHistory('forward');
      await popup.waitForFunction(() => document.title === 'Terms of Service · Morrowfield Academy');
      assert.equal((await recordInformation('native Forward returns repeated Terms')).entry, repeatedTerms.entry);
      await popup.locator('nav button').click();
      await popup.waitForFunction(() => document.title === 'Privacy & local preferences · Morrowfield Academy');
      await recordInformation('shell Back from repeated Terms returns Privacy');
      await popup.locator('nav button').click();
      await popup.waitForFunction(() => document.title === 'Terms of Service · Morrowfield Academy');
      assert.equal((await recordInformation('shell Back returns first Terms')).entry, firstTerms.entry);
      await popup.locator('nav button').click(); await popup.waitForURL(route('home'));
      assert.equal(await popup.locator('#academy-information-frame').count(), 0); await popup.close();
      pass('about:blank native hash Back/Forward and repeated Terms→Privacy→Terms history retain distinct entries; shell Back returns Privacy, Terms, then Academy');
      popupPromise = page.waitForEvent('popup'); await page.locator('.footer-legal a[href="/academy/terms"]').click(); popup = await popupPromise;
      await popup.frameLocator('#academy-information-frame').locator('#academy-home-return').click();
      await popup.waitForURL(origin + '/', { waitUntil: 'domcontentloaded' }); await popup.locator('#url').waitFor();
      assert.equal(await popup.locator('#academy-information-frame').count(), 0); await popup.close();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_settings')).future), 'preserve');
      pass('Search new-tab/about:blank modes show correct trusted content/title, null opener, shell Back, top-level Academy home and Continue; unrelated settings preserved');
      await page.evaluate(() => { window.open = () => null; });
      await page.locator('.footer-legal a[href="/academy/accessibility"]').click(); await page.waitForURL(route('accessibility'));
      await page.goto(route('home'));
      await page.evaluate(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } }); });
      await page.locator('.footer-legal a[href="/academy/privacy"]').click(); await page.waitForURL(route('privacy'));
      pass('blocked popup and denied Storage getter both fall back to real current-tab information navigation');
      await page.goto(route('home'));
      await page.evaluate(() => { localStorage.setItem('heavenly_settings', JSON.stringify({ decoyAutoTimer: true })); sessionStorage.removeItem('heavenly_decoy_unlocked'); });
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForURL(origin + '/', { timeout: 8000, waitUntil: 'domcontentloaded' }); await page.locator('#url').waitFor();
      pass('explicit existing timed-entry preference still unlocks this session');
      const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const reader = await noScript.newPage(); await reader.goto(route('home')); assert(await reader.locator('#academy-main h1').isVisible());
      assert(await reader.locator('#academy-nav').isVisible()); await reader.locator('#academy-nav a[href="/academy/programs"]').click(); await reader.waitForURL(route('programs')); await noScript.close();
      pass('literal Academy content and navigation remain readable with JavaScript disabled');
      assert.deepEqual(result.errors, []);
      result.status = 'passed';
    } catch (error) { result.status = 'failed'; result.failure = error.stack; process.exitCode = 1; console.error('FAIL ' + engine + ' ' + error.stack); }
    finally { await context?.close(); await browser?.close(); }
  }
})().catch(error => { report.failure = error.stack; process.exitCode = 1; console.error(error); }).finally(async () => {
  fs.writeFileSync(path.join(out, 'academy' + (process.env.HEAVENLY_BROWSER ? '-' + process.env.HEAVENLY_BROWSER : '') + (process.env.HEAVENLY_ONLY ? '-' + process.env.HEAVENLY_ONLY : '') + '.json'), JSON.stringify(report, null, 2));
  if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});
