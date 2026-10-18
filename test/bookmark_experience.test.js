'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const request = require('supertest');
const navigation = require('../public/assets/heavenly-navigation');
const blankWindow = require('./helpers/wrapper.cjs');
const app = require('../app');
const plain = value => JSON.parse(JSON.stringify(value));
function context(page = 'index.html') {
  const content = fs.readFileSync(require.resolve('../public/' + page), 'utf8');
  const store = new Map();
  const c = { HeavenlyBookmarks: require('../public/assets/heavenly-bookmarks'), URL, HeavenlyNavigation: navigation, localStorage: { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v) } };
  vm.createContext(c);
  const start = content.indexOf('    var DEFAULT_BOOKMARK_DATA =');
  vm.runInContext(content.slice(start, content.indexOf('\n    };', start) + 7), c);
  for (const name of ['loadBookmarkData', 'saveBookmarkData']) {
    const a = content.indexOf('    function ' + name + '('), b = content.indexOf('\n    function ', a + 1);
    vm.runInContext(content.slice(a, b), c);
  }
  return c;
}
for (const page of ['index.html', 'settings.html']) describe('Safe bookmark reconciliation: ' + page, () => {
  it('places Coolmath after all existing built-in Games defaults', () => {
    const c = context(page);
    const games = c.DEFAULT_BOOKMARK_DATA.bookmarks.filter(b => b.categoryId === 'cat_games' && b.builtIn).sort((a, b) => a.order - b.order);
    assert.equal(games.at(-1).id, 'bm_coolmath');
  });
  it('appends Coolmath once after existing game order, preserving personalized data and hidden settings', () => {
    const c = context(page), data = plain(c.DEFAULT_BOOKMARK_DATA);
    data.bookmarks = data.bookmarks.filter(b => b.id !== 'bm_coolmath');
    const game = data.bookmarks.find(b => b.id === 'bm_ng'); game.order = 700; game.icon = 'https://custom.test/icon.png';
    game.subBookmarks.push({ id: 'my-game', title: 'Custom child', url: 'https://custom.test/level?q=1#play', icon: 'preset:star' });
    data.categories.find(cat => cat.id === 'cat_games').hidden = true;
    const saved = plain(game);
    c.saveBookmarkData(data);
    for (let i = 0; i < 3; i++) {
      const result = c.loadBookmarkData();
      assert.equal(result.bookmarks.filter(b => b.id === 'bm_coolmath').length, 1);
      assert.equal(result.bookmarks.find(b => b.id === 'bm_coolmath').order, 701);
      assert.deepEqual(plain(result.bookmarks.find(b => b.id === 'bm_ng')).subBookmarks, saved.subBookmarks);
      assert.equal(result.bookmarks.find(b => b.id === 'bm_ng').icon, saved.icon);
      assert.equal(result.categories.find(cat => cat.id === 'cat_games').hidden, true);
    }
  });
  it('keeps an existing custom Coolmath homepage without adding a duplicate default', () => {
    const c = context(page), data = plain(c.DEFAULT_BOOKMARK_DATA);
    data.bookmarks = data.bookmarks.filter(b => b.id !== 'bm_coolmath');
    const custom = { id: 'my-coolmath', categoryId: 'cat_games', title: 'My games', url: 'http://coolmathgames.com', icon: 'preset:star', order: 82, subBookmarks: [] };
    data.bookmarks.push(custom); c.saveBookmarkData(data);
    assert.deepEqual(plain(c.loadBookmarkData().bookmarks.find(b => b.id === custom.id)), { ...custom, subSectionId: 'user' });
    assert(!c.loadBookmarkData().bookmarks.some(b => b.id === 'bm_coolmath'));
  });
  it('migrates shipped icon paths once and preserves custom FMHY icons', () => {
    const c = context(page), data = plain(c.DEFAULT_BOOKMARK_DATA);
    data.bookmarks.find(b => b.id === 'bm_fmhy_movies').icon = '/proxy/https://fmhy.net/hall.png';
    data.bookmarks.find(b => b.id === 'bm_fmhy_anime').icon = 'data:image/png;base64,custom';
    data.bookmarks.find(b => b.id === 'bm_nexus').icon = '/assets/nexus-logo.png';
    c.saveBookmarkData(data); const result = c.loadBookmarkData();
    assert.equal(result.bookmarks.find(b => b.id === 'bm_fmhy_movies').icon, '/assets/icons/fmhy-halloween-icon.png');
    assert.equal(result.bookmarks.find(b => b.id === 'bm_fmhy_anime').icon, 'data:image/png;base64,custom');
    assert.equal(result.bookmarks.find(b => b.id === 'bm_nexus').icon, '/assets/icons/nexus-icon.png');
    assert.equal(navigation.migrateBookmarkIcons(result), false);
  });
});
describe('Coolmath intentional launch boundary', () => {
  const target = 'https://www.coolmathgames.com/0-run-3?mode=one&x=%2F#play';
  function win() { return { location: new URL('https://heavenly.test/'), localStorage: { getItem() { return null; } }, setTimeout() {}, confirm: () => false }; }
  it('matches only the two actual hostnames', () => {
    for (const value of [target, 'https://coolmathgames.com/']) assert(navigation.isCoolmathUrl(value));
    for (const value of ['https://evilcoolmathgames.com/', 'https://coolmathgames.com.evil.test/', 'https://www.coolmathgames.com@evil.test/', 'https://evil.test/?url=' + target, 'javascript:coolmathgames.com', 'https://games.coolmathgames.com/']) assert(!navigation.isCoolmathUrl(value), value);
  });
  it('reuses one existing blank wrapper, retains full URL, and does not change preferences', () => {
    const w = win(), blank = blankWindow(), saved = { openBookmarksInAboutBlank: false, openBookmarksInNewTab: false };
    let opens = 0; w.open = () => { opens++; return blank; };
    assert.equal(navigation.launch(w, w.location.origin + '/proxy/' + target, { kind: 'bookmark', settings: saved }), blank);
    assert.equal(opens, 1); assert.equal(blank.document.getElementById('heavenly-wrapper-frame').src, w.location.origin + '/proxy/' + target);
    assert.equal(saved.openBookmarksInAboutBlank, false);
  });
  it('keeps Direct and explicit normal proxy recovery outside wrappers', () => {
    const w = win(); w.open = () => { throw new Error('must stay in current tab'); };
    navigation.launch(w, target, { kind: 'bookmark', settings: { openBookmarksInNewTab: false } });
    assert.equal(w.location.href, target);
    w.location = new URL('https://heavenly.test/');
    navigation.launch(w, w.location.origin + '/proxy/' + target, { aboutBlank: false, settings: { showProxiedUrl: true, openSearchInNewTab: false } });
    assert.equal(w.location.href, 'https://heavenly.test/proxy/' + target);
  });
  it('performs one popup attempt and supports accepted or cancelled blocked-popup fallback', () => {
    for (const accept of [false, true]) {
      const w = win(); let opens = 0; w.open = () => { opens++; return null; }; w.confirm = () => accept;
      navigation.launch(w, w.location.origin + '/proxy/' + target);
      assert.equal(opens, 1); assert.equal(w.location.href, accept ? 'https://heavenly.test/proxy/' + target : 'https://heavenly.test/');
    }
  });
  it('also wraps an explicit Coolmath proxy action from the existing outbound-link dialogs', () => {
    const w = win(), blank = blankWindow(); let opens = 0;
    w.__nativeWinOpen = () => { opens++; return blank; };
    const url = w.location.origin + '/proxy/' + target;
    require('../custom-client/unblocker-client').openIntentionalProxyLink(w, { proxyOrigin: w.location.origin }, url);
    assert.equal(opens, 1); assert.equal(blank.document.getElementById('heavenly-wrapper-frame').src, url);
    const normal = win(); let opened;
    normal.open = url => { opened = url; };
    require('../custom-client/unblocker-client').openIntentionalProxyLink(normal, { proxyOrigin: normal.location.origin }, normal.location.origin + '/proxy/https://other.test/');
    assert.equal(opened, 'https://heavenly.test/proxy/https://other.test/');
  });
  it('deduplicates saved game URLs including nested entries without collapsing query or fragment', () => {
    const data = { bookmarks: [{ url: 'https://other.test/', subBookmarks: [{ url: target }] }] };
    assert.equal(navigation.findBookmarkByUrl(data, target), data.bookmarks[0].subBookmarks[0]);
    assert.equal(navigation.findBookmarkByUrl(data, target + '2'), null);
  });
});
describe('Published bookmark assets', () => {
  for (const name of ['artic', 'aether', 'doc-of-docs', 'nexus', 'opium']) it('keeps the legacy ' + name + ' URL usable without duplicate files', async () => {
    await request(app).get('/assets/' + name + '-logo.png').expect(308).expect('Location', '/assets/icons/' + name + '-icon.png');
    await request(app).get('/assets/icons/' + name + '-icon.png').expect(200).expect('Content-Type', /image\/png/);
  });
  it('serves both local site icons', async () => {
    await request(app).get('/assets/icons/fmhy-halloween-icon.png').expect(200).expect('Content-Type', /image\/png/);
    await request(app).get('/assets/icons/coolmath-icon.ico').expect(200).expect('Content-Type', /image\//);
  });
});
