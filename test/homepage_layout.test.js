'use strict';
const assert = require('node:assert/strict');
const layout = require('../public/assets/heavenly-layout');
describe('Content-sized homepage layout', function () {
  it('protects center width across viewport, saved width and manual intent combinations', function () {
    for (let available=280;available<=2200;available+=13) for(const left of [240,256,400]) for(const right of [240,300,400]) for(const collapsed of [[],['left'],['right'],['left','right']]) {
      const prefs=layout.defaults();prefs.left.width=left;prefs.right.width=right;collapsed.forEach(side=>prefs[side].collapsed=true);
      const before=JSON.stringify(prefs),actual=layout.calculate(available,prefs,'right');
      assert.equal(JSON.stringify(prefs),before);
      if(actual.compact){assert(!actual.left.open&&!actual.right.open);continue;}
      const used=['left','right'].reduce((sum,side)=>sum+(actual[side].open?actual[side].width:44),32);
      assert(available-used>=440, 'center width at '+available);
      for(const side of ['left','right']){if(prefs[side].collapsed)assert(!actual[side].open);if(actual[side].open)assert(actual[side].width>=240&&actual[side].width<=400);}
    }
  });
  it('restores intended expanded state after pressure and prioritizes explicitly opened side', function () {
    const prefs=layout.defaults();
    assert(layout.calculate(1440,prefs).left.open&&layout.calculate(1440,prefs).right.open);
    assert(layout.calculate(788,prefs).left.open&&!layout.calculate(788,prefs).right.open);
    assert(!layout.calculate(788,prefs,'right').left.open&&layout.calculate(788,prefs,'right').right.open);
    assert(layout.calculate(1440,prefs).right.open);
    prefs.left.collapsed=true;assert(!layout.calculate(1440,prefs).left.open);
  });
  it('derives category rails without changing saved widths or manual intent', function () {
    const prefs=layout.defaults();prefs.left.width=384;prefs.right.width=320;prefs.categoryCollapsed.a=true;prefs.categoryCollapsed.b=true;
    const before=JSON.stringify(prefs),expanded=layout.calculate(1440,prefs),rail=layout.calculate(1440,prefs,'left',null,{left:176});
    assert.equal(rail.left.open,true);assert.equal(rail.left.categoryCompact,true);assert.equal(rail.left.width,176);
    assert.equal(rail.right.width,320);assert.equal(rail.right.categoryCompact,false);assert(expanded.left.width-rail.left.width>200);
    for (let available=280;available<=2000;available+=17) {
      const state=layout.calculate(available,prefs,'right',null,{left:176,right:200});
      if(!state.compact) {
        const used=['left','right'].reduce((sum,side)=>sum+(state[side].open?state[side].width:44),32);
        assert(available-used>=440);
      }
    }
    assert.equal(JSON.stringify(prefs),before);
    assert.equal(layout.calculate(1440,prefs).left.width,384,'expanded category restores saved width');
    prefs.left.collapsed=true;
    const manual=layout.calculate(1440,prefs,'left',null,{left:176});assert.equal(manual.left.open,false);assert.equal(manual.left.categoryCompact,true);
    const empty=layout.calculate(1440,prefs,'left',{left:false,right:true},{left:176});assert.equal(empty.left.empty,true);assert.equal(empty.left.categoryCompact,false);assert.equal(empty.left.width,0);
  });
  it('validates stored widths without touching any bookmark data', function () {
    assert.deepEqual(layout.normalize(null),layout.defaults());
    const parsed=layout.normalize({version:1,left:{width:-300,collapsed:true},right:{width:10000}});
    assert.equal(parsed.left.width,240);assert(parsed.left.collapsed);assert.equal(parsed.right.width,400);
    assert.deepEqual(layout.normalize({version:99}),layout.defaults());
  });
  it('removes empty side tracks from pressure without erasing saved manual intent', function () {
    for (const eligible of [{left:false,right:true},{left:true,right:false},{left:false,right:false}]) {
      const prefs=layout.defaults();prefs.left.width=400;prefs.left.collapsed=true;prefs.right.width=300;prefs.categoryCollapsed.personal=true;
      const before=JSON.stringify(prefs);
      for(let available=280;available<=1800;available+=17){
        const actual=layout.calculate(available,prefs,'right',eligible);
        for(const side of ['left','right']) if(!eligible[side]){assert(actual[side].empty);assert(!actual[side].open);assert.equal(actual[side].width,0);}
        if(!actual.compact){const used=['left','right'].reduce((sum,side)=>sum+(actual[side].empty?0:(actual[side].open?actual[side].width:44)+16),0);assert(available-used>=440||(!eligible.left&&!eligible.right));}
      }
      assert.equal(JSON.stringify(prefs),before);
      assert(layout.calculate(1440,prefs,'right',{left:true,right:true}).right.open);
      assert(!layout.calculate(1440,prefs,'right',{left:true,right:true}).left.open);
    }
  });
  it('keeps sparse stable category collapse separate from automatic layout pressure', function () {
    const original={version:1,left:{width:256},right:{width:256},categoryCollapsed:{'stable/category':true,expanded:false}};
    const prefs=layout.normalize(original);
    assert.deepEqual(prefs.categoryCollapsed,{'stable/category':true});
    const before=JSON.stringify(prefs);
    for(const width of [390,700,788,1024,1440])layout.calculate(width,prefs);
    assert.equal(JSON.stringify(prefs),before);
    assert(layout.customized(prefs));assert(!layout.customized(layout.defaults()));
    assert(!layout.customized(Object.assign(layout.defaults(),{priority:'right'})));
    const panel=layout.defaults();panel.right.compactOpen=true;assert(layout.customized(panel));
    assert.equal(layout.resizeTip,'You can resize the left and right bookmark panels by dragging their inner edges.');
    const special=layout.normalize(JSON.parse('{"version":1,"categoryCollapsed":{"constructor":true,"__proto__":true}}'));
    assert.equal(special.categoryCollapsed.constructor,true);assert.equal(special.categoryCollapsed.__proto__,true);
    assert.equal(Object.getPrototypeOf(special.categoryCollapsed),Object.prototype);
  });
});

