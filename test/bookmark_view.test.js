'use strict';
const assert = require('node:assert/strict');
const view = require('../public/assets/heavenly-bookmark-view');

describe('Homepage bookmark view preferences and visible collection search', function () {
  it('inherits sparse subsection and category limits without copying global values', function () {
    let settings = { bookmarkInitialLimit: 7, untouched: 'keep me' };
    assert.equal(view.limit({}, 'left', 'saved'), 5);
    assert.equal(view.limit(settings, 'left', 'saved'), 7);
    settings = Object.assign({}, settings, view.override(settings, 'left', null, 4));
    assert.equal(view.limit(settings, 'left', 'saved'), 4);
    settings = Object.assign({}, settings, view.override(settings, 'left', 'saved', 2));
    assert.equal(view.limit(settings, 'left', 'saved'), 2);
    settings = Object.assign({}, settings, view.override(settings, 'left', 'saved', null));
    assert.equal(view.limit(settings, 'left', 'saved'), 7);
    assert.equal(settings.bookmarkSectionLimits[view.sectionKey('left','saved')], 'global');
    settings.bookmarkInitialLimit = 9;
    assert.equal(view.limit(settings, 'left', 'saved'), 9);
    assert.equal(view.limit(settings, 'left', 'other'), 4);
    assert.equal(settings.untouched, 'keep me');
  });
  it('rejects invalid, fractional and excessive initial counts', function () {
    for (const value of ['', null, undefined, 0, -1, 2.5, 31, Infinity, 'nonsense']) assert.equal(view.validLimit(value), null);
    assert.equal(view.validLimit('30'), 30);
    assert.equal(view.limit({ bookmarkInitialLimit: 1000 }, 'a'), 5);
  });
  it('uses measured complete bottom rows by default while side panels keep five', function () {
    const before={untouched:'safe'},context={side:'bottom'};
    for(let width=120;width<=2000;width+=7){
      context.width=width;const count=view.limit(before,'a','s',context);
      assert.equal(count,Math.max(1,Math.floor((width+10)/210)));
      if(width>=200)assert(count*200+(count-1)*10<=width);
      assert.equal(view.limit(before,'a','s',{side:'left',width}),5);
    }
    assert.deepEqual(before,{untouched:'safe'});
    assert.equal(view.rowCapacity(619),2);assert.equal(view.rowCapacity(620),3);
    assert.equal(view.rowCapacity(619.99),2);assert.equal(view.rowCapacity(620.01),3);
    assert.equal(view.rowCapacity(0),1);assert.equal(view.rowCapacity(Infinity),30);
  });
  it('preserves legacy custom counts and explicit per-section precedence across Auto changes', function () {
    const context={side:'bottom',width:1374};
    let settings={bookmarkInitialLimit:7,bookmarkSectionLimits:{[view.sectionKey('a')]:4,[view.sectionKey('a','s')]:2},bookmarkExpandedSections:{kept:true}};
    const before=JSON.stringify(settings);
    assert.equal(view.mode(settings),'custom');assert.equal(view.limit(settings,'other','s',context),7);
    assert.equal(view.limit(settings,'a','s',context),2);assert.equal(view.limit(settings,'a','other',context),4);
    assert.equal(JSON.stringify(settings),before);
    settings.bookmarkCountMode='auto';
    assert.equal(view.limit(settings,'other','s',context),6);assert.equal(view.limit(settings,'a','s',context),2);
    settings=Object.assign({},settings,view.override(settings,'a','s','auto'));
    assert.equal(view.limit(settings,'a','s',context),6);assert.equal(view.limit(settings,'a','other',context),4);
    settings=Object.assign({},settings,view.override(settings,'a','s',null));
    assert.equal(view.limit(settings,'a','s',context),6);assert.equal(settings.bookmarkSectionLimits[view.sectionKey('a','s')],'global');
    settings.bookmarkCountMode='custom';assert.equal(view.limit(settings,'a','s',context),7);
    assert.deepEqual(settings.bookmarkExpandedSections,{kept:true});
  });
  it('searches built-in and custom entries using category, subsection and folder context without exposing hidden ancestors', function () {
    const data = { categories: [{ id:'c', title:'Explore', subSections:[{ id:'saved', title:'Research' }] }, { id:'hidden', title:'Secret', hidden:true }], bookmarks: [
      { id:'a', title:'Atlas', url:'https://atlas.test', categoryId:'c', subSectionId:'saved', builtIn:true },
      { id:'folder', title:'Astronomy', type:'folder', categoryId:'c', subSectionId:'saved', subBookmarks:[{ id:'star', title:'Star maps', url:'https://stars.test' }, { id:'child-hidden', title:'Hidden star', hidden:true, subBookmarks:[{ id:'hidden-grandchild', title:'Nebula' }] }, { id:'nested', title:'Deep sky', type:'folder', subBookmarks:[{ id:'nebula', title:'Nebula charts', url:'https://nebula.test' }] }] },
      { id:'hidden', title:'Hidden atlas', categoryId:'c', hidden:true, subBookmarks:[{ id:'child', title:'Hidden child' }] },
      { id:'secret', title:'Atlas secret', categoryId:'hidden' }
    ] };
    const before = JSON.stringify(data);
    assert.deepEqual(view.search(data, 'research').map(result => result.entry.id), ['a', 'folder', 'star', 'nested', 'nebula']);
    assert.deepEqual(view.search(data, 'astronomy stars').map(result => result.entry.id), ['star']);
    assert.deepEqual(view.search(data, 'astronomy deep nebula').map(result => result.entry.id), ['nebula']);
    assert.equal(view.search(data, 'hidden').length, 0);
    assert.equal(view.search(data, 'secret').length, 0);
    assert.equal(view.search(data, 'atlas')[0].entry.id, 'a');
    assert.equal(JSON.stringify(data), before);
  });
});
