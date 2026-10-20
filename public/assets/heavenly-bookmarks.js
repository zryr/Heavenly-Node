(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./heavenly-navigation'));
  else root.HeavenlyBookmarks = factory(root.HeavenlyNavigation);
})(typeof window !== 'undefined' ? window : this, function (navigation) {
  'use strict';
  function supportsQuickSave(bookmark) {
    return !!bookmark && bookmark.id !== 'bm_ng' &&
      (bookmark.type === 'folder' || bookmark.type === 'folder_bookmark' || navigation.isCoolmathUrl(navigation.bookmarkKey(bookmark.url)));
  }
  function findQuickSaveBookmark(data, value) {
    var current;
    try { current = new URL(navigation.bookmarkKey(value)); } catch (e) { return null; }
    var best = null, score = -1;
    (data.bookmarks || []).forEach(function (bookmark) {
      if (bookmark.hidden || !supportsQuickSave(bookmark) || !bookmark.url) return;
      try {
        var target = new URL(navigation.bookmarkKey(bookmark.url));
        if (current.hostname !== target.hostname && !current.hostname.endsWith('.' + target.hostname)) return;
        var pathMatches = current.pathname === target.pathname || current.pathname.indexOf(target.pathname.replace(/\/$/, '') + '/') === 0;
        if (navigation.isCoolmathUrl(target.href) && !pathMatches) return;
        var rank = current.href === target.href ? 100000 : pathMatches ? target.pathname.length : 0;
        if (rank > score) { best = bookmark; score = rank; }
      } catch (e) {}
    });
    // Choose the corresponding bookmark first; its disabled setting must not fall through to another owner.
    return best;
  }
  function setQuickSavePreference(storage, id, enabled) {
    var data = JSON.parse(storage.getItem('heavenly_bookmarks') || 'null');
    var bookmark = data && (data.bookmarks || []).find(function (entry) { return entry.id === id; });
    if (!supportsQuickSave(bookmark)) throw new Error('This bookmark does not support Quick Save.');
    bookmark.disableQuickSaveWidget = !enabled;
    storage.setItem('heavenly_bookmarks', JSON.stringify(data));
    return bookmark;
  }
  function visit(data, callback) {
    function walk(entries) {
      if (!Array.isArray(entries)) return;
      entries.forEach(function (entry) { if (!entry || typeof entry !== 'object') return; callback(entry); walk(entry.subBookmarks); });
    }
    walk(data && data.bookmarks);
  }
  function findEntry(data, id) {
    var found = null;
    visit(data, function (entry) { if (!found && entry.id === id) found = entry; });
    return found;
  }
  function noteFor(bookmark) {
    return bookmark && typeof bookmark.personalNote === 'string' ? bookmark.personalNote.slice(0, 4000) : '';
  }
  function saveNote(storage, id, text) {
    var data = JSON.parse(storage.getItem('heavenly_bookmarks') || 'null');
    var bookmark = data && findEntry(data, id);
    if (!bookmark) throw new Error('This bookmark no longer exists.');
    text = String(text).trim().slice(0, 4000);
    if (text) bookmark.personalNote = text;
    else delete bookmark.personalNote;
    storage.setItem('heavenly_bookmarks', JSON.stringify(data));
    return text;
  }
  function importBookmark(incoming, previous) {
    var copy = JSON.parse(JSON.stringify(incoming));
    if (!Object.prototype.hasOwnProperty.call(copy, 'personalNote') && noteFor(previous)) copy.personalNote = noteFor(previous);
    if (typeof copy.personalNote !== 'string') delete copy.personalNote;
    else copy.personalNote = copy.personalNote.slice(0, 4000);
    if (Array.isArray(copy.subBookmarks)) copy.subBookmarks = copy.subBookmarks.map(function (child) {
      var old = previous && (previous.subBookmarks || []).find(function (entry) { return entry.id === child.id; });
      return importBookmark(child, old);
    });
    return copy;
  }
  function preserveStoredNotes(incoming, saved) {
    visit(incoming, function (entry) {
      var previous = findEntry(saved, entry.id);
      if (!previous) return;
      var note = noteFor(previous);
      if (note) entry.personalNote = note;
      else delete entry.personalNote;
    });
    return incoming;
  }
  function mirrorState(bookmark, url, title, brokenMap) {
    var original = { title: bookmark ? bookmark.title : title, url: bookmark && bookmark.url || url, source: 'main' };
    var seen = Object.create(null);
    var entries = [original].concat(bookmark && bookmark.subBookmarks || []).filter(function (entry) {
      var key = navigation.bookmarkKey(entry.url);
      if (!key || seen[key]) return false;
      seen[key] = true; return true;
    }).map(function (entry) {
      var copy = Object.assign({}, entry);
      copy.isBroken = !!brokenMap[entry.url];
      return copy;
    });
    var primary = entries[0];
    if (primary && primary.isBroken) primary = entries.slice(1).find(function (entry) { return entry.isUser && !entry.isBroken; }) || entries.slice(1).find(function (entry) { return !entry.isBroken; }) || primary;
    if (primary) primary = Object.assign({}, primary, { isPromoted: primary !== entries[0] });
    return { primary: primary, entries: entries, broken: entries.filter(function (entry) { return entry.isBroken; }) };
  }
  function shareableData(data, defaults) {
    // Catalog identity also covers older presets with builtIn:false.
    var officialEntries = new Map();
    visit(defaults || {}, function (entry) { officialEntries.set(entry.id, entry); });
    function project(entry, categoryId, defaultParent, fromOfficial) {
      if (!entry || entry.hidden) return [];
      var known = officialEntries.get(entry.id);
      var defaultChildren = defaultParent && defaultParent.subBookmarks || [];
      var officialChild = fromOfficial && !entry.isUser && defaultChildren.some(function (item) {
        return item.id === entry.id || navigation.bookmarkKey(item.url) === navigation.bookmarkKey(entry.url);
      });
      var official = entry.builtIn === true || officialEntries.has(entry.id) || officialChild;
      var children = Array.isArray(entry.subBookmarks) ? entry.subBookmarks : [];
      if (official) {
        // Keep user-owned descendants as independent records; never copy the parent.
        return children.reduce(function (all, child) { return all.concat(project(child, categoryId, known || entry, true)); }, []);
      }
      var copy = Object.assign({}, entry);
      copy.subBookmarks = children.reduce(function (all, child) { return all.concat(project(child, categoryId, null, false)); }, []);
      if (fromOfficial) {
        copy.categoryId = categoryId; copy.subSectionId = 'user';
        copy.type = copy.type || 'bookmark'; copy.builtIn = false;
      }
      return [copy];
    }
    var bookmarks = (data.bookmarks || []).reduce(function (all, entry) { return all.concat(project(entry, entry.categoryId, null, false)); }, []);
    var categories = (data.categories || []).filter(function (category) { return bookmarks.some(function (entry) { return entry.categoryId === category.id; }); });
    return Object.assign({}, data, { categories: categories, bookmarks: bookmarks });
  }
  function publicSharePayload(payload, includeNotes) {
    var selected = new WeakSet();
    if (includeNotes === true) visit(payload, function (entry) { selected.add(entry); });
    return JSON.parse(JSON.stringify(payload, function (key, value) {
      if (key === 'personalNote') return includeNotes === true && selected.has(this) && typeof value === 'string' ? value.slice(0, 4000) : undefined;
      return value;
    }));
  }
  function mergeSharedNotes(data, incoming, replace) {
    visit(incoming, function (entry) {
      if (typeof entry.id !== 'string' || !entry.id) return;
      var existing = findEntry(data, entry.id), note = noteFor(entry);
      if (existing && note && (replace || !noteFor(existing))) existing.personalNote = note;
    });
    return data;
  }
  return { shareableData: shareableData, mirrorState: mirrorState, mergeSharedNotes: mergeSharedNotes, supportsQuickSave: supportsQuickSave, findQuickSaveBookmark: findQuickSaveBookmark, setQuickSavePreference: setQuickSavePreference,
    preserveStoredNotes: preserveStoredNotes, findEntry: findEntry, noteFor: noteFor, saveNote: saveNote, importBookmark: importBookmark, publicSharePayload: publicSharePayload };
});
