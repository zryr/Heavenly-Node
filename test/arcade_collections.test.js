"use strict";
const assert = require("node:assert/strict");
const M = require("../public/assets/heavenly-collections");
const C = require("../public/assets/heavenly-catalog");
const B = require("../public/assets/heavenly-bookmarks");
const V = require("../public/assets/heavenly-bookmark-view");
const clone = (x) => JSON.parse(JSON.stringify(x));
function fresh() {
  return M.prepare(C.fresh());
}
function storage(data) {
  let raw = JSON.stringify(data);
  return {
    getItem: () => raw,
    setItem: (_k, v) => {
      raw = v;
    },
  };
}
function fixtures() {
  const data = C.fresh();
  data.categories.push({ id: "study", title: "Study", hidden: true });
  data.bookmarks.push(
    {
      id: "study_a",
      title: "Reference",
      categoryId: "study",
      url: "https://study.test/a",
    },
    {
      id: "legacy_a",
      categoryId: "cat_games",
      title: "Old folder",
      type: "folder",
      subBookmarks: [
        {
          id: "game_a",
          title: "My renamed game",
          url: "https://games.test/play/1?utm_source=old",
          launchPreference: "direct",
          favorite: true,
          personalNote: "Keep this",
          subBookmarks: [],
        },
      ],
    },
    {
      id: "legacy_b",
      categoryId: "cat_games",
      title: "Other folder",
      type: "folder",
      subBookmarks: [
        {
          id: "game_b",
          title: "Same game",
          url: "https://games.test/play/1",
          personalNote: "Other note",
        },
        {
          id: "different",
          title: "Different page",
          url: "https://games.test/play/2",
        },
        {
          id: "deep",
          title: "Old deep folder",
          type: "folder",
          subBookmarks: [
            {
              id: "deep_game",
              title: "Deep game",
              url: "https://games.test/deep",
            },
          ],
        },
      ],
    },
  );
  return data;
}
describe("Shared Arcade Collections data and safe migration", function () {
  it("projects legacy game folders without removing a byte of record metadata", function () {
    const data = fixtures(),
      bookmarks = clone(data.bookmarks),
      m = M.prepare(data);
    assert.deepEqual(m.bookmarks, bookmarks);
    assert.deepEqual(data.bookmarks, bookmarks);
    assert.equal(
      M.items(m, "game").filter((e) => e.url.includes("/play/1")).length,
      1,
    );
    assert.equal(M.memberships(m, "game_a").length, 2);
    assert.equal(
      M.items(m, "game").some((e) => e.id === "study_a"),
      false,
    );
    assert.equal(M.entry(m, "game_b").id, "game_a");
    assert.equal(M.entry(m, "game_a").personalNote, "Keep this");
    assert.equal(B.findEntry(m, "game_b").personalNote, "Other note");
  });
  it("is repeat-safe and flattens deep folders without deleting the legacy hierarchy", function () {
    const once = M.prepare(fixtures()),
      twice = M.prepare(once);
    assert.deepEqual(twice, once);
    const deep = once._collections.collections.find(
      (c) => c.id === "legacy_folder_deep",
    );
    assert(deep);
    assert.equal(
      once._collections.collections.find((c) => c.id === deep.parentId)
        .parentId,
      null,
    );
    assert(M.entry(once, "deep_game"));
  });
  it("retains favorite and per-game launch modes across folders, reload and sort", function () {
    let d = M.prepare(fixtures());
    assert.equal(M.preference(d, "game_b").mode, "direct");
    assert(M.preference(d, "game_b").favorite);
    M.setPreference(d, "game_a", { mode: "proxy", newTab: true });
    assert.equal(M.preference(d, "different").mode, "proxy");
    M.setPreference(d, "different", { mode: "direct" });
    d = M.prepare(clone(d));
    assert.equal(M.preference(d, "game_a").mode, "proxy");
    assert.equal(M.preference(d, "different").mode, "direct");
    assert(M.preference(d, "game_b").newTab);
  });
  it("does not merge distinct paths, queries, hash routes or versions by hostname/title", function () {
    for (const [a, b] of [
      ["https://a.test/one", "https://a.test/two"],
      ["https://a.test/?game=1", "https://a.test/?game=2"],
      ["https://a.test/#/one", "https://a.test/#/two"],
    ])
      assert.notEqual(M.urlKey(a), M.urlKey(b));
    assert.equal(
      M.urlKey("https://a.test/?x=1&utm_source=x"),
      M.urlKey("https://a.test/?x=1"),
    );
  });
  it("supports independent item order, multiple membership, moving and removal", function () {
    const d = fresh(),
      a = M.create(d, { title: "A" }),
      b = M.create(d, { title: "B" }),
      ids = M.items(d, "game")
        .slice(0, 3)
        .map((e) => e.id);
    M.add(d, a.id, ids);
    M.add(d, b.id, ids);
    M.reorder(d, a.id, ids[0], 2);
    assert.deepEqual(b.itemIds, ids);
    assert.deepEqual(a.itemIds, [ids[1], ids[2], ids[0]]);
    M.add(d, b.id, [ids[1]], a.id);
    assert(!a.itemIds.includes(ids[1]));
    assert.equal(b.itemIds.filter((id) => id === ids[1]).length, 1);
  });
  it("creates, edits, nests and reorders collections, refusing grandchildren and cycles", function () {
    const d = fresh(),
      a = M.create(d, { title: "A", icon: "☁" }),
      b = M.create(d, { title: "B", parentId: a.id });
    assert.throws(
      () => M.edit(clone(d), a.id, { title: "A", parentId: b.id }),
      /one folder level/,
    );
    assert.throws(
      () => M.create(clone(d), { title: "Third", parentId: b.id }),
      /one folder level/,
    );
    M.edit(d, b.id, { title: "Renamed", icon: "🎮", parentId: a.id });
    assert.equal(b.icon, "🎮");
    M.reorder(d, null, b.id, -1);
    assert.equal(d._collections.collections.at(-2).id, b.id);
    assert.throws(() => M.create(clone(d), { title: " " }), /name/);
  });
  it("deletes a collection non-destructively, keeps unfiled items and does not resurrect deleted migration destinations", function () {
    let d = M.prepare(fixtures()),
      oldCount = M.items(d).length;
    M.deleteCollection(d, "legacy_folder_legacy_a");
    d = M.prepare(d);
    assert.equal(M.items(d).length, oldCount);
    assert(
      !d._collections.collections.some(
        (c) => c.id === "legacy_folder_legacy_a",
      ),
    );
    assert(M.entry(d, "game_a"));
  });
  it("previews and merges shared identities and ambiguous sources without collapsing distinct records", function () {
    const d = M.prepare(fixtures()),
      a = "legacy_folder_legacy_a",
      b = "legacy_folder_legacy_b",
      review = M.conflicts(d, a, b);
    assert(review.conflicts.some((c) => c.relation === "Shared item"));
    const before = M.items(d).length;
    M.merge(d, a, b, { removeSource: true });
    assert.equal(M.items(d).length, before);
    assert(!d._collections.collections.some((c) => c.id === a));
    assert.equal(
      new Set(d._collections.collections.find((c) => c.id === b).itemIds).size,
      review.resultCount,
    );
  });
  it("writes item and new collection in one transaction, fails safely and supports guarded Undo", function () {
    const s = storage(fresh()),
      before = s.getItem();
    const tx = M.transact(s, (d) =>
      M.quickSave(d, {
        title: "Personal game",
        url: "https://personal.test/play",
        kind: "game",
        newCollection: { title: "New", icon: "☁" },
      }),
    );
    assert.notEqual(s.getItem(), before);
    let d = JSON.parse(s.getItem());
    assert.equal(M.memberships(d, tx.result.item.id).length, 1);
    assert(M.items(d, "game").some((e) => e.id === tx.result.item.id));
    M.undo(s, tx);
    assert.equal(s.getItem(), before);
    assert.throws(
      () =>
        M.transact(s, (d) =>
          M.quickSave(d, {
            title: "Bad",
            url: "javascript:alert(1)",
            newCollection: { title: "Not saved" },
          }),
        ),
      /http/,
    );
    assert.equal(s.getItem(), before);
  });
  it("does not duplicate Quick Save memberships or overwrite an existing custom name", function () {
    const d = fresh(),
      a = M.create(d, { title: "A" }),
      e = M.saveItem(d, {
        title: "Custom title",
        url: "https://personal.test/1",
        kind: "game",
      });
    const first = M.quickSave(d, {
      url: e.url,
      title: "Website title",
      collectionId: a.id,
    });
    const second = M.quickSave(d, { id: e.id, collectionId: a.id });
    assert.equal(first.item.id, e.id);
    assert(second.already);
    assert.equal(a.itemIds.length, 1);
    assert.equal(e.title, "Custom title");
  });
  it("storage/quota failures and concurrent changes leave the previous collection untouched", function () {
    const d = fresh(),
      s = storage(d),
      before = s.getItem();
    const denied = {
      getItem: s.getItem,
      setItem: () => {
        throw Error("quota");
      },
    };
    assert.throws(
      () => M.transact(denied, (d) => M.create(d, { title: "A" })),
      /quota/,
    );
    assert.equal(s.getItem(), before);
    assert.throws(
      () =>
        M.transact(s, (d) => {
          M.create(d, { title: "A" });
          s.setItem("x", "external change");
        }),
      /changed/,
    );
    assert.equal(s.getItem(), "external change");
  });
  it("retains malformed/unknown schemas for recovery rather than silently resetting", function () {
    for (const bad of [
      "not JSON",
      null,
      { categories: [], bookmarks: [], _collections: { schema: 2 } },
    ]) {
      if (typeof bad === "string")
        assert.throws(() =>
          M.transact(
            {
              getItem: () => bad,
              setItem: () => assert.fail("must not write"),
            },
            () => {},
          ),
        );
      else assert.throws(() => M.prepare(bad));
    }
    const d = fresh();
    d._collections.collections[0].itemIds.push(7);
    assert.throws(() => M.prepare(d), /Invalid/);
  });
  it("backs up and restores shared memberships, preferences and independent order", function () {
    const d = M.prepare(fixtures()),
      a = M.create(d, { title: "My collection", icon: "☁" });
    M.add(d, a.id, ["game_a", "different"]);
    M.reorder(d, a.id, "different", -1);
    M.setPreference(d, "different", { mode: "direct", favorite: true });
    const exported = clone(d),
      restored = M.importState(C.fresh(), exported, true);
    assert.deepEqual(restored._collections, d._collections);
    const merged = M.importState(clone(d), exported, false);
    assert.deepEqual(merged._collections, d._collections);
  });
  it("retains shared private state during legacy note edits and strips it from public share codes", function () {
    const d = fresh(),
      incoming = clone(d);
    delete incoming._collections;
    B.preserveStoredNotes(incoming, d);
    assert.deepEqual(incoming._collections, d._collections);
    assert.equal(B.publicSharePayload(d)._collections, undefined);
  });
  it("keeps collection contents searchable through the homepage unified search when collapsed or hidden", function () {
    const d = M.prepare(fixtures()),
      c = M.create(d, { title: "Custom Research" });
    M.add(d, c.id, ["study_a"]);
    c.collapsed = true;
    assert(
      V.search(d, "custom research").some((r) => r.entry.id === "study_a"),
    );
    assert(V.search(d, "reference").some((r) => r.entry.id === "study_a"));
  });
  it("preserves personal games, titles, notes, mirror choices and launch preferences through real catalog reconciliation", function () {
    const d = fresh(),
      id = "bm_gn_math",
      e = M.entry(d, id);
    e.title = "My maths";
    e.personalNote = "Keep";
    e.mirrorPreferences = { preferredId: "main" };
    M.setPreference(d, id, { mode: "direct", favorite: true });
    const p = M.saveItem(d, {
        title: "My game",
        url: "https://personal.test/game",
        kind: "game",
      }),
      c = M.create(d, { title: "Mine" });
    M.add(d, c.id, [id, p.id]);
    const old = clone(d._collections),
      release = clone(C.release);
    release.version = "2099.1.1.1";
    release.data.bookmarks.find((e) => e.id === id).url =
      "https://changed.test/";
    release.data.bookmarks = release.data.bookmarks.filter(
      (e) => e.id !== "bm_gamebois",
    );
    release.data.bookmarks.push({
      id: "new_official",
      title: "New official game",
      url: "https://new.test/game",
      categoryId: "cat_games",
      subSectionId: "builtin",
      builtIn: true,
      order: 99,
    });
    const result = C.merge(d, release, "applied");
    assert.equal(M.entry(result, id).title, "My maths");
    assert.equal(M.entry(result, id).personalNote, "Keep");
    assert.deepEqual(result._collections, old);
    assert(M.entry(result, p.id));
    assert.equal(M.preference(result, id).mode, "direct");
    assert.equal(M.entry(result, id).mirrorPreferences.preferredId, "main");
    assert(M.entry(result, "bm_gamebois"));
    assert(
      C.pending(C.merge(d, release, "skipped"), release).changes.length === 0,
    );
  });
  it("scopes Restore Official Order to official positions, retaining memberships and personal games", function () {
    const d = fresh(),
      e = M.saveItem(d, {
        title: "Mine",
        url: "https://personal.test/",
        kind: "game",
      }),
      c = M.create(d, { title: "My order" });
    M.add(d, c.id, ["bm_gamebois", e.id]);
    M.setPreference(d, "bm_gamebois", { mode: "direct", favorite: true });
    const before = clone(d._collections),
      restored = C.restoreOrder(d, {});
    assert.deepEqual(restored._collections, before);
    assert(M.entry(restored, e.id));
    assert.equal(M.preference(restored, "bm_gamebois").mode, "direct");
  });
  it("refuses unsafe schemes and credentials while retaining distinct legitimate endpoints", function () {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "https://user:pass@site.test/",
      "//example.com/",
      "file:///etc/passwd",
    ])
      assert.equal(M.safeUrl(bad), null);
    assert.equal(
      M.safeUrl("https://games.budsin.dev/#/"),
      "https://games.budsin.dev/#/",
    );
  });
});

