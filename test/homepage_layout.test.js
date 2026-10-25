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
