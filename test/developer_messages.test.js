'use strict';
const assert=require('assert');
const model=require('../public/assets/heavenly-dev-hq-messages');
const runtime=require('../public/assets/heavenly-messages');
const published=require('../public/assets/heavenly-messages-data');
const copy=value=>JSON.parse(JSON.stringify(value));
const nextVersion=published.version.replace(/\d+$/,value=>Number(value)+1);
const generator=require('../scripts/build-messages.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

describe('Developer HQ reviewed message drafts',function(){
  let draft;
  beforeEach(()=>draft=copy(published));
  it('edits registered wording and appearance without changing the published data',function(){
    const before=JSON.stringify(published),item=copy(draft.items[0]);
    item.segments=[{text:'A reviewed local draft.',emphasis:true,gradient:'heavenly'}];item.theme='purple';item.weight=.5;
    const next=model.replace(draft,item,published);
    assert.equal(next.items[0].segments[0].text,'A reviewed local draft.');assert.equal(next.items[0].weight,.5);
    assert.equal(JSON.stringify(published),before);assert.notDeepEqual(draft,next);assert(model.validateDraft(next,published));
  });
  it('reorders complete entries and retains stable IDs, enabled states and dialogue',function(){
    const item=draft.items[draft.items.length-1],next=model.move(draft,item.id,0,published);
    assert.deepEqual(next.items[0],item);assert.equal(next.items.length,draft.items.length);
    assert.deepEqual(next.items.map(row=>row.id).sort(),draft.items.map(row=>row.id).sort());
    assert.throws(()=>model.move(draft,item.id,-1,published),/position/);
    assert.throws(()=>model.move(draft,'not_registered',0,published),/position/);
  });
  it('refuses unknown, missing, duplicate or reclassified registered entries',function(){
    let bad=copy(draft);bad.items[0].id='new_unregistered';assert.throws(()=>model.validateDraft(bad,published),/registered/);
    bad=copy(draft);bad.items.pop();assert.throws(()=>model.validateDraft(bad,published),/every registered/);
    bad=copy(draft);bad.items[1].id=bad.items[0].id;assert.throws(()=>model.validateDraft(bad,published),/unique/);
    bad=copy(draft);bad.items[0].kind='special';assert.throws(()=>model.validateDraft(bad,published),/registered/);
  });
  it('keeps actions registered while allowing safe dialogue editing',function(){
    const item=copy(draft.items.find(row=>row.action&&row.action.type==='scene'));
    item.action.steps[0].text='Is this the reviewed dialogue?';assert(model.validateDraft(model.replace(draft,item,published),published));
    item.action.scene='doggy';assert.throws(()=>model.replace(draft,item,published),/registered message action/);
    item.action.scene='purple-hulk';item.action.steps[0].asset='https://unreviewed.example/track.gif';assert.throws(()=>model.replace(draft,item,published),/asset/);
  });
  it('checks the actual destination field on every preview/save/export candidate',function(){
    for(const link of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','//example.com','https://user:pass@example.com','http://example.com','/proxy/https://example.com']){
      const item=copy(draft.items[0]);item.segments=[{text:'Open',link}];assert.throws(()=>model.replace(draft,item,published),/Links require/);
    }
    for(const link of ['/settings.html','/html-viewer.html','https://example.com/safe']){
      const item=copy(draft.items[0]);item.segments=[{text:'Open',link}];assert(model.validateDraft(model.replace(draft,item,published),published));
    }
  });
  it('rejects invalid weight, unbounded dialogue, arbitrary CSS and executable fields',function(){
    for(const change of [{weight:0},{weight:11},{theme:'url(javascript:alert(1))'},{animation:'spin-forever'},{onClick:'alert(1)'}]){
      const item=Object.assign(copy(draft.items[0]),change);assert.throws(()=>model.replace(draft,item,published));
    }
    const scene=copy(draft.items.find(row=>row.action&&row.action.type==='scene'));scene.action.steps[0].text='x'.repeat(241);assert.throws(()=>model.replace(draft,scene,published),/Dialogue/);
  });
  it('requires an explicit review and newer version for a deterministic JSON source export',function(){
    assert.throws(()=>model.exportConfig(draft,published,nextVersion,false),/Review/);
    assert.throws(()=>model.exportConfig(draft,published,published.version,true),/newer/);
    const text=model.exportConfig(draft,published,nextVersion,true),result=JSON.parse(text);
    assert.equal(result.version,nextVersion);assert.equal(text,model.exportConfig(draft,published,nextVersion,true));
    assert(runtime.validateData(result));assert.deepEqual(result.items,published.items);assert.equal(draft.version,published.version);
  });
  it('restores compatible local drafts and refuses stale or corrupt stored copies without altering them',function(){
    const raw=model.serialize(draft,published);assert.deepEqual(model.restore(raw,published),draft);
    const stale=JSON.parse(raw);stale.baseVersion='2000.1.1.1';const stored=JSON.stringify(stale);
    assert.throws(()=>model.restore(stored,published),/different source version/);assert.equal(JSON.stringify(stale),stored);
    assert.throws(()=>model.restore('{broken',published));
    const unsafe=JSON.parse(raw);unsafe.config.items[0].segments=[{text:'Unsafe',link:'javascript:alert(1)'}];assert.throws(()=>model.restore(JSON.stringify(unsafe),published),/Links require/);
  });
  it('keeps the validated JSON source and generated browser bundle deterministic and current',function(){
    const source=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../public/assets/heavenly-messages.json'),'utf8'));
    assert.deepEqual(source,published);
    assert.equal(generator.generate(source),generator.generate(copy(source)));
    assert.equal(generator.build(true),fs.readFileSync(path.resolve(__dirname,'../public/assets/heavenly-messages-data.js'),'utf8'));
    const invalid=copy(source);invalid.items[0].segments[0].link='javascript:alert(1)';assert.throws(()=>generator.generate(invalid),/Links require/);
  });
  it('serializes authored markup and script separators safely without changing the browser data',function(){
    const source=copy(published),text='Literal </script><script> & \u2028 \u2029';
    source.items[0].segments=[{text}];source.items[0].reducedMotionText=text;
    const bundle=generator.generate(source),context={self:{}};
    assert(!/[<>\u2028\u2029]/.test(bundle));assert(bundle.includes('\\u0026'));vm.runInNewContext(bundle,context);
    assert.equal(JSON.stringify(context.self.HeavenlyMessagesData),JSON.stringify(source));
  });
});