describe("Collection recovery and shared controls", function () {
  it("keeps moved curated games discoverable and inherits legacy folder launch mode", function () {
    const d = fixtures();
    d.bookmarks.find((e) => e.id === "bm_gamebois").categoryId = "study";
    const folder = d.bookmarks.find((e) => e.id === "legacy_b");
    folder.launchPreference = "direct";
    const saved = M.prepare(d);
    assert(M.items(saved, "game").some((e) => e.id === "bm_gamebois"));
    assert.equal(M.preference(saved, "different").mode, "direct");
  });
  it("lets a user separate an exact-URL legacy version without losing its original note", function () {
    const d = M.prepare(fixtures());
    assert.equal(M.entry(d, "game_b").id, "game_a");
    const e = M.separateAlias(d, "game_b");
    assert.equal(e.personalNote, "Other note");
    assert.equal(M.entry(d, "game_b").id, "game_b");
    assert(M.items(d, "game").some((e) => e.id === "game_b"));
    assert(
      M.memberships(d, "game_b").some((c) => c.id === "legacy_folder_legacy_b"),
    );
    assert.deepEqual(M.prepare(d), d);
  });
  it("syncs mode and favorite choices made through existing bookmark controls", function () {
    const d = fresh();
    M.setPreference(d, "bm_gamebois", { mode: "proxy", favorite: true });
    const e = M.entry(d, "bm_gamebois");
    e.launchPreference = "direct";
    e.favorite = false;
    assert.equal(M.preference(d, e.id).mode, "direct");
    assert.equal(M.preference(d, e.id).favorite, false);
  });
  it("rejects duplicate collection names only in the same parent", function () {
    const d = fresh(),
      p = M.create(d, { title: "Parent" });
    M.create(d, { title: "Unique" });
    assert.throws(() => M.create(d, { title: "UNIQUE" }), /already exists/);
    assert(M.create(d, { title: "Unique", parentId: p.id }));
  });
  it("atomically saves collection name/icon edits with Quick Save and rejects stale destination edits", function () {
    const s = storage(fresh());
    const tx = M.transact(s, (d) => {
      const c = M.create(d, { title: "Before" });
      return M.quickSave(d, {
        title: "Page",
        url: "https://personal.test/atomic",
        collectionId: c.id,
        collectionEdit: {
          title: "After",
          icon: "☁",
          expected: JSON.stringify(c),
        },
      });
    });
    assert.equal(tx.result.collection.title, "After");
    assert.equal(tx.result.collection.icon, "☁");
    const before = s.getItem();
    assert.throws(
      () =>
        M.transact(s, (d) =>
          M.quickSave(d, {
            id: tx.result.item.id,
            collectionId: tx.result.collection.id,
            collectionEdit: { title: "Stale", icon: "x", expected: "old" },
          }),
        ),
      /changed/,
    );
    assert.equal(s.getItem(), before);
  });
});

