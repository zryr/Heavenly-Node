'use strict';
// Real standalone documents and recovery interactions; all devices are emulated.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const playwright = require('playwright'), express = require('express'), app = require('../../app');
const out = path.resolve(__dirname, '../../docs/phase8/evidence');
const report = { executed: new Date().toISOString(), scope: 'Linux browser automation, emulated viewport/touch and CSS zoom; no physical iPad, Chromebook or Apple Safari test.', browsers: [] };
const pages = Object.keys(require('../../academy/pages.json'));
const sizes = [['desktop',1440,1000],['chromebook',1366,768],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['phone',390,844],['narrow-phone',320,740]];
let server;
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const fixture = express();
  let errorRequests = 0;
  fixture.get('/phase8-error', (req,res) => { errorRequests++; res.status(502).type('html').send(app.renderHeavenlyErrorPage({statusCode:502,errorType:'Server Not Found',targetUrl:'https://example.invalid/' + 'a'.repeat(230),details:'Heavenly could not find this website’s server. Check the address or try again later.',source:'proxy',phase:'dns',code:'ENOTFOUND'})); });
  fixture.use(app);
  server = fixture.listen(0,'127.0.0.1'); await new Promise(resolve => server.on('listening',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const engine of (process.env.HEAVENLY_BROWSER ? [process.env.HEAVENLY_BROWSER] : ['chromium','firefox','webkit'])) {
    const row = {engine,checks:[],layouts:[],errors:[]}; report.browsers.push(row); let browser;
    try {
      browser = await playwright[engine].launch(engine === 'chromium' ? {executablePath:'/usr/bin/chromium',args:['--no-sandbox']} : {});
      row.version = browser.version();
      const context = await browser.newContext({ viewport:{width:1440,height:1000},hasTouch:engine!=='firefox' });
      await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill(route.request().resourceType()==='stylesheet' ? {contentType:'text/css',body:''} : {contentType:'text/html',body:'<!doctype html><h1>External navigation fixture</h1>'}));
      const page = await context.newPage(); page.on('pageerror',error => row.errors.push(error.message));
      for (const name of pages) {
        await page.goto(origin + (name === 'home' ? '/academy' : '/academy/' + name));
        assert(!/fictional|demonstration|not a real school/i.test(await page.locator('body').innerText()),name);
        assert.equal(await page.locator('#url,#codex-dev-modal,.app-layout').count(),0);
        assert.equal(await page.locator('meta[name=description]').getAttribute('content'), 'Explore open study guides, learning pathways and resources from Morrowfield Academy.');
        for (const [label,width,height] of sizes) {
          await page.setViewportSize({width,height}); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          const dims = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
          assert(dims.scrollWidth <= dims.width+1,name+' '+label+' overflow '+JSON.stringify(dims));
          row.layouts.push({name,label,...dims});
        }
        await page.setViewportSize({width:1440,height:1000});
        for (const zoom of [2,.67]) {
          await page.evaluate(zoom => document.documentElement.style.zoom=zoom,zoom);
          const dims = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
          assert(dims.scrollWidth <= dims.width+1,name+' zoom '+zoom);row.layouts.push({name,zoom,...dims});
        }
      }
      row.checks.push('12 Academy documents remain isolated at six viewport sizes and CSS zoom 200%/67%; all visible/metadata copy corrected');
      await page.goto(origin+'/academy/terms');
      assert(!await page.locator('body').innerText().then(text => text.includes('This landing experience is part of Heavenly Node')));
      await page.locator('a[href="/academy/credits#software"]').click(); await page.locator('#software').waitFor();
      for (const text of ['GNU Affero General Public License','Nathan Friedly','Syshi','Matthew Petroff']) assert((await page.locator('body').innerText()).includes(text));
      await page.goto(origin+'/academy/no-such-phase8-page');assert(await page.locator('#academy-not-found').isVisible());
      row.checks.push('Terms link reaches retained software/photo attribution and unknown page has Academy-only recovery');
      await page.goto(origin+'/phase8-error');
      for(const [label,width,height] of sizes){
        await page.setViewportSize({width,height});
        assert.equal(await page.locator('.error-container').evaluate(node=>getComputedStyle(node).backdropFilter),'none');
        const dims=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
        assert(dims.scrollWidth<=dims.width+1,label+' error overflow');
        for(const control of await page.locator('.actions-group a').all())assert((await control.boundingBox()).height>=44);
      }
      assert.equal(await page.locator('main[aria-labelledby="error-title"]').count(),1);
      assert.equal(await page.locator('.glow-orb').count(),0);
      await page.locator('#heavenly-advanced-details > summary').click();
      assert(await page.locator('.diagnostic-grid').isVisible());
      await page.locator('.diagnostic-report > summary').click();
      const copied = await page.locator('#heavenly-advanced-report').inputValue();
      assert(copied.includes('ENOTFOUND')); assert(!copied.includes('a'.repeat(200)));
      await page.locator('#heavenly-advanced-copy').click();
      assert(await page.locator('#heavenly-advanced-copy-status').isVisible());
      const before = errorRequests; await page.getByRole('link',{name:'Try Again',exact:true}).click(); assert(errorRequests>before);
      const popupPromise=page.waitForEvent('popup');await page.getByRole('link',{name:'Open website directly',exact:true}).click();
      const popup=await popupPromise;await popup.waitForLoadState();assert.equal(new URL(popup.url()).hostname,'example.invalid');assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.getAnimations().filter(a=>a.playState==='running').length===0);
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
      if(engine==='chromium'){
        await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'error-phone.png'),fullPage:true});
        await page.goto(origin+'/academy');await page.screenshot({path:path.join(out,'academy-phone.png'),fullPage:true});
        await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(out,'academy-desktop.png'),fullPage:true});
      }
      row.checks.push('Recovery fits six sizes, 44px actions, real retry/direct popup, selectable sanitized diagnostics and reduced-motion static surface');
      assert.deepEqual(row.errors,[]);row.status='passed';await context.close();
      console.log('PASS '+engine+': '+row.checks.length+' groups, '+row.layouts.length+' Academy layout observations');
    }catch(error){row.status='failed';row.failure=error.stack;process.exitCode=1;console.error(error.stack);}
    finally{await browser?.close();}
  }
})().catch(error=>{report.failure=error.stack;process.exitCode=1;console.error(error.stack);}).finally(async()=>{
 fs.writeFileSync(path.join(out,'surface-results.json'),JSON.stringify(report,null,2)+'\n');
 if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}
});
