(function (root) {
  'use strict';
  var options = null;
  function element(tag, className, text) {
    var node = root.document.createElement(tag); if (className) node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  }
  function announce(text) {
    var node = root.document.getElementById('heavenly-order-status');
    if (!node) { node = element('p', 'heavenly-collection-sr-only'); node.id = 'heavenly-order-status'; node.setAttribute('role','status'); node.setAttribute('aria-live','polite'); root.document.body.appendChild(node); }
    node.textContent = text;
  }
  function open(scope) {
    if (!options) return;
    scope = scope || {};
    var data, preview, name = 'all official sections';
    try {
      data = options.data(); preview = root.HeavenlyCatalog.previewRestore(data, scope);
      var category = (data.categories || []).find(function (entry) { return entry.id === scope.categoryId; });
      var subsection = category && (category.subSections || []).find(function (entry) { return entry.id === scope.subSectionId; });
      if (category) name = category.title + (subsection ? ' / ' + subsection.title : '');
    } catch (error) { announce('Official ordering could not be previewed. Your collection has not changed.'); return; }
    var global = !scope.categoryId;
    return root.HeavenlyCollectionDialog.open({ id:'heavenly-restore-modal', title:global ? 'Restore All Official Ordering' : 'Restore This Section’s Official Order', returnFocus:options.returnFocus, render:function (card, close) {
      card.appendChild(element('p', 'heavenly-collection-intro', 'Scope: ' + name));
      card.appendChild(element('p', 'heavenly-restore-note', 'Use the latest official ordering you have accepted. Custom sorting in this scope will change. Personal bookmarks, notes, mirrors, hidden items and saved preferences stay as they are. Moved bookmarks stay in their chosen sections.'));
      card.appendChild(element('p', 'heavenly-restore-note', 'Missing or skipped content will stay absent. Pending catalog updates will stay pending.'));
      var count = Number(preview.count) || 0;
      var summary = element('p', 'heavenly-restore-status', count ? count + (count === 1 ? ' layout change is' : ' layout changes are') + ' ready to review:' : 'This scope already follows your accepted official ordering.'); card.appendChild(summary);
      if (count) {
        var list = element('ul', 'heavenly-restore-list'); list.tabIndex = 0; list.setAttribute('aria-label', 'Ordering changes');
        (preview.changes || []).forEach(function (change) { list.appendChild(element('li', '', change.title || 'Official section order')); }); card.appendChild(list);
      }
      var error = element('p', 'heavenly-restore-status'); error.setAttribute('role','status'); card.appendChild(error);
      var actions = element('footer', 'heavenly-collection-actions');
      var cancel = element('button', 'heavenly-collection-button', 'Cancel'); cancel.type = 'button'; cancel.dataset.initialFocus = ''; cancel.onclick = close;
      var confirm = element('button', 'heavenly-collection-button is-primary', 'Restore Official Order'); confirm.type = 'button'; confirm.disabled = !count;
      confirm.onclick = function () {
        try {
          var result = root.HeavenlyCatalog.commitRestore(options.storage, scope, preview.fingerprint);
          if (options.onRestore) options.onRestore(result, scope);
          close(); announce('Official ordering restored for ' + name + '. Your personal content and preferences were preserved.');
        } catch (failure) {
          error.textContent = 'The order could not be saved. Your collection is safe. Close this preview and try again; your bookmarks may have changed in another tab.';
        }
      };
      actions.append(cancel, confirm); card.appendChild(actions);
    }});
  }
  function button(scope, label) {
    var node = element('button', 'heavenly-restore-trigger', label || 'Restore official order'); node.type = 'button';
    node.onclick = function (event) { event.preventDefault(); event.stopPropagation(); open(scope); }; return node;
  }
  root.HeavenlyRestoreUI = { configure:function (value) { options = value; }, open:open, button:button };
})(window);
