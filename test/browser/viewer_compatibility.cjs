'use strict';
// Deterministic practice-project resources and navigation inside the opaque sandbox.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const pw = require('playwright');
const app = require('../../app');
let server;
const results = {executed:new Date().toISOString(),physicalDevices:[],browsers:[]};
(async()=>{
  // Serve real HTTP fixture bytes: Chromium credentialless-frame requests can
  // bypass DevTools interception and otherwise receive the app's HTML fallback.
  server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://fixture.local');
    if(!url.pathname.startsWith('/viewer-fixture/'))return app(request,response);
    let contentType='text/html',body;
    if(url.pathname.endsWith('.css')){contentType='text/css';body='.asset-probe{color:rgb(12,34,56)}'}
    else if(url.pathname.endsWith('.js')){contentType='application/javascript';body='document.body.dataset.externalScript="loaded";'}
    else if(url.pathname.endsWith('.svg')){contentType='image/svg+xml';body='<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="cyan"/></svg>'}
    else if(url.pathname.endsWith('/popup-external'))body='<!doctype html><h1>VUS app popup</h1><script>var probe={opener:opener===null};try{probe.storage=localStorage.getItem("viewer_shell_secret")}catch(e){probe.storage="blocked"}try{probe.topStorage=top.localStorage.getItem("viewer_shell_secret")}catch(e){probe.topStorage="blocked"}document.body.dataset.probe=JSON.stringify(probe);<\/script><a href="/viewer-fixture/popup-navigation">Navigate this app window</a>';
    else if(url.pathname.endsWith('/popup-navigation'))body='<!doctype html><h1>Popup navigation retained isolation</h1><script>try{localStorage.setItem("viewer_popup_escape","yes");document.body.dataset.storage="allowed"}catch(e){document.body.dataset.storage="blocked"}<\/script>';
    else body='<!doctype html><h1 id="destination">'+(url.pathname.endsWith('/form')?'Form submitted':'Link followed')+'</h1><script>try{parent.document.body.dataset.escaped="yes";document.body.dataset.isolation="failed"}catch(e){document.body.dataset.isolation="blocked"}</script><a id="next-link" href="/viewer-fixture/link">Follow a normal link</a>';
    response.writeHead(200,{'content-type':contentType,'access-control-allow-origin':'*'});response.end(body);
  }).listen(0,'127.0.0.1'); await new Promise(r=>server.on('listening',r));
  const origin='http://127.0.0.1:'+server.address().port;
  for(const engine of (process.env.HEAVENLY_ENGINES||'chromium,firefox,webkit').split(',')){
    let browser, page;
    const result={engine,checks:[]};results.browsers.push(result);
    try{
      browser=await pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{});
      result.version=browser.version();
      const context=await browser.newContext({viewport:{width:1366,height:768}});
      context.setDefaultTimeout(8000);
      if(process.env.HEAVENLY_VIEWER_DEBUG) context.on('page',item=>{
        item.on('console',message=>console.log(engine+' '+message.type()+': '+message.text().slice(0,500)));
        item.on('pageerror',error=>console.log(engine+' pageerror: '+error.message));
        item.on('requestfailed',request=>console.log(engine+' requestfailed: '+request.url().slice(0,160)+' '+JSON.stringify(request.failure())));
        item.on('response',response=>console.log(engine+' response: '+response.status()+' '+response.url().slice(0,160)));
      });
      await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
      page=await context.newPage();page.setDefaultTimeout(8000);
      await page.goto(origin+'/html-viewer.html',{waitUntil:'domcontentloaded'});
      async function run(code){await page.locator('#view-editor').click();await page.locator('#code-input').fill(code);await page.locator('#view-split').click();await page.locator('#btn-run').click();}
      await run('<link rel="stylesheet" href="'+origin+'/viewer-fixture/asset.css"><p class="asset-probe">External practice assets</p><img alt="Asset" src="'+origin+'/viewer-fixture/asset.svg"><script src="'+origin+'/viewer-fixture/asset.js"></script>');
      const frame=page.frameLocator('#preview-iframe');
      await page.waitForFunction(()=>/Rendered|notice/.test(document.getElementById('preview-status-text').textContent));
      await page.frames().find(item=>item.parentFrame()).waitForFunction(()=>{
        const probe=document.querySelector('.asset-probe');return probe && getComputedStyle(probe).color==='rgb(12, 34, 56)' && document.body.dataset.externalScript==='loaded' && document.querySelector('img').naturalWidth===12;
      },null,{timeout:8000});
      assert.equal(await frame.locator('.asset-probe').evaluate(el=>getComputedStyle(el).color),'rgb(12, 34, 56)');
      assert.equal(await frame.locator('body').getAttribute('data-external-script'),'loaded');
      assert.equal(await frame.locator('img').evaluate(el=>el.naturalWidth),12);
      result.checks.push('External CSS, JavaScript and image resources render in an ordinary practice project');
      await run('<form action="'+origin+'/viewer-fixture/form" method="get"><input name="practice" value="retained"><button>Submit practice form</button></form>');
      await frame.getByRole('button',{name:'Submit practice form'}).click();
      await frame.locator('#destination').waitFor();
      assert.equal(await frame.locator('#destination').textContent(),'Form submitted');
      assert.equal(await frame.locator('body').getAttribute('data-isolation'),'blocked');
      assert.equal(await page.locator('body').getAttribute('data-escaped'),null);
      await frame.locator('#next-link').click();
      await frame.getByText('Link followed',{exact:true}).waitFor();
      assert.equal(await frame.locator('body').getAttribute('data-isolation'),'blocked');
      await page.locator('#preview-diagnostics').waitFor({state:'visible'});
      assert((await page.locator('#preview-diagnostics').textContent()).includes('navigated'));
      result.checks.push('User-submitted forms and normal links navigate inside the sandbox and retain parent DOM isolation');
      await run('<h1>Policy probe</h1><object data="'+origin+'/viewer-fixture/object"></object>');
      await page.waitForFunction(()=>document.getElementById('preview-diagnostics').textContent.includes('Blocked by preview policy'));
      result.checks.push('Observable blocked plugin content produces policy feedback without relaxing sandbox permissions');

      // Use the actual local VUS openApp function. A fixture adds only its launch
      // button because the vendored fallback currently omits its card renderer.
      await context.route('https://raw.githubusercontent.com/Cra-Z-Gaming/VUS/main/index.html',route=>route.abort());
      await context.route(origin+'/proxy/https://raw.githubusercontent.com/Cra-Z-Gaming/VUS/main/index.html',route=>route.fulfill({status:503,body:'fixture unavailable'}));
      const rawBase='https://raw.githubusercontent.com/Cra-Z-Gaming/VUS/refs/heads/main/';
      const application={name:'Practice popup',url:origin+'/viewer-fixture/popup-external'};
      await context.route(rawBase+'apps.json*',route=>route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({apps:[application]})}));
      await page.evaluate(()=>localStorage.setItem('viewer_shell_secret','retained'));
      await page.locator('#viewer-tools > summary').click();
      const shellOpened=context.waitForEvent('page');
      await page.locator('#btn-vus').click();
      const shell=await shellOpened;
      await shell.waitForFunction(()=>document.querySelector('.notice').textContent.includes('VUS isolated preview'));
      assert.equal(await shell.evaluate(()=>window.opener),null);
      assert.equal(await shell.locator('iframe').getAttribute('sandbox'),'allow-scripts allow-forms allow-popups');
      const hub=shell.frames().find(item=>item.parentFrame());
      await hub.waitForFunction(()=>typeof appsReady!=='undefined' && appsReady);
      assert.deepEqual(await hub.evaluate(()=>{
        const probe={};try{probe.storage=parent.localStorage.getItem('viewer_shell_secret')}catch(e){probe.storage='blocked'}
        try{parent.document.body.dataset.viewerPopupEscape='yes';probe.dom='allowed'}catch(e){probe.dom='blocked'}return probe;
      }),{storage:'blocked',dom:'blocked'});
      await hub.evaluate(()=>{
        const button=document.createElement('button');button.id='fixture-launch-app';button.textContent='Launch practice popup';
        button.addEventListener('click',()=>openApp({name:'Practice popup'}));document.body.prepend(button);
      });
      const appOpened=context.waitForEvent('page');
      await hub.locator('#fixture-launch-app').click();
      const popup=await appOpened;
      await popup.locator('body[data-probe]').waitFor();
      assert.deepEqual(JSON.parse(await popup.locator('body').getAttribute('data-probe')),{opener:true,storage:'blocked',topStorage:'blocked'});
      assert.equal(await shell.locator('body').getAttribute('data-viewer-popup-escape'),null);
      assert.equal(await page.evaluate(()=>localStorage.getItem('viewer_shell_secret')),'retained');
      await popup.getByRole('link',{name:'Navigate this app window'}).click();
      await popup.locator('body[data-storage]').waitFor();
      assert.equal(await popup.locator('body').getAttribute('data-storage'),'blocked');
      assert.equal(await page.evaluate(()=>localStorage.getItem('viewer_popup_escape')),null);
      await popup.close();await shell.close();
      result.checks.push('Explicit VUS external app user-click opens an openerless popup with opaque storage isolation retained after navigation; hub cannot read shell storage or DOM');
      result.status='passed';console.log('PASS '+engine+' '+result.checks.length+' practice compatibility groups');
      await context.close();
    }catch(error){result.status='failed';if(page){try{result.state=await page.evaluate(()=>({status:document.getElementById('preview-status-text').textContent,diagnostics:document.getElementById('preview-diagnostics').textContent}));}catch(_){}}result.failure=String(error.stack).slice(0,1800);process.exitCode=1;console.error('FAIL '+engine+': '+result.failure)}finally{await browser?.close()}
  }
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
  const file=path.resolve('docs/phase4-5/evidence/viewer-compatibility.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(results,null,2));
  if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}
});
