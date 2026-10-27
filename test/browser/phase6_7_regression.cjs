'use strict';
// Run established browser regressions with new evidence destinations. The
// subprocess logs retain complete failures instead of reporting only a count.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/phase6-7/evidence/regressions');
const engines=['chromium','firefox','webkit'];
const suites=['homepage_cross_browser','homepage_search_limits','settings_celestial','viewer_celestial','widgets_celestial','compact_rails'];
const jobs=suites.flatMap(suite=>engines.map(engine=>({suite,engine})));
jobs.push({suite:'viewer_independent_security',engine:'all'});
for(const suite of ['quick_settings_customization','cloaking_consolidation','catalog_updates','homepage_layout_touch','homepage_touch_drag'])jobs.push({suite,engine:'chromium'});
const summary={executed:new Date().toISOString(),physicalDevices:[],jobs:[]};let cursor=0;
async function worker(){while(cursor<jobs.length){const job=jobs[cursor++],label=job.suite+'-'+job.engine,dir=path.join(out,label);fs.mkdirSync(dir,{recursive:true});const log=path.join(dir,'run.txt'),fd=fs.openSync(log,'w'),started=Date.now();
 const env={...process.env,NODE_PATH:process.env.NODE_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules',PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS:'1',HEAVENLY_EVIDENCE_DIR:dir,HEAVENLY_CAPTURE_DIR:dir,HEAVENLY_GESTURE_ARTIFACTS:dir,HEAVENLY_BROWSER_MATRIX:path.join(dir,'matrix.json'),HEAVENLY_VIEWER_SECURITY_RESULTS:path.join(dir,'security.json')};if(job.engine!=='all')env.HEAVENLY_BROWSER=job.engine;
 const child=spawn(process.execPath,[path.join(__dirname,job.suite+'.cjs')],{cwd:root,env,stdio:['ignore',fd,fd]});const code=await new Promise(resolve=>child.on('exit',resolve));fs.closeSync(fd);const content=fs.readFileSync(log,'utf8'),record={...job,status:code===0?'passed':'failed',exitCode:code,elapsedSeconds:Math.round((Date.now()-started)/100)/10,groups:(content.match(/^PASS /gm)||[]).length,log:path.relative(path.dirname(out),log)};summary.jobs.push(record);console.log(record.status.toUpperCase()+' '+label+' '+record.groups+' groups');if(code!==0)process.exitCode=1;fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
}}
fs.mkdirSync(out,{recursive:true});Promise.all([worker(),worker()]).catch(error=>{console.error(error);process.exitCode=1});
