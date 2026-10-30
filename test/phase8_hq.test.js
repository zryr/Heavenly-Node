'use strict';
const assert=require('assert');
const Workshop=require('../public/assets/heavenly-dev-hq-messages');
const Messages=require('../public/assets/heavenly-messages');
const published=require('../public/assets/heavenly-messages-data');
const clone=value=>JSON.parse(JSON.stringify(value));

describe('Phase 8 HQ draft preservation',function(){
  it('recovers the shipped older collection by identity without rewriting stored input or dropping new entries',function(){
    const old=clone(published);old.version='2026.10.25.1';
    const base=clone(published);base.version='2026.10.27.9';
    // Model an addition to a later registered collection.
    const added=clone(base.items[0]);added.id='msg_phase8_migration_test';base.items.push(added);
    old.items[0].segments=[{text:'My deliberately edited old wording'}];old.items[0].weight=.5;
    old.items.reverse();
    const raw=JSON.stringify({schema:1,baseVersion:'2026.10.25.1',config:old}),before=raw;
    const result=Workshop.restore(raw,base);
    assert.strictEqual(raw,before);
    assert.strictEqual(result.items.find(item=>item.id===published.items[0].id).segments[0].text,'My deliberately edited old wording');
    assert.strictEqual(result.items.find(item=>item.id===published.items[0].id).weight,.5);
    assert.deepStrictEqual(result.items.slice(0,old.items.length).map(item=>item.id),old.items.map(item=>item.id));
    assert.strictEqual(result.items.at(-1).id,added.id);
    assert.strictEqual(result.version,base.version);
    assert(Workshop.validateDraft(result,base));
  });
  it('preserves and refuses an unsupported source version or unknown old identity',function(){
    const base=clone(published);base.version='2026.10.27.9';
    const config=clone(published);
    assert.throws(()=>Workshop.restore(JSON.stringify({schema:1,baseVersion:'2000.1.1.1',config}),base),/different source version/);
    config.items[0].id='msg_unregistered_previous_entry';
    const raw=JSON.stringify({schema:1,baseVersion:'2026.10.25.1',config});
    assert.throws(()=>Workshop.restore(raw,base),/unregistered/);
    assert(raw.includes('msg_unregistered_previous_entry'));
  });
  it('round-trips image placement while rejecting arbitrary asset URLs and placement code',function(){
    const base=clone(published),item=clone(base.items.find(item=>item.action&&item.action.type==='scene'));
    for(const imagePlacement of ['left','right','inline']){
      item.action.steps[0].imagePlacement=imagePlacement;
      const next=Workshop.replace(base,item,base);
      assert.strictEqual(Workshop.restore(Workshop.serialize(next,base),base).items.find(row=>row.id===item.id).action.steps[0].imagePlacement,imagePlacement);
    }
    item.action.steps[0].imagePlacement='javascript:alert(1)';assert.throws(()=>Workshop.replace(base,item,base),/placement/i);
    item.action.steps[0].imagePlacement='inline';item.action.steps[0].asset='https://unreviewed.invalid/tracker.svg';assert.throws(()=>Workshop.replace(base,item,base),/asset/i);
    const note=clone(base.items[0]);note.noteImage={asset:'anger',imagePlacement:'inline'};
    const next=Workshop.replace(base,note,base);assert(Messages.validateData(next));
    note.noteImage.asset='data:image/svg+xml,<svg onload=alert(1)>';assert.throws(()=>Workshop.replace(base,note,base),/asset/i);
  });
});
