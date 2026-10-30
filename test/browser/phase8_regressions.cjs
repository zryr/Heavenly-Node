'use strict';
// Reuse interaction suites, with Phase 8 logs isolated from historical evidence.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/phase8/evidence/regressions');
const suites=(process.env.PHASE8_SUITES||'navigation_history,quick_settings_customization,cloaking_consolidation,viewer_independent_security,proxy_platform_regression,catalog_updates,homepage_search_limits').split(',');
const engines=(process.env.PHASE8_ENGINES||'chromium,firefox,webkit').split(',');
const jobs=suites.flatMap(suite=>suite==='viewer_independent_security'?[{suite,engine:'all'}]:engines.map(engine=>({suite,engine})));
const report={executed:new Date().toISOString(),physicalDevices:[],jobs:[]};let cursor=0;
async function worker(){while(cursor<jobs.length){const job=jobs[cursor++],label=job.suite+'-'+job.engine,dir=path.join(out,label);fs.mkdirSync(dir,{recursive:true});const log=path.join(dir,'run.txt'),fd=fs.openSync(log,'w'),started=Date.now();
const env={...process.env,NODE_PATH:process.env.NODE_PATH||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules',PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS:'1',HEAVENLY_EVIDENCE_DIR:dir,HEAVENLY_CAPTURE_DIR:dir,HEAVENLY_GESTURE_ARTIFACTS:dir,HEAVENLY_BROWSER_MATRIX:path.join(dir,'matrix.json'),HEAVENLY_VIEWER_SECURITY_RESULTS:path.join(dir,'security.json')};if(job.engine!=='all')env.HEAVENLY_BROWSER=job.engine;
const child=spawn(process.execPath,[path.join(__dirname,job.suite+'.cjs')],{cwd:root,env,stdio:['ignore',fd,fd]});const code=await new Promise(resolve=>child.on('exit',resolve));fs.closeSync(fd);const content=fs.readFileSync(log,'utf8');report.jobs.push({...job,status:code===0?'passed':'failed',exitCode:code,elapsedSeconds:Math.round((Date.now()-started)/100)/10,groups:(content.match(/^PASS /gm)||[]).length,log:path.relative(path.dirname(out),log)});console.log((code===0?'PASS ':'FAIL ')+label);if(code!==0)process.exitCode=1;fs.writeFileSync(path.join(out,'summary-'+(process.env.PHASE8_LABEL||'existing')+'.json'),JSON.stringify(report,null,2)+'\n');}}
fs.mkdirSync(out,{recursive:true});Promise.all([worker(),worker()]).catch(e=>{console.error(e);process.exitCode=1});
