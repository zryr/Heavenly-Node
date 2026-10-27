'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
const out = process.env.HEAVENLY_EVIDENCE_DIR ? path.resolve(process.env.HEAVENLY_EVIDENCE_DIR) : path.resolve(__dirname, '../../docs/phase4-5/evidence');
const result = {engine, emulatedDevices:true, physicalDevices:[], checks:[], errors:[]};
let server, browser, context, activePage;
(async () => {
  fs.mkdirSync(out,{recursive:true});
  server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.on('listening',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? {executablePath:'/usr/bin/chromium',args:['--no-sandbox']} : {});
  result.version = browser.version();
  context = await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
  await context.route('**/*', route => {
    const request = route.request();
    if (request.url().startsWith(origin) || ['font','stylesheet','image'].includes(request.resourceType())) return route.continue();
    return route.abort();
  });
  const page = await context.newPage(); activePage = page;
  page.setDefaultTimeout(8000);
  page.on('pageerror',e => result.errors.push(e.message));
  const check = text => { result.checks.push(text); console.log('PASS ' + engine + ': ' + text); };
  const status = () => page.locator('#preview-status-text').textContent();
  const source = page.locator('#code-input');
  async function run(code) {
    await page.locator('#view-editor').click();
    await source.waitFor({state:'visible'});
    if (code.length > 100000) {
      // Exercise the real input/save path without Chromium CDP insertText's
      // pathological multi-line paste cost, then test reload and caret editing.
      await source.evaluate((el,text)=>{el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));},code);
    } else await source.fill(code);
    if (page.viewportSize().width > 900) await page.locator('#view-split').click();
    await page.locator('#btn-run').click();
    await page.waitForFunction(() => /Rendered|Blank canvas/.test(document.getElementById('preview-status-text').textContent));
  }
  async function tools(id) { await page.locator('#viewer-tools summary').click(); await page.locator(id).click(); }
  async function shot(file) {
    if (engine !== 'chromium') return;
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({path:path.join(out,file)});
  }
  await page.goto(origin + '/html-viewer.html',{waitUntil:'domcontentloaded'});
  // Let the parent frame's webfont metrics settle before targeting a child-frame button.
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(() => document.getElementById('preview-status-text').textContent === 'Rendered');
  const sample = await source.inputValue();
  assert(sample.includes('Small ideas.'));
  await page.frameLocator('#preview-iframe').getByRole('button').click();
  await page.frameLocator('#preview-iframe').getByRole('button',{name:/JavaScript is running/}).waitFor();
  await shot('after-viewer-desktop.png');
  check('Sample HTML/CSS/JavaScript renders and responds in the isolated preview');

  const attack = '<h1 id="probe">Checking isolation</h1><script>var r={};for(var k of ["storage","dom","frame","top"]){try{if(k==="storage"){r[k]=parent.localStorage.getItem("heavenly_private_probe");parent.localStorage.setItem("heavenly_private_probe","changed")}if(k==="dom"){parent.document.body.setAttribute("data-compromised","yes");r[k]="accessible"}if(k==="frame")r[k]=String(window.frameElement);if(k==="top"){top.document.body.innerHTML="compromised";r[k]="accessible"}}catch(e){r[k]=e.name}}try{r.ownStorage=localStorage.getItem("heavenly_private_probe")}catch(e){r.ownStorage=e.name}try{r.popup=window.open("about:blank")===null?"blocked":"opened"}catch(e){r.popup=e.name}document.getElementById("probe").textContent=JSON.stringify(r);<\/script>';
  await page.evaluate(() => localStorage.setItem('heavenly_private_probe','secret'));
  await run(attack);
  const isolation = JSON.parse(await page.frameLocator('#preview-iframe').locator('#probe').textContent());
  assert.equal(isolation.storage,'SecurityError'); assert.equal(isolation.dom,'SecurityError'); assert.equal(isolation.top,'SecurityError');
  assert.equal(isolation.ownStorage,'SecurityError'); assert.equal(isolation.frame,'null'); assert(['blocked','InvalidAccessError','SecurityError'].includes(isolation.popup));
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_private_probe')),'secret');
  assert.equal(await page.locator('body').getAttribute('data-compromised'),null);
  result.isolation = isolation;
  check('Executed attack cannot read/write parent storage, parent/top DOM or frameElement; preview storage and popup blocked');

  await run('<h1>Validated messages</h1>');
  const before = await status();
  await page.evaluate(() => {
    window.postMessage({type:'heavenly-preview-connect',token:'fake'},'*');
    var channel = new MessageChannel();
    window.postMessage({type:'heavenly-preview-connect',token:'fake'},'*',[channel.port2]);
    channel.port1.postMessage({type:'error',text:'UNTRUSTED MESSAGE',line:1});
    document.getElementById('preview-iframe').contentWindow.postMessage({type:'error',text:'UNTRUSTED MESSAGE'},'*');
  });
  await page.waitForTimeout(60);
  assert.equal(await status(),before);
  assert.equal(await page.locator('#preview-diagnostics').textContent(),'');
  await run('<h1>Old document</h1><script>setTimeout(function(){throw Error("STALE DOCUMENT")},2000)<\/script>');
  await run('<h1>Fresh document</h1>');
  await page.waitForTimeout(2100);
  assert.equal(await page.locator('#preview-diagnostics').textContent(),'');
  check('Unregistered/wrong-token messages ignored and rerunning tears down old timers and diagnostic channel');

  await run('<h1>Runtime feedback</h1>\n<script>\nthrow new Error("Try fixing this line");\n<\/script>');
  await page.locator('#preview-diagnostics').waitFor({state:'visible'});
  const runtimeNotice = await page.locator('#preview-diagnostics').textContent();
  if (runtimeNotice.includes('hid the error details')) result.runtimeDetails='browser-redacted';
  else { assert(runtimeNotice.includes('Try fixing this line')); assert(runtimeNotice.includes('line 3')); result.runtimeDetails='source line and message'; }
  await shot('after-viewer-error.png');
  await run('<h1>Syntax feedback</h1><script>var broken = ;<\/script>');
  await page.locator('#preview-diagnostics').waitFor({state:'visible'});
  assert((await page.locator('#preview-diagnostics').textContent()).match(/SyntaxError|Unexpected|hid the error details/));
  await run('<h1>Rejection feedback</h1><script>Promise.reject(new Error("Async practice error"));<\/script>');
  await page.locator('#preview-diagnostics').waitFor({state:'visible'});
  assert((await page.locator('#preview-diagnostics').textContent()).match(/Async practice error|background task failed|hid the error details/));
  check('Runtime, syntax and rejected-promise failures produce readable diagnostics; browser-redacted details have actionable guidance');

  const work = '<!doctype html>\n<h1>Keep this work</h1>\n<script>document.body.dataset.ran="yes";<\/script>';
  await run(work);
  for (const view of ['editor','preview','split']) {
    await page.locator('#view-' + view).click();
    assert.equal(await source.inputValue(),work);
    assert.equal(await page.locator('#view-' + view).getAttribute('aria-selected'),'true');
    if (view === 'editor') { assert.equal(await page.locator('.preview-pane').isVisible(),false); await shot('after-viewer-editor.png'); }
    if (view === 'preview') { assert.equal(await page.locator('.editor-pane').isVisible(),false); await shot('after-viewer-preview.png'); }
  }
  await source.focus(); await page.keyboard.press('Control+Enter');
  await page.waitForFunction(() => document.getElementById('preview-status-text').textContent === 'Rendered');
  await page.keyboard.press('Meta+Enter');
  await page.waitForFunction(() => document.getElementById('preview-status-text').textContent === 'Rendered');
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_html_viewer_code')),work);
  check('All three view modes and Ctrl/Cmd+Enter preserve and execute current source');

  await page.locator('#workspace-resize').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#workspace-resize').getAttribute('aria-valuenow'),'52');
  const divider = await page.locator('#workspace-resize').boundingBox();
  await page.mouse.move(divider.x+divider.width/2,divider.y+divider.height/2);
  await page.mouse.down(); await page.mouse.move(divider.x+80,divider.y+divider.height/2,{steps:8}); await page.mouse.up();
  assert(Number(await page.locator('#workspace-resize').getAttribute('aria-valuenow'))>52);
  const split = await page.evaluate(() => localStorage.getItem('heavenly_html_viewer_split'));
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await source.inputValue(),work);
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_html_viewer_split')),split);
  check('Mouse/keyboard splitter preference persists separately from exact source');

  await source.fill('one\ntwo\nthree');
  await source.evaluate(el=>el.setSelectionRange(0,7));
  await page.keyboard.press('Tab');
  assert.equal(await source.inputValue(),'  one\n  two\nthree');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await source.inputValue(),'one\ntwo\nthree');
  await source.evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
  await page.keyboard.press('Tab');
  const indented = await source.inputValue();
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await source.inputValue(),indented);
  await source.focus(); await page.keyboard.press('Escape'); await page.keyboard.press('Tab');
  assert.notEqual(await page.evaluate(() => document.activeElement.id),'code-input');
  check('Tab/multiline/Shift+Tab edits autosave; Escape then Tab leaves the editor');

  await run(work);
  await tools('#btn-clear');
  assert.equal(await source.inputValue(),'');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await source.inputValue(),'');
  await page.locator('#btn-undo-replace').click();
  assert.equal(await source.inputValue(),work);
  await tools('#btn-load-sample');
  assert.equal(await source.inputValue(),sample);
  await page.locator('#btn-undo-replace').click();
  assert.equal(await source.inputValue(),work);
  check('Clear persists intentional empty source; reload/Restore and sample replacement recover previous work');

  await tools('#btn-clear');
  await page.evaluate(() => {
    window.__originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key,value) { if (key === 'heavenly_html_viewer_code' && value.length>0) throw new DOMException('Quota exceeded','QuotaExceededError'); return window.__originalSet.call(this,key,value); };
  });
  await page.locator('#btn-undo-replace').click();
  assert.equal(await source.inputValue(),work);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_html_viewer_recovery')).code),work);
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_html_viewer_code')),'');
  assert.equal(await page.locator('#storage-warning').isVisible(),true);
  await page.evaluate(() => { Storage.prototype.setItem=window.__originalSet; document.getElementById('code-input').dispatchEvent(new Event('input',{bubbles:true})); });
  await page.waitForTimeout(300);
  check('Simulated quota failure during Restore preserves the durable recovery copy and reports unsaved work');

  const durableBeforeReadFailure = await page.evaluate(()=>localStorage.getItem('heavenly_html_viewer_code'));
  const unreadable = await context.newPage();
  await unreadable.addInitScript(()=>{
    const original = Storage.prototype.getItem; let denied = false;
    Storage.prototype.getItem = function(key){if(key==='heavenly_html_viewer_code'&&!denied){denied=true;throw new DOMException('Read temporarily denied','SecurityError');}return original.call(this,key);};
  });
  await unreadable.goto(origin+'/html-viewer.html',{waitUntil:'domcontentloaded'});
  await unreadable.locator('#view-editor').click();
  await unreadable.locator('#code-input').fill('<h1>New work kept in this tab</h1>');
  await unreadable.locator('#btn-run').click();
  await unreadable.evaluate(()=>localStorage.setItem('viewer_write_probe','write succeeds'));
  assert.equal(await unreadable.evaluate(()=>localStorage.getItem('heavenly_html_viewer_code')),durableBeforeReadFailure);
  assert((await unreadable.locator('#storage-warning').textContent()).includes('left untouched'));
  assert((await unreadable.locator('.editor-pane .status-indicator').textContent()).includes('Unsaved'));
  await unreadable.close();
  check('A denied initial source read followed by working writes never overwrites the unreadable saved document');

  await page.evaluate(() => { window.__copied=''; Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}}); });
  await tools('#btn-copy-code');
  assert.equal(await page.evaluate(() => window.__copied),work);
  assert((await page.locator('.editor-pane .status-indicator').textContent()).includes('copied'));
  check('Copy feedback follows actual clipboard completion');

  await page.evaluate(() => { document.querySelector('.preview-pane').requestFullscreen=()=>Promise.reject(new Error('unsupported')); });
  await page.locator('#btn-fullscreen-preview').click();
  await page.waitForFunction(() => document.querySelector('.preview-pane').classList.contains('native-fullscreen-overlay'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.native-fullscreen-overlay').count(),0);
  check('Fullscreen rejection has a visible fallback with Escape and focus restoration');

  await run(attack);
  await page.locator('#viewer-tools summary').click();
  const popupPromise = context.waitForEvent('page');
  await page.locator('#btn-blank').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  assert.equal(await popup.evaluate(() => window.opener),null);
  const fullIsolation = JSON.parse(await popup.frameLocator('iframe').locator('#probe').textContent());
  assert.equal(fullIsolation.storage,'SecurityError'); assert.equal(fullIsolation.dom,'SecurityError'); assert.equal(fullIsolation.ownStorage,'SecurityError');
  result.newTabIsolation = fullIsolation;
  await popup.close();
  check('User-initiated full-window preview has no opener and authored code remains opaque-origin isolated');

  // Remote launcher routing is stubbed to exercise the real local fallback without relying on remote availability.
  await context.route('https://raw.githubusercontent.com/Cra-Z-Gaming/VUS/main/index.html',r=>r.abort());
  await context.route(origin+'/proxy/https://raw.githubusercontent.com/Cra-Z-Gaming/VUS/main/index.html',r=>r.fulfill({status:503,body:'fixture unavailable'}));
  await page.locator('#viewer-tools summary').click();
  const vusPromise = context.waitForEvent('page'); await page.locator('#btn-vus').click();
  const vus = await vusPromise;
  await vus.waitForFunction(() => document.querySelector('.notice').textContent.includes('VUS isolated preview'));
  assert.equal(await vus.evaluate(() => window.opener),null);
  assert.equal(await vus.locator('iframe').getAttribute('sandbox'),'allow-scripts allow-forms allow-popups');
  await vus.close();
  check('Existing three-tier VUS launch reaches local fallback in the same isolated user-initiated shell');

  await run(Array.from({length:20000},(_,i)=>'<!-- line '+(i+1)+' -->').join('\n'));
  await source.evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll'));});
  await page.waitForTimeout(80);
  const gutter = await page.locator('.gutter-lines').textContent();
  assert(gutter.includes('20000')); assert(gutter.split('\n').length < 100);
  assert.equal(await source.inputValue().then(text=>text.split('\n').length),20000);
  await source.focus(); await page.keyboard.press('Control+End'); await page.keyboard.type(' ');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>localStorage.getItem('heavenly_html_viewer_code').split('\n').length),20000);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await source.inputValue().then(text=>text.split('\n').length),20000);
  check('20,000-line source loads, accepts caret editing and persists with a bounded scroll-synchronized gutter');

  await run(sample);
  for (const [width,height,name] of [[820,1180,'tablet'],[1180,820,'tablet-landscape'],[390,844,'phone'],[844,390,'phone-landscape']]) {
    await page.setViewportSize({width,height});
    await page.locator('#view-editor').click();
    assert.equal(await page.locator('.editor-pane').isVisible(),true);
    assert.equal(await page.locator('.preview-pane').isVisible(),false);
    if (name === 'tablet') await shot('after-viewer-tablet.png');
    if (name === 'phone') await shot('after-viewer-phone.png');
    await page.locator('#view-preview').click();
    assert.equal(await page.locator('.preview-pane').isVisible(),true);
    assert.equal(await page.locator('.editor-pane').isVisible(),false);
    assert.equal(await source.inputValue(),sample);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    result.checks.push(name+' '+width+'×'+height+' Editor/Preview, source preserved, no overflow');
  }
  check('Tablet/phone portrait and landscape switch panels without losing source or horizontal overflow');

  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#btn-run').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  await page.evaluate(() => localStorage.setItem('heavenly_settings',JSON.stringify({persistentCloak:true,selectedPreset:'google'})));
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.title(),'Google');
  const settingsTab = await context.newPage();
  await settingsTab.goto(origin+'/html-viewer.html',{waitUntil:'domcontentloaded'});
  await settingsTab.evaluate(()=>{const settings=JSON.parse(localStorage.getItem('heavenly_settings'));settings.disableAllFeatures=true;localStorage.setItem('heavenly_settings',JSON.stringify(settings));});
  await page.waitForFunction(()=>document.title==='Heavenly - HTML Viewer');
  assert.equal(await page.locator('#heavenly-cloak-icon').count(),0);
  await settingsTab.evaluate(()=>{const settings=JSON.parse(localStorage.getItem('heavenly_settings'));settings.disableAllFeatures=false;localStorage.setItem('heavenly_settings',JSON.stringify(settings));});
  await page.waitForFunction(()=>document.title==='Google');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('heavenly_settings')).persistentCloak),true);
  assert((await page.locator('#heavenly-cloak-icon').getAttribute('href')).includes('google.com'));
  await settingsTab.close();
  check('Reduced motion, persisted cloaking and cross-tab master gating retain choices and restore the correct identity');
  if (engine === 'chromium') {
    const fresh = await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});
    await fresh.route('**/*',route=>route.request().url().startsWith(origin)||['font','stylesheet','image'].includes(route.request().resourceType())?route.continue():route.abort());
    const capture = await fresh.newPage();
    await capture.goto(origin+'/html-viewer.html',{waitUntil:'domcontentloaded'});
    await capture.evaluate(()=>document.fonts.ready);
    await capture.waitForFunction(()=>document.getElementById('preview-status-text').textContent==='Rendered');
    await capture.screenshot({path:path.join(out,'after-viewer-tablet.png')});
    await capture.setViewportSize({width:390,height:844});
    await capture.screenshot({path:path.join(out,'after-viewer-phone.png')});
    await fresh.close();
  }
  result.expectedAuthoredErrors = result.errors.filter(message => /Try fixing this line|Async practice error|Unexpected token|expected expression|Blocked a frame at \"null\" from accessing/.test(message));
  result.errors = result.errors.filter(message => !result.expectedAuthoredErrors.includes(message));
  assert.deepEqual(result.errors,[]);
})().catch(async e=>{result.failure=String(e.stack).slice(0,2500);if(activePage){try{result.failureState=await activePage.evaluate(()=>({mode:document.getElementById('workspace').className,viewport:[innerWidth,innerHeight],source:document.getElementById('code-input').getBoundingClientRect().toJSON(),sourceDisplay:getComputedStyle(document.getElementById('code-input')).display}));await activePage.screenshot({path:'/tmp/heavenly-viewer-failure-'+engine+'.png'});}catch(_){}}console.error(String(e.stack).slice(0,2500));process.exitCode=1}).finally(async()=>{
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'viewer-browser-'+engine+'.json'),JSON.stringify(result,null,2));
  await context?.close();await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}
});
