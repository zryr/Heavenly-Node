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
