// Own deterministic fixtures: no third-party game source, credentials or HAR.
const assert = require('node:assert/strict');
const http = require('node:http');
const playwright = require('playwright');
process.env.NODE_ENV = 'production'; process.env.VERCEL = '1'; process.env.HEAVENLY_DEV_DIAGNOSTICS = '1';
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
const listen = srv => new Promise(resolve => srv.listen(0,'127.0.0.1',resolve));
let server, fixture, browser, checks = 0;
const pass = text => { checks++; console.log('PASS '+text); };
(async () => {
  const requests=[];
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="blue"/></svg>';
  const gif='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  fixture=http.createServer((req,res)=>{
    requests.push(req.url);
    if(req.url==='/game/play') {
      res.setHeader('Content-Type','text/html');
      res.end('<!doctype html><head><base href="/games/fixture/"><title>Embedded fixture</title></head><body><canvas id="game" width="100" height="80" tabindex="0"></canvas><p id="game-status">Loading</p><script src="Build/game.loader.js"></script><script>startFixture().catch(()=>document.getElementById("game-status").textContent="Failed");</script></body>');return;
    }
    if(req.url==='/games/fixture/Build/game.loader.js') {
      res.setHeader('Content-Type','application/javascript');
      res.end(`window.startFixture=async()=>{const framework=document.createElement('script');framework.src='Build/game.framework.js';const loaded=new Promise((resolve,reject)=>{framework.onload=resolve;framework.onerror=reject});document.head.appendChild(framework);const [data,wasm]=await Promise.all([fetch('Build/game.data').then(r=>r.json()),WebAssembly.instantiateStreaming(fetch('Build/game.wasm'))]);await loaded;window.fixtureWasm=!!wasm.module;window.gameMoves=0;window.drawFixture();document.getElementById('game-status').textContent=data.message;function move(){gameMoves++;drawFixture()}document.getElementById('game').addEventListener('pointerdown',move);addEventListener('keydown',e=>{if(e.key==='ArrowRight')move()});};`);return;
    }
    if(req.url==='/games/fixture/Build/game.framework.js') {res.setHeader('Content-Type','application/javascript');res.end("window.drawFixture=()=>{const c=document.getElementById('game').getContext('2d');c.fillStyle=gameMoves?'red':'blue';c.fillRect(0,0,100,80)}");return;}
    if(req.url==='/games/fixture/Build/game.data') {res.setHeader('Content-Type','application/json');res.end('{"message":"Ready"}');return;}
    if(req.url==='/games/fixture/Build/game.wasm') {res.setHeader('Content-Type','application/wasm');res.end(Buffer.from([0,97,115,109,1,0,0,0]));return;}
    if(req.url.startsWith('/content/assets/')||req.url.startsWith('/_next/image?')||req.url.startsWith('/styles/teaser/')) {res.setHeader('Content-Type','image/svg+xml');res.end(svg);return;}
    if(req.url==='/upstream-error') {res.writeHead(503,{'Content-Type':'text/html'});res.end('upstream error');return;}
    if(req.url==='/missing'||req.url.endsWith('.loader.js')) {res.writeHead(404,{'Content-Type':'text/html','X-Content-Type-Options':'nosniff'});res.end('<h1>Missing fixture</h1>');return;}
    res.setHeader('Content-Type','text/html');
    res.end(`<!doctype html><head><base href="/content/"><title>Game fixture</title><script type="application/json" id="image-data">{"src":"http://127.0.0.1:PLACEHOLDER/original-thumb.png"}</script></head><body><h1>Games</h1><iframe title="Game" id="game-frame" src="/game/play"></iframe><picture><source id="responsive" srcset="${gif} 1x, assets/thumb,large.svg 2x"><img id="thumbnail" src="${gif}" alt="Thumbnail"></picture><img id="lazy" src="${gif}" loading="lazy" data-srcset="assets/lazy.svg 1x, assets/lazy2.svg 2x" alt="Lazy"><button id="load-lazy" onclick="document.getElementById('lazy').srcset=document.getElementById('lazy').dataset.srcset">Load deferred image</button><img id="next-image" src="/_next/image?url=%2Fimages%2Foptimised.png&amp;w=64&amp;q=75" alt="Optimized"><a href="/second" id="next">Next</a><img id="derived-thumbnail" alt="Derived thumbnail"><script>const input=JSON.parse(document.getElementById('image-data').textContent).src;const processed=input.startsWith('http')?new URL('/styles/teaser/original-thumb.png',input).href:input;document.getElementById('derived-thumbnail').src=processed;</script></body>`.replace('127.0.0.1:PLACEHOLDER',req.headers.host));
  });await listen(fixture);
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port,remote='http://127.0.0.1:'+fixture.address().port;
  const proxied=path=>origin+'/proxy/'+remote+path;
  browser=await playwright[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{});
  const context=await browser.newContext({viewport:{width:820,height:1180},deviceScaleFactor:2,hasTouch:true});
  await context.addInitScript(()=>{try{sessionStorage.setItem('heavenly_decoy_unlocked','true');localStorage.setItem('heavenly_settings',JSON.stringify({touchPanic:false,autoCloak:false,persistentCloak:false,showMagnifier:true,useWidgetDock:sessionStorage.getItem('fixture_floating')!=='true'}))}catch{}});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(9000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(proxied('/game'),{waitUntil:'domcontentloaded'});
  const game=page.frameLocator('#game-frame');await game.locator('#game-status').filter({hasText:'Ready'}).waitFor();
  const frame=page.frames().find(f=>f.url()===proxied('/game/play'));
  assert.equal(await frame.evaluate(()=>window.fixtureWasm),true);
  const pixel=()=>frame.evaluate(()=>Array.from(document.getElementById('game').getContext('2d').getImageData(1,1,1,1).data));
  const before=await pixel();await game.locator('canvas').tap();await game.locator('canvas').press('ArrowRight');
  assert.equal(await frame.evaluate(()=>gameMoves),2);assert.notDeepEqual(await pixel(),before);
  for(const file of ['game.loader.js','game.framework.js','game.data','game.wasm']) assert(requests.includes('/games/fixture/Build/'+file));
  assert(!requests.some(path=>path.startsWith('/game/Build/')));
  assert.equal(await frame.locator('#heavenly-dock-root').count(),0,'widgets must not cover ordinary game frames');
  pass('embedded loader/framework/data/Wasm respect base href; the initialized fixture responds to touch and keyboard with changed canvas pixels');
  await page.locator('#derived-thumbnail').evaluate(img=>img.decode());
  assert((await page.locator('#derived-thumbnail').evaluate(img=>img.currentSrc)).includes('/styles/teaser/original-thumb.png'));
  await page.locator('#thumbnail').evaluate(img=>img.decode());
  assert((await page.locator('#thumbnail').evaluate(img=>img.currentSrc)).includes('/content/assets/thumb,large.svg'));
  assert.equal(await page.locator('#lazy').getAttribute('loading'),'lazy');
  assert.equal(requests.some(path=>/assets\/lazy/.test(path)),false);
  await page.locator('#load-lazy').click();await page.locator('#lazy').evaluate(img=>img.decode());
  assert((await page.locator('#lazy').evaluate(img=>img.currentSrc)).includes('assets/lazy2.svg'));
  await page.locator('#next-image').evaluate(img=>img.decode());
  assert(requests.includes('/_next/image?url=%2Fimages%2Foptimised.png&w=64&q=75'));
  pass('JSON-driven thumbnail derivation, picture/data-URL candidates, deferred lazy sources and encoded Next image routes remain correct');
  async function expandDock(){const pull=page.locator('#heavenly-dock-root .collapsed .pull-tab');if(await pull.count())await pull.click()}
  await page.setViewportSize({width:375,height:812});await expandDock();
  const lock=page.locator('#dock-scroll-btn');await lock.click();
  const activeStyle=await lock.evaluate(button=>{const svg=button.querySelector('svg'),span=button.querySelector('span');return{stroke:getComputedStyle(svg).stroke,color:getComputedStyle(button).color,background:getComputedStyle(button).backgroundImage,width:svg.getBoundingClientRect().width,labelDisplay:getComputedStyle(span).display}});
  assert.equal(activeStyle.stroke,activeStyle.color);assert(activeStyle.width>=14);assert.notEqual(activeStyle.labelDisplay,'none');assert.equal(await lock.getAttribute('aria-pressed'),'true');
  await lock.click();assert.equal(await lock.getAttribute('aria-pressed'),'false');assert(await lock.locator('svg').isVisible());
  pass('Scroll Lock SVG inherits a contrasting foreground and ON/OFF labels remain visible on a narrow touch viewport');
  await page.setViewportSize({width:820,height:1180});
  const mag=page.locator('#dock-mag-btn');await mag.click();
  await page.locator('#heavenly-magnifier-root .lens-frame').waitFor();assert.equal(await mag.getAttribute('aria-pressed'),'true');assert(await mag.locator('svg').isVisible());
  const zoomBefore=await page.locator('#dock-zoom-label').innerText();await page.locator('#dock-zoom-in').click();assert.notEqual(await page.locator('#dock-zoom-label').innerText(),zoomBefore);
  assert(await page.locator('#heavenly-magnifier-root #lens-header svg').isVisible());
  assert(!(await page.locator('#heavenly-magnifier-root').innerHTML()).includes('🔍'));
  await page.locator('#dock-zoom-out').click();assert.equal(await page.locator('#dock-zoom-label').innerText(),zoomBefore);
  await mag.click();assert.equal(await mag.getAttribute('aria-pressed'),'false');assert(await mag.locator('svg').isVisible());
  pass('Magnifier uses SVG states/title, retains zoom controls and toggles its lens without emoji');
  await page.locator('#next').click();await page.waitForURL(proxied('/second'));await page.goBack();await page.waitForURL(proxied('/game'));
  const missing=await context.newPage();await missing.goto(proxied('/missing'),{waitUntil:'domcontentloaded'});assert.equal(await missing.locator('h1').innerText(),'Missing fixture');assert.equal(await missing.locator('#heavenly-advanced-details').count(),0);const count=requests.filter(p=>p==='/missing').length;await missing.waitForTimeout(200);assert.equal(requests.filter(p=>p==='/missing').length,count);await missing.close();
  pass('ordinary navigation/back remain functional; genuine 404 pages stay 404 without retry loops');
  await page.goto(proxied('/upstream-error'),{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#heavenly-advanced-details').getAttribute('open'),null);
  assert.equal(await page.locator('#heavenly-advanced-report').isVisible(),false);
  await page.getByText('Advanced Details',{exact:true}).click();
  const text=await page.locator('#heavenly-advanced-report').inputValue();assert(text.includes('Status: 503'));assert(text.includes('Source: upstream'));assert(text.includes('Upstream Status: 503'));
  assert.equal(await page.locator('#heavenly-dev-details').count(),0);assert.equal((await context.request.get(origin+'/__heavenly/dev-diagnostics.js?debug=1')).status(),404);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText(value){window.copiedReport=value;return Promise.resolve()}},configurable:true}));
  await page.locator('#heavenly-advanced-copy').click();await page.locator('#heavenly-advanced-copy-status').filter({hasText:'Diagnostics copied.'}).waitFor();assert.equal(await page.evaluate(()=>window.copiedReport),text);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText(){return Promise.reject(new Error('denied'))}},configurable:true}));
  await page.locator('#heavenly-advanced-copy').click();await page.locator('#heavenly-advanced-copy-status').filter({hasText:'selected'}).waitFor();
  assert.equal(await page.locator('#heavenly-advanced-report').evaluate(t=>t.selectionEnd-t.selectionStart),text.length);
  await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  pass('hosted-production Advanced Details expands, copies only its own report, provides a selected-text fallback and keeps developer diagnostics denied');
  const noJs=await browser.newContext({javaScriptEnabled:false});await noJs.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());const plain=await noJs.newPage();await plain.goto(proxied('/upstream-error'),{waitUntil:'domcontentloaded'});await plain.getByText('Advanced Details',{exact:true}).click();assert((await plain.locator('#heavenly-advanced-report').inputValue()).includes('Upstream HTTP Error'));assert.equal(await plain.locator('#heavenly-advanced-copy').isVisible(),false);await noJs.close();
  pass('native Advanced Details and the selectable report remain usable when JavaScript is disabled');
  await page.evaluate(()=>sessionStorage.setItem('fixture_floating','true'));
  await page.goto(proxied('/game'),{waitUntil:'domcontentloaded'});
  const miniLock=page.locator('#heavenly-scroll-lock-root .heavenly-widget.minimized .mini-icon');await miniLock.waitFor({state:'visible'});await miniLock.click();
  const floatingLock=page.locator('#heavenly-scroll-lock-root #toggle-btn');
  await floatingLock.click();assert.equal(await floatingLock.getAttribute('aria-pressed'),'true');assert(await floatingLock.locator('svg').isVisible());await floatingLock.click();
  const miniMag=page.locator('#heavenly-magnifier-root .heavenly-widget.minimized .mini-icon');await miniMag.waitFor({state:'visible'});await miniMag.click();
  const floatingMag=page.locator('#heavenly-magnifier-root #mag-toggle-btn');
  await floatingMag.click();assert.equal(await floatingMag.getAttribute('aria-pressed'),'true');assert(await floatingMag.locator('svg').isVisible());
  await page.locator('#heavenly-magnifier-root #zoom-in-btn').click();assert(await page.locator('#heavenly-magnifier-root #lens-header svg').isVisible());await floatingMag.click();assert.equal(await floatingMag.getAttribute('aria-pressed'),'false');assert(await floatingMag.locator('svg').isVisible());
  assert.equal(await page.evaluate(()=>document.createElement(null).tagName),'NULL');
  await page.evaluate(()=>{const f=document.createElement('iframe');f.src='about:blank';f.id='native-api-frame';document.body.appendChild(f)});
  await page.waitForTimeout(100);
  pass('floating Scroll Lock and Magnifier keep SVGs and zoom behavior; native null element coercion and blank API frames initialize safely');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(checks+' game/resource/advanced checks passed in '+engine);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close();for(const srv of [server,fixture])if(srv){srv.closeAllConnections?.();await new Promise(resolve=>srv.close(resolve))}});