describe('Bottom category width preferences', function () {
  it('migrates existing v1 preferences without changing sides or collapse and accepts sparse width identities', function () {
    const old={version:1,priority:'right',left:{width:368,collapsed:true},right:{width:288,compactOpen:true},categoryCollapsed:{personal:true}};
    const before=JSON.stringify(old),normalized=layout.normalize(old);
    assert.equal(JSON.stringify(old),before);
    assert.deepEqual(normalized.categoryWidths,{});assert.equal(normalized.left.width,368);assert(normalized.left.collapsed);assert(normalized.right.compactOpen);assert(normalized.categoryCollapsed.personal);
    const next=layout.normalize({...old,categoryWidths:{small:12,wide:1800,valid:548,bad:'420',nil:null,nonfinite:Infinity}});
    assert.deepEqual(next.categoryWidths,{small:260,wide:1536,valid:548});assert(layout.customized(next));
    for(const width of [320,560,768,1024,1440])layout.calculate(width,next);
    assert.equal(next.categoryWidths.valid,548,'viewport pressure must preserve intended category width');
  });
  it('stores hostile-looking stable IDs as own data properties without prototype assignment', function () {
    const parsed=layout.normalize(JSON.parse('{"version":1,"categoryWidths":{"__proto__":540,"constructor":600,"stable/category":480}}'));
    assert.equal(Object.getPrototypeOf(parsed.categoryWidths),Object.prototype);
    assert.equal(parsed.categoryWidths.__proto__,540);assert.equal(parsed.categoryWidths.constructor,600);assert.equal(parsed.categoryWidths['stable/category'],480);
    assert.deepEqual(layout.normalize(JSON.parse(JSON.stringify(parsed))),parsed);
  });
});

describe('Private layout backup merging', function () {
  it('merges sparse widths and collapse states by own stable identity while selected side preferences use the backup', function () {
    const saved=layout.normalize(JSON.parse('{"version":1,"left":{"width":300},"categoryWidths":{"__proto__":540,"personal":600},"categoryCollapsed":{"personal":true}}'));
    const incoming=layout.normalize(JSON.parse('{"version":1,"left":{"width":360},"categoryWidths":{"constructor":480,"personal":720},"categoryCollapsed":{"backup":true}}'));
    const before=JSON.stringify(saved),result=layout.merge(saved,incoming);
    assert.equal(JSON.stringify(saved),before);assert.equal(result.left.width,360);
    assert.equal(result.categoryWidths.__proto__,540);assert.equal(result.categoryWidths.constructor,480);assert.equal(result.categoryWidths.personal,720);
    assert.equal(Object.getPrototypeOf(result.categoryWidths),Object.prototype);assert.deepEqual(result.categoryCollapsed,{personal:true,backup:true});
  });
});
