'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../../docs/phase6-7'),result={checks:[],physicalDevices:[]};let browser,server;
(async()=>{
 // Managed Chromium blocks file:// navigation. Serve exactly the standalone
 // artifact locally, with all external requests blocked during validation.
 const artifact=fs.readFileSync(path.join(root,'comparison.html'));
 server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(artifact)}).listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});result.engine=browser.version();result.transport='Local HTTP; external requests blocked; managed browser disallows file://';const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 await page.locator('.preview img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 const buttons=page.locator('.preview'),count=await buttons.count();assert(count>=35);result.screenshots=count;
 for(let i=0;i<count;i++){
  const button=buttons.nth(i),width=await button.locator('img').evaluate(n=>n.naturalWidth);assert(width>0);await button.click();await page.locator('#full-image').evaluate(n=>n.decode());assert.equal(await page.locator('#full-image').evaluate(n=>n.getBoundingClientRect().width),width);assert(await page.locator('#viewer').evaluate(n=>n.open));await page.keyboard.press('Escape');assert.equal(await page.locator('#viewer').evaluate(n=>n.open),false);
 }
 result.checks.push('All '+count+' embedded screenshots decode, open at original pixel width and close by keyboard');
 const videos=await page.locator('video').count();assert.equal(videos,2);await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(video=>Number.isFinite(video.duration)&&video.duration>0));assert(await page.locator('video').evaluateAll(videos=>videos.every(video=>video.paused&&video.controls&&!video.autoplay)));result.checks.push('Both embedded recordings load metadata and remain paused with native playback controls');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await buttons.first().click();assert(await page.locator('#close').isVisible());await page.keyboard.press('Escape');result.checks.push('Phone report has no page overflow and retains usable image dismissal');
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(root,'report-preview.png')});assert.deepEqual(errors,[]);result.status='passed';console.log('PASS portable report '+count+' images and '+videos+' recordings');
})().catch(error=>{result.status='failed';result.failure=error.stack;process.exitCode=1;console.error(error)}).finally(async()=>{fs.writeFileSync(path.join(root,'evidence/report-validation.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();if(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve))}});
