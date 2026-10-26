'use strict';
// Isolated experiment only. No production script imports or enables this mode.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, firefox, webkit } = require('playwright');
const out = path.resolve(__dirname, '../../docs/phase6-7/evidence/blob-navigation.json');
const results = { purpose: 'Isolated Blob navigation prototype; about:blank remains the shipped option', physicalDevices: [], engines: [] };
let server;
(async () => {
  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.url === '/destination') {
      res.end('<!doctype html><html lang="en"><title>QA destination</title><h1>QA destination</h1></html>');
      return;
    }
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Isolated navigation QA</title><h1>Isolated navigation QA</h1><button id="make">Create real Blob</button><button id="revoke">Revoke</button><script>
      localStorage.setItem('blob-qa-sentinel','qa-value');
      document.getElementById('make').onclick=function(){
        var target=location.origin+'/destination';
        var html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blob QA document</title><h1 id="ready">Blob QA document</h1><a id="next" href="'+target+'">QA destination</a><script>document.body.dataset.storage=localStorage.getItem("blob-qa-sentinel");document.body.dataset.opener=String(opener===null);<'+ '/script></html>';
        window.qaURL=URL.createObjectURL(new Blob([html],{type:'text/html'}));
        var link=document.createElement('a');link.href=qaURL;link.target='_blank';link.rel='noopener';link.id='launch';link.textContent='Open QA Blob';document.body.appendChild(link);
      };
      document.getElementById('revoke').onclick=function(){URL.revokeObjectURL(window.qaURL)};
    </script></html>`);
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    if (process.env.HEAVENLY_BROWSER && process.env.HEAVENLY_BROWSER !== name) continue;
    const record = { engine: name, checks: [] }; results.engines.push(record);
    let browser;
    try {
      browser = await engine.launch(name === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
      record.version = browser.version();
      const context = await browser.newContext();
      const page = await context.newPage(); page.setDefaultTimeout(6000);
      await page.goto(origin);
      await page.locator('#make').click();
      const url = await page.evaluate(() => window.qaURL);
      assert(url.startsWith('blob:' + origin + '/'));
      const opened = context.waitForEvent('page');
      await page.locator('#launch').click();
      const blob = await opened; blob.setDefaultTimeout(6000);
      await blob.locator('#ready').waitFor();
      assert.equal(await blob.title(), 'Blob QA document');
      assert.equal(await blob.locator('body').getAttribute('data-opener'), 'true');
      assert.equal(await blob.locator('body').getAttribute('data-storage'), 'qa-value');
      record.checks.push('A real object URL opens with an explicit title and null opener; it can still read creator-origin storage');
      record.relativeURL = await blob.evaluate(() => { try { return new URL('./resource', location.href).href; } catch (_) { return 'cannot resolve a relative URL against this Blob URL'; } });
      await blob.locator('#next').click();
      await blob.locator('h1').filter({ hasText: 'QA destination' }).waitFor();
      await blob.goBack(); await blob.locator('#ready').waitFor();
      await blob.reload(); await blob.locator('#ready').waitFor();
      record.checks.push('Absolute destination links, Back and reload work while the creator keeps the URL alive');
      await page.locator('#revoke').click();
      record.revokedFetch = await page.evaluate(async url => { try { await fetch(url); return 'unexpectedly fetched'; } catch (_) { return 'blocked after revocation'; } }, url);
      // Record engine behavior instead of assuming revocation has identical
      // cache semantics. WebKit can still retrieve the previously loaded URL.
      try {
        await blob.reload({ timeout: 6000 });
        record.revokedReload = await blob.locator('#ready').count() ? 'document retained by browser' : 'document unavailable';
      } catch (_) { record.revokedReload = 'navigation rejected after revocation'; }
      record.checks.push('Recorded fetch and reload behavior after revocation; lifecycle differs by engine');
      record.status = 'passed';
      console.log('PASS Blob QA: ' + name + ' (' + record.checks.length + ' groups)');
    } catch (error) { record.status = 'failed'; record.failure = error.message; process.exitCode = 1; console.error('FAIL Blob QA: ' + name + ': ' + error.message); }
    finally { await browser?.close(); }
  }
})().catch(error => { results.failure = error.stack; process.exitCode = 1; console.error(error); }).finally(async () => {
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(results, null, 2) + '\n');
  if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});
