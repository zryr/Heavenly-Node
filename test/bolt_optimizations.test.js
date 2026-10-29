const assert = require('assert');
const navigation = require('../public/assets/heavenly-navigation');
const bookmarks = require('../public/assets/heavenly-bookmarks');

describe('Bolt performance optimizations regression tests', function () {
  it('findBookmarkByUrl fast-path direct equality check correctly finds canonical bookmarks', function () {
    const data = {
      bookmarks: [
        { id: 'bm_1', url: 'https://everythingmoe.com/', title: 'EverythingMoe' },
        {
          id: 'bm_2',
          url: 'https://bloxcraft-ubg.pages.dev',
          title: 'Bloxcraft',
          subBookmarks: [
            { id: 'sub_1', url: 'https://5kh0.github.io', title: 'Bloxcraft 5kh0' }
          ]
        }
      ]
    };

    const foundMain = navigation.findBookmarkByUrl(data, 'https://everythingmoe.com/');
    assert.ok(foundMain);
    assert.strictEqual(foundMain.id, 'bm_1');

    const foundChild = navigation.findBookmarkByUrl(data, 'https://5kh0.github.io');
    assert.ok(foundChild);
    assert.strictEqual(foundChild.id, 'sub_1');
  });

  it('mirrorState correctly computes mirror states without extra allocations', function () {
    const bookmark = {
      id: 'bm_opium',
      title: 'Opium',
      url: 'https://opium.best/',
      subBookmarks: [
        { id: 'sub_1', title: 'jsDelivr SVG', url: 'https://cdn.jsdelivr.net/gh/OpiumBest/svg/icon.svg' }
      ]
    };
    const brokenMap = { 'https://opium.best/': true };

    const state = bookmarks.mirrorState(bookmark, '', '', brokenMap);
    assert.strictEqual(state.entries.length, 2);
    assert.strictEqual(state.entries[0].isBroken, true);
    assert.strictEqual(state.entries[1].isBroken, false);
    assert.strictEqual(state.active.identity, 'id:sub_1');
  });
});
