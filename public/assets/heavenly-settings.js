(function () {
  'use strict';
  var root = document.querySelector('.settings-container');
  var sections = root && root.querySelector('.settings-sections');
  if (!sections || sections.dataset.organized) return;
  sections.dataset.organized = 'true';
  var children = Array.from(sections.children);
  var definitions = [
    { source: 2, id: 'bookmarks', title: 'Bookmarks & shortcuts', description: 'Choose how bookmarks open and how many you see.', icon: 'M5 3h14v18l-7-4-7 4z', hash: 'bookmark-display-settings' },
    { source: 1, id: 'cloaking', title: 'Tab cloaking', description: 'Change the tab title, icon, and how pages open.', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', hash: 'tab-cloaking' },
    { source: 3, id: 'panic', title: 'Panic controls', description: 'Choose a key or button to open another website.', icon: 'M12 3 2 21h20L12 3z M12 9v5 M12 17v1', hash: 'panic-controls' },
    { source: 4, id: 'widgets', title: 'Widgets & dock', description: 'Choose the tools shown on proxy pages.', icon: 'M3 4h7v7H3z M14 4h7v7h-7z M3 15h7v6H3z M14 15h7v6h-7z', hash: 'widget-settings' },
    { source: 0, id: 'features', title: 'Feature controls', description: 'Turn groups of tools and tab disguises off.', icon: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6', hash: 'master-controls' },
    { source: 6, id: 'backup', title: 'Backup & transfer', description: 'Download a backup or restore one from a file.', icon: 'M4 15v6h16v-6 M12 3v13 M7 8l5-5 5 5', hash: 'settings-group-backup' },
    { source: 5, id: 'updates', title: 'Bookmark updates', description: 'Review new and changed built-in bookmarks.', icon: 'M20 7a8 8 0 1 0 1 7 M20 2v6h-6', hash: 'bookmark-updates' }
  ];
  var nav = document.getElementById('settings-category-nav');
  var groups = [];
  definitions.forEach(function (definition, index) {
    var original = children[definition.source];
    if (!original) return;
    var group = document.createElement('details');
    group.className = 'settings-group';
    group.id = 'settings-group-' + definition.id;
    group.dataset.category = definition.title;
    group.open = index === 0 && !window.matchMedia('(max-width: 850px)').matches;
    var summary = document.createElement('summary');
    summary.className = 'settings-group-heading';
    summary.innerHTML = '<span class="settings-group-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + definition.icon + '"></path></svg></span><span class="settings-group-heading-text"><span class="settings-group-name" role="heading" aria-level="2">' + definition.title + '</span><span class="settings-group-description">' + definition.description + '</span></span><svg class="settings-group-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m8 10 4 4 4-4"/></svg>';
    var body = document.createElement('div');
    body.className = 'settings-group-body';
    // Move the existing nodes once. IDs, event handlers, and control state survive.
    var heading = original.querySelector(':scope > .section-title');
    if (heading) {
      var target = heading.querySelector('[id]');
      if (target) {
        // Reuse the existing deep-link identity as the disclosure heading,
        // rather than repeating its text above the first setting.
        target.classList.add('settings-group-name', 'settings-anchor');
        target.setAttribute('role', 'heading'); target.setAttribute('aria-level', '2');
        target.textContent = definition.title;
        summary.querySelector('.settings-group-name').replaceWith(target);
      }
      // Keep contextual configuration actions beside their related controls.
      var configure = heading.querySelector('[data-qs-config]');
      if (configure) { configure.classList.add('settings-context-config'); configure.textContent = definition.id === 'widgets' ? 'More widget settings' : 'Shortcut preferences'; body.appendChild(configure); }
      heading.remove();
    }
    if (definition.id === 'features') {
      var master = original.querySelector('#master-controls');
      if (master) {
        var oldSummary = master.querySelector(':scope > summary');
        if (oldSummary) oldSummary.remove();
        master.className = 'settings-master-content';
        // Preserve this destination without requiring two nested disclosures.
        var masterTarget = document.createElement('div');
        masterTarget.id = master.id;
        masterTarget.tabIndex = -1;
        while (master.firstChild) masterTarget.appendChild(master.firstChild);
        body.appendChild(masterTarget);
      }
    } else body.appendChild(original);
    if (definition.id === 'cloaking' || definition.id === 'panic') {
      var featureNote = document.createElement('p'); featureNote.className = 'settings-feature-gating'; featureNote.hidden = true;
      featureNote.textContent = 'These features are off in Feature controls. Your saved choices are kept.';
      body.prepend(featureNote);
    }
    group.append(summary, body);
    sections.appendChild(group);
    var link = document.createElement('a');
    link.href = '#' + definition.hash;
    link.className = 'settings-nav-link';
    link.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + definition.icon + '"></path></svg><span>' + definition.title + '</span>';
    nav.appendChild(link);
    groups.push({ node: group, body: body, link: link, definition: definition });
  });
  children.forEach(function (child) { if (child.parentNode === sections) child.remove(); });
  var search = document.getElementById('settings-search');
  var clear = document.getElementById('settings-search-clear');
  var status = document.getElementById('settings-search-status');
  var empty = document.getElementById('settings-search-empty');
  var snapshot = null, searchEntry = null, selected = 'bookmarks', lastSettingFocus = null;
  var aliases = {
    'set-bookmark-count-mode': 'bookmark count limit show more auto custom density number visible bottom row',
    'customize-quick-settings-btn': 'quick settings shortcuts visibility reorder order customize homepage menu',
    'set-auto-cloak': 'cloaking hide disguise tab title favicon automatic background auto tab cloaking',
    'set-persistent-cloak': 'cloaking persistent always title favicon persistent cloaking',
    'preset-select': 'cloaking custom title icon identity preset favicon',
    'set-randomize-preset-session': 'randomizer pool identities session presets',
    'set-panic-key-enable': 'panic keyboard shortcut hotkey emergency redirect',
    'set-touch-panic': 'panic touch gesture emergency',
    'set-panic-url': 'panic destination redirect url address',
    'set-use-widget-dock': 'dock toolbar edge position floating widgets top bottom left right enable collapsible widget dock bar',
    'set-show-magnifier': 'magnifier magnify lens zoom size dimensions',
    'set-show-scroll-lock': 'scroll lock scrolling unlock',
    'set-show-nav-bookmark': 'navigation save bookmark floating',
    'set-show-nav-search': 'navigation search address url floating',
    'set-show-nav-home': 'navigation home direct page floating',
    'set-disable-all-features': 'master disable all privacy overlays features off disable all privacy widget overlays',
    'set-disable-all-widgets': 'master disable all widgets dock off disable all proxied page widgets',
    'open-export-modal-btn': 'backup export import transfer json download restore notes local device data migration granular backup',
    'reset-widget-pos-btn': 'widget position reset screen offscreen restore',
    'reset-builtin-bookmarks-btn': 'bookmarks hidden categories restore built in reset',
    'set-search-new-tab': 'general navigation go new tab search merge button',
    'set-bookmarks-new-tab': 'general navigation bookmarks new tab launch',
    'set-decoy-auto-timer': 'timed decoy auto unlock timer academy school page wait terms of service',
    'set-merge-go-newtab': 'merge go new tab buttons combine',
    'set-bookmarks-about-blank': 'cloaking bookmarks blank launch',
    'set-search-about-blank': 'cloaking search blank launch'
  };
  var records = [];
  groups.forEach(function (group) {
    var cards = Array.from(group.body.querySelectorAll('.hero-card')).filter(function (card) { return !card.parentElement.closest('.hero-card'); });
    cards.forEach(function (card) {
      var terms = [];
      Object.keys(aliases).forEach(function (id) { if (card.querySelector('[id="' + id + '"]')) terms.push(aliases[id]); });
      var badge = document.createElement('span');
      badge.className = 'settings-result-category'; badge.textContent = group.definition.title;
      card.prepend(badge); card.tabIndex = -1;
      records.push({ node: card, group: group, title: Array.from(card.querySelectorAll('.hero-card-title')).map(function (node) { return node.textContent; }).join(' ').toLowerCase(), content: card.textContent.toLowerCase(), aliases: terms.join(' '), text: (card.textContent + ' ' + group.definition.title + ' ' + terms.join(' ')).toLowerCase() });
    });
  });
  function select(group) {
    selected = group.definition.id;
    groups.forEach(function (entry) {
      if (entry === group) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    });
  }
  select(groups[0]);
  function detailsKey(node) {
    if (node.id) return 'id:' + node.id;
    var group = node.closest('.settings-group');
    if (node.dataset.categoryId) return (group ? group.id : '') + ':category:' + node.dataset.categoryId;
    var summary = node.querySelector(':scope > summary');
    if (summary && summary.id) return 'summary:' + summary.id;
    return (group ? group.id : '') + ':details:' + Array.from(group ? group.querySelectorAll('details') : sections.querySelectorAll('details')).indexOf(node);
  }
  function visibleRecords() { return records.filter(function (record) { return !record.node.hidden && !record.group.node.hidden; }).sort(function (a,b) { return a.node.getBoundingClientRect().top - b.node.getBoundingClientRect().top; }); }
  function unmark() {
    sections.querySelectorAll('mark.settings-match').forEach(function (mark) { var parent = mark.parentNode; mark.replaceWith(document.createTextNode(mark.textContent)); parent.normalize(); });
  }
  function highlight(card, tokens) {
    card.querySelectorAll('.hero-card-title,.hero-card-desc,.bookmark-count-controls > label').forEach(function (element) {
      var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), nodes = [], node;
      while ((node = walker.nextNode())) nodes.push(node);
      nodes.forEach(function (textNode) {
        var text = textNode.nodeValue, lower = text.toLowerCase(), ranges = [];
        tokens.forEach(function (token) { var start = 0, found; while ((found = lower.indexOf(token, start)) !== -1) { ranges.push([found, found + token.length]); start = found + token.length; } });
        if (!ranges.length) return;
        ranges.sort(function (a,b) { return a[0]-b[0]; });
        var fragment = document.createDocumentFragment(), cursor = 0;
        ranges.forEach(function (range) { if (range[0] < cursor) return; fragment.appendChild(document.createTextNode(text.slice(cursor, range[0]))); var mark = document.createElement('mark'); mark.className = 'settings-match'; mark.textContent = text.slice(range[0], range[1]); fragment.appendChild(mark); cursor = range[1]; });
        fragment.appendChild(document.createTextNode(text.slice(cursor))); textNode.replaceWith(fragment);
      });
    });
  }
  function restoreSearch(restoreFocus) {
    searchEntry = null;
    unmark(); root.classList.remove('settings-searching');
    records.forEach(function (record) { record.node.hidden = false; record.node.style.removeProperty('order'); });
    groups.forEach(function (group) { group.node.hidden = false; group.node.style.removeProperty('order'); });
    clear.hidden = true; empty.hidden = true; status.textContent = 'Search setting names, help, or shortcuts.';
    if (!snapshot) return;
    var currentDetails = Array.from(sections.querySelectorAll('details'));
    snapshot.details.forEach(function (state) { var node = state.node.isConnected ? state.node : currentDetails.find(function (entry) { return detailsKey(entry) === state.key; }); if (node) node.open = state.open; });
    var previousGroup = groups.find(function (group) { return group.definition.id === snapshot.selected; });
    if (previousGroup) select(previousGroup);
    var prior = snapshot; snapshot = null;
    if (restoreFocus && prior.focus && prior.focus.isConnected && !prior.focus.closest('details:not([open])')) prior.focus.focus({ preventScroll: true });
    else if (restoreFocus) search.focus({ preventScroll: true });
    window.scrollTo({ top: prior.scroll, behavior: 'instant' });
  }
  function captureArrangement(focus) {
    return { details: Array.from(sections.querySelectorAll('details')).map(function (node) { return { node: node, key: detailsKey(node), open: node.open }; }), selected: selected, scroll: window.scrollY, focus: focus || lastSettingFocus };
  }
  // Capture before focusing the search field scrolls it into view. This lets
  // clearing search return to the setting the user was working with.
  search.addEventListener('pointerdown', function () { if (!snapshot) searchEntry = captureArrangement(); });
  document.addEventListener('focusout', function (event) {
    if (!snapshot && sections.contains(event.target) && event.relatedTarget === search) searchEntry = captureArrangement(event.target);
  });
  search.addEventListener('focus', function () { if (!snapshot && !searchEntry) searchEntry = captureArrangement(); });
  function filter() {
    var query = search.value.trim().toLowerCase();
    if (!query) { restoreSearch(false); return; }
    if (!snapshot) snapshot = searchEntry || captureArrangement();
    searchEntry = null;
    unmark(); root.classList.add('settings-searching'); clear.hidden = false;
    var tokens = query.split(/\s+/).slice(0, 12), count = 0;
    groups.forEach(function (group) { group.node.hidden = true; group.score = 3; group.link.removeAttribute('aria-current'); });
    records.forEach(function (record) {
      var match = tokens.every(function (token) { return record.text.indexOf(token) !== -1; });
      record.node.hidden = !match;
      if (!match) return;
      var containsAll = function (text) { return tokens.every(function (token) { return text.indexOf(token) !== -1; }); };
      var score = containsAll(record.title) ? 0 : containsAll(record.content) ? 1 : containsAll(record.aliases) ? 2 : 3;
      record.node.style.order = String(score);
      record.group.score = Math.min(record.group.score, score);
      record.group.node.style.order = String(record.group.score);
      count++; record.group.node.hidden = false; record.group.node.open = true;
      record.node.querySelectorAll('details').forEach(function (details) { details.open = true; });
      highlight(record.node, tokens);
    });
    status.textContent = count ? count + (count === 1 ? ' setting found.' : ' settings found.') + ' Press Down Arrow to browse results.' : 'No matching settings.';
    empty.hidden = count > 0;
    document.getElementById('settings-empty-query').textContent = search.value.trim();
  }
  function clearSearch(restoreFocus) { search.value = ''; restoreSearch(restoreFocus); }
  search.addEventListener('input', filter);
  clear.addEventListener('click', function () { clearSearch(true); });
  document.getElementById('settings-empty-clear').addEventListener('click', function () { clearSearch(true); });
  search.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && search.value) { event.preventDefault(); clearSearch(true); }
    if ((event.key === 'ArrowDown' || event.key === 'Enter') && snapshot) {
      var first = visibleRecords()[0];
      if (first) { event.preventDefault(); first.node.focus(); }
    }
  });
  sections.addEventListener('keydown', function (event) {
    if (!snapshot || !event.target.classList.contains('hero-card')) return;
    var visible = visibleRecords(), index = visible.findIndex(function (record) { return record.node === event.target; });
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      var next = visible[index + (event.key === 'ArrowDown' ? 1 : -1)];
      if (next) next.node.focus(); else search.focus();
    } else if (event.key === 'Enter') {
      var control = event.target.querySelector('input:not([type="hidden"]):not(:disabled),button:not(:disabled),select:not(:disabled),summary');
      if (control) { event.preventDefault(); control.focus(); }
    } else if (event.key === 'Escape') { event.preventDefault(); clearSearch(true); }
  });
  document.addEventListener('focusin', function (event) { if (sections.contains(event.target) && !snapshot) { lastSettingFocus = event.target; searchEntry = null; } });
  groups.forEach(function (group) {
    // Select only an intentional disclosure activation. Native toggle events are
    // queued and can arrive after search restoration, so they cannot represent
    // the selected category reliably during programmatic open/close changes.
    group.node.querySelector(':scope > summary').addEventListener('click', function () {
      if (!snapshot && !group.node.open) select(group);
    });
    group.link.addEventListener('click', function () { if (snapshot) clearSearch(false); group.node.open = true; select(group); });
  });
  function revealHash() {
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { return; }
    if (!id) return;
    var target = document.getElementById(id);
    if (!target || !sections.contains(target)) return;
    if (snapshot) clearSearch(false);
    var group = groups.find(function (entry) { return entry.node === target || entry.node.contains(target); });
    if (!group) return;
    group.node.open = true;
    var ancestor = target.parentElement;
    while (ancestor && ancestor !== sections) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; }
    select(group);
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    requestAnimationFrame(function () { target.scrollIntoView({ block: 'start', behavior: 'instant' }); target.focus({ preventScroll: true }); });
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();
  // The transfer editors keep their existing selection and import/export logic.
  // Give their existing dialogs a complete keyboard boundary and inert backdrop.
  var transferModals = ['export-modal', 'import-modal'].map(function (id) { return document.getElementById(id); });
  var previousOverflow = null;
  function syncTransferModal() {
    var active = transferModals.find(function (modal) { return modal.classList.contains('active'); });
    root.inert = Boolean(active);
    transferModals.forEach(function (modal) { modal.setAttribute('aria-hidden', String(modal !== active)); });
    if (active && previousOverflow === null) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    else if (!active && previousOverflow !== null) { document.body.style.overflow = previousOverflow; previousOverflow = null; }
  }
  transferModals.forEach(function (modal) {
    new MutationObserver(syncTransferModal).observe(modal, { attributes: true, attributeFilter: ['class'] });
    modal.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var controls = Array.from(modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')).filter(function (control) { return control.getClientRects().length; });
      if (!controls.length) return;
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  });
  syncTransferModal();
  window.HeavenlySettingsSearch = { clear: clearSearch, revealHash: revealHash };
})();