describe("Explicit default layout restoration", function () {
  it("keeps personal names, links, icons, descendants, collections and catalog decisions", function () {
    const d = fresh(),
      e = M.entry(d, "bm_gn_math");
    e.title = "My math";
    e.url = "https://custom-math.test/";
    e.icon = "☁";
    e.personalNote = "Keep my note";
    M.setPreference(d, e.id, { mode: "direct", favorite: true });
    const c = M.create(d, { title: "My custom shelf" });
    M.add(d, c.id, [e.id]);
    d.categories[0].subSections.push({
      id: "custom_section",
      title: "My section",
    });
    const parent = M.entry(d, "bm_individual_games");
    parent.subBookmarks.push({
      id: "my_nested",
      title: "Nested personal game",
      url: "https://personal.test/nested",
    });
    d._catalog.decisions.kept = "skipped";
    const restored = M.restoreDefaults(d, C.fresh());
    assert.equal(M.entry(restored, e.id).title, e.title);
    assert.equal(M.entry(restored, e.id).url, e.url);
    assert.equal(M.entry(restored, e.id).icon, e.icon);
    assert.equal(M.entry(restored, e.id).personalNote, e.personalNote);
    assert.equal(M.preference(restored, e.id).mode, "direct");
    assert(M.preference(restored, e.id).favorite);
    assert(M.entry(restored, "my_nested"));
    assert(
      restored.categories[0].subSections.some((s) => s.id === "custom_section"),
    );
    assert.deepEqual(
      restored._collections.collections.find((x) => x.id === c.id),
      c,
    );
    assert.equal(restored._catalog.decisions.kept, "skipped");
  });
});
