'use strict';
// Independent execution probes: assertions inspect results from authored code, not sandbox attributes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pw = require('playwright');
const app = require('../../app');
const result = { executed: new Date().toISOString(), physicalDevices: [], browsers: [] };
let server;
const code = `<!doctype html><html><body><h1>Isolation probe</h1><script>
  var probe={};
  try { probe.parentStorage=parent.localStorage.getItem('qa_parent_secret'); } catch(e) { probe.parentStorage='blocked'; }
  try { parent.document.body.dataset.qaParent='modified'; probe.parentDOM='allowed'; } catch(e) { probe.parentDOM='blocked'; }
  try { probe.ownStorage=localStorage.getItem('qa_parent_secret'); } catch(e) { probe.ownStorage='blocked'; }
  try { probe.topStorage=top.localStorage.getItem('qa_parent_secret'); } catch(e) { probe.topStorage='blocked'; }
  try { probe.opener=window.opener===null; } catch(e) { probe.opener='blocked'; }
  try { probe.popup=window.open('about:blank')===null; } catch(e) { probe.popup=true; }
  document.body.dataset.probe=JSON.stringify(probe);
<\/script></body></html>`;

(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const engine of (process.env.HEAVENLY_ENGINES || 'chromium,firefox,webkit').split(',')) {
    let browser;
    const entry = { engine, checks: [] }; result.browsers.push(entry);
    const pass = message => { entry.checks.push(message); console.log('PASS ' + engine + ': ' + message); };
    try {
      browser = await pw[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
      entry.version = browser.version();
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      await context.addInitScript(() => {
        try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); } catch (_) {}
        // Trusted test instrumentation pauses the real child handshake before
        // registration, so every forged event must pass the actual identity gates.
        window.__qaPausePreview = false;
        window.addEventListener('message', event => {
          const frame = document.getElementById('preview-iframe');
          if (window.__qaPausePreview && event.isTrusted && frame && event.source === frame.contentWindow && event.data && event.data.type === 'heavenly-preview-connect') {
            window.__qaCurrentToken = event.data.token;
            window.__qaConnectionSeen = true;
            event.stopImmediatePropagation();
          }
        }, true);
      });
      await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
      const page = await context.newPage(); page.setDefaultTimeout(8000);
      await page.goto(origin + '/html-viewer.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => { localStorage.setItem('qa_parent_secret', 'retained private sentinel'); document.body.dataset.qaParent = 'retained'; });
      async function run(source) { await page.locator('#code-input').fill(source); await page.locator('#btn-run').click(); }
      await run(code);
      const body = page.frameLocator('#preview-iframe').locator('body');
      await body.waitFor();
      await page.waitForFunction(() => document.getElementById('preview-status-text').textContent === 'Rendered');
      const probe = JSON.parse(await body.getAttribute('data-probe'));
      assert.deepEqual(probe, { parentStorage: 'blocked', parentDOM: 'blocked', ownStorage: 'blocked', topStorage: 'blocked', opener: true, popup: true });
      assert.equal(await page.evaluate(() => localStorage.getItem('qa_parent_secret')), 'retained private sentinel');
      assert.equal(await page.locator('body').getAttribute('data-qa-parent'), 'retained');
      pass('executed authored JS cannot read parent/top/own app storage, mutate parent DOM, or open an automatic popup');

      await page.evaluate(() => { window.__qaPausePreview = true; window.__qaConnectionSeen = false; });
      await run('<h1>Message identity probe</h1>');
      await page.waitForFunction(() => window.__qaConnectionSeen === true);
      const statusBefore = await page.locator('#preview-status-text').textContent();
      await page.evaluate(() => {
        const iframe = document.getElementById('preview-iframe');
        const token = window.__qaCurrentToken;
        const channel = new MessageChannel();
        // A real parent-window message has the correct token but wrong source.
        window.postMessage({ type: 'heavenly-preview-connect', token }, '*', [channel.port2]);
        channel.port1.postMessage({ type: 'error', text: 'UNTRUSTED_MESSAGE', line: 1 });
        function syntheticConnection(origin, suppliedToken) {
          const port = new MessageChannel();
          const event = new MessageEvent('message', { origin, data: { type: 'heavenly-preview-connect', token: suppliedToken }, ports: [port.port2] });
          // Firefox rejects a cross-origin WindowProxy in MessageEventInit. A
          // trusted synthetic property supplies it without changing browser APIs.
          Object.defineProperty(event, 'source', { value: iframe.contentWindow });
          dispatchEvent(event);
          port.port1.postMessage({ type: 'error', text: 'UNTRUSTED_MESSAGE', line: 1 });
        }
        syntheticConnection(location.origin, token);
        syntheticConnection('null', 'wrong-token');
        // A real opaque-origin sibling is supplied even the current session token;
        // its own browsing context must still fail the source check.
        const sibling = document.createElement('iframe');
        sibling.id = 'qa-forged-sibling'; sibling.setAttribute('sandbox', 'allow-scripts');
        sibling.srcdoc = '<script>const c=new MessageChannel();parent.postMessage({type:"heavenly-preview-connect",token:' + JSON.stringify(token) + '},"*",[c.port2]);c.port1.postMessage({type:"error",text:"UNTRUSTED_MESSAGE",line:1});<\/script>';
        document.body.appendChild(sibling);
      });
      await page.waitForTimeout(160);
      assert.equal(await page.locator('#preview-status-text').textContent(), statusBefore);
      assert.equal(await page.locator('#preview-diagnostics').isVisible(), false);
      assert.equal(await page.locator('body').getAttribute('data-qa-parent'), 'retained');
      await page.evaluate(() => { window.__qaPausePreview = false; document.getElementById('qa-forged-sibling').remove(); });
      pass('before registration, real wrong-source/sibling messages and synthetic wrong-origin/token channels are rejected');

      await run('<h1>Old session</h1><script>setTimeout(function(){console.error("STALE_SESSION_NOTICE")},400)<\/script>');
      await run('<h1 id="fresh">Fresh session</h1>');
      await page.frameLocator('#preview-iframe').locator('#fresh').waitFor();
      await page.waitForTimeout(500);
      assert.equal(await page.locator('#preview-diagnostics').isVisible(), false);
      assert.equal(await page.locator('#preview-status-text').textContent(), 'Rendered');
      pass('re-running replaces the browsing context and old timers/diagnostics do not leak into the next session');

      await run('<h1>Malformed script</h1><script>const value = ;<\/script>');
      await page.locator('#preview-diagnostics').waitFor({ state: 'visible' });
      assert.match(await page.locator('#preview-diagnostics').textContent(), /Script|SyntaxError|Unexpected/);
      assert.equal(await page.locator('body').getAttribute('data-qa-parent'), 'retained');
      pass('a real malformed script produces useful diagnostics while parent state remains intact');

      await run(code);
      await page.locator('#viewer-tools > summary').click();
      const opened = context.waitForEvent('page');
      await page.locator('#btn-blank').click();
      const popup = await opened;
      await popup.waitForLoadState('domcontentloaded');
      assert.equal(await popup.evaluate(() => window.opener), null);
      const popupBody = popup.frameLocator('iframe').locator('body[data-probe]');
      await popupBody.waitFor();
      await popup.waitForFunction(() => document.querySelector('iframe') && document.querySelector('iframe').getAttribute('srcdoc'));
      const shellProbe = JSON.parse(await popupBody.getAttribute('data-probe'));
      assert.equal(shellProbe.parentStorage, 'blocked'); assert.equal(shellProbe.parentDOM, 'blocked');
      assert.equal(shellProbe.topStorage, 'blocked'); assert.equal(shellProbe.ownStorage, 'blocked');
      assert.equal(shellProbe.popup, true);
      assert.equal(await page.evaluate(() => localStorage.getItem('qa_parent_secret')), 'retained private sentinel');
      assert.equal(await page.locator('body').getAttribute('data-qa-parent'), 'retained');
      pass('explicit new-tab execution severs opener and keeps authored code isolated from shell DOM and shared storage');
      await popup.close();
      entry.status = 'passed';
      await context.close();
    } catch (error) { entry.status = 'failed'; entry.failure = String(error.stack).slice(0, 2500); process.exitCode = 1; console.error('FAIL ' + engine + ': ' + error.stack); }
    finally { await browser?.close(); }
  }
})().catch(error => { process.exitCode = 1; console.error(error); }).finally(async () => {
  const target = path.resolve(process.env.HEAVENLY_VIEWER_SECURITY_RESULTS || 'docs/phase4-5/evidence/viewer-independent-security.json');
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(result, null, 2));
  if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});
