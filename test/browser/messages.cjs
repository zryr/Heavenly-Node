'use strict';
// Focused lifecycle checks. Browser clocks and visibility below are emulated;
// Spotify is fulfilled locally, so this does not claim destination availability.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const app = require('../../app');
const output = path.resolve(__dirname,'../../docs/phase6-7/evidence/messages-browser-results.json');
const engines = process.env.HEAVENLY_BROWSER ? [process.env.HEAVENLY_BROWSER] : ['chromium','firefox','webkit'];
const report = {executed:new Date().toISOString(),input:'Playwright mouse/keyboard with browser clock and synthetic visibility; no physical devices.',browsers:[]};
let server;
async function ready(page) {
  await page.waitForFunction(() => window.heavenlyMessages && (!document.getElementById('heavenly-loading-screen') || document.getElementById('heavenly-loading-screen').hidden || getComputedStyle(document.getElementById('heavenly-loading-screen')).display === 'none'));
}
async function state(page) { return page.evaluate(() => heavenlyMessages.getState()); }
async function show(page,id) { await page.evaluate(id => heavenlyMessages.show(id),id); }
async function open(page,id) { await show(page,id); await page.locator('#heavenly-messages [data-message-text]').click(); await page.locator('#heavenly-message-dialog').waitFor(); }
async function nextScene(page,count) { for (let i=0;i<count;i++) { await page.locator('#heavenly-message-dialog [data-scene-next]').focus(); await page.keyboard.press('Enter'); } }
async function remount(page) {
  await page.evaluate(() => { heavenlyMessages.destroy(); window.heavenlyMessages = HeavenlyMessages.mount(document.getElementById('heavenly-messages'),{random:() => .5}); });
  await page.locator('#heavenly-messages').scrollIntoViewIfNeeded();
  await page.mouse.move(1,1); await page.evaluate(() => document.activeElement.blur());
  await page.waitForFunction(() => !heavenlyMessages.getState().paused);
}
(async function () {
  server = app.listen(0,'127.0.0.1'); await new Promise(resolve => server.on('listening',resolve));
  const origin = 'http://127.0.0.1:'+server.address().port;
  for (const engine of engines) {
    let browser,context;
    const result = {engine,checks:[],errors:[]}; report.browsers.push(result);
    const pass = label => { result.checks.push(label); console.log('PASS '+engine+' '+label); };
    try {
      browser = await playwright[engine].launch(engine === 'chromium' ? {executablePath:'/usr/bin/chromium',args:['--no-sandbox']} : {}); result.version = browser.version();
      context = await browser.newContext({viewport:{width:1440,height:1000}});
      await context.addInitScript(() => { if (window === top) sessionStorage.setItem('heavenly_decoy_unlocked','true'); });
      await context.route('https://open.spotify.com/**',route => route.fulfill({status:200,contentType:'text/html',body:'<title>Local Spotify navigation fixture</title>'}));
      let page = await context.newPage(); page.setDefaultTimeout(8000); page.on('pageerror',error => result.errors.push(error.message));
      await page.goto(origin,{waitUntil:'domcontentloaded'}); await ready(page); await page.clock.install(); await remount(page);
      assert.equal((await state(page)).kind,'ordinary');
      const first = await page.evaluate(() => { heavenlyMessages.show(heavenlyMessages.getState().id); return heavenlyMessages.getState(); }); assert(first.remaining >= 13490 && first.remaining <= 13500);
      await page.clock.fastForward(13000); assert.equal((await state(page)).changes,first.changes);
      await page.clock.fastForward(600); assert.equal((await state(page)).changes,first.changes+1);
      assert.equal(context.pages().length,1); assert.equal(await page.locator('#heavenly-message-dialog').count(),0);
      pass('ordinary first; real browser scheduler holds through13seconds and rotates once by13.6seconds with no unsolicited popup');
      let host = page.locator('#heavenly-messages'), next = host.locator('[data-message-next]'), pause = host.locator('[data-message-pause]');
      await host.hover(); assert((await state(page)).reasons.includes('hover')); let frozen = (await state(page)).changes;
      await page.clock.fastForward(60000); assert.equal((await state(page)).changes,frozen); await page.mouse.move(1,1);
      await next.focus(); assert((await state(page)).reasons.includes('focus')); await page.clock.fastForward(60000); assert.equal((await state(page)).changes,frozen);
      await page.keyboard.press('Enter'); assert.equal((await state(page)).changes,frozen+1); await page.evaluate(() => document.activeElement.blur());
      await page.evaluate(() => { Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}); document.dispatchEvent(new Event('visibilitychange')); });
      assert((await state(page)).reasons.includes('hidden')); frozen = (await state(page)).changes; await page.clock.fastForward(60000); assert.equal((await state(page)).changes,frozen);
      await page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
      await host.evaluate(node => { node.style.display = 'none'; }); await page.waitForFunction(() => heavenlyMessages.getState().reasons.includes('offscreen'));
      await page.clock.fastForward(60000); assert.equal((await state(page)).changes,frozen); await host.evaluate(node => { node.style.display = ''; });
      await page.waitForFunction(() => !heavenlyMessages.getState().reasons.includes('offscreen'));
      await pause.focus(); await page.keyboard.press('Enter'); assert.equal(await pause.getAttribute('aria-pressed'),'true');
      await page.reload({waitUntil:'domcontentloaded'}); await ready(page); assert((await state(page)).reasons.includes('user'));
      assert.equal(await pause.getAttribute('aria-pressed'),'true');
      pass('hover, keyboard focus, hidden document, offscreen state and persisted explicit Pause compose; manual Next remains usable');
      // Use an ordinary browser clock for input/animation checks. WebKit's
      // clock-emulated CSS stability differs after large virtual-time jumps.
      await context.close(); context = await browser.newContext({viewport:{width:1440,height:1000},hasTouch:engine !== 'firefox'});
      await context.addInitScript(() => { if (window === top) { sessionStorage.setItem('heavenly_decoy_unlocked','true'); if (!localStorage.getItem('heavenly_messages_paused')) localStorage.setItem('heavenly_messages_paused','true'); } });
      await context.route('https://open.spotify.com/**',route => route.fulfill({status:200,contentType:'text/html',body:'<title>Local Spotify navigation fixture</title>'}));
      page = await context.newPage(); page.setDefaultTimeout(8000); page.on('pageerror',error => result.errors.push(error.message)); await page.goto(origin,{waitUntil:'domcontentloaded'}); await ready(page);
      host = page.locator('#heavenly-messages'); next = host.locator('[data-message-next]'); pause = host.locator('[data-message-pause]');
      await page.evaluate(() => heavenlyMessages.resume()); await next.focus(); await page.keyboard.press('Enter'); await pause.click(); assert.equal(await pause.getAttribute('aria-pressed'),'true','Mouse Pause after keyboard Next must retain the native click target.');
      await open(page,'msg_aura'); let dialog = page.locator('#heavenly-message-dialog');
      assert.equal(await dialog.locator('.hm-headphone-advice').innerText(),'For the full sound, try listening with headphones or both earbuds.');
      assert.equal(await dialog.locator('[data-playlist-next]').count(),0); assert.equal(context.pages().length,1);
      await dialog.locator('[data-scene-skip]').click(); assert.equal(await dialog.locator('.hm-headphone-advice').count(),0);
      assert.equal(await dialog.locator('[data-playlist-next]').count(),2); assert.equal(context.pages().length,1);
      await dialog.getByRole('button',{name:'Explore Hardstyle',exact:true}).click(); assert.equal(await dialog.getAttribute('data-playlist'),'hardstyle');
      assert.equal(await dialog.locator('a').getAttribute('href'),'https://open.spotify.com/playlist/0tsLDxUYDVIhHYPeqdP015');
      await dialog.locator('[data-scene-skip]').click(); await dialog.getByRole('button',{name:'Explore Favorite Songs',exact:true}).click();
      assert.equal(await dialog.getAttribute('data-message-theme'),'gold'); assert.equal(context.pages().length,1);
      const popupPromise = page.waitForEvent('popup'); await dialog.getByRole('link',{name:/Open Favorite Songs playlist/}).click(); const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded'); assert.equal(popup.url(),'https://open.spotify.com/playlist/5lDrWA2Ty2YTemqQ4OEMUj'); assert.equal(await popup.evaluate(() => window.opener),null); await popup.close();
      await page.waitForFunction(() => !document.getElementById('heavenly-message-dialog'));
      await open(page,'msg_hardtekk'); assert.equal(await dialog.locator('.hm-headphone-advice').count(),0); assert.equal(await dialog.locator('a').getAttribute('href'),'https://open.spotify.com/playlist/6asU2SoBz4duQ0rZaV20wI'); await dialog.locator('[data-scene-close]').click();
      await page.reload({waitUntil:'domcontentloaded'}); await ready(page); await open(page,'msg_aura'); assert.equal(await dialog.locator('.hm-headphone-advice').count(),0); await page.keyboard.press('Escape');
      const dismissed = await page.evaluate(() => JSON.parse(sessionStorage.getItem('heavenly_messages_dismissed_v1'))); for (const id of ['msg_aura','msg_hardstyle','msg_hardtekk','msg_favorites']) assert(dismissed.includes(id));
      await page.evaluate(() => { for (let i=0;i<300;i++) heavenlyMessages.next(); }); assert(!['msg_aura','msg_hardstyle','msg_hardtekk','msg_favorites'].includes((await state(page)).id));
      pass('headphone advice appears once per session; explicit Aura→Hardstyle/Hardtekk→Favorites exploration never autoopens Spotify; real anchor opens exact destination with null opener only on click');
      for (const [id,asset] of [['msg_purple_hulk','ao-side.webp'],['msg_khezu','khezu.webp'],['msg_doggy','doggy.webp']]) {
        await open(page,id); assert((await dialog.locator('img').getAttribute('src')).endsWith('/'+asset)); await nextScene(page,1);
        if (id === 'msg_khezu') { assert.equal(await dialog.locator('.hm-speaker').innerText(),'Cloudy'); assert.equal(await dialog.locator('.hm-dialog-line').innerText(),'No, you can’t use it for that.'); }
        await dialog.locator('[data-scene-skip]').focus(); await page.keyboard.press('Enter'); assert.equal(await dialog.count(),0);
      }
      await open(page,'msg_ao_oni'); assert.equal(await dialog.locator('.hm-speaker').innerText(),'You'); await nextScene(page,1); assert.equal(await dialog.locator('.hm-speaker').innerText(),'Cloudy'); await nextScene(page,2);
      assert.equal(await page.locator('.hm-dancer').count(),7); assert.equal(await dialog.evaluate(node => node.matches(':modal')),false); assert.equal(await page.locator('.hm-dance-burst').evaluate(node => getComputedStyle(node).pointerEvents),'none');
      for (const src of await page.locator('.hm-dancer').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')))) assert.equal(src,'/assets/messages/ao-dance.gif');
      await page.locator('#url').click(); await page.locator('#url').fill('The main input stays usable'); await page.keyboard.press('Escape'); assert.equal(await dialog.count(),0); assert.equal(await page.locator('.hm-dance-burst').count(),0); assert(await page.locator('#url').evaluate(node => node === document.activeElement));
      await open(page,'msg_ao_oni'); await nextScene(page,3); await page.waitForTimeout(2600); assert.equal(await dialog.count(),0); assert.equal(await page.locator('.hm-dance-burst').count(),0);
      pass('original character assets and keyboard dialogue work; seven short GIF dancers are nonmodal and pointer-transparent; Escape preserves input focus and auto completion removes the scene');
      await open(page,'msg_doggy'); await dialog.locator('[data-scene-close]').focus(); await page.keyboard.press('Shift+Tab'); assert(await dialog.locator('[data-scene-skip]').evaluate(node => node === document.activeElement)); await page.keyboard.press('Tab'); assert(await dialog.locator('[data-scene-close]').evaluate(node => node === document.activeElement)); await page.keyboard.press('Escape'); assert(await host.locator('[data-message-text]').evaluate(node => node === document.activeElement));
      await open(page,'msg_doggy'); await page.evaluate(() => { Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}); document.dispatchEvent(new Event('visibilitychange')); }); assert.equal(await dialog.count(),0); await page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
      await open(page,'msg_doggy'); await host.evaluate(node => { node.style.display = 'none'; }); await page.waitForFunction(() => !document.getElementById('heavenly-message-dialog')); await host.evaluate(node => { node.style.display = ''; }); await page.waitForFunction(() => !heavenlyMessages.getState().reasons.includes('offscreen'));
      await open(page,'msg_doggy'); await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); assert.equal(await dialog.count(),0); assert((await state(page)).reasons.includes('page')); await page.evaluate(() => window.dispatchEvent(new Event('pageshow'))); assert(!(await state(page)).reasons.includes('page')); assert((await state(page)).reasons.includes('user'));
      pass('modal keyboard boundaries restore the trigger; hidden, offscreen and page-transition lifecycle events close scenes while preserving explicit Pause');
      await page.emulateMedia({reducedMotion:'reduce'}); await open(page,'msg_ao_oni'); await nextScene(page,3); assert.equal(await page.locator('.hm-dance-burst').count(),0); assert.equal(await dialog.locator('img[src$=".gif"]').count(),0); assert((await dialog.locator('img').getAttribute('src')).endsWith('/ao-still.webp')); await page.keyboard.press('Escape'); assert.equal(await dialog.count(),0);
      await page.emulateMedia({reducedMotion:'no-preference'}); await open(page,'msg_doggy'); await page.emulateMedia({reducedMotion:'reduce'}); await page.keyboard.press('Escape'); assert(await host.locator('[data-message-text]').evaluate(node => node === document.activeElement),'Live reduced-motion rerender must retain a valid return-focus target.');
      await page.emulateMedia({reducedMotion:'no-preference'}); await open(page,'msg_ao_oni'); await nextScene(page,3); await page.locator('#url').click(); await page.locator('#url').fill('Keep this input focused'); await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForFunction(() => !document.querySelector('.hm-dance-burst')); assert.equal(await dialog.locator('img[src$=".gif"]').count(),0); assert(await page.locator('#url').evaluate(node => node === document.activeElement),'Changing reduced motion during a nonmodal dance must preserve unrelated input focus.'); await page.keyboard.press('Escape'); assert(await page.locator('#url').evaluate(node => node === document.activeElement));
      await page.evaluate(() => { const data = HeavenlyMessages.clone(HeavenlyMessagesData); const item = data.items.find(item => item.id === 'msg_homework'); item.reducedMotionText = 'A clear static fallback.'; window.liveMotionData = data; heavenlyMessages.destroy(); window.heavenlyMessages = HeavenlyMessages.mount(document.getElementById('heavenly-messages'),{data}); heavenlyMessages.show('msg_homework'); heavenlyMessages.pause(); });
      assert.equal(await host.locator('.hm-words').innerText(),'A clear static fallback.'); await page.emulateMedia({reducedMotion:'no-preference'}); await page.waitForFunction(() => document.querySelector('#heavenly-messages .hm-words').textContent === 'Doing anything but homework...');
      pass('reduced motion uses only still assets; changing the preference cleans an active dance and rerenders the current fallback without waiting for rotation');
      for (const width of [1440,820,390,320]) {
        await page.setViewportSize({width,height:900});
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        let previousHeight = null;
        for (const id of ['msg_homework','msg_resize','msg_purple_hulk','msg_favorites','msg_settings','msg_viewer']) {
          await show(page,id); const metrics = await host.evaluate(node => { const copy = node.querySelector('.hm-copy').getBoundingClientRect(), controls = node.querySelector('.hm-controls').getBoundingClientRect(); return {height:node.getBoundingClientRect().height,copyBottom:copy.bottom,controlsTop:controls.top,width:document.documentElement.scrollWidth}; });
          if (previousHeight !== null) assert.equal(metrics.height,previousHeight); previousHeight = metrics.height; assert(metrics.copyBottom <= metrics.controlsTop+1,'Message copy overlaps controls at '+width); assert(metrics.width <= width);
          for (const control of [next,pause]) { const box = await control.boundingBox(); assert(box.width >= 32 && box.height >= 32); }
          if (id === 'msg_settings' || id === 'msg_viewer') { await host.locator('a').focus(); const tip = await host.locator('[role=tooltip]').boundingBox(); assert(tip.x >= 0 && tip.x+tip.width <= width); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await page.evaluate(() => document.activeElement.blur()); }
        }
      }
      await show(page,'msg_homework'); const gradient = await host.locator('.hm-segment').evaluate(node => { const style = getComputedStyle(node); return {name:style.animationName,count:style.animationIterationCount,duration:style.animationDuration,play:style.animationPlayState}; }); assert.deepEqual(gradient,{name:'hm-sheen',count:'1',duration:'1.4s',play:'paused'});
      pass('published short, long and sticker messages keep a stable well at1440/820/390/320px with32px controls and no overlap or horizontal overflow');
      await page.evaluate(() => { const item = HeavenlyMessages.clone(HeavenlyMessagesData.items[0]); item.segments = [{text:'<img src=x onerror=alert(1)>',link:'HTTPS://example.invalid/preview-only'}]; const target = document.createElement('div'); target.id = 'message-safe-preview'; document.body.appendChild(target); HeavenlyMessages.renderPreview(target,item,{allowExternal:false}); });
      const preview = page.locator('#message-safe-preview'); assert.equal(await preview.locator('img').count(),0); assert.equal(await preview.locator('a').innerText(),'<img src=x onerror=alert(1)>'); assert.equal(await preview.locator('a').getAttribute('target'),'_blank'); assert.equal(await preview.locator('a').getAttribute('rel'),'noopener noreferrer'); const beforeURL = page.url(); await preview.locator('a').click({button:'middle'}); assert.equal(context.pages().length,1); assert.equal(page.url(),beforeURL); await preview.locator('a').click(); assert.equal(page.url(),beforeURL);
      pass('authored markup remains literal text and disabled preview navigation blocks primary and middle clicks');
      await page.evaluate(() => {
        heavenlyMessages.destroy(); window.messageListenerLedger = [];
        const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
        function owned(target,name) { return (target === window || target === document || target instanceof MediaQueryList) && ['visibilitychange','keydown','pagehide','pageshow','change'].includes(name); }
        EventTarget.prototype.addEventListener = function (name,fn,opts) { if (owned(this,name)) messageListenerLedger.push({target:this,name,fn}); return add.call(this,name,fn,opts); };
        EventTarget.prototype.removeEventListener = function (name,fn,opts) { const at = messageListenerLedger.findIndex(item => item.target === this && item.name === name && item.fn === fn); if (at >= 0) messageListenerLedger.splice(at,1); return remove.call(this,name,fn,opts); };
        window.restoreMessageEventMethods = () => { EventTarget.prototype.addEventListener = add; EventTarget.prototype.removeEventListener = remove; };
        window.heavenlyMessages = HeavenlyMessages.mount(document.getElementById('heavenly-messages')); heavenlyMessages.show('msg_ao_oni');
      });
      await host.scrollIntoViewIfNeeded(); await page.waitForFunction(() => !heavenlyMessages.getState().reasons.includes('offscreen')); await page.evaluate(() => heavenlyMessages.activate());
      await nextScene(page,3); await page.evaluate(() => document.getElementById('heavenly-messages').remove()); await page.waitForFunction(() => heavenlyMessages.getState().destroyed);
      assert.equal(await dialog.count(),0); assert.equal(await page.locator('.hm-dance-burst').count(),0); assert.equal(await page.evaluate(() => messageListenerLedger.length),0); const final = await state(page); await page.waitForTimeout(300); assert.equal((await state(page)).changes,final.changes); await page.evaluate(() => restoreMessageEventMethods());
      pass('detaching the owner during a dance destroys its timer, observer-owned scene and all owned document/window/media listeners');
      assert.deepEqual(result.errors,[]); result.status = 'passed';
    } catch (error) { result.status = 'failed'; result.failure = error.stack; process.exitCode = 1; console.error('FAIL '+engine+' '+error.stack); }
    finally { await context?.close(); await browser?.close(); }
  }
})().catch(error => { report.failure = error.stack; process.exitCode = 1; console.error(error); }).finally(async () => { fs.mkdirSync(path.dirname(output),{recursive:true}); fs.writeFileSync(output,JSON.stringify(report,null,2)); if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); } });
