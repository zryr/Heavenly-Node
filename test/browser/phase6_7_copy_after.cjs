'use strict';
// Matching implementation views for the immutable baseline copy captures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),app=require('../../app');
const out=path.resolve(__dirname,'../../docs/phase6-7/evidence/after');let server,browser;
const result={captured:new Date().toISOString(),fixture:'Known ENOTFOUND passed through the actual error middleware; no live destination failure is implied',screenshots:[],checks:[],physicalDevices:[]};
(async()=>{
 app.get('/phase67-copy-error',(req,res)=>app.heavenlyErrorMiddleware({code:'ENOTFOUND'},{url:'/proxy/https://example.invalid/',originalUrl:'/proxy/https://example.invalid/'},res,()=>{}));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});result.engine=browser.version();const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(()=>{if(window===top)sessionStorage.setItem('heavenly_decoy_unlocked','true')});
 const page=await context.newPage();page.setDefaultTimeout(10000);const capture=async(name)=>{await page.screenshot({path:path.join(out,name+'.png')});result.screenshots.push(name+'.png')};
 await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});await page.locator('#heavenly-loading-screen').waitFor({state:'hidden'});await page.locator('#settings-search').fill('persistent');await page.locator('#set-persistent-cloak').scrollIntoViewIfNeeded();await capture('settings-cloaking-desktop');
 assert(await page.locator('#set-persistent-cloak').isVisible());result.checks.push('Legacy persistent terminology reaches the existing tab appearance control');
 const response=await page.goto(origin+'/phase67-copy-error',{waitUntil:'domcontentloaded'});assert.equal(response.status(),502);assert.equal(await page.locator('h1').innerText(),'This website could not load');
 const direct=page.getByRole('link',{name:'Open website directly'});assert.equal(await direct.getAttribute('href'),'https://example.invalid/');assert.equal(await direct.getAttribute('rel'),'noopener');await capture('error-desktop');
 assert(await page.getByRole('link',{name:'Return to Heavenly'}).isVisible());await page.locator('#heavenly-advanced-details > summary').click();assert(await page.locator('#heavenly-advanced-report').count());result.checks.push('Actionable 502 copy preserves direct destination, null-opener link policy and optional sanitized technical details');
 console.log('PASS '+result.checks.length+' matching copy and error fixture groups');
})().catch(error=>{result.failure=error.stack;process.exitCode=1;console.error(error)}).finally(async()=>{fs.writeFileSync(path.join(out,'copy-after-manifest.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
