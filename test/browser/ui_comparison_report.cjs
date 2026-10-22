'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const reportPath = path.resolve(process.argv[2] || 'work/final-ux/comparison.html');

(async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(fs.readFileSync(reportPath));
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto('http://127.0.0.1:' + server.address().port + '/comparison.html');
    await page.waitForFunction(() => [...document.querySelectorAll('.preview img')].every(n => n.complete && n.naturalWidth > 0));
    const previews = page.locator('.preview');
    const count = await previews.count();
    assert(count >= 20);
    assert(await previews.locator('img').evaluateAll(nodes => nodes.every(n => n.src.startsWith('data:image/png;base64,'))));
    console.log('PASS ' + count + ' embedded screenshots decode and render in a real browser');
    for (let i = 0; i < count; i++) {
      const preview = previews.nth(i);
      const width = await preview.locator('img').evaluate(n => n.naturalWidth);
      await preview.click();
      assert(await page.locator('#viewer').evaluate(n => n.open));
      await page.waitForFunction(() => document.getElementById('full-image').complete);
      assert.equal(await page.locator('#full-image').evaluate(n => n.naturalWidth), width);
      assert.equal(await page.locator('#full-image').evaluate(n => n.getBoundingClientRect().width), width);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await previews.nth(10).click();
    assert(await page.locator('#viewer').evaluate(n => n.open));
    await page.locator('#close').click();
    await page.screenshot({ path: path.join(path.dirname(reportPath), 'report-preview.png') });
    console.log('PASS every screenshot opens at full resolution; viewing and dismissal work on desktop and narrow layouts');
  } finally {
    await browser?.close();
    server.closeAllConnections();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
