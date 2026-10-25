'use strict';
const assert=require('assert');
const vm=require('vm');
const model=require('../public/assets/heavenly-dev-hq-model');
const catalog=require('../public/assets/heavenly-catalog');
const copy=model.clone;
describe('Codex Developer HQ official content model',function(){
  let draft;
  beforeEach(()=>draft=model.create(catalog.release));
  it('creates a complete valid identity-based source without touching personal catalog data',function(){
    const source=JSON.stringify(catalog.release);assert(model.validate(draft,catalog.release));
    assert.equal(draft.bookmarks.length,Object.values(catalog.records(catalog.release.data)).filter(r=>r.kind==='bookmark').length);
    model.move(draft,'category:cat_games',{side:'left',index:0},catalog.release);
    assert.equal(JSON.stringify(catalog.release),source);
  });
  it('moves a category between sidebars and keeps consecutive positions in both groups',function(){
    const next=model.move(draft,'category:cat_games',{side:'left',index:0},catalog.release);
    assert.equal(next.categories.find(c=>c.id==='cat_games').side,'left');assert(model.validate(next,catalog.release));
    assert.equal(draft.categories.find(c=>c.id==='cat_games').side,'bottom');assert(model.changed(next,catalog.release).includes('category:cat_games'));
  });
  it('reorders sections and nested links using stable identities',function(){
    let next=model.move(draft,'section:cat_games:builtin',{index:1},catalog.release);assert.equal(next.categories.find(c=>c.id==='cat_games').subSections.find(s=>s.id==='builtin').order,1);
    const nested=next.bookmarks.find(b=>b.parentId&&next.bookmarks.filter(c=>c.parentId===b.parentId).length>1);
    next=model.move(next,'bookmark:'+nested.id,{index:1},catalog.release);assert.equal(next.bookmarks.find(b=>b.id===nested.id).order,1);assert(model.validate(next,catalog.release));
  });
  it('moves a root container with its entire subtree to a compatible official destination',function(){
    const root=draft.bookmarks.find(b=>!b.parentId&&draft.bookmarks.some(x=>x.parentId===b.id));
    const next=model.move(draft,'bookmark:'+root.id,{categoryId:'cat_op_websites',subSectionId:'browser_games',index:0},catalog.release);
    assert.equal(next.bookmarks.find(b=>b.id===root.id).categoryId,'cat_op_websites');
    next.bookmarks.filter(b=>b.parentId===root.id).forEach(b=>assert.equal(b.subSectionId,'browser_games'));assert(model.validate(next,catalog.release));
  });
  it('rejects missing/duplicate identities and incompatible schema/version imports',function(){
    let bad=copy(draft);bad.bookmarks.push(copy(bad.bookmarks[0]));assert.throws(()=>model.validate(bad,catalog.release),/Duplicate/);
    bad=copy(draft);bad.categories.pop();assert.throws(()=>model.validate(bad,catalog.release),/Missing/);
    bad=copy(draft);bad.schema=2;assert.throws(()=>model.validate(bad,catalog.release),/schema/);
    bad=copy(draft);bad.catalogVersion='1900.1.1.1';assert.throws(()=>model.validate(bad,catalog.release),/different catalog/);
    bad=copy(draft);bad.localStorage={};assert.throws(()=>model.validate(bad,catalog.release),/Unexpected/);
  });
  it('rejects invalid destinations, parent changes, circular nesting and order conflicts',function(){
    let bad=copy(draft);bad.bookmarks[0].categoryId='missing';assert.throws(()=>model.validate(bad,catalog.release),/destination/);
    bad=copy(draft);bad.bookmarks[0].subSectionId='missing';assert.throws(()=>model.validate(bad,catalog.release),/destination/);
    const nested=draft.bookmarks.find(b=>b.parentId);
    bad=copy(draft);bad.bookmarks.find(b=>b.id===nested.id).parentId=nested.id;assert.throws(()=>model.validate(bad,catalog.release),/Circular/);
    assert.throws(()=>model.move(draft,'bookmark:'+nested.id,{parentId:null,index:0},catalog.release),/unsupported/);
    bad=copy(draft);bad.bookmarks[0].order=-1;assert.throws(()=>model.validate(bad,catalog.release),/nonnegative/);
    bad=copy(draft);const a=bad.bookmarks.find(b=>!b.parentId);const b=bad.bookmarks.find(b=>b!==a&&!b.parentId&&b.categoryId===a.categoryId&&b.subSectionId===a.subSectionId);b.order=a.order;assert.throws(()=>model.validate(bad,catalog.release),/Duplicate positions/);
    assert.throws(()=>model.move(draft,'category:cat_games',{side:'floating',index:0},catalog.release),/sidebar/);
  });
  it('exports deterministic repository source with an explicit newer catalog release version',function(){
    const parts=catalog.release.version.split('.');parts[3]=Number(parts[3])+1;const next=parts.join('.');
    assert.throws(()=>model.exportOrder(draft,catalog.release,catalog.release.version),/newer/);
    const text=model.exportOrder(draft,catalog.release,next);assert.equal(JSON.parse(text).catalogVersion,next);assert.equal(text,model.exportOrder(draft,catalog.release,next));
    const imported=JSON.parse(text);imported.catalogVersion=catalog.release.version;assert(model.validate(imported,catalog.release));
  });
  it('round-trips an exported ranking through the real repository generator and fresh catalog',function(){
    const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'heavenly-hq-export-'));
    try {
      fs.mkdirSync(path.join(dir,'public/assets'),{recursive:true});fs.mkdirSync(path.join(dir,'scripts'));
      for(const name of ['heavenly-catalog.js','heavenly-navigation.js','heavenly-official-order.js','heavenly-dev-hq-model.js'])fs.copyFileSync(path.join(__dirname,'../public/assets',name),path.join(dir,'public/assets',name));
      fs.copyFileSync(path.join(__dirname,'../scripts/build-official-order.cjs'),path.join(dir,'scripts/build-official-order.cjs'));
      const next=model.move(draft,'bookmark:bm_gamebois',{index:0},catalog.release);const parts=catalog.release.version.split('.');parts[3]=Number(parts[3])+1;const version=parts.join('.');
      fs.writeFileSync(path.join(dir,'public/assets/heavenly-official-order.json'),model.exportOrder(next,catalog.release,version));
      cp.execFileSync(process.execPath,[path.join(dir,'scripts/build-official-order.cjs')]);
      cp.execFileSync(process.execPath,[path.join(dir,'scripts/build-official-order.cjs'),'--check']);
      const published=require(path.join(dir,'public/assets/heavenly-catalog.js'));assert.equal(published.release.version,version);
      const fresh=published.fresh();const game=fresh.bookmarks.find(b=>b.id==='bm_gamebois');assert.equal(game.order,0);
      const personal=catalog.fresh();personal.bookmarks.find(b=>b.id==='bm_gamebois').order=50;personal.bookmarks.find(b=>b.id==='bm_gamebois').personalNote='Keep my placement';
      const accepted=published.merge(personal,published.release,'applied');assert.equal(accepted.bookmarks.find(b=>b.id==='bm_gamebois').order,50);assert.equal(accepted.bookmarks.find(b=>b.id==='bm_gamebois').personalNote,'Keep my placement');
    } finally {fs.rmSync(dir,{recursive:true,force:true});}
  });
  function picks(){return {schema:1,version:'2026.10.24.2',items:[{id:'pick_test',title:'Reviewed game',url:'https://www.newgrounds.com/portal/view/1',description:'A considered recommendation.',icon:'',thumbnail:'',tags:['Puzzle'],enabled:true,order:0}]};}
  it('exports validated Picks as a real safe UMD asset while public recommendations remain empty',function(){
    const publicData=require('../public/assets/heavenly-picks');assert.deepEqual(publicData.items,[]);
    const draft=picks();draft.items[0].description='Text </script> remains data';const code=model.exportPicks(draft,'2026.10.24.1');assert(!code.includes('</script>'));
    const sandbox={module:{exports:{}}};vm.runInNewContext(code,sandbox);assert.equal(sandbox.module.exports.items[0].id,'pick_test');
    const browser={};browser.self=browser;vm.runInNewContext(code,browser);assert.equal(browser.HeavenlyPicks.items[0].id,'pick_test');assert.equal(JSON.stringify(browser.HeavenlyPicks),JSON.stringify(sandbox.module.exports));assert.deepEqual(publicData.items,[]);
  });
  it('refuses a reviewed bridge that reparents a nested link before the generator can redefine its expected tree',function(){
    const bad=copy(draft),nested=bad.bookmarks.find(b=>b.parentId);
    const destination=bad.bookmarks.find(b=>!b.parentId&&b.id!==nested.parentId&&bad.bookmarks.some(child=>child.parentId===b.id));
    nested.parentId=destination.id;nested.categoryId=destination.categoryId;nested.subSectionId=destination.subSectionId;
    assert.throws(()=>catalog.applyOfficialOrder(copy(catalog.defaults),bad),/official ordering is invalid/);
  });
  it('refuses unsafe URLs, malformed Picks and duplicate stable recommendation IDs',function(){
    for(const url of ['javascript:alert(1)','data:text/html,hello','https://user:password@example.com/']){const bad=picks();bad.items[0].url=url;assert.throws(()=>model.validatePicks(bad),/HTTP/);}
    let bad=picks();bad.items.push(copy(bad.items[0]));assert.throws(()=>model.validatePicks(bad),/unique/);
    bad=picks();bad.items[0].thumbnail='javascript:alert(1)';assert.throws(()=>model.validatePicks(bad),/images/);
    bad=picks();bad.items[0].order=10;assert.throws(()=>model.validatePicks(bad),/consecutive/);
    bad=picks();bad.items[0].title=' ';assert.throws(()=>model.validatePicks(bad),/title/);
  });
});
