'use strict';
// Supplementary baseline captures from an immutable source archive. No extra
// branch or checkout is created, and the active implementation is untouched.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),base='a329d6cf0a01728526057b8a854a5ec7fb19c705',out=path.join(root,'docs/phase6-7/evidence/before');
let temp,browser,server;
const result={commit:base,captured:new Date().toISOString(),method:'Immutable git archive of the merged baseline, rendered after implementation began; no second branch',captures:[],physicalDevices:[]};
(async()=>{
 temp=fs.mkdtempSync(path.join(os.tmpdir(),'heavenly-phase67-copy-'));
 const archive=cp.execFileSync('git',['archive',base,'app.js','lib','custom-client','public','package.json'],{cwd:root,maxBuffer:30*1024*1024});
 cp.execFileSync('tar',['-x','-C',temp],{input:archive});fs.symlinkSync(path.join(root,'node_modules'),path.join(temp,'node_modules'),'dir');
 const app=require(path.join(temp,'app.js'));
 app.get('/phase67-copy-error',(req,res)=>res.status(502).type('html').send(app.renderHeavenlyErrorPage({statusCode:502,errorType:'Server Not Found',targetUrl:'https://example.invalid/',details:'Heavenly could not connect or resolve the server address at https://example.invalid/. DNS lookup failed from this server; check the address or try again later.',source:'proxy',phase:'dns',code:'ENOTFOUND'})));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});result.engine=browser.version();const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{if(window===top)sessionStorage.setItem('heavenly_decoy_unlocked','true')});const page=await context.newPage();page.setDefaultTimeout(10000);
 const shot=async(id)=>{await page.screenshot({path:path.join(out,id+'.png')});result.captures.push(id+'.png')};
 await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});await page.locator('#heavenly-loading-screen').waitFor({state:'hidden'});await page.locator('#settings-search').fill('persistent');await page.locator('#set-persistent-cloak').scrollIntoViewIfNeeded();await shot('settings-cloaking-desktop');
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/html-viewer.html',{waitUntil:'domcontentloaded'});await page.locator('.isolation-note').scrollIntoViewIfNeeded();await shot('viewer-help-phone');
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/phase67-copy-error',{waitUntil:'domcontentloaded'});await shot('error-desktop');
 console.log('Captured '+result.captures.length+' supplementary baseline copy views from '+base.slice(0,7));
})().catch(e=>{result.failure=e.stack;process.exitCode=1;console.error(e)}).finally(async()=>{fs.writeFileSync(path.join(out,'copy-baseline-manifest.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}if(temp)fs.rmSync(temp,{recursive:true,force:true})});
