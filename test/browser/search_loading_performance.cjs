// Heavenly-owned fixtures; no third-party engines, ad controls or private logs.
const assert = require('node:assert/strict');
const http = require('node:http');
const playwright = require('playwright');
process.env.NODE_ENV = 'development'; process.env.HEAVENLY_DEV_DIAGNOSTICS = '1'; delete process.env.VERCEL;
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let upstream, server, browser, checks = 0;
const pass = message => { checks++; console.log('PASS ' + message); };
const requests = [];
const html = body => '<!doctype html><head><title>Loading and search fixture</title></head><body>' + body + '</body>';
const form = '<form action="/results" method="get"><label>Search games<input id="search" name="q" type="search"></label><button aria-label="Submit search">Search</button><div id="suggestions"></div></form><script>document.getElementById("search").oninput=async e=>{const response=await fetch("/api/suggest?q="+encodeURIComponent(e.target.value));const data=await response.json();document.getElementById("suggestions").innerHTML="<a href=\\"/game\\">"+data.name+"</a>";};</script>';
const listen = srv => new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
(async () => {
  upstream = http.createServer((req, res) => {
    requests.push(req.url);
    const url = new URL(req.url, 'http://fixture');
    if (url.pathname === '/api/suggest') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ name: "Papa's Freezeria" })); return; }
    if (url.pathname === '/repeat') { res.setHeader('Cache-Control', 'no-store'); res.end('ok'); return; }
    if (url.pathname === '/fail') { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('missing'); return; }
    if (url.pathname === '/assets/game/engine.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end("window.syntheticStarts=(window.syntheticStarts||0)+1;const canvas=document.getElementById('game');canvas.width=80;canvas.height=60;window.moves=0;function draw(){const c=canvas.getContext('2d');c.fillStyle=moves?'red':'blue';c.fillRect(0,0,80,60)}draw();canvas.onpointerdown=()=>{moves++;draw()};onkeydown=e=>{if(e.key==='ArrowRight'){moves++;draw()}};document.getElementById('status').textContent='Ready';"); return;
    }
    if (url.pathname === '/embed/start') { res.writeHead(302, { Location: '/embed/play?fixture=ready' }); res.end(); return; }
    res.setHeader('Content-Type', 'text/html');
    if (url.pathname === '/embed/play') { res.end('<!doctype html><head><base href="/assets/game/"></head><body><p id="status">Starting</p><canvas id="game" tabindex="0"></canvas><script src="engine.js"></script><script>console.error("private-frame-error token=secret");</script></body>'); return; }
    if (url.pathname === '/restricted') { res.end(html('<iframe id="guard" src="/embed/restricted"></iframe>')); return; }
    if (url.pathname === '/embed/restricted') { res.end(html('<script>if(location.hostname!=="fixture-authorized.invalid")location.href="/restricted-host";</script>')); return; }
    if (url.pathname === '/restricted-host') { res.statusCode = 403; res.end(html('<p id="refused">Host not authorized by fixture</p>')); return; }
    if (url.pathname === '/game') {
      res.end(html('<p id="countdown">2</p><div id="embed"></div><script>let seconds=2;const timer=setInterval(()=>{document.getElementById("countdown").textContent=--seconds;if(!seconds){clearInterval(timer);const frame=document.createElement("iframe");frame.id="game-frame";frame.src="/embed/start";document.getElementById("embed").appendChild(frame)}},20);</script>')); return;
    }
    if (url.pathname === '/results') { res.end(html('<h1>Search results</h1><a id="result" href="/game">Papa’s Freezeria</a>' + form)); return; }
    res.end(html('<h1>Games</h1>' + form + '<button id="build">Build subtree</button><div id="subtree"></div><script>document.getElementById("build").onclick=()=>{probeVisits=0;let parent=document.getElementById("subtree");for(let i=0;i<500;i++){const child=document.createElement("div");child.__probe=true;parent.appendChild(child);parent=child}parent.innerHTML="<img id=\\"nested-image\\" src=\\"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7\\">";setTimeout(()=>window.batchDone=true,0)};</script>'));
  });
  await listen(upstream); server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, remote = 'http://127.0.0.1:' + upstream.address().port;
  const proxy = path => origin + '/proxy/' + remote + path;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  await context.addInitScript(() => {
    window.fixtureNativeSetAttribute = Element.prototype.setAttribute;
    sessionStorage.setItem('heavenly_dev_diagnostics', 'true');
    localStorage.setItem('heavenly_settings', JSON.stringify({ autoCloak: false, touchPanic: false }));
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'children');
    Object.defineProperty(Element.prototype, 'children', { ...descriptor, get() { if (this.__probe) window.probeVisits++; return descriptor.get.call(this); } });
    const nativeObserver = MutationObserver;
    window.observerInstallations = 0;
    window.MutationObserver = class extends nativeObserver { constructor(callback) { super(callback); window.observerInstallations++; } };
  });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage(); page.setDefaultTimeout(9000);
  await page.goto(proxy('/'), { waitUntil: 'domcontentloaded' });
  const query = "Papa's Freezeria & ice / milk";
  await page.locator('#search').tap(); await page.locator('#search').fill(query);
  await page.locator('#suggestions a').waitFor();
  assert.equal(new URL(requests.find(path => path.startsWith('/api/suggest')), remote).searchParams.get('q'), query);
  await page.locator('#search').press('Enter'); await page.waitForURL('**/results?q=*');
  assert.equal(new URL(page.url()).searchParams.get('q'), query); assert(await page.locator('#result').isVisible());
  await page.locator('#result').tap(); await page.waitForURL(proxy('/game'));
  const game = page.frameLocator('#game-frame'); await game.locator('#status').filter({ hasText: 'Ready' }).waitFor();
  const frame = page.frames().find(f => f.url().includes('/embed/play'));
  await game.locator('canvas').tap(); await game.locator('canvas').press('ArrowRight');
  assert.equal(await frame.evaluate(() => moves), 2);
  assert.deepEqual(await frame.evaluate(() => Array.from(document.getElementById('game').getContext('2d').getImageData(1, 1, 1, 1).data)), [255, 0, 0, 255]);
  assert.equal(requests.filter(path => path === '/assets/game/engine.js').length, 1);
  assert.equal(await frame.locator('#heavenly-dock-root').count(), 0);
  pass('search suggestions, encoded Enter submission, visible results and opening a result reach an interactive embedded fixture after its own shortened countdown');
  await page.goBack(); await page.locator('#result').waitFor(); await page.goForward(); await game.locator('#status').filter({ hasText: 'Ready' }).waitFor();
  await page.goBack(); await page.locator('#search').fill('Boba Simulator'); await page.getByRole('button', { name: 'Submit search' }).tap();
  await page.waitForURL('**/results?q=Boba+Simulator'); assert(await page.locator('#result').isVisible());
  pass('back/forward and touch button submission preserve search results and query values');
  await page.goto(proxy('/'), { waitUntil: 'domcontentloaded' });
  await page.locator('#build').click(); await page.waitForFunction(() => window.batchDone);
  const visits = await page.evaluate(() => probeVisits);
  assert(visits <= 1000, '500 nested insertions must not rescan every descendant per mutation: ' + visits);
  assert(await page.locator('#nested-image').evaluate(image => image.complete && image.naturalWidth > 0));
  await page.evaluate(() => {
    const parent = document.createElement('div'), lazy = document.createElement('div');
    lazy.id = 'custom-lazy'; parent.appendChild(lazy); document.body.appendChild(parent);
    fixtureNativeSetAttribute.call(lazy, 'data-url', '/repeat');
  });
  await page.waitForFunction(() => document.getElementById('custom-lazy').getAttribute('data-url').startsWith('/proxy/'));
  console.log('MEASUREMENT', JSON.stringify({ nestedNodes: 500, subtreeVisits: visits }));
  pass('batched nested mutations receive bounded subtree processing while inserted resources remain functional');
  const before = await page.evaluate(() => observerInstallations);
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = '/proxy/client/unblocker-client.js'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
      unblockerInit({ prefix: '/proxy/', url: location.pathname.slice('/proxy/'.length) }, window);
    }
  });
  assert.equal(await page.evaluate(() => observerInstallations), before);
  pass('repeated client script initialization does not add another observer or multiply resource initialization');
  await page.goto(proxy('/game'), { waitUntil: 'domcontentloaded' }); await game.locator('#status').filter({ hasText: 'Ready' }).waitFor();
  await page.evaluate(async remote => {
    for (let i = 0; i < 3; i++) await fetch(remote + '/repeat?token=private-repeat', { cache: 'no-store' });
    await fetch(remote + '/fail?api_key=private-key');
    console.error('private-message /server/private/path', { cookie: 'private-cookie' });
  }, remote);
  const details = page.locator('#heavenly-dev-loading-details'); await details.locator('summary').click();
  await details.getByRole('button', { name: 'Refresh snapshot' }).click();
  const report = await details.locator('textarea').inputValue();
  for (const secret of ['private-repeat', 'private-key', 'private-message', 'private-cookie', '/server/private/path', remote]) assert(!report.includes(secret));
  assert(report.includes('Exact cause unavailable.')); assert(report.includes('"http-error": 1')); assert(report.includes('"childCounts"')); assert(report.includes('"console-error": 1'));
  assert(report.includes('"interactiveGameplay": "Unavailable"'));
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
  await details.getByRole('button', { name: 'Copy Diagnostics' }).click(); await details.getByRole('status').filter({ hasText: 'Report selected' }).waitFor();
  assert.equal(await details.locator('textarea').evaluate(el => el.selectionEnd - el.selectionStart), (await details.locator('textarea').inputValue()).length);
  await page.setViewportSize({ width: 375, height: 812 }); assert(await details.evaluate(el => el.getBoundingClientRect().right <= innerWidth));
  pass('opt-in loading details show coarse frame/resource/error observations, redact all private values and provide a narrow-screen manual-copy fallback');
  await page.goto(proxy('/restricted'), { waitUntil: 'domcontentloaded' });
  await page.frameLocator('#guard').locator('#refused').waitFor();
  const guarded = page.frames().find(f => f.url().includes('/restricted-host'));
  assert.equal(await guarded.evaluate(() => location.hostname), '127.0.0.1');
  assert.equal(await guarded.evaluate(() => new URL(location.href).origin), origin);
  pass('a fixture hostname restriction still refuses the proxy; native Location/URL identity and explicit refusal remain intact');
  const inactive = await browser.newContext(); const plain = await inactive.newPage(); await plain.goto(proxy('/'), { waitUntil: 'domcontentloaded' });
  assert.equal(await plain.locator('#heavenly-dev-loading-details').count(), 0);
  assert.equal(await plain.evaluate(() => typeof window.__heavenlyDevDiagnostics), 'undefined'); await inactive.close();
  pass('development instrumentation and loading view stay absent without tab opt-in');
  console.log(checks + ' search/loading/performance checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  for (const srv of [server, upstream]) if (srv) { srv.closeAllConnections?.(); await new Promise(resolve => srv.close(resolve)); }
});
