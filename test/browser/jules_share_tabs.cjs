'use strict';
// Exercise Palette's adapted tab semantics with real keyboard input.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pw = require('playwright');
const app = require('../../app');
const result = { executed:new Date().toISOString(), physicalDevices:[], browsers:[] };
let server;
(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const engine of (process.env.HEAVENLY_ENGINES || 'chromium,firefox,webkit').split(',')) {
    let browser;
    const entry = { engine, checks:[] }; result.browsers.push(entry);
    try {
      browser = await pw[engine].launch(engine === 'chromium' ? { executablePath:'/usr/bin/chromium', args:['--no-sandbox'] } : {});
      entry.version = browser.version();
      const context = await browser.newContext({ viewport:{ width:1280, height:900 } });
      await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked', 'true'));
      await context.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().includes('/proxy/') ? route.continue() : route.abort());
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin, { waitUntil:'domcontentloaded' });
      await page.locator('#heavenly-loading-screen').waitFor({ state:'hidden' });
      const saved = await page.evaluate(() => localStorage.getItem('heavenly_bookmarks'));
      await page.locator('#open-share-btn').click();
      const modal = page.locator('#share-modal.active'); await modal.waitFor();
      const create = modal.getByRole('tab', { name:'1. Pick & Share', exact:true });
      const redeem = modal.getByRole('tab', { name:'2. Enter Code / Link', exact:true });
      assert.equal(await modal.getByRole('tablist').count(), 1);
      async function selected(tab, other, view) {
        assert.equal(await tab.getAttribute('aria-selected'), 'true');
        assert.equal(await tab.getAttribute('tabindex'), '0');
        assert.equal(await other.getAttribute('aria-selected'), 'false');
        assert.equal(await other.getAttribute('tabindex'), '-1');
        assert.equal(await page.locator('#' + view).isVisible(), true);
        const hidden = view === 'share-view-create' ? '#share-view-redeem' : '#share-view-create';
        assert.equal(await page.locator(hidden).isVisible(), false);
        assert.equal(await page.locator(hidden).evaluate(node => node.hidden && node.inert), true);
      }
      await selected(create, redeem, 'share-view-create');
      await create.focus(); await page.keyboard.press('ArrowRight');
      await selected(redeem, create, 'share-view-redeem');
      assert.equal(await redeem.evaluate(node => node === document.activeElement), true);
      await page.locator('#share-code-input').fill('Unsubmitted local draft');
      await redeem.focus(); await page.keyboard.press('Home');
      await selected(create, redeem, 'share-view-create');
      await page.keyboard.press('End'); await selected(redeem, create, 'share-view-redeem');
      assert.equal(await page.locator('#share-code-input').inputValue(), 'Unsubmitted local draft');
      await page.keyboard.press('ArrowLeft'); await selected(create, redeem, 'share-view-create');
      await page.keyboard.press('ArrowLeft'); await selected(redeem, create, 'share-view-redeem');
      entry.checks.push('actual arrow/Home/End keyboard navigation, selection, roving focus, inactive panel isolation and draft retention');
      await page.keyboard.press('Escape'); await page.locator('#share-modal').waitFor({ state:'hidden' });
      assert.equal(await page.locator('#open-share-btn').evaluate(node => node === document.activeElement), true);
      assert.equal(page.url(), origin + '/');
      assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_bookmarks')), saved);
      assert.deepEqual(errors, []);
      entry.checks.push('Escape restores invoking focus; no navigation or bookmark storage changes');
      entry.status = 'passed'; console.log('PASS ' + engine + ': ' + entry.checks.join('; '));
    } catch (error) { entry.status = 'failed'; entry.failure = error.stack; process.exitCode = 1; console.error('FAIL ' + engine + ': ' + error.stack); }
    finally { await browser?.close(); }
  }
})().catch(error => { process.exitCode = 1; console.error(error); }).finally(async () => {
  const target = path.resolve(process.env.HEAVENLY_SHARE_RESULTS || 'docs/phase3/evidence/jules-share-browser-results.json');
  fs.mkdirSync(path.dirname(target), { recursive:true }); fs.writeFileSync(target, JSON.stringify(result, null, 2));
  if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});
