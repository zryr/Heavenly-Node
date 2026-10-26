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
    if (!Object.prototype.hasOwnProperty.call(copy, 'mirrorPreferences') && previous && previous.mirrorPreferences) copy.mirrorPreferences = JSON.parse(JSON.stringify(previous.mirrorPreferences));
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
      if (previous.mirrorPreferences) entry.mirrorPreferences = JSON.parse(JSON.stringify(previous.mirrorPreferences));
      var note = noteFor(previous);
      if (note) entry.personalNote = note;
      else delete entry.personalNote;
    });
    return incoming;
  }
  // Local choices refer to identities, never rewrite catalog destinations or child order.
  function mirrorIdentity(entry) {
    return entry.source === 'main' ? 'main' : entry.id ? 'id:' + entry.id : 'url:' + navigation.bookmarkKey(entry.url);
  }
  function eligibleMirror(entry) {
    var key = navigation.bookmarkKey(entry.url);
    if (!key || entry.hidden || entry.type === 'folder' || entry.mirrorEligible === false) return false;
    // The catalog intentionally includes asset-style destinations. Eligibility is explicit, not guessed from a suffix.
    return true;
  }
  function mirrorState(bookmark, url, title, brokenMap) {
    brokenMap = brokenMap || {};
    var original = { title: bookmark ? bookmark.title : title, url: bookmark && bookmark.url || url, source: 'main', mirrorEligible: bookmark && bookmark.mirrorEligible, catalogPreviousUrls: bookmark && bookmark.catalogPreviousUrls };
    var seen = Object.create(null), brokenKeys = Object.create(null);
    for (var u in brokenMap) { if (brokenMap[u]) brokenKeys[navigation.bookmarkKey(u)] = true; }
    var entries = [original].concat(bookmark && bookmark.subBookmarks || []).filter(function (entry) {
      var key = navigation.bookmarkKey(entry.url);
      if (!key || seen[key]) return false;
      seen[key] = true; return true;
    }).map(function (entry) {
      return Object.assign({}, entry, { identity: mirrorIdentity(entry), eligible: eligibleMirror(entry), isBroken: !!brokenKeys[navigation.bookmarkKey(entry.url)] || (entry.catalogPreviousUrls || []).some(function(url){return !!brokenKeys[navigation.bookmarkKey(url)];}) });
    });
    var saved = bookmark && bookmark.mirrorPreferences || {};
    var eligible = entries.filter(function (entry) { return entry.eligible; });
    // Keep the legacy default priority for collections without an explicit order.
    var defaults = eligible.filter(function (e) { return e.source === 'main'; }).concat(eligible.filter(function (e) { return e.isUser; }), eligible.filter(function (e) { return e.source !== 'main' && !e.isUser; }));
    var order = Array.isArray(saved.order) ? saved.order : [];
    var ordered = defaults.slice().sort(function (a, b) {
      var ai = order.indexOf(a.identity), bi = order.indexOf(b.identity);
      return (ai < 0 ? order.length + defaults.indexOf(a) : ai) - (bi < 0 ? order.length + defaults.indexOf(b) : bi);
    });
    var preferred = eligible.find(function (e) { return e.identity === saved.preferred; }) || eligible.find(function (e) { return e.source === 'main'; });
    var previous = eligible.find(function (e) { return e.identity === saved.active; });
    var available = ordered.filter(function (e) { return !e.isBroken; });
    var active = previous && (!previous.isBroken || saved.activeBroken === true) ? previous : preferred && !preferred.isBroken ? preferred : available[0] || previous || preferred || entries[0];
    var changed = !!active && active.identity !== (saved.active || 'main');
    var promoted = changed && !!available.length && (!previous || previous.isBroken);
    var preferences = Object.assign({}, saved, { active: active && active.identity, activeBroken: !!(active && active.isBroken) });
    return { primary: active && Object.assign({}, active, { isPromoted: promoted }), active: active, preferred: preferred, entries: entries,
      ordered: ordered, available: available, broken: entries.filter(function (e) { return e.isBroken; }), allBroken: !available.length, promoted: promoted, preferences: preferences };
  }
  function saveMirrorPreferences(storage, id, preferences) {
    var data = JSON.parse(storage.getItem('heavenly_bookmarks') || 'null');
    var bookmark = findEntry(data, id);
    if (!bookmark) throw new Error('This bookmark no longer exists.');
    bookmark.mirrorPreferences = Object.assign({}, preferences);
    storage.setItem('heavenly_bookmarks', JSON.stringify(data));
    return bookmark;
  }
  function chooseMirror(storage, id, identity, brokenMap) {
    var data = JSON.parse(storage.getItem('heavenly_bookmarks') || 'null'), bookmark = findEntry(data, id);
    var state = mirrorState(bookmark, '', '', brokenMap);
    var entry = state.ordered.find(function (e) { return e.identity === identity; });
    if (!entry) throw new Error('This destination is not eligible.');
    var preferences = Object.assign({}, state.preferences, { preferred: identity });
    if (!entry.isBroken) { preferences.active = identity; preferences.activeBroken = false; }
    return saveMirrorPreferences(storage, id, preferences);
  }
  function reorderMirrors(storage, id, source, target, after, brokenMap) {
    var data = JSON.parse(storage.getItem('heavenly_bookmarks') || 'null'), bookmark = findEntry(data, id);
    var state = mirrorState(bookmark, '', '', brokenMap), ids = state.ordered.map(function (e) { return e.identity; });
    if (source === target || ids.indexOf(source) < 0 || ids.indexOf(target) < 0) return bookmark;
    ids.splice(ids.indexOf(source), 1); ids.splice(ids.indexOf(target) + (after ? 1 : 0), 0, source);
    return saveMirrorPreferences(storage, id, Object.assign({}, state.preferences, { order: ids }));
  }
  function shareableData(data, defaults) {
    // Catalog identity also covers older presets with builtIn:false.
    var officialEntries = new Map();
    visit(defaults || {}, function (entry) { officialEntries.set(entry.id, entry); });
    // Older share/import payloads may still carry the shipped non-builtIn alias.
    if (officialEntries.has('bm_ng')) officialEntries.set('bm_user_ng', officialEntries.get('bm_ng'));
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
      // Private update decisions and migration recovery archives never belong in
      // public share codes, even when a caller supplies a complete backup.
      if (key === '_catalog') return undefined;
      if (key === 'mirrorPreferences') return undefined;
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
  return { eligibleMirror: eligibleMirror, saveMirrorPreferences: saveMirrorPreferences, chooseMirror: chooseMirror, reorderMirrors: reorderMirrors, shareableData: shareableData, mirrorState: mirrorState, mergeSharedNotes: mergeSharedNotes, supportsQuickSave: supportsQuickSave, findQuickSaveBookmark: findQuickSaveBookmark, setQuickSavePreference: setQuickSavePreference,
    preserveStoredNotes: preserveStoredNotes, findEntry: findEntry, noteFor: noteFor, saveNote: saveNote, importBookmark: importBookmark, publicSharePayload: publicSharePayload };
});
