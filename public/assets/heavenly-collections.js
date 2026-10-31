/* Collections are relationships over the existing catalog, never a second catalog. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(
      require("./heavenly-navigation"),
      require("./heavenly-bookmarks"),
    );
  else
    root.HeavenlyCollections = factory(
      root.HeavenlyNavigation,
      root.HeavenlyBookmarks,
    );
})(typeof self !== "undefined" ? self : this, function (navigation, bookmarks) {
  "use strict";
  var key = "heavenly_bookmarks";
  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }
  function dict(x) {
    return x && typeof x === "object" && !Array.isArray(x);
  }
  function safeUrl(value) {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;
    try {
      var u = new URL(value);
      return !u.username && !u.password ? u.href : null;
    } catch (e) {
      return null;
    }
  }
  function urlKey(value) {
    value = safeUrl(value);
    if (!value) return "";
    var u = new URL(value);
    Array.from(u.searchParams.keys()).forEach(function (k) {
      if (/^utm_/i.test(k) || /^(fbclid|gclid)$/i.test(k))
        u.searchParams.delete(k);
    });
    return u.href;
  }
  function uid(prefix) {
    return (
      prefix +
      "_" +
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + "_" + Math.random().toString(36).slice(2))
    );
  }
  function title(value) {
    value = String(value || "").trim();
    if (!value || value.length > 160)
      throw new Error("Enter a name of 1–160 characters.");
    return value;
  }
  function icon(value) {
    value = String(value || "").trim();
    if (value.length > 80) throw new Error("Use a short icon or emoji.");
    return value || "✦";
  }
  function index(data) {
    var map = Object.create(null);
    bookmarks.visit(data, function (e) {
      map[e.id] = e;
    });
    return map;
  }
  function canonical(data, id) {
    var aliases = data._collections.aliases;
    return Object.prototype.hasOwnProperty.call(aliases, id) ? aliases[id] : id;
  }
  function entry(data, id) {
    return index(data)[canonical(data, id)] || null;
  }
  function collection(data, id) {
    var c = data._collections.collections.find(function (c) {
      return c.id === id;
    });
    if (!c) throw new Error("That collection no longer exists.");
    return c;
  }
  function validate(data) {
    var s = data._collections;
    if (
      !dict(s) ||
      s.schema !== 1 ||
      !Array.isArray(s.collections) ||
      !dict(s.preferences) ||
      !dict(s.aliases) ||
      !Array.isArray(s.gameIds) ||
      !Array.isArray(s.seen)
    )
      throw new Error(
        "Collections data needs recovery. Export a backup before editing.",
      );
    if (
      s.gameIds.some(function (id) {
        return typeof id !== "string";
      }) ||
      s.seen.some(function (id) {
        return typeof id !== "string";
      })
    )
      throw new Error("Invalid saved identities.");
    Object.keys(s.preferences).forEach(function (id) {
      var p = s.preferences[id];
      if (
        !dict(p) ||
        (p.mode !== undefined && !["direct", "proxy"].includes(p.mode)) ||
        (p.favorite !== undefined && typeof p.favorite !== "boolean") ||
        (p.newTab !== undefined && typeof p.newTab !== "boolean")
      )
        throw new Error("Invalid item preferences.");
    });
    var ids = new Set();
    s.collections.forEach(function (c) {
      if (
        !dict(c) ||
        typeof c.id !== "string" ||
        !c.id ||
        ids.has(c.id) ||
        typeof c.title !== "string" ||
        !Array.isArray(c.itemIds) ||
        c.itemIds.some(function (id) {
          return typeof id !== "string";
        })
      )
        throw new Error("Invalid collection or repeated identity.");
      ids.add(c.id);
    });
    s.collections.forEach(function (c) {
      if (c.parentId) {
        var p = s.collections.find(function (p) {
          return p.id === c.parentId;
        });
        if (!p || p.parentId || p === c)
          throw new Error("Collections allow only one folder level.");
      }
      if (new Set(c.itemIds).size !== c.itemIds.length)
        throw new Error("Repeated collection membership.");
    });
    Object.keys(s.aliases).forEach(function (id) {
      if (typeof s.aliases[id] !== "string" || s.aliases[s.aliases[id]])
        throw new Error("Invalid item alias.");
    });
    return data;
  }
  function prepare(input) {
    var data = clone(input);
    if (!Array.isArray(data.bookmarks) || !Array.isArray(data.categories))
      throw new Error("Invalid bookmark data.");
    if (data._collections !== undefined) validate(data);
    else
      data._collections = {
        schema: 1,
        collections: [],
        preferences: {},
        aliases: {},
        gameIds: [],
        seen: [],
        migration: {
          version: 1,
          policy:
            "Legacy records retained; nested folders projected at one level.",
          sources: {},
        },
      };
    var s = data._collections,
      map = index(data),
      known = new Map();
    // Existing IDs are authoritative. Exact URLs can share membership identity;
    // all original records and conflicting metadata remain in the legacy tree.
    Object.keys(map).forEach(function (id) {
      var e = map[id],
        k = urlKey(e.url);
      if (k && !known.has(k) && !s.aliases[id]) known.set(k, id);
    });
    var catMap = new Map(
      data.categories.map(function (c) {
        return [c.id, c];
      }),
    );
    function officialGame(id) {
      var accepted = (data._catalog && data._catalog.accepted) || {},
        r = accepted["bookmark:" + id],
        guard = 0;
      while (r && r.parent && guard++ < 100)
        r = accepted["bookmark:" + r.parent];
      return !!(r && r.value.categoryId === "cat_games");
    }
    var seen = new Set(s.seen),
      games = new Set(s.gameIds);
    function ensure(id, name, parent) {
      var c = s.collections.find(function (c) {
        return c.id === id;
      });
      if (!c) {
        c = {
          id: id,
          title: name || "Saved links",
          icon: "✦",
          parentId: parent || null,
          itemIds: [],
          origin: "legacy",
        };
        s.collections.push(c);
      }
      return c;
    }
    function walk(items, cat, parentFolder, isGame, isMirror, inheritedMode) {
      (items || [])
        .slice()
        .sort(function (a, b) {
          return (Number(a.order) || 0) - (Number(b.order) || 0);
        })
        .forEach(function (e) {
          if (!e || typeof e.id !== "string") return;
          var game = isGame || e.kind === "game" || officialGame(e.id),
            k = urlKey(e.url),
            first = !seen.has(e.id),
            folder =
              !!e.subBookmarks?.length ||
              e.type === "folder" ||
              e.type === "folder_bookmark";
          if (first) {
            if (k && !isMirror) {
              var existing = known.get(k);
              if (existing && existing !== e.id) s.aliases[e.id] = existing;
            }
            var id = canonical(data, e.id);
            if (game && !isMirror) games.add(id);
            if (k && !isMirror) {
              var target = parentFolder || "legacy_category_" + cat.id;
              var c = ensure(
                target,
                parentFolder
                  ? (map[parentFolder.slice(14)] || {}).title
                  : cat.title,
                null,
              );
              if (!c.itemIds.includes(id)) c.itemIds.push(id);
              if (dict(s.migration) && dict(s.migration.sources))
                Object.defineProperty(s.migration.sources, e.id, {
                  value: { collectionId: target, canonicalId: id },
                  writable: true,
                  enumerable: true,
                  configurable: true,
                });
            }
            if (
              (e.favorite === true ||
                e.launchPreference === "direct" ||
                e.launchPreference === "proxy" ||
                inheritedMode) &&
              !Object.prototype.hasOwnProperty.call(s.preferences, id)
            )
              s.preferences[id] = {
                favorite: e.favorite === true,
                mode:
                  e.launchPreference === "direct"
                    ? "direct"
                    : e.launchPreference === "proxy"
                      ? "proxy"
                      : inheritedMode || "proxy",
              };
            seen.add(e.id);
          }
          if (folder) {
            var folderId = parentFolder;
            if (
              first &&
              !isMirror &&
              (e.type === "folder" || e.type === "folder_bookmark")
            ) {
              var parent = ensure("legacy_category_" + cat.id, cat.title, null);
              // Deeper historical folders are siblings. Their full path is retained
              // in provenance and the unmodified legacy record for recovery.
              folderId = "legacy_folder_" + e.id;
              ensure(folderId, e.title, parent.id);
            } else if (
              s.collections.some(function (c) {
                return c.id === "legacy_folder_" + e.id;
              })
            )
              folderId = "legacy_folder_" + e.id;
            walk(
              e.subBookmarks,
              cat,
              folderId,
              game,
              isMirror || (e.type !== "folder" && e.type !== "folder_bookmark"),
              ["direct", "proxy"].includes(e.launchPreference)
                ? e.launchPreference
                : inheritedMode,
            );
          }
        });
    }
    data.bookmarks.forEach(function (e) {
      var cat = catMap.get(e.categoryId) || { id: "unfiled", title: "Unfiled" };
      walk(
        [e],
        cat,
        null,
        e.categoryId === "cat_games" || /^games$/i.test(cat.title),
        false,
      );
    });
    s.seen = Array.from(seen);
    s.gameIds = Array.from(games);
    return validate(data);
  }
  function items(data, kind) {
    var map = index(data),
      seen = new Set(),
      games = new Set(data._collections.gameIds);
    return Object.keys(map)
      .map(function (id) {
        return map[id];
      })
      .filter(function (e) {
        var id = canonical(data, e.id);
        if (
          seen.has(id) ||
          id !== e.id ||
          e.type === "folder" ||
          (!safeUrl(e.url) && !games.has(id))
        )
          return false;
        seen.add(id);
        return kind !== "game" || games.has(id);
      });
  }
  function preference(data, id) {
    id = canonical(data, id);
    var e = entry(data, id) || {},
      p = Object.assign(
        { favorite: false, mode: "proxy", newTab: false },
        Object.prototype.hasOwnProperty.call(data._collections.preferences, id)
          ? data._collections.preferences[id]
          : {},
      );
    if (typeof e.favorite === "boolean") p.favorite = e.favorite;
    if (["direct", "proxy"].includes(e.launchPreference))
      p.mode = e.launchPreference;
    return p;
  }
  function setPreference(data, id, patch) {
    id = canonical(data, id);
    var e = entry(data, id);
    if (!e) throw new Error("Item no longer exists.");
    var next = Object.assign({}, preference(data, id), patch);
    if (!["direct", "proxy"].includes(next.mode))
      throw new Error("Choose Direct or Proxy.");
    next.favorite = !!next.favorite;
    next.newTab = !!next.newTab;
    Object.defineProperty(data._collections.preferences, id, {
      value: next,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    e.favorite = next.favorite;
    e.launchPreference = next.mode;
    return next;
  }
  function create(data, values) {
    if (
      data._collections.collections.some(function (c) {
        return (
          c.title.toLowerCase() === title(values.title).toLowerCase() &&
          (c.parentId || null) === (values.parentId || null)
        );
      })
    )
      throw new Error(
        "A collection with that name already exists here. Choose another name or placement.",
      );
    var c = {
      id: values.id || uid("collection"),
      title: title(values.title),
      icon: icon(values.icon),
      parentId: values.parentId || null,
      itemIds: [],
      origin: "personal",
    };
    data._collections.collections.push(c);
    validate(data);
    return c;
  }
  function edit(data, id, values) {
    var c = collection(data, id);
    if (
      data._collections.collections.some(function (other) {
        return (
          other.id !== id &&
          other.title.toLowerCase() === title(values.title).toLowerCase() &&
          (other.parentId || null) === (values.parentId || null)
        );
      })
    )
      throw new Error(
        "A collection with that name already exists here. Choose another name or placement.",
      );
    c.title = title(values.title);
    c.icon = icon(values.icon);
    c.parentId = values.parentId || null;
    validate(data);
    return c;
  }
  function memberships(data, id) {
    id = canonical(data, id);
    return data._collections.collections.filter(function (c) {
      return c.itemIds.includes(id);
    });
  }
  function add(data, cid, ids, from) {
    var c = collection(data, cid);
    ids.forEach(function (id) {
      id = canonical(data, id);
      if (!entry(data, id)) throw new Error("Item no longer exists.");
      if (!c.itemIds.includes(id)) c.itemIds.push(id);
    });
    if (from && from !== cid) remove(data, from, ids);
  }
  function remove(data, cid, ids) {
    var c = collection(data, cid),
      set = new Set(
        ids.map(function (id) {
          return canonical(data, id);
        }),
      );
    c.itemIds = c.itemIds.filter(function (id) {
      return !set.has(id);
    });
  }
  function deleteCollection(data, id) {
    var s = data._collections,
      c = collection(data, id);
    s.collections = s.collections.filter(function (e) {
      return e !== c;
    });
    s.collections.forEach(function (e) {
      if (e.parentId === id) e.parentId = null;
    });
  }
  function reorder(data, cid, id, delta) {
    var list = cid
      ? collection(data, cid).itemIds
      : data._collections.collections;
    var at = cid
        ? list.indexOf(id)
        : list.findIndex(function (c) {
            return c.id === id;
          }),
      to = Math.max(0, Math.min(list.length - 1, at + delta));
    if (at < 0) throw new Error("Item no longer exists.");
    list.splice(to, 0, list.splice(at, 1)[0]);
  }
  function conflicts(data, left, right) {
    var a = collection(data, left),
      b = collection(data, right),
      map = index(data),
      out = [];
    a.itemIds.forEach(function (id) {
      var x = map[id];
      b.itemIds.forEach(function (other) {
        var y = map[other];
        if (!x || !y) return;
        var relation =
          id === other
            ? "Shared item"
            : urlKey(x.url) === urlKey(y.url)
              ? "Exact URL; separate metadata"
              : safeUrl(x.url) &&
                  safeUrl(y.url) &&
                  new URL(x.url).hostname === new URL(y.url).hostname
                ? "Same domain, different page"
                : x.title.toLowerCase() === y.title.toLowerCase()
                  ? "Same title, alternate source"
                  : "Separate items";
        if (relation !== "Separate items")
          out.push({
            left: id,
            right: other,
            relation: relation,
            leftTitle: x.title,
            rightTitle: y.title,
            leftUrl: x.url,
            rightUrl: y.url,
            leftNote: x.personalNote || "",
            rightNote: y.personalNote || "",
            leftPreference: preference(data, id),
            rightPreference: preference(data, other),
            leftIcon: x.icon || "",
            rightIcon: y.icon || "",
            leftMirrors: (x.subBookmarks || []).map(function (m) {
              return { title: m.title, url: m.url };
            }),
            rightMirrors: (y.subBookmarks || []).map(function (m) {
              return { title: m.title, url: m.url };
            }),
            leftCollections: memberships(data, id).map(function (c) {
              return c.title;
            }),
            rightCollections: memberships(data, other).map(function (c) {
              return c.title;
            }),
          });
      });
    });
    return {
      source: a.title,
      destination: b.title,
      sourceCount: a.itemIds.length,
      destinationCount: b.itemIds.length,
      resultCount: new Set(b.itemIds.concat(a.itemIds)).size,
      conflicts: out,
    };
  }
  function merge(data, source, destination, options) {
    if (source === destination)
      throw new Error("Choose a different destination.");
    var a = collection(data, source),
      b = collection(data, destination);
    b.itemIds = Array.from(
      new Set(
        options?.sourceFirst
          ? a.itemIds.concat(b.itemIds)
          : b.itemIds.concat(a.itemIds),
      ),
    );
    if (options?.removeSource) deleteCollection(data, source);
    return b;
  }
  function saveItem(data, values) {
    var e = values.id && entry(data, values.id),
      url = safeUrl(values.url);
    if (!url)
      throw new Error(
        "Enter a complete http or https URL without credentials.",
      );
    if (e && e.builtIn)
      throw new Error("Edit curated content through catalog review.");
    if (!e) {
      e = {
        id: uid("personal"),
        categoryId:
          values.kind === "game"
            ? "cat_games"
            : data.categories[0]?.id || "cat_games",
        subSectionId: "user",
        type: "bookmark",
        builtIn: false,
        order: data.bookmarks.length,
      };
      data.bookmarks.push(e);
    }
    e.title = title(values.title);
    e.url = url;
    e.description = String(values.description || "").slice(0, 2000);
    if (values.icon !== e.icon) {
      var itemIcon = String(values.icon || "").trim();
      if (itemIcon.length > 2048)
        throw new Error("Choose a shorter icon URL or an emoji.");
      e.icon = itemIcon || "✦";
    }
    e.kind = values.kind === "game" ? "game" : "bookmark";
    if (e.kind === "game" && !data._collections.gameIds.includes(e.id))
      data._collections.gameIds.push(e.id);
    if (!data._collections.seen.includes(e.id))
      data._collections.seen.push(e.id);
    if (values.mode) setPreference(data, e.id, { mode: values.mode });
    return e;
  }
  function quickSave(data, values) {
    if (!values.id && !safeUrl(values.url))
      throw new Error(
        "Enter a complete http or https URL without credentials.",
      );
    var e = values.id && entry(data, values.id),
      match =
        !e &&
        items(data).find(function (e) {
          return urlKey(e.url) === urlKey(values.url);
        });
    if (match) e = match;
    if (!e) e = saveItem(data, values);
    var c = values.newCollection
      ? create(data, values.newCollection)
      : collection(data, values.collectionId);
    if (!values.newCollection && values.collectionEdit) {
      if (
        values.collectionEdit.expected &&
        JSON.stringify(c) !== values.collectionEdit.expected
      )
        throw new Error(
          "The destination changed. Cancel and reopen Quick Save to review it.",
        );
      c = edit(data, c.id, {
        title: values.collectionEdit.title,
        icon: values.collectionEdit.icon,
        parentId: c.parentId,
      });
    }
    var already = c.itemIds.includes(e.id);
    add(data, c.id, [e.id], values.moveFrom);
    return { item: e, collection: c, already: already };
  }
  function separateAlias(data, id) {
    var s = data._collections,
      primary = s.aliases[id],
      original = index(data)[id];
    if (!Object.prototype.hasOwnProperty.call(s.aliases, id) || !original)
      throw new Error("This legacy version is no longer linked.");
    delete s.aliases[id];
    if (s.gameIds.includes(primary) && !s.gameIds.includes(id))
      s.gameIds.push(id);
    var source = s.migration?.sources?.[id],
      c =
        source &&
        s.collections.find(function (c) {
          return c.id === source.collectionId;
        });
    if (c && !c.itemIds.includes(id)) c.itemIds.push(id);
    setPreference(data, id, {
      mode: ["direct", "proxy"].includes(original.launchPreference)
        ? original.launchPreference
        : preference(data, primary).mode,
      favorite: original.favorite === true,
    });
    return original;
  }
  // Explicit layout restoration still keeps the personal layer and review history.
  function restoreDefaults(current, defaults) {
    var result = clone(defaults),
      accepted = current._catalog?.accepted || {};
    current.categories.forEach(function (old) {
      var next = result.categories.find(function (c) {
        return c.id === old.id;
      });
      if (!next) {
        result.categories.push(clone(old));
        return;
      }
      (old.subSections || []).forEach(function (s) {
        if (
          !(next.subSections || []).some(function (n) {
            return n.id === s.id;
          })
        ) {
          next.subSections = next.subSections || [];
          next.subSections.push(clone(s));
        }
      });
      var base = accepted["category:" + old.id]?.value;
      ["title", "icon"].forEach(function (field) {
        if (
          old[field] !== undefined &&
          (!base || JSON.stringify(old[field]) !== JSON.stringify(base[field]))
        )
          next[field] = clone(old[field]);
      });
    });
    var present = index(result);
    function visit(items, parent) {
      (items || []).forEach(function (old) {
        var next = present[old.id];
        if (!next) {
          var copy = clone(old),
            target = parent && present[parent];
          if (target) {
            target.subBookmarks = target.subBookmarks || [];
            target.subBookmarks.push(copy);
          } else result.bookmarks.push(copy);
          bookmarks.visit({ bookmarks: [copy] }, function (e) {
            present[e.id] = e;
          });
          return;
        }
        var base = accepted["bookmark:" + old.id]?.value;
        Object.keys(old).forEach(function (field) {
          if (
            [
              "order",
              "categoryId",
              "subSectionId",
              "hidden",
              "subBookmarks",
              "builtIn",
            ].includes(field)
          )
            return;
          if (
            ["title", "url", "icon", "type"].includes(field) &&
            base &&
            JSON.stringify(old[field]) === JSON.stringify(base[field])
          )
            return;
          next[field] = clone(old[field]);
        });
        visit(old.subBookmarks, old.id);
      });
    }
    visit(current.bookmarks, null);
    if (current._catalog) result._catalog = clone(current._catalog);
    if (current._collections) result._collections = clone(current._collections);
    return prepare(result);
  }
  function importState(data, source, complete) {
    if (!source?._collections) return prepare(data);
    var incoming = prepare(source)._collections;
    if (complete) {
      data._collections = clone(incoming);
      return prepare(data);
    }
    data = prepare(data);
    var s = data._collections,
      map = index(data);
    incoming.collections.forEach(function (c) {
      var saved = s.collections.find(function (x) {
        return x.id === c.id;
      });
      if (!saved) s.collections.push(clone(c));
      else saved.itemIds = Array.from(new Set(saved.itemIds.concat(c.itemIds)));
    });
    Object.keys(incoming.preferences).forEach(function (id) {
      if (map[id] && !Object.prototype.hasOwnProperty.call(s.preferences, id))
        s.preferences[id] = clone(incoming.preferences[id]);
    });
    s.gameIds = Array.from(new Set(s.gameIds.concat(incoming.gameIds)));
    s.seen = Array.from(new Set(s.seen.concat(incoming.seen)));
    return validate(data);
  }
  function transact(storage, change) {
    var raw = storage.getItem(key);
    if (!raw) throw new Error("Open Heavenly first to initialize bookmarks.");
    var data = prepare(JSON.parse(raw)),
      result = change(data);
    validate(data);
    if (storage.getItem(key) !== raw)
      throw new Error("Saved data changed. Review and retry.");
    var next = JSON.stringify(data);
    storage.setItem(key, next);
    return { data: data, result: result, before: raw, after: next };
  }
  function undo(storage, transaction) {
    if (storage.getItem(key) !== transaction.after)
      throw new Error(
        "Other changes were saved. Export a backup before restoring an older arrangement.",
      );
    storage.setItem(key, transaction.before);
  }
  return {
    key: key,
    safeUrl: safeUrl,
    urlKey: urlKey,
    prepare: prepare,
    validate: validate,
    index: index,
    canonical: canonical,
    entry: entry,
    items: items,
    preference: preference,
    setPreference: setPreference,
    create: create,
    edit: edit,
    memberships: memberships,
    add: add,
    remove: remove,
    deleteCollection: deleteCollection,
    reorder: reorder,
    conflicts: conflicts,
    merge: merge,
    saveItem: saveItem,
    quickSave: quickSave,
    separateAlias: separateAlias,
    restoreDefaults: restoreDefaults,
    importState: importState,
    transact: transact,
    undo: undo,
  };
});
