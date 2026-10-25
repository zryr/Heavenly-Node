'use strict';
const assert = require('node:assert/strict');
const catalog = require('../public/assets/heavenly-catalog');
const bookmarks = require('../public/assets/heavenly-bookmarks');
const clone = value => JSON.parse(JSON.stringify(value));
const find = (data, id) => bookmarks.findEntry(data, id);
const leaf = id => ({id, title:id, url:'https://saved.test/' + id, isUser:true, personalNote:'Keep ' + id});

function fixture() {
  const data = catalog.fresh();
  const canonical = find(data, 'bm_ng');
  canonical.title = 'Newgrounds: Syshi';
  canonical.personalNote = 'Canonical note';
  canonical.subBookmarks = [leaf('canonical_saved_child')];
  const alias = {id:'bm_user_ng', title:'Newgrounds', url:'https://newgrounds.com', type:'folder_bookmark', builtIn:false,
    categoryId:'cat_games', subSectionId:'user', order:99, personalNote:'Alias note', subBookmarks:[leaf('alias_saved_child')]};
  return {data, canonical, alias};
}

function assertMigration(data, originals, expectedPersonalIds) {
  const result = catalog.prepare(data);
  const canonical = find(result, 'bm_ng');
  assert(canonical, 'canonical Newgrounds remains reachable after removing its alias');
  assert.equal(find(result, 'bm_user_ng'), null);
  assert(canonical.personalNote.includes('Canonical note'));
  assert(canonical.personalNote.includes('Alias note'));
  const identities = [];
  function visit(items) { for (const item of items) { identities.push(item.id); visit(item.subBookmarks || []); } }
  visit(result.bookmarks);
  assert.equal(identities.filter(id => id === 'bm_ng').length, 1);
  for (const id of expectedPersonalIds) {
    assert.equal(identities.filter(value => value === id).length, 1, id + ' survives exactly once');
    if (id.endsWith('_child') || id.endsWith('_sibling')) assert.equal(find(result, id).personalNote, 'Keep ' + id);
  }
  const archive = result._catalog.migrations.newgrounds.originals;
  for (const original of originals) assert(archive.some(saved => JSON.stringify(saved.record) === JSON.stringify(original)), 'complete original ' + original.id + ' remains archived');
  assert.deepEqual(catalog.prepare(clone(result)), result, 'repeated repair is idempotent');
  catalog.validate(result);
}

describe('Additional Newgrounds migration audit: nested personal layouts', () => {
  for (const deep of [false, true]) {
    it('preserves a canonical Newgrounds moved ' + (deep ? 'deep inside a personal folder under' : 'directly under') + ' its retired alias', () => {
      const {data, canonical, alias} = fixture();
      data.bookmarks = data.bookmarks.filter(item => item !== canonical);
      delete canonical.categoryId; delete canonical.subSectionId;
      const personalIds = ['canonical_saved_child', 'alias_saved_child'];
      if (deep) {
        const folder = {id:'personal_container', title:'Personal folder', type:'folder', personalNote:'Keep folder',
          subBookmarks:[leaf('before_sibling'), canonical, leaf('after_sibling')]};
        alias.subBookmarks.push(folder);
        personalIds.push('personal_container', 'before_sibling', 'after_sibling');
      } else alias.subBookmarks.push(canonical);
      data.bookmarks.push(alias);
      assertMigration(data, clone([canonical, alias]), personalIds);
    });
    it('preserves a retired alias moved ' + (deep ? 'deep inside a personal folder under' : 'directly under') + ' canonical Newgrounds', () => {
      const {data, canonical, alias} = fixture();
      delete alias.categoryId; delete alias.subSectionId;
      const personalIds = ['canonical_saved_child', 'alias_saved_child'];
      if (deep) {
        const folder = {id:'personal_container', title:'Personal folder', type:'folder', personalNote:'Keep folder',
          subBookmarks:[leaf('before_sibling'), alias, leaf('after_sibling')]};
        canonical.subBookmarks.push(folder);
        personalIds.push('personal_container', 'before_sibling', 'after_sibling');
      } else canonical.subBookmarks.push(alias);
      // Compatibility assigns a missing legacy alias subsection before archival.
      const archivedAlias = clone(alias); archivedAlias.subSectionId = 'user';
      const archivedCanonical = clone(canonical);
      function reflectAlias(items) { for (const item of items) { if (item.id === alias.id) item.subSectionId = 'user'; reflectAlias(item.subBookmarks || []); } }
      reflectAlias(archivedCanonical.subBookmarks);
      assertMigration(data, [archivedCanonical, archivedAlias], personalIds);
    });
  }
});
