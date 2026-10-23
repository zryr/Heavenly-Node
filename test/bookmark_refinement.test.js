'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const bookmarks = require('../public/assets/heavenly-bookmarks');
const navigation = require('../public/assets/heavenly-navigation');
const clone = value => JSON.parse(JSON.stringify(value));
function storage(data) { let raw = JSON.stringify(data); return { getItem: () => raw, setItem: (key, value) => { raw = value; } }; }
function fixture() { return { categories: [{ id: 'games', hidden: true }], bookmarks: [{ id: 'home', title: 'Coolmath', url: 'https://www.coolmathgames.com/', type: 'bookmark', subBookmarks: [{ id: 'game', url: 'https://www.coolmathgames.com/0-run-3?q=1#play', personalNote: 'Nested note' }] }, { id: 'gn', builtIn: true, title: 'GN', url: 'https://gn-math.dev/', icon: 'preset:star', order: 42, personalNote: 'Old note', subBookmarks: [] }] }; }
describe('Shared Quick Save preference and matching', () => {
  it('supports Coolmath without changing its bookmark type or creating a bookmark', () => {
    const original = fixture(), store = storage(original);
    bookmarks.setQuickSavePreference(store, 'home', false);
    let result = JSON.parse(store.getItem()); assert.equal(result.bookmarks.length, 2); assert.equal(result.bookmarks[0].type, 'bookmark'); assert.equal(result.bookmarks[0].disableQuickSaveWidget, true);
    bookmarks.setQuickSavePreference(store, 'home', true);
    result = JSON.parse(store.getItem()); delete result.bookmarks[0].disableQuickSaveWidget; assert.deepEqual(result, original);
  });
  it('finds the selected Coolmath game preference before the general homepage even when disabled', () => {
    const data = fixture(); data.bookmarks.push({ id: 'saved-game', type: 'bookmark', url: 'https://coolmathgames.com/0-run-3', disableQuickSaveWidget: true });
    assert.equal(bookmarks.findQuickSaveBookmark(data, 'https://www.coolmathgames.com/0-run-3?q=1#play').id, 'saved-game');
    assert.equal(bookmarks.findQuickSaveBookmark(data, 'https://www.coolmathgames.com/0-other').id, 'home');
  });
  it('rejects lookalike Coolmath hosts and preserves ordinary folder matching', () => {
    const data = fixture(); assert.equal(bookmarks.findQuickSaveBookmark(data, 'https://www.coolmathgames.com.evil.test/'), null);
    data.bookmarks.push({ id: 'folder', type: 'folder_bookmark', url: 'https://example.test/', disableQuickSaveWidget: true });
    assert.equal(bookmarks.findQuickSaveBookmark(data, 'https://games.example.test/play').id, 'folder');
    assert(!bookmarks.supportsQuickSave({ id: 'plain', type: 'bookmark', url: 'https://other.test/' }));
    assert(!bookmarks.supportsQuickSave({ id: 'bm_ng', type: 'folder_bookmark', url: 'https://newgrounds.com/' }));
  });
  it('does not re-create a deleted bookmark or accept unsupported settings', () => {
    const store = storage(fixture()); assert.throws(() => bookmarks.setQuickSavePreference(store, 'missing', true)); assert.throws(() => bookmarks.setQuickSavePreference(store, 'gn', true));
  });
});
describe('Local plain-text bookmark notes', () => {
  it('saves, edits and clears built-in notes without changing official metadata or unrelated data', () => {
    const original = fixture(), store = storage(original); bookmarks.saveNote(store, 'gn', 'A personal note <b>as text</b>');
    let result = JSON.parse(store.getItem()); assert.equal(result.bookmarks[1].personalNote, 'A personal note <b>as text</b>');
    delete result.bookmarks[1].personalNote; const expected = clone(original); delete expected.bookmarks[1].personalNote; assert.deepEqual(result, expected);
    bookmarks.saveNote(store, 'gn', 'Changed'); assert.equal(JSON.parse(store.getItem()).bookmarks[1].personalNote, 'Changed');
    bookmarks.saveNote(store, 'gn', ''); assert.equal(JSON.parse(store.getItem()).bookmarks[1].personalNote, undefined);
  });
  it('uses stable nested identities and the latest saved collection', () => {
    const data = fixture(), store = storage(data); data.bookmarks.reverse(); data.bookmarks[0].categoryId = 'moved'; store.setItem('heavenly_bookmarks', JSON.stringify(data));
    bookmarks.saveNote(store, 'game', 'A nested note'); const result = JSON.parse(store.getItem()); assert.equal(bookmarks.findEntry(result, 'game').personalNote, 'A nested note'); assert.equal(result.bookmarks[0].categoryId, 'moved');
  });
  it('keeps notes during legacy imports and transfers explicit notes through private backups', () => {
    const old = fixture().bookmarks[0]; old.personalNote = 'My note'; const legacy = clone(old); delete legacy.personalNote; delete legacy.subBookmarks[0].personalNote;
    const merged = bookmarks.importBookmark(legacy, old); assert.equal(merged.personalNote, old.personalNote); assert.equal(merged.subBookmarks[0].personalNote, 'Nested note');
    assert.equal(bookmarks.importBookmark({ ...legacy, personalNote: 'Imported note' }, old).personalNote, 'Imported note');
    assert.equal(bookmarks.importBookmark({ ...legacy, personalNote: '' }, old).personalNote, '');
    assert.deepEqual(JSON.parse(JSON.stringify(merged)), merged);
  });
  it('preserves the latest note when an unrelated editor saves an older snapshot', () => {
    const latest = fixture(), stale = fixture();
    latest.bookmarks[1].personalNote = 'Saved in another tab';
    delete latest.bookmarks[0].subBookmarks[0].personalNote;
    stale.bookmarks[1].order = 99;
    bookmarks.preserveStoredNotes(stale, latest);
    assert.equal(stale.bookmarks[1].personalNote, 'Saved in another tab');
    assert.equal(stale.bookmarks[1].order, 99);
    assert.equal(stale.bookmarks[0].subBookmarks[0].personalNote, undefined);
  });
  it('strips notes recursively from public payloads without mutating private bookmarks', () => {
    const data = fixture(), before = JSON.stringify(data); const shared = bookmarks.publicSharePayload(data);
    assert(!JSON.stringify(shared).includes('personalNote')); assert.equal(JSON.stringify(data), before);
  });
  it('never resurrects deleted notes and propagates storage failures without losing the saved note', () => {
    const data = fixture(), store = storage(data); data.bookmarks.pop(); store.setItem('heavenly_bookmarks', JSON.stringify(data)); assert.throws(() => bookmarks.saveNote(store, 'gn', 'new'));
    const denied = storage(fixture()), before = denied.getItem(); denied.setItem = () => { throw new Error('quota'); }; assert.throws(() => bookmarks.saveNote(denied, 'gn', 'new')); assert.equal(denied.getItem(), before);
  });
  it('bounds notes and discards malformed imported note metadata', () => {
    const store = storage(fixture()); bookmarks.saveNote(store, 'gn', 'x'.repeat(4500)); assert.equal(JSON.parse(store.getItem()).bookmarks[1].personalNote.length, 4000);
    assert.equal(bookmarks.importBookmark({ id: 'x', personalNote: { nested: 'bad' } }).personalNote, undefined);
  });
});
describe('Notes and Quick Save survive every built-in reader', () => {
  for (const name of ['public/index.html', 'public/settings.html', 'custom-client/unblocker-client.js']) it(name, () => {
    const source = fs.readFileSync(name, 'utf8'), definition = source.indexOf('var DEFAULT_BOOKMARK_DATA =');
    const end = name.startsWith('custom') ? source.indexOf('\n      };', definition) + 9 : source.indexOf('\n    };', definition) + 7;
    const c = { HeavenlyCatalog: require('../public/assets/heavenly-catalog'), catalog: require('../public/assets/heavenly-catalog'), HeavenlyBookmarks: bookmarks, HeavenlyNavigation: navigation, navigation, localStorage: null, storage: null }; vm.createContext(c); c.DEFAULT_BOOKMARK_DATA = c.HeavenlyCatalog.defaults;
    const data = clone(c.DEFAULT_BOOKMARK_DATA); data.bookmarks.find(b => b.id === 'bm_gn_math').personalNote = 'Keep across updates'; data.bookmarks.find(b => b.id === 'bm_duckmath').disableQuickSaveWidget = false;
    c.localStorage = c.storage = storage(data);
    if (name.startsWith('custom')) c.catalog.load(c.storage);
    else {
      for (const fn of ['loadBookmarkData', 'saveBookmarkData']) { const a = source.indexOf('    function ' + fn + '('), b = source.indexOf('\n    function ', a + 1); vm.runInContext(source.slice(a, b), c); }
      c.loadBookmarkData();
    }
    const result = JSON.parse(c.storage.getItem()); assert.equal(result.bookmarks.find(b => b.id === 'bm_gn_math').personalNote, 'Keep across updates'); assert.equal(result.bookmarks.find(b => b.id === 'bm_duckmath').disableQuickSaveWidget, false);
  });
});
