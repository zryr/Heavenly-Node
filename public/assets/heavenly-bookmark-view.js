(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeavenlyBookmarkView = factory(root);
})(typeof window === 'undefined' ? this : window, function (root) {
  'use strict';
  var DEFAULT_LIMIT = 5, MAX_LIMIT = 30;
  function validLimit(value) {
    if (value === '' || value === null || value === undefined) return null;
    var number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= MAX_LIMIT ? number : null;
  }
  function sectionKey(categoryId, subsectionId) { return JSON.stringify([categoryId, subsectionId || null]); }
  function rowCapacity(width, minimum, gap) {
    minimum = Number(minimum) || 200; gap = Number(gap) || 10;
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor((Math.max(0, Number(width) || 0) + gap) / (minimum + gap))));
  }
  function mode(settings) { settings = settings || {}; return settings.bookmarkCountMode === 'auto' ? 'auto' : settings.bookmarkCountMode === 'custom' || validLimit(settings.bookmarkInitialLimit) !== null ? 'custom' : 'auto'; }
  function policy(settings, categoryId, subsectionId) {
    settings = settings || {};
    var overrides = settings.bookmarkSectionLimits || {};
    var global = { mode: mode(settings), count: validLimit(settings.bookmarkInitialLimit) || DEFAULT_LIMIT };
    var keys = [sectionKey(categoryId, subsectionId), sectionKey(categoryId)];
    for (var i = 0; i < keys.length; i++) {
      var value = overrides[keys[i]];
      if (value === 'global') return global;
      if (value === 'auto') return { mode: 'auto', count: DEFAULT_LIMIT };
      if (validLimit(value) !== null) return { mode: 'custom', count: validLimit(value) };
    }
    return global;
  }
  function limit(settings, categoryId, subsectionId, context) {
    var resolved = policy(settings, categoryId, subsectionId);
    if (resolved.mode === 'custom') return resolved.count;
    return context && context.side === 'bottom' ? rowCapacity(context.width, context.minimum, context.gap) : DEFAULT_LIMIT;
  }
  function override(settings, categoryId, subsectionId, value) {
    var overrides = Object.assign({}, settings.bookmarkSectionLimits || {}), key = sectionKey(categoryId, subsectionId);
    var count = validLimit(value);
    if (value === 'auto') overrides[key] = 'auto';
    else if (count === null) {
      delete overrides[key];
      // Reset means the global default, even when a category has its own count.
      // Keep only that explicit exception, never a redundant copy of the number.
      if (subsectionId && (validLimit(overrides[sectionKey(categoryId)]) || overrides[sectionKey(categoryId)] === 'auto')) overrides[key] = 'global';
    }
    else overrides[key] = count;
    return { bookmarkSectionLimits: overrides };
  }
  // One observer belongs to the existing render lifecycle. It observes widths,
  // never item heights; changing Show More cannot trigger a density feedback loop.
  var rowObserver, rowFrame = 0, rowCallbacks = new Map(), rowWidths = new Map(), pendingRows = new Set(), fallbackBound = false;
  function measuredWidth(node) { return node.getBoundingClientRect().width; }
  function flushRows() {
    rowFrame = 0;
    Array.from(pendingRows).forEach(function (node) {
      pendingRows.delete(node);
      var callback = rowCallbacks.get(node);
      if (!node.isConnected) { rowCallbacks.delete(node); rowWidths.delete(node); if (rowObserver) rowObserver.unobserve(node); return; }
      var width = measuredWidth(node);
      if (callback && width > 0) { rowWidths.set(node, width); callback(width); }
    });
  }
  function observeRow(node, callback) {
    if (!root) return;
    rowCallbacks.set(node, callback);
    if (!rowObserver && root.ResizeObserver) rowObserver = new root.ResizeObserver(function (entries) {
      entries.forEach(function (entry) { if (Math.abs(measuredWidth(entry.target) - (rowWidths.get(entry.target) || 0)) > .01) pendingRows.add(entry.target); });
      if (!rowFrame) rowFrame = root.requestAnimationFrame(flushRows);
    });
    if (rowObserver) rowObserver.observe(node);
    else if (!fallbackBound) {
      fallbackBound = true;
      function remeasure() { rowCallbacks.forEach(function (_, target) { pendingRows.add(target); }); if (!rowFrame) rowFrame = root.requestAnimationFrame(flushRows); }
      root.addEventListener('resize', remeasure); root.addEventListener('orientationchange', remeasure);
    }
    pendingRows.add(node);
    if (!rowFrame) rowFrame = root.requestAnimationFrame(flushRows);
  }
  function disconnectRows() {
    if (rowObserver) rowObserver.disconnect();
    if (rowFrame) root.cancelAnimationFrame(rowFrame);
    rowFrame = 0; rowCallbacks.clear(); rowWidths.clear(); pendingRows.clear();
  }
  function text(value) { return String(value || '').toLocaleLowerCase(); }
  // Search the authoritative collection, independently of layout, lazy rendering,
  // Show More and collapsed subsections. Explicitly hidden ancestors stay hidden.
  function search(data, query) {
    var words = text(query).trim().split(/\s+/).filter(Boolean), results = [];
    if (!words.length) return results;

    var rawCategories = data.categories || [];
    var categories = [];
    var categoryMap = Object.create(null);
    for (var c = 0; c < rawCategories.length; c++) {
      var cat = rawCategories[c];
      if (!cat.hidden) {
        categories.push(cat);
        categoryMap[cat.id] = cat;
      }
    }
    categories.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    var bookmarks = data.bookmarks || [];
    var bookmarksByCat = Object.create(null);
    for (var b = 0; b < bookmarks.length; b++) {
      var bm = bookmarks[b];
      if (!bm.hidden && categoryMap[bm.categoryId]) {
        var list = bookmarksByCat[bm.categoryId];
        if (!list) { list = []; bookmarksByCat[bm.categoryId] = list; }
        list.push(bm);
      }
    }

    for (var ci = 0; ci < categories.length; ci++) {
      var category = categories[ci];
      var catBookmarks = bookmarksByCat[category.id];
      if (!catBookmarks) continue;

      catBookmarks.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

      var subSections = category.subSections || [];
      var subSectionMap = Object.create(null);
      for (var s = 0; s < subSections.length; s++) {
        subSectionMap[subSections[s].id] = subSections[s];
      }

      for (var bi = 0; bi < catBookmarks.length; bi++) {
        var bookmark = catBookmarks[bi];
        var subsectionId = bookmark.subSectionId || (bookmark.builtIn ? 'builtin' : 'user');
        var subsection = subSectionMap[subsectionId];
        if (subsection && subsection.hidden) continue;

        var context = [category.title, subsection ? subsection.title : (bookmark.builtIn ? 'Built-In' : 'Your Bookmarks')];

        function visit(entry, ancestors) {
          if (entry.hidden) return;
          var parent = ancestors[ancestors.length - 1] || null;
          var names = ancestors.map(function (ancestor) { return ancestor.title; });
          var parts = context.concat(names, [entry.title, entry.url]);
          var haystack = text(parts.join(' '));
          if (words.every(function (word) { return haystack.indexOf(word) !== -1; })) {
            results.push({ entry: entry, parent: parent, category: category, subsectionId: subsectionId, context: context.concat(names).filter(Boolean).join(' / ') });
          }
          (entry.subBookmarks || []).forEach(function (child) { visit(child, ancestors.concat([entry])); });
        }
        visit(bookmark, []);
      }
    }
    return results;
  }
  function initSearch(options) {
    var input = options.input, host = options.host, clear = options.clear, visibleCount = 80, results = [];
    if (!input || !host) return null;
    input.setAttribute('aria-controls', host.id);
    input.setAttribute('aria-expanded', 'false');
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Bookmark search results');
    var doc = host.ownerDocument;
    function update(reset) {
      if (reset) visibleCount = 80;
      var query = input.value.trim();
      host.hidden = !query;
      input.setAttribute('aria-expanded', String(!!query));
      if (clear) clear.classList.toggle('visible', !!query);
      host.textContent = '';
      if (!query) return;
      results = search(options.data(), query);
      var count = doc.createElement('p');
      count.className = 'bookmark-search-summary';
      count.setAttribute('role', 'status');
      count.textContent = results.length ? results.length + (results.length === 1 ? ' result' : ' results') + ' across your bookmarks' : 'No bookmarks found';
      host.appendChild(count);
      if (!results.length) {
        var empty = doc.createElement('p');
        empty.className = 'bookmark-search-empty';
        empty.textContent = 'Try a site, category, folder or subsection name. Hidden bookmarks stay hidden.';
        host.appendChild(empty);
        return;
      }
      var lastCategory = null;
      results.slice(0, visibleCount).forEach(function (result, index) {
        if (lastCategory !== result.category.id) {
          var heading = doc.createElement('h2');
          heading.className = 'bookmark-search-group'; heading.textContent = result.category.title;
          host.appendChild(heading); lastCategory = result.category.id;
        }
        var row = doc.createElement(result.entry.type === 'folder' ? 'button' : 'a');
        if (result.entry.type === 'folder') row.type = 'button';
        row.className = 'bookmark-search-result'; row.dataset.searchIndex = index;
        row.dataset.bookmarkId = result.entry.id;
        row.href = result.entry.url ? (options.href ? options.href(result) : location.origin + '/proxy/' + result.entry.url) : '#';
        if (result.entry.url) { row.target = '_blank'; row.rel = 'noopener'; }
        row.title = result.entry.title + ' · ' + result.context;
        var iconSlot = doc.createElement('span'); iconSlot.className = 'bookmark-search-icon'; iconSlot.setAttribute('aria-hidden', 'true');
        var fallback = doc.createElement('span');
        fallback.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (result.entry.type === 'folder' ? '<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3z"/>' : '<path d="M6 3h12v18l-6-4-6 4z"/>') + '</svg>';
        iconSlot.appendChild(fallback);
        if (result.entry.icon || result.entry.url) {
          var icon = options.icon(result.entry.icon, result.entry.url, '');
          if (icon.tagName === 'IMG') {
            icon.alt = ''; icon.style.opacity = '0';
            icon.onload = function () { icon.style.opacity = '1'; fallback.hidden = true; };
            icon.onerror = function () { icon.remove(); };
            if (icon.complete && icon.naturalWidth > 0) icon.onload();
          } else fallback.hidden = true;
          iconSlot.appendChild(icon);
        }
        row.appendChild(iconSlot);
        var copy = doc.createElement('span'); copy.className = 'bookmark-search-copy';
        var name = doc.createElement('strong'); name.textContent = result.entry.title;
        var context = doc.createElement('small'); context.textContent = result.context;
        copy.appendChild(name); copy.appendChild(context); row.appendChild(copy);
        var arrow = doc.createElement('span'); arrow.className = 'bookmark-search-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (result.entry.type === 'folder' ? '<path d="m9 5 7 7-7 7"/>' : '<path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7"/>') + '</svg>'; row.appendChild(arrow);
        row.onclick = function (event) {
          // Modified clicks retain normal link behavior using the saved launch
          // destination, while ordinary clicks use the shared homepage launcher.
          if (result.entry.type !== 'folder' && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
          event.preventDefault();
          if (result.entry.type === 'folder') {
            input.value = result.entry.title; update(true);
            var firstChild = Array.from(host.querySelectorAll('.bookmark-search-result')).find(function (node) { return node.dataset.bookmarkId !== result.entry.id; });
            if (firstChild) firstChild.focus();
          } else options.launch(result);
        };
        host.appendChild(row);
      });
      if (results.length > visibleCount) {
        var more = doc.createElement('button'); more.type = 'button'; more.className = 'show-more-btn bookmark-search-more';
        more.textContent = 'Show more results (' + (results.length - visibleCount) + ' remaining)';
        more.onclick = function () { var previous = visibleCount; visibleCount += 80; update(false); var next = host.querySelector('[data-search-index="' + previous + '"]'); if (next) next.focus(); };
        host.appendChild(more);
      }
    }
    function clearSearch() { input.value = ''; update(true); input.focus({ preventScroll: true }); }
    input.oninput = function () { update(true); };
    if (clear) clear.onclick = function (event) { event.preventDefault(); clearSearch(); };
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        var first = host.querySelector('.bookmark-search-result');
        if (first && !host.hidden) { event.preventDefault(); if (event.key === 'Enter') first.click(); else first.focus(); }
      }
    });
    host.addEventListener('keydown', function (event) {
      var rows = Array.from(host.querySelectorAll('.bookmark-search-result')), index = rows.indexOf(doc.activeElement), next;
      if (event.key === 'ArrowDown') next = rows[Math.min(index + 1, rows.length - 1)];
      else if (event.key === 'ArrowUp') next = index <= 0 ? input : rows[index - 1];
      else if (event.key === 'Home') next = rows[0];
      else if (event.key === 'End') next = rows[rows.length - 1];
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); clearSearch(); }
      if (next) { event.preventDefault(); next.focus(); }
    });
    update(true);
    return { refresh: function () { update(false); }, clear: clearSearch };
  }
  function initLimitSettings(options) {
    var doc = options.document, globalInput = doc.getElementById('set-bookmark-initial-limit'), sectionSelect = doc.getElementById('set-bookmark-limit-section'), sectionInput = doc.getElementById('set-bookmark-section-limit'), reset = doc.getElementById('reset-bookmark-section-limit'), status = doc.getElementById('bookmark-limit-status');
    var globalMode = doc.getElementById('set-bookmark-count-mode'), sectionMode = doc.getElementById('set-bookmark-section-mode');
    if (!globalInput || !sectionSelect || !sectionInput) return;
    function selected() { try { return JSON.parse(sectionSelect.value); } catch (error) { return null; } }
    function sync() {
      var settings = options.settings(), chosen = selected();
      globalInput.value = validLimit(settings.bookmarkInitialLimit) || DEFAULT_LIMIT;
      if (globalMode) { globalMode.value = mode(settings); globalInput.disabled = globalMode.value === 'auto'; }
      sectionInput.disabled = !chosen; reset.disabled = !chosen;
      if (sectionMode) { sectionMode.disabled = !chosen; sectionMode.value = 'inherit'; }
      if (!chosen) return;
      var value = (settings.bookmarkSectionLimits || {})[sectionKey(chosen[0], chosen[1])];
      sectionInput.value = validLimit(value) || '';
      var resolved = policy(settings, chosen[0], chosen[1]);
      sectionInput.placeholder = resolved.mode === 'auto' ? 'Auto: one bottom row; 5 in side panels' : 'Effective count: ' + resolved.count;
      if (sectionMode) { sectionMode.value = value === 'auto' ? 'auto' : validLimit(value) ? 'custom' : 'inherit'; sectionInput.disabled = sectionMode.value !== 'custom'; }
      reset.disabled = validLimit(value) === null && value !== 'auto';
    }
    function refreshSections() {
      var previous = sectionSelect.value;
      sectionSelect.textContent = '';
      var placeholder = doc.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Choose a category or subsection'; sectionSelect.appendChild(placeholder);
      (options.data().categories || []).forEach(function (category) {
        function add(subsection) {
          var option = doc.createElement('option'); option.value = sectionKey(category.id, subsection && subsection.id); option.textContent = category.title + (subsection ? ' / ' + subsection.title : ' · category default'); sectionSelect.appendChild(option);
        }
        add();
        (category.subSections || [{ id:'builtin', title:'Built-In' }, { id:'user', title:'Your Bookmarks' }]).forEach(add);
      });
      sectionSelect.value = previous; sync();
    }
    function validate(input, allowEmpty) {
      var valid = (allowEmpty && input.value === '') || validLimit(input.value) !== null;
      input.setCustomValidity(valid ? '' : 'Enter a whole number from 1 to 30.');
      if (!valid) input.reportValidity();
      return valid;
    }
    globalInput.onchange = function () {
      if (!validate(globalInput, false)) return;
      options.save({ bookmarkInitialLimit: validLimit(globalInput.value), bookmarkCountMode: 'custom' }); sync(); status.textContent = 'Custom default bookmark count saved.';
    };
    if (globalMode) globalMode.onchange = function () {
      options.save({ bookmarkCountMode: globalMode.value, bookmarkInitialLimit: validLimit(globalInput.value) || validLimit(options.settings().bookmarkInitialLimit) || DEFAULT_LIMIT }); sync();
      status.textContent = globalMode.value === 'auto' ? 'Auto shows one complete row in bottom sections and 5 bookmarks in side panels.' : 'Custom default bookmark count saved.';
    };
    sectionSelect.onchange = sync;
    if (sectionMode) sectionMode.onchange = function () {
      var chosen = selected(); if (!chosen) return;
      var value = sectionMode.value === 'auto' ? 'auto' : sectionMode.value === 'custom' ? validLimit(sectionInput.value) || limit(options.settings(), chosen[0], chosen[1]) : null;
      options.save(override(options.settings(), chosen[0], chosen[1], value)); sync();
      status.textContent = value === 'auto' ? 'This section now uses Auto.' : value === null ? 'This section now uses the default.' : 'Custom section count saved.';
    };
    sectionInput.onchange = function () {
      var chosen = selected(); if (!chosen || !validate(sectionInput, true)) return;
      options.save(override(options.settings(), chosen[0], chosen[1], sectionInput.value)); sync(); status.textContent = 'Section bookmark count saved.';
    };
    reset.onclick = function () {
      var chosen = selected(); if (!chosen) return;
      options.save(override(options.settings(), chosen[0], chosen[1], null)); sync(); status.textContent = 'Override removed. This section uses the global default.';
      sectionInput.focus();
    };
    refreshSections();
    return { refresh: refreshSections };
  }
  return { validLimit: validLimit, rowCapacity: rowCapacity, mode: mode, policy: policy, limit: limit, override: override, observeRow: observeRow, disconnectRows: disconnectRows, sectionKey: sectionKey, search: search, initSearch: initSearch, initLimitSettings: initLimitSettings };
});
