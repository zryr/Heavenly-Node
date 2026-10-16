// Captures the Vercel feedback script's currentScript-origin/iframe URL contract.
// Local fixtures only; a genuine 404 repeats the same injected runtime as preview.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let fixture, server, browser, checks = 0;
const pass = message => { checks++; console.log('PASS ' + message); };
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
(async () => {
  const toolbar = `const origin = new URL(document.currentScript.src).origin;const frame=document.createElement('iframe');frame.title='Preview feedback';frame.src=new URL('/_next-live/feedback/feedback.html',origin).href;document.body.appendChild(frame);`;
  const signed = Buffer.from('window.signedScriptRan=true;window.literal="https://example.org/unchanged";\n');
  const integrity = 'sha512-' + crypto.createHash('sha512').update(signed).digest('base64');
  let feedback404 = 0, missing404 = 0;
  fixture = http.createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/video' }); res.end(); return; }
    if (req.url === '/assets/entry.js') { res.setHeader('Content-Type', 'application/javascript'); res.end('import { value } from "./chunk.js"; window.relativeModuleValue=value;'); return; }
    if (req.url === '/assets/chunk.js') { res.setHeader('Content-Type', 'application/javascript'); res.end('export const value=42;'); return; }
    if (req.url === '/signed.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(signed); return; }
    if (req.url === '/bad.js') { res.setHeader('Content-Type', 'application/javascript'); res.end('window.badScriptRan=true;'); return; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const missing = req.url.startsWith('/_next-live/') || req.url === '/missing';
    if (req.url === '/missing') missing404++;
    if (missing) { res.statusCode = 404; if (req.url.startsWith('/_next-live/')) feedback404++; }
    res.end(`<!doctype html><head><title>${missing ? 'Upstream 404' : 'FMHY-shaped fixture'}</title></head><body><header>Header must not initialize another client</header><h1>${missing ? '404' : 'Video'}</h1><a id="next" href="/second">Relative navigation</a><button id="spa" onclick="history.pushState({page:2},'', '/spa?q=1#part')">SPA</button><script type="module" src="/assets/entry.js"></script><script src="/signed.js" integrity="${integrity}" crossorigin="anonymous"></script><script src="/bad.js" integrity="${integrity}" crossorigin="anonymous"></script><script data-explicit-opt-in="true" src="https://vercel.live/_next-live/feedback/feedback.js"></script></body>`);
  });
  await listen(fixture); server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, remote = 'http://127.0.0.1:' + fixture.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const context = await browser.newContext();
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  const docs = [], errors = []; let inits = 0;
  page.on('console', message => { if (message.text().includes('[Heavenly Debug] Initializing')) inits++; if (message.type() === 'error') errors.push(message.text()); });
  await context.route('**/*', async route => {
    const req = route.request(), url = req.url();
    if (req.isNavigationRequest()) {
      docs.push(url);
      if (feedback404 > 5) return route.abort(); // Bound the failing regression; never hammer a live site.
    }
    if (url.includes('/_next-live/feedback/feedback.js')) return route.fulfill({ contentType: 'application/javascript', body: toolbar });
    if (url.startsWith('https://vercel.live/_next-live/feedback/feedback.html')) return route.fulfill({ contentType: 'text/html', body: '<title>Deployment feedback</title><p>Feedback ready</p>' });
    if (url.startsWith(origin)) return route.continue();
    return route.abort();
  });
  await page.goto(origin + '/proxy/' + remote + '/redirect', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  console.log('TRACE', JSON.stringify({ docs, feedback404, inits }));
  assert.equal(feedback404, 0, 'preview feedback must not become a remote-site 404');
  assert(docs.some(url => url.startsWith('https://vercel.live/_next-live/feedback/feedback.html')));
  assert(docs.length <= 3, 'only redirect, final document and one feedback frame');
  assert.equal(inits, 1, 'header tags must not cause repeated initialization');
  assert.equal(await page.locator('h1').innerText(), 'Video');
  assert.equal((await page.locator('iframe').getAttribute('src')).startsWith('https://vercel.live/'), true);
  pass('preview feedback retains its own origin; redirect stabilizes without recursive upstream 404 frames or duplicate initialization');
  assert.equal(await page.evaluate(() => window.relativeModuleValue), 42);
  assert.equal(await page.evaluate(() => window.signedScriptRan), true);
  assert.equal(await page.evaluate(() => !!window.badScriptRan), false);
  assert.equal(await page.locator('script[src*="signed.js"]').getAttribute('integrity'), integrity);
  const bytes = await (await context.request.get(origin + '/proxy/' + remote + '/signed.js')).body(); assert.deepEqual(bytes, signed);
  pass('relative module imports, JavaScript bytes and SRI attributes are preserved; valid signed code executes while mismatched code remains blocked');
  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_history')));
  assert.equal(initial[0].url, remote + '/video');
  await page.locator('#spa').click(); assert(page.url().endsWith('/spa?q=1#part'));
  await page.goBack(); await page.waitForURL('**/video'); await page.locator('#next').click(); await page.waitForURL('**/second');
  assert.equal(await page.locator('h1').innerText(), 'Video');
  pass('relative navigation, history push/back and ordinary page loads work alongside the deployment runtime');
  const response = await page.goto(origin + '/proxy/' + remote + '/missing', { waitUntil: 'domcontentloaded' }); assert.equal(response.status(), 404);
  const before = docs.filter(url => url.startsWith(origin)).length; await page.waitForTimeout(500); assert.equal(docs.filter(url => url.startsWith(origin)).length, before); assert.equal(missing404, 1); assert.equal(feedback404, 0); assert.equal(await page.locator('h1').innerText(), '404');
  pass('genuine upstream 404 remains a single stable error response with no automatic retries');
  assert(errors.some(message => /integrity|digest|hash|subresource/i.test(message)), 'invalid SRI remains visible in browser diagnostics');
  console.log(checks + ' proxy platform checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.closeAllConnections?.(); fixture?.closeAllConnections?.(); await Promise.all([server,fixture].filter(Boolean).map(server => new Promise(resolve => server.close(resolve)))); });
