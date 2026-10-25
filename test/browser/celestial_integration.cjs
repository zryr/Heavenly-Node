'use strict';
// Cross-surface safety checks with real browser navigation. All device sizes are emulated.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pw = require('playwright');
const app = require('../../app');
const output = path.resolve(process.env.HEAVENLY_CELESTIAL_RESULTS || 'docs/phase4-5/evidence/integration-results.json');
const results = { executed: new Date().toISOString(), physicalDevices: [], browsers: [] };
let server;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const engine of (process.env.HEAVENLY_ENGINES || 'chromium,firefox,webkit').split(',')) {
    let browser;
    const entry = { engine, checks: [], errors: [] };
    results.browsers.push(entry);
    const pass = message => { entry.checks.push(message); console.log('PASS ' + engine + ': ' + message); };
    try {
      browser = await pw[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
      entry.version = browser.version();
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked', 'true'));
      let logoFinished = false;
      await context.route('**/*', async route => {
        const url = route.request().url();
        if (!url.startsWith(origin)) return route.abort();
        if (url.includes('/proxy/')) return route.fulfill({ body: '<h1>Controlled destination</h1>', contentType: 'text/html' });
        if (url.endsWith('/assets/heavenly-logo.png')) {
          await wait(2200);
          logoFinished = true;
        }
        try { await route.continue(); } catch (error) { if (!/closed|disposed/i.test(error.message)) throw error; }
      });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.on('pageerror', error => entry.errors.push(error.message));
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.evaluate(() => window.__heavenlyLandingInitialized), true);
      assert.equal(await page.locator('#heavenly-loading-screen').getAttribute('aria-hidden'), 'true');
      assert.equal(logoFinished, false, 'decorative image must not hold initialization');
      await page.locator('#heavenly-loading-screen').waitFor({ state: 'hidden' });
      pass('homepage dismisses during initialization without a 300ms hold or waiting for a delayed decorative image');

      await page.locator('#url').focus();
      await page.evaluate(() => { HeavenlyLoading.show(); HeavenlyLoading.dismiss(); HeavenlyLoading.show(); });
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#heavenly-loading-screen').isVisible(), true);
      assert.equal(await page.locator('#url').evaluate(node => node === document.activeElement), true);
      await page.evaluate(() => HeavenlyLoading.dismiss());
      await page.locator('#heavenly-loading-screen').waitFor({ state: 'hidden' });
      pass('interrupted dismiss/show cannot hide the current loader, and loader changes preserve focus');

      const personal = await page.evaluate(() => localStorage.getItem('heavenly_bookmarks'));
      assert.equal(await page.locator('button:visible,a:visible').filter({ hasText: /Codex|Developer HQ/i }).count(), 0);
      await page.locator('#bm-universal-search').fill('codex');
      assert.equal(await page.locator('.bookmark-search-result').count(), 0);
      assert.equal(await page.locator('#codex-dev-modal').isVisible(), false);
      await page.locator('#bm-search-clear-btn').click();
      await page.locator('#url').fill('codex');
      assert.equal(await page.locator('#codex-dev-modal').isVisible(), false);
      await page.locator('#search-go-btn').click();
      await page.locator('#codex-dev-modal.active').waitFor();
      assert.equal(page.url(), origin + '/');
      await page.keyboard.press('Escape');
      await page.locator('#codex-dev-modal').waitFor({ state: 'hidden' });
      await page.locator('#url').fill('codex');
      await page.locator('#url').press('Enter');
      await page.locator('#codex-dev-modal.active').waitFor();
      assert.equal(page.url(), origin + '/');
      await page.keyboard.press('Escape');
      await page.locator('#codex-dev-modal').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_bookmarks')), personal);
      pass('HQ has no visible shortcut/search result; intentional codex submission through Go and Enter opens it without changing bookmarks');

      // Safe preview API only; no destructive HQ actions are executed in this suite.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => HeavenlyLoading.show());
      assert.equal(await page.locator('.loading-shimmer-glow').evaluate(node => getComputedStyle(node).animationName), 'none');
      await page.evaluate(() => HeavenlyLoading.dismiss());
      assert.equal(await page.locator('#heavenly-loading-screen').isVisible(), false);
      await page.evaluate(() => HeavenlyLoading.show());
      await page.waitForFunction(() => getComputedStyle(document.getElementById('heavenly-loading-screen')).visibility === 'hidden', null, { timeout: 5000 });
      assert.equal(await page.locator('#heavenly-loading-screen').evaluate(node => getComputedStyle(node).pointerEvents), 'none');
      pass('reduced motion stops the shimmer, dismissal is immediate, and an interrupted initialization has a bounded fallback');

      await page.goto(origin + '/settings.html', { waitUntil: 'domcontentloaded' });
      assert.equal(await page.evaluate(() => window.__heavenlySettingsInitialized), true);
      assert.equal(await page.locator('#heavenly-loading-screen').getAttribute('aria-hidden'), 'true');
      await page.locator('#heavenly-loading-screen').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('button:visible,a:visible').filter({ hasText: /Codex|Developer HQ/i }).count(), 0);
      pass('Settings shares immediate readiness dismissal and introduces no HQ launch control');

      const broken = await browser.newContext({ reducedMotion: 'reduce' });
      await broken.addInitScript(() => {
        sessionStorage.setItem('heavenly_decoy_unlocked', 'true');
        // Suppress normal pageshow recovery as well, so this exercises the fallback itself.
        addEventListener('pageshow', event => event.stopImmediatePropagation(), true);
      });
      await broken.route('**/*', async route => {
        const url = route.request().url();
        if (!url.startsWith(origin)) return route.abort();
        if (url === origin + '/') {
          const response = await route.fetch();
          const body = (await response.text()).replace('function initLandingPage() {', 'function initLandingPage() { throw new Error("Simulated interrupted initializer");');
          return route.fulfill({ response, body });
        }
        return route.continue();
      });
      const failedPage = await broken.newPage();
      const expectedErrors = [];
      failedPage.on('pageerror', error => expectedErrors.push(error.message));
      const interruptedError = failedPage.waitForEvent('pageerror', { predicate: error => error.message.includes('Simulated interrupted initializer') });
      await failedPage.goto(origin, { waitUntil: 'domcontentloaded' });
      await interruptedError;
      assert(expectedErrors.some(message => message.includes('Simulated interrupted initializer')));
      await failedPage.waitForFunction(() => {
        const loader = document.getElementById('heavenly-loading-screen');
        return getComputedStyle(loader).visibility === 'hidden' && getComputedStyle(loader).pointerEvents === 'none';
      }, null, { timeout: 5000 });
      await failedPage.locator('#url').click();
      assert.equal(await failedPage.locator('#url').evaluate(node => node === document.activeElement), true);
      pass('a deliberately throwing page initializer cannot leave a blocking overlay');
      await broken.close();
      assert.deepEqual(entry.errors, []);
      entry.status = 'passed';
      await context.close();
    } catch (error) {
      entry.status = 'failed'; entry.failure = error.stack;
      process.exitCode = 1;
      console.error('FAIL ' + engine + ': ' + error.stack);
    } finally { await browser?.close(); }
  }
})().catch(error => { process.exitCode = 1; console.error(error); }).finally(async () => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});
