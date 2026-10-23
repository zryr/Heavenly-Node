const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
function source(name, content = html) {
  const start = content.indexOf('    function ' + name + '(');
  assert(start >= 0, 'Missing function: ' + name);
  const end = content.indexOf('\n    function ', start + 1);
  return content.slice(start, end);
}
function context() {
  const store = new Map();
  const sandbox = {
    HeavenlyCatalog: require('../public/assets/heavenly-catalog'), catalog: require('../public/assets/heavenly-catalog'), HeavenlyBookmarks: require('../public/assets/heavenly-bookmarks'), Set, URL, HeavenlyNavigation: require('../public/assets/heavenly-navigation'), navigation: require('../public/assets/heavenly-navigation'),
    localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) }
  };
  vm.createContext(sandbox);
  sandbox.DEFAULT_BOOKMARK_DATA = sandbox.HeavenlyCatalog.defaults;
  vm.runInContext(['loadBookmarkData', 'saveBookmarkData', 'reorderSectionDraft'].map(name => source(name)).join('\n'), sandbox);
  return sandbox;
}
const plain = value => JSON.parse(JSON.stringify(value));

describe('Bookmark management and saved ordering', function () {
  it('stages moves before and after sections without changing saved section objects', function () {
    const c = context();
    const saved = ['builtin', 'user', 'classics'];
    assert.deepStrictEqual(plain(c.reorderSectionDraft(saved, 'builtin', 'classics', true)), ['user', 'classics', 'builtin']);
    assert.deepStrictEqual(plain(c.reorderSectionDraft(saved, 'classics', 'builtin', false)), ['classics', 'builtin', 'user']);
    assert.deepStrictEqual(saved, ['builtin', 'user', 'classics']);
    assert.strictEqual(c.localStorage.getItem('heavenly_bookmarks'), null);
  });

  it('leaves ordering intact for self drops and missing sections', function () {
    const c = context(), ids = ['a', 'b', 'c'];
    [['a', 'a'], ['missing', 'b'], ['a', 'missing']].forEach(([sourceId, target]) => {
      assert.deepStrictEqual(plain(c.reorderSectionDraft(ids, sourceId, target, true)), ids);
    });
  });

  it('keeps built-in bookmark reordering and destination sections on repeated loads', function () {
    const c = context();
    const data = c.loadBookmarkData();
    const anime = data.bookmarks.find(b => b.id === 'bm_everythingmoe');
    anime.order = 30;
    const docs = data.bookmarks.find(b => b.id === 'bm_project_idk');
    docs.subSectionId = 'user';
    const movies = data.categories.find(cat => cat.id === 'cat_movies');
    movies.subSections.reverse();
    c.saveBookmarkData(data);
    for (let i = 0; i < 3; i++) {
      const loaded = c.loadBookmarkData();
      assert.strictEqual(loaded.bookmarks.find(b => b.id === anime.id).order, 30);
      assert.strictEqual(loaded.bookmarks.find(b => b.id === docs.id).subSectionId, 'user');
      assert.deepStrictEqual(plain(loaded.categories.find(cat => cat.id === movies.id).subSections), plain(movies.subSections));
    }
  });

  it('fills missing legacy section IDs using defaults without overwriting user moves', function () {
    const c = context(), data = c.loadBookmarkData();
    delete data.bookmarks.find(b => b.id === 'bm_project_idk').subSectionId;
    c.saveBookmarkData(data);
    assert.strictEqual(c.loadBookmarkData().bookmarks.find(b => b.id === 'bm_project_idk').subSectionId, 'docs_games');
  });

  it('preserves ordering and built-in moves when settings and the proxy bookmark widget read the same storage', function () {
    const c = context(), data = c.loadBookmarkData();
    data.bookmarks.find(b => b.id === 'bm_everythingmoe').order = 40;
    data.bookmarks.find(b => b.id === 'bm_project_idk').subSectionId = 'user';
    const sections = data.categories.find(cat => cat.id === 'cat_movies').subSections;
    sections.reverse();
    c.saveBookmarkData(data);
    const settings = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');
    vm.runInContext(source('loadBookmarkData', settings), c);
    let loaded = c.loadBookmarkData();
    function verify(value) {
      assert.strictEqual(value.bookmarks.find(b => b.id === 'bm_everythingmoe').order, 40);
      assert.strictEqual(value.bookmarks.find(b => b.id === 'bm_project_idk').subSectionId, 'user');
      assert.deepStrictEqual(plain(value.categories.find(cat => cat.id === 'cat_movies').subSections), plain(sections));
    }
    verify(loaded);
    const client = fs.readFileSync(path.join(__dirname, '../custom-client/unblocker-client.js'), 'utf8');
    c.storage = c.localStorage;
    vm.runInContext('var data = catalog.load(storage);', c);
    verify(c.data);
  });

  it('shares exactly checked bookmarks and the category metadata needed to import them', function () {
    const c = context();
    const data = c.loadBookmarkData();
    const one = {id:'custom_share',title:'My site',url:'https://custom.test/',categoryId:'cat_movies'};
    data.bookmarks.push(one); c.saveBookmarkData(data);
    let payload;
    c.document = { querySelectorAll: selector => selector === '.share-bm-cb:checked' ? [{ getAttribute: () => one.id }] : [] };
    c.$ = () => ({});
    c.location = { origin: 'https://heavenly.test', pathname: '/' };
    c.encodeSharePayload = value => { payload = value; return 'code'; };
    vm.runInContext(source('updateShareOutputCode'), c);
    c.updateShareOutputCode();
    assert.deepStrictEqual(plain(payload.bookmarks.map(b => b.id)), [one.id]);
    assert.deepStrictEqual(plain(payload.categories.map(cat => cat.id)), [one.categoryId]);
  });
});
