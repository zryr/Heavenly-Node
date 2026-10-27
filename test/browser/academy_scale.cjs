'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const playwright = require('playwright'), app = require('../../app');
const pages = Object.keys(require('../../academy/pages.json'));
const report = { executed: new Date().toISOString(), scope: 'Chromium CDP emulated pinch scale and Linux WebKit mobile/touch viewport profiles. This does not establish native OS browser zoom, physical iPad behavior, or Apple Safari compatibility.', browsers: [] };
let server;
async function metrics(page) {
  return page.evaluate(() => ({ innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, viewportWidth: visualViewport.width, viewportHeight: visualViewport.height, scale: visualViewport.scale, dpr: devicePixelRatio }));
}
(async () => {
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const engine of ['chromium', 'webkit']) {
    const row = { engine, checks: [] }; report.browsers.push(row); let browser;
    try {
      browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
      row.version = browser.version();
      const context = await browser.newContext(engine === 'webkit' ? { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const cdp = engine === 'chromium' ? await context.newCDPSession(page) : null;
      for (const name of pages) {
        await page.goto(origin + (name === 'home' ? '/academy' : '/academy/' + name));
        const profiles = cdp ? [.5, 2, 1] : [{ width: 820, height: 1180 }, { width: 1180, height: 820 }];
        for (const profile of profiles) {
          if (cdp) await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: profile });
          else await page.setViewportSize(profile);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const value = await metrics(page);
          assert(value.scrollWidth <= value.innerWidth + 1, name + ' document overflow ' + JSON.stringify(value));
          assert.equal(await page.locator('#url,#codex-dev-modal,#heavenly-home').count(), 0);
          assert(await page.locator('#academy-main h1').isVisible());
          row.checks.push({ page: name, profile, ...value, requestedScaleApplied: cdp ? Math.abs(value.scale - profile) < .01 : undefined });
          if (cdp && profile >= 1) assert(Math.abs(value.scale - profile) < .01, 'requested CDP scale not applied');
        }
      }
      if (cdp) await cdp.detach();
      assert.deepEqual(errors, []); row.status = 'passed'; await context.close();
      console.log('PASS ' + engine + ' ' + row.checks.length + ' scale/mobile profile checks');
    } catch (error) { row.status = 'failed'; row.failure = error.stack; process.exitCode = 1; console.error(error.stack); }
    finally { await browser?.close(); }
  }
})().catch(error => { report.failure = error.stack; process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.resolve(__dirname, '../../docs/phase6-7/evidence/academy-scale.json'), JSON.stringify(report, null, 2));
  if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});
