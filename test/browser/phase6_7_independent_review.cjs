'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require('playwright');
const app=require('../../app');
const report={executed:new Date().toISOString(),scope:'Independent review scenarios, rerun after the identified fixes',physicalDevices:[],engines:[]};
const outfile=path.resolve(__dirname,'../../docs/phase6-7/evidence/independent-review.json');
(async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 try{for(const engine of ['chromium','firefox','webkit']){
  const result={engine,checks:[],errors:[]};report.engines.push(result);
  const browser=await pw[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{});result.version=browser.version();
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  try{
   await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
   await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
   const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
   await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.heavenlyMessages);await page.evaluate(()=>heavenlyMessages.pause());
   async function check(name,run){try{const evidence=await run();result.checks.push({name,status:'passed',evidence});console.log(engine+' PASS '+name);}catch(e){process.exitCode=1;result.checks.push({name,status:'failed',error:e.message});console.log(engine+' FAIL '+name+': '+e.message);}}
   await check('safe DOM, destination validation and external attributes',()=>page.evaluate(()=>{
    const item=structuredClone(HeavenlyMessagesData.items[0]);item.segments=[{text:'Literal <img src=x onerror=alert(1)>',link:'HTTPS://example.com/review'}];
    const node=document.createElement('div');document.body.append(node);const preview=HeavenlyMessages.renderPreview(node,item,{allowExternal:false});const a=node.querySelector('a');
    const output={images:node.querySelectorAll('img').length,text:a.textContent,target:a.target,rel:a.rel,blockedAux:!a.dispatchEvent(new MouseEvent('auxclick',{bubbles:true,cancelable:true,button:1})),badLinks:['javascript:alert(1)','data:text/html,x','//example.com','http://example.com','https://u:p@example.com','/proxy/https://example.com'].map(x=>HeavenlyMessages.safeLink(x))};
    preview.destroy();node.remove();if(output.images||output.target!=='_blank'||!output.rel.includes('noopener')||!output.blockedAux||output.badLinks.some(Boolean))throw Error(JSON.stringify(output));return output;
   }));
   await check('hidden and focused tooltip bounds at 320 and 390 pixels',async()=>{
    const bounds=[];for(const width of[320,390]){await page.setViewportSize({width,height:844});for(const id of['msg_settings','msg_viewer']){
      await page.evaluate(id=>{document.getElementById('url').focus();heavenlyMessages.show(id);},id);
      const hidden=await page.locator('#heavenly-messages .hm-tooltip').evaluate(n=>getComputedStyle(n).display);assert.equal(hidden,'none');await page.locator('#heavenly-messages a').focus();
      const rect=await page.locator('#heavenly-messages .hm-tooltip').evaluate(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};});assert(rect.left>=0&&rect.right<=width+1&&rect.scrollWidth<=width);bounds.push({width,id,hidden,...rect});
    }}return bounds;
   });
   await check('focused inline link survives live reduced-motion change',async()=>{
    await page.evaluate(()=>heavenlyMessages.show('msg_settings'));await page.locator('#heavenly-messages a').focus();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.activeElement&&document.activeElement.getAttribute('href')==='/settings.html');return page.evaluate(()=>({tag:document.activeElement.tagName,href:document.activeElement.getAttribute('href')}));
   });
   await check('dialogue control and close return focus survive reduced-motion change',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>heavenlyMessages.show('msg_ao_oni'));await page.locator('#heavenly-messages button.hm-copy').click();await page.locator('#heavenly-message-dialog [data-scene-next]').focus();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.activeElement&&document.activeElement.hasAttribute('data-scene-next'));await page.locator('#heavenly-message-dialog [data-scene-close]').click();assert(await page.locator('#heavenly-messages button.hm-copy').evaluate(n=>n===document.activeElement));return 'Next remains focused, then Close returns to the current rendered trigger';
   });
   await check('nonmodal dance preserves unrelated input focus on live reduced motion',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>heavenlyMessages.show('msg_ao_oni'));await page.locator('#heavenly-messages button.hm-copy').click();for(let n=0;n<3;n++)await page.locator('#heavenly-message-dialog [data-scene-next]').click();await page.locator('#url').focus();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelectorAll('.hm-dancer').length===0);const focused=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName,text:document.activeElement.textContent}));assert.equal(focused.id,'url',JSON.stringify(focused));return focused;
   });
   await page.evaluate(()=>heavenlyMessages.show('msg_homework'));
   await check('detaching a mounted message host destroys its scheduler',async()=>{
    await page.evaluate(()=>{const node=document.createElement('div');document.body.append(node);window.__reviewDetached=HeavenlyMessages.mount(node,{random:()=>0});node.remove();});await page.waitForFunction(()=>__reviewDetached.getState().destroyed);return page.evaluate(()=>__reviewDetached.getState());
   });
    assert.deepEqual(result.errors,[]);result.status=result.checks.every(check=>check.status==='passed')?'passed':'failed';
  }finally{await context.close();await browser.close();}
 }}finally{server.closeAllConnections?.();await new Promise(r=>server.close(r));}
})().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(()=>fs.writeFileSync(outfile,JSON.stringify(report,null,2)+'\n'));
