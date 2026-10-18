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
    (data.bookmarks || []).forEach(function (bookmark) { callback(bookmark); (bookmark.subBookmarks || []).forEach(callback); });
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
  function publicSharePayload(payload) {
    // Private backups retain metadata. Every public code/link omits notes, including nested entries.
    return JSON.parse(JSON.stringify(payload, function (key, value) { return key === 'personalNote' ? undefined : value; }));
  }
  return { supportsQuickSave: supportsQuickSave, findQuickSaveBookmark: findQuickSaveBookmark, setQuickSavePreference: setQuickSavePreference,
    preserveStoredNotes: preserveStoredNotes, findEntry: findEntry, noteFor: noteFor, saveNote: saveNote, importBookmark: importBookmark, publicSharePayload: publicSharePayload };
});
