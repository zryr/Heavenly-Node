// Owned launch-mode fixtures. No third-party runtime, domain bypass or live game load.
const assert = require('node:assert/strict');
const http = require('node:http');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let fixture, server, browser, checks = 0;
const listen = srv => new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
const pass = text => { checks++; console.log('PASS ' + text); };
(async () => {
  fixture = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    const remote = 'http://' + req.headers.host;
    if (req.url === '/escaped') { res.end('<h1 id="escaped">Original destination</h1>'); return; }
    if (req.url === '/guard') {
      res.end(`<!doctype html><p id="state"></p><script>if(location.host===${JSON.stringify(req.headers.host)}){document.getElementById('state').textContent='Ready'}else{document.getElementById('state').textContent='Host refused'}</script>`); return;
    }
    if (req.url === '/embed') {
      res.end(`<!doctype html><canvas id="game" width="100" height="80" tabindex="0"></canvas><p id="state">Ready</p>
        <button id="full">Fullscreen</button><button id="top">Navigate top</button><button id="parent">Navigate parent</button><button id="self">Navigate self directly</button>
        <script>window.moves=0;const canvas=document.getElementById('game');function draw(){const c=canvas.getContext('2d');c.fillStyle=moves?'red':'blue';c.fillRect(0,0,100,80)}draw();canvas.onpointerdown=()=>{moves++;draw()};addEventListener('keydown',e=>{if(e.key==='ArrowRight'){moves++;draw()}});
        document.getElementById('full').onclick=()=>canvas.requestFullscreen();
        document.getElementById('top').onclick=()=>{try{top.location.href=${JSON.stringify(remote + '/escaped')}}catch(e){window.blockedTop=true}finally{window.attemptedTop=true}};
        document.getElementById('parent').onclick=()=>{try{parent.document.location=${JSON.stringify(remote + '/escaped')}}catch(e){window.blockedParent=true}finally{window.attemptedParent=true}};
        document.getElementById('self').onclick=()=>{location.href=${JSON.stringify(remote + '/escaped')}};</script>`); return;
    }
    res.end('<!doctype html><h1>Fixture game page</h1><iframe id="game-frame" title="Game" allowfullscreen ' + (req.url === '/sandboxed-game' ? 'sandbox="allow-scripts allow-same-origin allow-popups allow-forms" ' : '') + 'src="/embed"></iframe>');
  }); await listen(fixture);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const remote = 'http://127.0.0.1:' + fixture.address().port;
  const proxy = path => origin + '/proxy/' + remote + path;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('heavenly_decoy_unlocked', 'true');
      localStorage.setItem('heavenly_settings', JSON.stringify({ autoCloak: false, persistentCloak: false, touchPanic: false }));
    } catch (_) {}
  });
  await context.route('**/*', route => [origin, remote].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  async function blankFor(path) {
    const launcher = await context.newPage(); await launcher.goto(origin);
    const popup = context.waitForEvent('page');
    await launcher.evaluate(url => HeavenlyNavigation.openBlank(window, url, { showProxiedUrl: true }), proxy(path));
    const blank = await popup; blank.setDefaultTimeout(7000);
    await blank.locator('#heavenly-wrapper-frame').waitFor();
    await launcher.close(); return blank;
  }
  for (const mode of ['direct', 'normal', 'blank']) {
    const page = mode === 'blank' ? await blankFor('/game') : await context.newPage(); page.setDefaultTimeout(7000);
    if (mode !== 'blank') await page.goto(mode === 'direct' ? remote + '/game' : proxy('/game'));
    const frameUrl = mode === 'direct' ? remote + '/embed' : proxy('/embed');
    const container = mode === 'blank' ? page.frameLocator('#heavenly-wrapper-frame') : page;
    await container.frameLocator('#game-frame').locator('#state').filter({ hasText: 'Ready' }).waitFor();
    const frame = page.frames().find(frame => frame.url() === frameUrl);
    assert(frame, 'game must remain at its expected origin'); await frame.locator('#state').filter({ hasText: 'Ready' }).waitFor();
    assert.equal(await frame.evaluate(() => location.origin), mode === 'direct' ? remote : origin);
    assert.equal(await frame.evaluate(() => self === top), false);
    assert.equal(await frame.evaluate(() => parent === top), mode !== 'blank');
    if (mode === 'blank') {
      assert.equal(page.url(), 'about:blank');
      const source = await page.locator('#heavenly-wrapper-frame').getAttribute('src'); assert(source.startsWith(origin + '/proxy/'));
      await page.evaluate(() => localStorage.setItem('fixture-storage-probe', 'shared'));
      assert.equal(await frame.evaluate(() => localStorage.getItem('fixture-storage-probe')), 'shared');
      await page.evaluate(() => localStorage.removeItem('fixture-storage-probe'));
    }
    await frame.locator('canvas').tap(); await frame.locator('canvas').press('ArrowRight');
    assert.equal(await frame.evaluate(() => moves), 2);
    assert.deepEqual(await frame.evaluate(() => Array.from(document.getElementById('game').getContext('2d').getImageData(1, 1, 1, 1).data)), [255, 0, 0, 255]);
    if (await frame.evaluate(() => document.fullscreenEnabled)) {
      await frame.locator('#full').click(); await frame.waitForFunction(() => document.fullscreenElement?.id === 'game');
      await frame.evaluate(() => document.exitFullscreen());
    }
    pass(mode + ': nested game has native identity, touch/keyboard input and delegated fullscreen when supported');
    await page.close();
  }
  const original = await context.newPage(); await original.goto(remote + '/guard'); assert.equal(await original.locator('#state').innerText(), 'Ready'); await original.close();
  for (const mode of ['normal', 'blank']) {
    const page = mode === 'blank' ? await blankFor('/guard') : await context.newPage();
    if (mode === 'normal') await page.goto(proxy('/guard'));
    const guard = mode === 'normal' ? page.mainFrame() : await page.locator('#heavenly-wrapper-frame').elementHandle().then(handle => handle.contentFrame());
    await guard.locator('#state').filter({ hasText: 'Host refused' }).waitFor();
    assert.equal(await guard.evaluate(() => location.host), new URL(origin).host); await page.close();
  }
  pass('native host restriction remains enforced in both proxy launch modes');
  async function classifyParent(page, path, expected = proxy(path), embedded = proxy('/embed')) {
    const frame = page.frames().find(frame => frame.url() === embedded);
    await frame.locator('#parent').click();
    // Some engines block with a synchronous exception; others allow a nested
    // parent to navigate. Observe a settled outcome, not just the click return.
    const outcome = await page.waitForFunction(expected => {
      try {
        const site = window.__heavenlyWrapper ? window.__heavenlyWrapper.frame.contentWindow : window;
        if (site.location.href !== expected) return 'direct';
        const child = site.document.getElementById('game-frame');
        if (child && child.contentWindow.blockedParent) return 'blocked';
      } catch (_) { return 'direct'; }
      return false;
    }, expected);
    const kind = await outcome.jsonValue();
    if (kind === 'blocked') {
      assert(page.frames().some(frame => frame.url() === expected));
      assert.equal(frame.url(), embedded);
    } else {
      assert(page.frames().some(frame => frame.url() === remote + '/escaped'));
      if (page.url() === 'about:blank') await page.locator('#heavenly-wrapper-status').filter({ hasText: 'could not load here' }).waitFor();
    }
    console.log('OBSERVATION ' + engine + ' ' + path + ' parent navigation: ' + kind);
    return kind;
  }
  const blank = await blankFor('/game'); await blank.frameLocator('#heavenly-wrapper-frame').frameLocator('#game-frame').locator('#state').waitFor();
  const embedded = blank.frames().find(frame => frame.url() === proxy('/embed'));
  await embedded.locator('#top').click(); await embedded.waitForFunction(() => window.attemptedTop === true);
  assert.equal(blank.url(), 'about:blank');
  await classifyParent(blank, '/game'); assert.equal(blank.url(), 'about:blank'); await blank.close();
  pass('wrapper retains its top-level context and reports direct nested parent navigation when an engine permits it');
  const directChild = await blankFor('/game'); await directChild.frameLocator('#heavenly-wrapper-frame').frameLocator('#game-frame').locator('#state').waitFor();
  const child = directChild.frames().find(frame => frame.url() === proxy('/embed'));
  await child.locator('#self').click(); await child.waitForURL(remote + '/escaped');
  assert.equal(directChild.url(), 'about:blank'); assert.equal(await child.locator('#escaped').innerText(), 'Original destination');
  assert(!child.url().startsWith(origin + '/proxy/')); await directChild.close();
  pass('a direct self-navigation may remain framed but is distinguishable from proxied gameplay');
  const nativeSandbox = await context.newPage(); await nativeSandbox.goto(remote + '/sandboxed-game');
  await nativeSandbox.frameLocator('#game-frame').locator('#state').waitFor();
  const nativeOutcome = await classifyParent(nativeSandbox, '/sandboxed-game (native)', remote + '/sandboxed-game', remote + '/embed');
  await nativeSandbox.close();
  for (const mode of ['normal', 'blank']) {
    const page = mode === 'blank' ? await blankFor('/sandboxed-game') : await context.newPage();
    if (mode === 'normal') await page.goto(proxy('/sandboxed-game'));
    const container = mode === 'blank' ? page.frameLocator('#heavenly-wrapper-frame') : page;
    await container.frameLocator('#game-frame').locator('#state').waitFor();
    assert.equal(await container.locator('#game-frame').getAttribute('sandbox'), 'allow-scripts allow-same-origin allow-popups allow-forms');
    const outcome = await classifyParent(page, '/sandboxed-game');
    if (mode === 'normal') {
      assert.equal(outcome, nativeOutcome, 'proxy must preserve the observed native sandbox/navigation behavior');
      assert.equal(page.url(), outcome === 'direct' ? remote + '/escaped' : proxy('/sandboxed-game'));
    } else assert.equal(page.url(), 'about:blank');
    await page.close();
  }
  pass('upstream game iframe sandbox attributes remain intact; native ancestor-navigation behavior is classified separately');
  const normal = await context.newPage(); await normal.goto(proxy('/game')); const game = normal.frameLocator('#game-frame'); await game.locator('#state').waitFor();
  await game.locator('#parent').click(); await normal.waitForURL(remote + '/escaped'); assert.equal(await normal.locator('#escaped').innerText(), 'Original destination'); await normal.close();
  pass('native parent document assignment can leave normal proxy browsing; the browser destination is not silently rewritten or spoofed');
  console.log(checks + ' game launch-mode checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  for (const srv of [server, fixture]) if (srv) { srv.closeAllConnections?.(); await new Promise(resolve => srv.close(resolve)); }
});
