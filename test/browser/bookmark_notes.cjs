const assert=require('node:assert/strict'),playwright=require('playwright'),app=require('../../app');
const engine=process.env.HEAVENLY_BROWSER||'chromium';let browser,server,checks=0;const pass=s=>{checks++;console.log('PASS '+s)};
(async()=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await playwright[engine].launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{});
 const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});await context.addInitScript(()=>{try{sessionStorage.setItem('heavenly_decoy_unlocked','true')}catch{}});
 await context.route('**/*',r=>r.request().url().startsWith(origin)&&!r.request().url().includes('/proxy/')?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForTimeout(500);
 const open=()=>page.evaluate(()=>openBuiltinTestModal('GN Math','https://gn-math.dev/',location.origin+'/proxy/https://gn-math.dev/',null,false,'bm_gn_math'));
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('heavenly_bookmarks')));
 const gn=async()=> (await read()).bookmarks.find(b=>b.id==='bm_gn_math');
 const opener=page.locator('[data-category-id="cat_anime"] .special-links-btn');await opener.focus();
 await open();const modal=page.locator('#builtin-test-modal'),note=modal.locator('.bookmark-personal-note'),text=note.locator('textarea');
 assert.equal(await note.getAttribute('open'),null);assert.equal(await modal.locator('.bookmark-launch-summary .bookmark-icon').count(),1);
 assert.equal(await modal.locator('#builtin-alt-versions-container button').filter({hasText:'Mark Broken'}).count(),1);
 const before=await gn();await note.locator('summary').click();
 const privateNote='Private reminder <img src=x onerror="window.noteExecuted=true">';await text.fill(privateNote);await note.getByRole('button',{name:'Save Note',exact:true}).click();
 assert.equal((await gn()).personalNote,privateNote);const metadata=await gn();delete metadata.personalNote;assert.deepEqual(metadata,before);
 assert.equal(await page.evaluate(()=>window.noteExecuted===true),false);assert.equal(await note.locator('img').count(),0);
 await text.fill('Discard this change');await note.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await gn()).personalNote,privateNote);
 await note.locator('summary').click();assert.equal(await text.inputValue(),privateNote);await page.keyboard.press('Escape');assert(await opener.evaluate(e=>document.activeElement===e));
 pass('normal built-in dialog preserves mirror/broken controls and supports safe plain-text Save/Cancel');
 await open();await note.locator('summary').click();await text.fill('Discard on close');await page.keyboard.press('Escape');await open();await note.locator('summary').click();assert.equal(await text.inputValue(),privateNote);
 await note.getByRole('button',{name:'Clear Note',exact:true}).click();assert.equal((await gn()).personalNote,undefined);assert.equal(await note.getAttribute('open'),null);
 await note.locator('summary').click();await text.fill('Keep me across updates');await note.getByRole('button',{name:'Save Note',exact:true}).click();
 await page.evaluate(()=>{const original=Storage.prototype.setItem;window.restoreNotesStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(k==='heavenly_bookmarks')throw new Error('quota');return original.call(this,k,v)}});
 await text.fill('Unsaved draft');await note.getByRole('button',{name:'Save Note',exact:true}).click();assert.match(await note.locator('[role="status"]').innerText(),/Could not save/);assert.equal(await text.inputValue(),'Unsaved draft');await page.evaluate(()=>window.restoreNotesStorage());assert.equal((await gn()).personalNote,'Keep me across updates');await page.keyboard.press('Escape');
 pass('Clear and Escape discard drafts; failed storage writes keep the draft and saved note intact');
 for(const [id,title,url] of [['bm_fmhy_movies','FMHY: Movies','https://fmhy.net/video'],['bm_fmhy_anime','FMHY: Anime','https://fmhy.net/video#anime-streaming'],['bm_everythingmoe','EverythingMoe','https://everythingmoe.com/']]){
   await page.evaluate(([title,url])=>openEverythingMoeNoticeModal(title,url,location.origin+'/proxy/'+url),[title,url]);
   const special=page.locator('#everythingmoe-modal .bookmark-personal-note');await special.locator('summary').click();await special.locator('textarea').fill('Note for '+id);await special.getByRole('button',{name:'Save Note',exact:true}).click();
   assert.equal((await read()).bookmarks.find(b=>b.id===id).personalNote,'Note for '+id);await page.keyboard.press('Escape');
 }
 pass('FMHY Movies, FMHY Anime and EverythingMoe launch notices support independent stable-ID notes');
 await page.evaluate(()=>{const d=loadBookmarkData(),b=d.bookmarks.find(b=>b.id==='bm_gn_math');b.categoryId='cat_movies';b.order=901;saveBookmarkData(d);renderBookmarksUI()});await page.reload();assert.equal((await gn()).personalNote,'Keep me across updates');
 const share=await page.evaluate(()=>{const data=loadBookmarkData();const encoded=encodeSharePayload(data);const decoded=JSON.parse(decodeURIComponent(atob(encoded.slice(5))));return {hasNote:JSON.stringify(decoded).includes('personalNote'),hasText:JSON.stringify(decoded).includes('Keep me across updates'),incoming:decodeSharePayload('HBM1_'+btoa(encodeURIComponent(JSON.stringify({bookmarks:[{id:'injected',personalNote:'foreign note'}]}))))}});
 assert.equal(share.hasNote,false);assert.equal(share.hasText,false);assert.equal(share.incoming.bookmarks[0].personalNote,undefined);assert(!requests.some(url=>url.includes('Keep%20me%20across')||url.includes('Private%20reminder')));
 pass('notes survive moves/reconciliation and never enter public codes, inbound share notes or proxy requests');
 await page.goto(origin+'/settings.html',{waitUntil:'domcontentloaded'});await page.locator('#open-export-modal-btn').click();await page.locator('#export-select-all-btn').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#download-export-btn').click();const download=await downloadPromise;let contents='';for await(const chunk of await download.createReadStream())contents+=chunk;const backup=JSON.parse(contents);
 assert.equal(backup.bookmarks.find(b=>b.id==='bm_gn_math').personalNote,'Keep me across updates');await page.keyboard.press('Escape');
 async function importFile(payload,mode='merge'){
   await page.locator('#open-import-modal-btn').click();await page.locator('#import-file-input').setInputFiles({name:'bookmark-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
   await page.locator('#import-step-2').waitFor({state:'visible'});await page.locator('#import-mode-select').selectOption(mode);await page.locator('#apply-import-btn').click();
 }
 const legacy={categories:backup.categories,bookmarks:backup.bookmarks.map(b=>{const c=structuredClone(b);delete c.personalNote;for(const child of c.subBookmarks||[])delete child.personalNote;return c})};
 await importFile(legacy);assert.equal((await gn()).personalNote,'Keep me across updates');
 const replacement=structuredClone(backup);replacement.bookmarks.find(b=>b.id==='bm_gn_math').personalNote='Transferred from private backup';await importFile(replacement,'overwrite');assert.equal((await gn()).personalNote,'Transferred from private backup');
 await page.locator('details').filter({has:page.locator('#reset-builtin-bookmarks-btn')}).locator(':scope > summary').click();await page.locator('#reset-builtin-bookmarks-btn').click();assert.equal((await gn()).personalNote,'Transferred from private backup');
 pass('private backup download/import transfers notes; legacy merges and built-in reset preserve notes');
 await page.goto(origin,{waitUntil:'domcontentloaded'});await open();
 for(const [width,height] of [[320,740],[820,1180],[1180,820]]){
   await page.setViewportSize({width,height});
   if((await note.getAttribute('open'))===null)await note.locator('summary').click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await modal.locator('.modal-card').evaluate(e=>e.scrollWidth<=e.clientWidth));
   const controls=await modal.locator('button:visible,input:visible,summary:visible,textarea:visible').count();for(let i=0;i<controls+2;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('#builtin-test-modal')),JSON.stringify({width,i,focus:await page.evaluate(()=>document.activeElement.outerHTML)}))}
 }
 await page.keyboard.press('Escape');await page.evaluate(()=>openCoolmathLaunchModal('Coolmath Games','https://www.coolmathgames.com/'));assert.equal(await page.locator('#coolmath-launch-modal .bookmark-personal-note').count(),0);await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);pass('notes remain readable, keyboard-contained and responsive; Coolmath stays focused without a notes editor');
 console.log(checks+' bookmark notes checks passed in '+engine);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}});
