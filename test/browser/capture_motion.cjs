'use strict';
// Reproducible frame samples plus a separate live, unpaused gesture sequence.
// Usage: node test/browser/capture_motion.cjs /path/to/immutable-baseline
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const baseline=process.argv[2];
if(!baseline)throw Error('Pass an immutable baseline checkout/archive directory.');
const out=path.resolve('docs/homepage-overhaul/evidence');fs.mkdirSync(out,{recursive:true});
const metadata={baseline:'013cd07a36854c74b8feb8f29a8437f2c4daa72b',browser:'Chromium desktop emulation',physicalDevice:false,viewport:{width:1440,height:1000},captures:[]};
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    for(const [label,root] of [['before',baseline],['after',path.resolve('.')]]){
      const app=require(path.join(root,'app.js')),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
      const origin='http://127.0.0.1:'+server.address().port,raw=path.resolve('work/motion-recordings',label);fs.mkdirSync(raw,{recursive:true});
      const context=await browser.newContext({viewport:metadata.viewport,recordVideo:{dir:raw,size:metadata.viewport}});
      await context.addInitScript(()=>sessionStorage.setItem('heavenly_decoy_unlocked','true'));
      await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
      const page=await context.newPage(),started=Date.now();
      try{
        await page.goto(origin,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>document.querySelector('#heavenly-loading-screen').style.display==='none');
        await page.evaluate(()=>{
          const data=loadBookmarkData();data.categories.forEach(category=>category.hidden=true);
          data.categories.push({id:'motion',title:'Saved for later',side:'left',subSections:[{id:'user',title:'Reading list'}]});
          data.bookmarks.push({id:'motion_folder',title:'Celestial reading',type:'folder',categoryId:'motion',subSectionId:'user',order:0,
            subBookmarks:[{id:'motion_child1',title:'Astronomy Picture of the Day',url:'https://apod.nasa.gov/'},{id:'motion_child2',title:'Webb Space Telescope',url:'https://science.nasa.gov/mission/webb/'}]});
          saveBookmarkData(data);expandedSubSections.motion_user=true;renderBookmarksUI();
        });
        await page.waitForTimeout(650);
        const folder=page.locator('[data-bm-id="motion_folder"]'),card=page.locator('[data-category-id="motion"]'),button=folder.locator('.folder-expand-btn');
        await folder.scrollIntoViewIfNeeded();
        await card.screenshot({path:path.join(out,'motion-'+label+'-closed.png')});
        await button.click();
        const frames=await folder.locator('..').evaluate(wrapper=>{
          const node=wrapper.lastElementChild,animation=node.getAnimations()[0];window.__captureMotion=animation;animation.pause();
          return animation.effect.getKeyframes().map(frame=>({height:frame.height,opacity:frame.opacity}));
        });
        for(const time of [0,70,140,210]){
          await page.evaluate(time=>window.__captureMotion.currentTime=time,time);
          await card.screenshot({path:path.join(out,'motion-'+label+'-'+time+'ms.png')});
        }
        await page.evaluate(()=>window.__captureMotion.play());await page.waitForTimeout(300);
        await button.click();await page.waitForTimeout(300);
        const liveStart=(Date.now()-started)/1000;
        // This sequence runs on the browser clock without pausing or seeking.
        await button.click();await page.waitForTimeout(420);await button.click();await page.waitForTimeout(90);
        await button.click();await page.waitForTimeout(90);await button.click();await page.waitForTimeout(90);
        await button.click();await page.waitForTimeout(500);await button.click();await page.waitForTimeout(500);
        await context.close();
        const source=await page.video().path(),video='motion-'+label+'-live.webm';
        execFileSync('ffmpeg',['-y','-ss',String(Math.max(0,liveStart-.3)),'-i',source,'-t','3.3','-an','-c:v','libvpx-vp9','-crf','36','-b:v','0',path.join(out,video)],{stdio:'ignore'});
        metadata.captures.push({label,firstOpenKeyframes:frames,video,frames:[0,70,140,210].map(time=>'motion-'+label+'-'+time+'ms.png'),note:'Filmstrip samples pause the real WAAPI effect at labeled times; live video runs normal clicks/reversal without pausing.'});
        console.log(label+': '+JSON.stringify(frames)+'; '+video);
      }finally{await context.close();server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(out,'motion-metadata.json'),JSON.stringify(metadata,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
