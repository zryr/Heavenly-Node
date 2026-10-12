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
    Set,
    localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) }
  };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(html.indexOf('    var DEFAULT_BOOKMARK_DATA ='), html.indexOf('    var expandedCategories =')), sandbox);
  vm.runInContext(['loadBookmarkData', 'saveBookmarkData', 'reorderSectionDraft', 'moveSelectedBookmarks'].map(name => source(name)).join('\n'), sandbox);
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
    vm.runInContext(client.slice(client.indexOf('      var data = JSON.parse(JSON.stringify(DEFAULT_BOOKMARK_DATA));'), client.indexOf('      var path = window.location.pathname;')), c);
    verify(c.data);
  });

  it('moves only selected visible bookmarks together, preserving folders, URLs and relative order', function () {
    const c = context();
    const data = {
      categories: [{ id: 'dest', subSections: [{ id: 'user' }, { id: 'classics' }] }],
      bookmarks: [
        { id: 'second', categoryId: 'src', subSectionId: 'user', order: 8, url: 'https://two.test' },
        { id: 'first', categoryId: 'src', subSectionId: 'user', order: 2, type: 'folder', subBookmarks: [{ title: 'Child', url: 'https://child.test' }] },
        { id: 'existing', categoryId: 'dest', subSectionId: 'classics', order: 10 },
        { id: 'untouched', categoryId: 'src', subSectionId: 'user', order: 0 },
        { id: 'hidden', categoryId: 'src', subSectionId: 'user', order: 1, hidden: true }
      ]
    };
    const before = plain(data);
    assert.strictEqual(c.moveSelectedBookmarks(data, new Set(['second', 'first', 'hidden', 'stale']), 'dest', 'classics'), true);
    assert.deepStrictEqual(data.bookmarks[0], { ...before.bookmarks[0], categoryId: 'dest', subSectionId: 'classics', order: 12 });
    assert.deepStrictEqual(data.bookmarks[1], { ...before.bookmarks[1], categoryId: 'dest', subSectionId: 'classics', order: 11 });
    assert.deepStrictEqual(data.bookmarks.slice(2), before.bookmarks.slice(2));
  });

  it('does not mutate data for hidden categories, invalid sections or empty selections', function () {
    const c = context();
    const data = {
      categories: [{ id: 'dest', subSections: [{ id: 'user' }] }, { id: 'hidden', hidden: true, subSections: [{ id: 'user' }] }],
      bookmarks: [{ id: 'bm', categoryId: 'src', order: 3 }]
    };
    const before = plain(data);
    assert.strictEqual(c.moveSelectedBookmarks(data, new Set(['bm']), 'dest', 'missing'), false);
    assert.strictEqual(c.moveSelectedBookmarks(data, new Set(['bm']), 'hidden', 'user'), false);
    assert.strictEqual(c.moveSelectedBookmarks(data, new Set(), 'dest', 'user'), false);
    assert.deepStrictEqual(data, before);
  });

  it('shares exactly checked bookmarks and the category metadata needed to import them', function () {
    const c = context();
    const data = c.loadBookmarkData();
    const one = data.bookmarks.find(b => b.id === 'bm_everythingmoe');
    let payload;
    c.document = { querySelectorAll: selector => selector === '.share-bm-cb:checked' ? [{ getAttribute: () => one.id }] : [] };
    c.$ = () => ({});
    c.encodeSharePayload = value => { payload = value; return 'code'; };
    vm.runInContext(source('updateShareOutputCode'), c);
    c.updateShareOutputCode();
    assert.deepStrictEqual(plain(payload.bookmarks.map(b => b.id)), [one.id]);
    assert.deepStrictEqual(plain(payload.categories.map(cat => cat.id)), [one.categoryId]);
  });
});
