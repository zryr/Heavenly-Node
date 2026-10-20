/* Shared homepage panel and Settings editor. Layout changes never write feature values. */
(function (root) {
  'use strict';
  var model = root.HeavenlyQuickSettingsModel;
  var catalog = model.items;
  var infoIcon = '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>';
  function svg(paths) { return '<svg aria-hidden="true" viewBox="0 0 24 24">' + paths + '</svg>'; }
  function read() { try { return root.HeavenlyNavigation.readSettings(root.localStorage); } catch (e) { return {}; } }
  function signature(value) { return JSON.stringify(value); }
  function itemById(id) { return catalog.find(function (item) { return item.id === id; }); }

  root.HeavenlyQuickSettings = { init: function (options) {
    var doc = root.document;
    var tray = options.tray;
    var section = options.section;
    var editorTrigger = options.editorTrigger;
    var draft = null, baseline = null, externalLayout = false, lastSettings = null;
    var syncedSettings = signature(read());
    var drag = null, dragFrame = null;
    var touchPointers = new Set();
    var modal = doc.createElement('div');
    modal.id = 'qs-editor';
    modal.className = 'qs-editor-backdrop';
    modal.hidden = true;
    modal.innerHTML = '<section class="qs-editor-card" role="dialog" aria-modal="true" aria-labelledby="qs-editor-title" aria-describedby="qs-editor-description">' +
      '<header class="qs-editor-header"><div><h2 id="qs-editor-title">Customize Quick Settings</h2><p id="qs-editor-description">Choose which shortcuts appear in Quick Settings. Hiding a shortcut keeps its setting unchanged. Categories follow their first shortcut; shortcuts stay in your chosen order within each category.</p></div><button type="button" data-editor-close aria-label="Cancel customization">×</button></header>' +
      '<div class="qs-editor-body"><div id="qs-editor-conflict" role="status" hidden><p id="qs-editor-conflict-text"></p><div id="qs-editor-conflict-actions" hidden><button type="button" id="qs-editor-load">Load saved layout</button><button type="button" id="qs-editor-keep">Keep my draft</button></div></div>' +
      '<h3>Visible shortcuts</h3><ol id="qs-editor-visible" class="qs-editor-list"></ol><p id="qs-editor-empty" hidden>No shortcuts selected. Edit remains available.</p>' +
      '<details id="qs-editor-more"><summary>Add More Shortcuts</summary><ul id="qs-editor-available" class="qs-editor-list"></ul></details>' +
      '<label class="qs-editor-info" for="qs-editor-info-icons"><span>Show info icons beside shortcuts</span><span class="qs-switch"><input id="qs-editor-info-icons" type="checkbox" role="switch"><span class="qs-switch-track" aria-hidden="true"></span></span></label><p class="qs-editor-note">Visibility here controls the shortcut only. Use its pill to change the feature. Widget changes may require refreshing an open proxied website.</p>' +
      '<p id="qs-editor-announcement" class="qs-sr-only" aria-live="polite"></p><p id="qs-editor-error" role="alert" hidden></p></div>' +
      '<footer class="qs-editor-footer"><button type="button" id="qs-editor-reset">Reset to Default</button><div><button type="button" data-editor-close>Cancel</button><button type="button" id="qs-editor-save" class="qs-primary">Save</button></div></footer></section>';
    doc.body.appendChild(modal);
    var card = modal.querySelector('.qs-editor-card');
    function announce(message) { doc.getElementById('qs-editor-announcement').textContent = message; }
    function write(patch) {
      try { root.HeavenlyNavigation.updateSettings(root.localStorage, patch); }
      catch (e) { return false; }
      // Match the existing pool editor: invalidate this tab's session choice
      // only after a successful save, before hosts apply their existing rules.
      if (Object.prototype.hasOwnProperty.call(patch, 'randomPool')) { try { root.sessionStorage.removeItem('heavenly_session_preset'); } catch (e) {} }
      root.dispatchEvent(new root.CustomEvent('heavenly:settings-change'));
      return true;
    }
    function entries(id) {
      var settings = read(), saved = model.layout(settings);
      var list = id === 'all' ? model.groups(settings).reduce(function (items, group) { return items.concat(group.items); }, []) : [itemById(id)];
      return { guide: id === 'all', title: id === 'all' ? 'Quick Settings Guide' : list[0].name, entries: list.length ? list.map(function (item) {
        var state = model.state(item, settings);
        return { id: item.id, group: item.group, icon: model.icons[item.icon], name: item.name, text: item.help + (state.reason ? ' ' + state.reason : '') };
      }) : [{ name: 'Quick Settings', text: 'No shortcuts are shown. Use Edit to add shortcuts without changing their saved settings.' }] };
    }
    var help = section ? root.HeavenlyQuickSettingsHelp.init(section, entries) : null;
    var config = root.HeavenlyQuickSettingsConfig.init({ presets: options.presets, write: write, fallbackFocus: function () { return editorTrigger; }, beforeOpen: function () { if (help) help.close(false); } });
    function renderPanel() {
      if (!tray) return;
      var settings = read(), saved = model.layout(settings);
      if (!modal.hidden && draft) saved.showInfoIcons = draft.showInfoIcons;
      var active = doc.activeElement;
      var popover = doc.getElementById('qs-help-popover');
      var focusedInHelp = !!active && popover && popover.contains(active);
      var focusedInPanel = !!active && (section.contains(active) || focusedInHelp);
      var focusId = active && active.id;
      if (focusedInHelp) { var anchor = section.querySelector('[data-qs-help][aria-expanded="true"]'); focusId = anchor && anchor.id; }
      if (help) help.close(false);
      tray.textContent = '';
      var headerInfo = doc.getElementById('quick-settings-info-btn');
      if (headerInfo) headerInfo.hidden = saved.showInfoIcons;
      var widgetGearAdded = false;
      model.groups(settings).forEach(function (category) {
        var group, controls;
        group = doc.createElement('div'); group.className = 'qs-navigation-group';
        group.setAttribute('role', 'group'); group.setAttribute('aria-label', category.name + ' shortcuts');
        var label = doc.createElement('span'); label.className = 'qs-group-label'; label.textContent = category.name;
        controls = doc.createElement('div'); controls.className = 'qs-controls';
        var heading = doc.createElement('div'); heading.className = 'qs-group-heading'; heading.appendChild(label);
        if (category.name === 'Widgets' && !widgetGearAdded) { heading.appendChild(config.button('widgets', 'Configure widgets', 'qs-widgets-config-btn')); widgetGearAdded = true; }
        group.appendChild(heading); group.appendChild(controls); tray.appendChild(group);
        category.items.forEach(function (item) {
          var id = item.id, state = model.state(item, settings);
          var unit = doc.createElement('div'); unit.className = 'qs-setting';
          var pill = doc.createElement('button'); pill.type = 'button'; pill.id = id; pill.className = 'qs-pill-chip';
          pill.setAttribute('aria-label', item.key === 'autoCloak' ? 'Auto Tab Cloaking' : item.name); pill.setAttribute('aria-describedby', id + '-help');
          pill.innerHTML = svg(model.icons[item.icon]) + '<span class="qs-pill-copy"><span>' + item.label + '</span><span class="qs-required" hidden></span></span>' + (item.href ? '' : '<span class="pill-dot" aria-hidden="true"></span>');
          if (!item.href) {
            pill.classList.toggle('active', state.effectiveEnabled === undefined ? state.enabled : state.effectiveEnabled); pill.disabled = state.disabled;
            pill.setAttribute('aria-pressed', String(state.enabled));
            var badge = pill.querySelector('.qs-required'); badge.hidden = !state.badge; badge.textContent = state.badge;
          }
          pill.title = item.href ? 'Open ' + item.name : state.reason || 'Toggle ' + (item.key === 'autoCloak' ? 'Auto Tab Cloaking' : item.name);
          pill.onclick = function () {
            if (item.href) { root.location.href = item.href; return; }
            var patch = {}, latest = read(), current = model.state(item, latest);
            if (current.disabled) return;
            if (item.configure === 'panic' && typeof latest.panicKey === 'string' && !latest.panicKey.trim()) { config.open('panic', pill); return; }
            patch[item.key] = item.inverted ? current.enabled : !current.enabled;
            if (!write(patch)) {
              var status = doc.getElementById('qs-panel-status'); status.textContent = 'Could not save this setting. Browser storage may be unavailable.';
            }
          };
          unit.appendChild(pill);
          if (item.configure) unit.appendChild(config.button(item.configure, 'Configure ' + item.label, id + '-config'));
          var info = doc.createElement('button'); info.type = 'button'; info.className = 'qs-help-button';
          info.hidden = !saved.showInfoIcons; info.id = id + '-info'; info.innerHTML = svg(infoIcon);
          info.setAttribute('data-qs-help', id); info.setAttribute('aria-label', 'About ' + item.name);
          info.setAttribute('aria-expanded', 'false'); info.setAttribute('aria-haspopup', 'dialog'); info.setAttribute('aria-controls', 'qs-help-popover');
          var explanation = doc.createElement('span'); explanation.id = id + '-help'; explanation.hidden = true; explanation.textContent = item.help + (state.reason ? ' ' + state.reason : '');
          unit.appendChild(info); unit.appendChild(explanation); controls.appendChild(unit);
        });
      });
      tray.classList.toggle('qs-has-widget-settings', widgetGearAdded);
      if (!saved.visible.length) {
        var empty = doc.createElement('p'); empty.className = 'qs-empty'; empty.textContent = 'Use Edit to add shortcuts.'; tray.appendChild(empty);
      }
      var status = doc.createElement('p'); status.id = 'qs-panel-status'; status.className = 'qs-panel-status'; status.setAttribute('role', 'status');
      var nav = root.HeavenlyNavigation.navigationSettings(settings);
      if (nav.showProxiedUrl && (nav.openBookmarksInAboutBlank || nav.openSearchInAboutBlank)) {
        status.textContent = (nav.openBookmarksInAboutBlank && nav.openSearchInAboutBlank ? 'Bookmarks and search' : nav.openBookmarksInAboutBlank ? 'Bookmarks' : 'Search') + ': about:blank keeps the address inside Heavenly.';
      }
      tray.appendChild(status);
      if (focusId) { var focused = doc.getElementById(focusId); if (focused && focused.getClientRects().length && !focused.disabled) focused.focus({ preventScroll: true }); else if (focusedInPanel) editorTrigger.focus({ preventScroll: true }); }
    }
    function conflict(current) {
      externalLayout = true;
      doc.getElementById('qs-editor-conflict').hidden = false;
      doc.getElementById('qs-editor-conflict-text').textContent = 'The shortcut layout changed in another tab. Your draft is kept. Load the saved layout or choose to save your draft instead.';
      doc.getElementById('qs-editor-conflict-actions').hidden = false;
      doc.getElementById('qs-editor-save').disabled = true;
    }
    function refresh() {
      syncedSettings = signature(read());
      renderPanel();
      if (options.onChange) options.onChange();
      config.refresh();
      if (!modal.hidden) {
        var current = read();
        if (signature(model.layout(current)) !== baseline) conflict(current);
        else if (signature(current) !== lastSettings && !externalLayout) {
          doc.getElementById('qs-editor-conflict').hidden = false;
          doc.getElementById('qs-editor-conflict-text').textContent = 'Other settings changed. Your shortcut draft is kept; Save only changes the shortcut layout.';
        }
        lastSettings = signature(current);
      }
    }
    function row(item, visible) {
      var li = doc.createElement('li'); li.dataset.shortcut = item.id; li.className = 'qs-editor-row';
      var name = doc.createElement('span'); name.className = 'qs-editor-name'; name.innerHTML = svg(model.icons[item.icon]);
      var text = doc.createElement('span'); text.textContent = item.name; name.appendChild(text); li.appendChild(name);
      li.__heavenlyDragItem = { kind:'shortcut', label:item.name, icon:name.querySelector('svg') };
      var actions = doc.createElement('div'); actions.className = 'qs-editor-actions';
      var show = doc.createElement('button'); show.type = 'button'; show.dataset.visibility = item.id;
      show.textContent = visible ? 'Hide' : 'Add'; show.setAttribute('aria-label', (visible ? 'Hide ' : 'Show ') + item.name + ' shortcut');
      show.onclick = function () {
        draft.visible = visible ? draft.visible.filter(function (id) { return id !== item.id; }) : draft.visible.concat(item.id);
        renderEditor();
        var next = modal.querySelector('[data-visibility="' + item.id + '"]');
        if (!visible) next.focus(); else modal.querySelector('summary').focus();
        announce(item.name + (visible ? ' hidden from draft' : ' added to draft'));
      };
      actions.appendChild(show);
      if (visible) {
        ['up', 'down'].forEach(function (direction) {
          var button = doc.createElement('button'); button.type = 'button'; button.dataset.move = direction; button.dataset.id = item.id;
          button.innerHTML = direction === 'up' ? '↑' : '↓'; button.setAttribute('aria-label', 'Move ' + item.name + ' ' + direction);
          var shown = visibleOrder(), index = shown.indexOf(item.id);
          button.disabled = direction === 'up' ? index === 0 : index === shown.length - 1;
          button.onclick = function () { move(item.id, shown[index + (direction === 'up' ? -1 : 1)], direction === 'down'); var next = modal.querySelector('[data-id="' + item.id + '"][data-move="' + direction + '"]'); (next.disabled ? modal.querySelector('[data-handle="' + item.id + '"]') : next).focus(); };
          actions.appendChild(button);
        });
        var handle = doc.createElement('button'); handle.type = 'button'; handle.className = 'qs-editor-handle'; handle.dataset.handle = item.id;
        handle.textContent = '⠿'; handle.setAttribute('aria-label', 'Reorder ' + item.name); handle.setAttribute('aria-describedby', 'qs-editor-drag-hint');
        handle.addEventListener('pointerdown', startDrag);
        handle.addEventListener('keydown', function (event) {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault(); var shown = visibleOrder(), index = shown.indexOf(item.id), down = event.key === 'ArrowDown';
          var target = shown[index + (down ? 1 : -1)]; if (target) { move(item.id, target, down); modal.querySelector('[data-handle="' + item.id + '"]').focus(); }
        });
        actions.appendChild(handle);
      }
      li.appendChild(actions); return li;
    }
    function visibleOrder() { return draft.order.filter(function (id) { return draft.visible.indexOf(id) !== -1; }); }
    function renderEditor() {
      var visible = doc.getElementById('qs-editor-visible'), available = doc.getElementById('qs-editor-available');
      visible.textContent = ''; available.textContent = '';
      draft.order.forEach(function (id) { var shown = draft.visible.indexOf(id) !== -1; (shown ? visible : available).appendChild(row(itemById(id), shown)); });
      var more = doc.getElementById('qs-editor-more');
      more.hidden = available.children.length === 0;
      if (more.hidden) more.open = false;
      doc.getElementById('qs-editor-empty').hidden = draft.visible.length !== 0;
      doc.getElementById('qs-editor-info-icons').checked = draft.showInfoIcons;
    }
    function move(id, target, after) {
      if (!target || id === target) return;
      draft.order = draft.order.filter(function (key) { return key !== id; });
      draft.order.splice(draft.order.indexOf(target) + (after ? 1 : 0), 0, id);
      renderEditor(); announce(itemById(id).name + ' moved to position ' + (visibleOrder().indexOf(id) + 1));
    }
    // Handle-only hold prevents a scroll gesture over a row from becoming a drag.
    function startDrag(event) {
      if (event.pointerType === 'touch' && touchPointers.size !== 1) return;
      if (event.button !== 0 || drag) return;
      var handle = event.currentTarget;
      drag = { id: handle.dataset.handle, pointer: event.pointerId, x: event.clientX, y: event.clientY, item: handle.closest('.qs-editor-row').__heavenlyDragItem, input: event.pointerType, active: event.pointerType !== 'touch', target: null, after: false };
      handle.setPointerCapture(event.pointerId);
      if (!drag.active) drag.timer = root.setTimeout(function () { if (drag) { drag.active = true; handle.classList.add('is-dragging'); } }, 400);
      handle.addEventListener('pointermove', dragMove);
      handle.addEventListener('pointerup', finishDrag);
      handle.addEventListener('pointercancel', cancelDrag);
      handle.addEventListener('lostpointercapture', cancelDrag);
      drag.handle = handle;
    }
    function dragMove(event) {
      if (!drag || event.pointerId !== drag.pointer) return;
      if (!drag.active) { if (Math.abs(event.clientX - drag.x) > 8 || Math.abs(event.clientY - drag.y) > 8) cancelDrag(); return; }
      event.preventDefault(); drag.handle.classList.add('is-dragging');
      if (!drag.preview && root.HeavenlyDrag) drag.preview = root.HeavenlyDrag.create({ id:'heavenly-shortcut-drag-avatar', icon:drag.item.icon, label:drag.item.label, kind:drag.item.kind, input:drag.input, x:event.clientX, y:event.clientY });
      if (drag.preview) drag.preview.move(event.clientX,event.clientY);
      drag.clientX = event.clientX; drag.clientY = event.clientY;
      previewDrop(event.clientX, event.clientY);
      var body = modal.querySelector('.qs-editor-body'), rect = body.getBoundingClientRect();
      root.cancelAnimationFrame(dragFrame);
      var speed = event.clientY < rect.top + 35 ? -8 : event.clientY > rect.bottom - 35 ? 8 : 0;
      function scroll() { if (!drag) return; var previous = body.scrollTop; body.scrollTop += speed; previewDrop(drag.clientX, drag.clientY); if (body.scrollTop !== previous) dragFrame = root.requestAnimationFrame(scroll); }
      if (speed) dragFrame = root.requestAnimationFrame(scroll);
    }
    function previewDrop(x, y) {
      var hit = doc.elementFromPoint(x, y);
      var target = hit && hit.closest('#qs-editor-visible .qs-editor-row');
      drag.target = target ? target.dataset.shortcut : null;
      drag.after = target && y > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
      modal.querySelectorAll('.qs-drop-before, .qs-drop-after').forEach(function (node) { node.classList.remove('qs-drop-before', 'qs-drop-after'); });
      if (target && drag.target !== drag.id) target.classList.add(drag.after ? 'qs-drop-after' : 'qs-drop-before');
    }
    function finishDrag(event) {
      if (!drag || event.pointerId !== drag.pointer) return;
      var done = drag; cancelDrag();
      if (done.active && done.target) { move(done.id, done.target, done.after); modal.querySelector('[data-handle="' + done.id + '"]').focus(); }
    }
    function cancelDrag() {
      if (!drag) return;
      root.clearTimeout(drag.timer); root.cancelAnimationFrame(dragFrame);
      if (drag.preview) drag.preview.destroy();
      var handle = drag.handle, pointer = drag.pointer; drag = null;
      handle.removeEventListener('pointermove', dragMove); handle.removeEventListener('pointerup', finishDrag); handle.removeEventListener('pointercancel', cancelDrag); handle.removeEventListener('lostpointercapture', cancelDrag);
      handle.classList.remove('is-dragging'); if (handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer);
      modal.querySelectorAll('.qs-drop-before, .qs-drop-after').forEach(function (node) { node.classList.remove('qs-drop-before', 'qs-drop-after'); });
    }
    function open() {
      if (help) help.close(false);
      var current = read(); draft = model.layout(current); baseline = signature(draft); lastSettings = signature(current); externalLayout = false;
      doc.getElementById('qs-editor-conflict').hidden = true; doc.getElementById('qs-editor-conflict-actions').hidden = true; doc.getElementById('qs-editor-error').hidden = true;
      doc.getElementById('qs-editor-save').disabled = false;
      doc.getElementById('qs-editor-more').open = false;
      renderEditor(); dialog.open();
    }
    var dialog = root.HeavenlyQuickSettingsDialog.create(modal, { onClose: function () { cancelDrag(); draft = null; renderPanel(); }, fallbackFocus: function () { return editorTrigger; } });
    function close() { dialog.close(); }
    editorTrigger.addEventListener('click', open);
    doc.getElementById('qs-editor-info-icons').onchange = function (event) { draft.showInfoIcons = event.target.checked; renderPanel(); };
    doc.getElementById('qs-editor-reset').onclick = function () { cancelDrag(); draft = model.layout({}); renderEditor(); renderPanel(); announce('Default shortcuts restored in draft. Save to apply.'); };
    doc.getElementById('qs-editor-load').onclick = function () {
      cancelDrag(); var current = read(); draft = model.layout(current); baseline = signature(draft); lastSettings = signature(current); externalLayout = false;
      doc.getElementById('qs-editor-conflict').hidden = true; doc.getElementById('qs-editor-conflict-actions').hidden = true; doc.getElementById('qs-editor-save').disabled = false; renderEditor(); renderPanel();
      modal.querySelector('[data-editor-close]').focus();
    };
    doc.getElementById('qs-editor-keep').onclick = function () {
      baseline = signature(model.layout(read())); externalLayout = false; doc.getElementById('qs-editor-save').disabled = false;
      doc.getElementById('qs-editor-conflict-actions').hidden = true; doc.getElementById('qs-editor-conflict-text').textContent = 'Your draft will replace the saved shortcut layout. Other settings will be kept.';
      doc.getElementById('qs-editor-save').focus();
    };
    doc.getElementById('qs-editor-save').onclick = function () {
      cancelDrag(); var current = read();
      if (signature(model.layout(current)) !== baseline) { conflict(current); return; }
      if (!write({ quickSettings: model.mergeLayout(current, draft) })) {
        doc.getElementById('qs-editor-error').hidden = false; doc.getElementById('qs-editor-error').textContent = 'Could not save. Your draft is kept. Check that browser storage is available and try again.'; return;
      }
      close();
    };
    // Both same-window saves and cross-tab changes refresh the panel, not the draft.
    root.addEventListener('heavenly:settings-change', refresh);
    root.addEventListener('storage', function (event) { if (!event.key || event.key === 'heavenly_settings') refresh(); });
    // A delayed initial pageshow must not interrupt help or configuration focus.
    // Restore from the back/forward cache, or refresh if saved values changed.
    root.addEventListener('pageshow', function (event) { if (event.persisted || signature(read()) !== syncedSettings) refresh(); });
    // A second finger anywhere cancels both a pending hold and an active drag.
    doc.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'touch') return;
      touchPointers.add(event.pointerId);
      if (touchPointers.size > 1) cancelDrag();
    }, true);
    ['pointerup', 'pointercancel'].forEach(function (type) {
      doc.addEventListener(type, function (event) { touchPointers.delete(event.pointerId); }, true);
    });
    function interruptDrag() { touchPointers.clear(); cancelDrag(); }
    root.addEventListener('blur', interruptDrag);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) interruptDrag(); });
    var hint = doc.createElement('p'); hint.id = 'qs-editor-drag-hint'; hint.className = 'qs-sr-only'; hint.textContent = 'Hold the handle to drag. Use Up and Down arrows or the Move buttons to reorder.'; card.appendChild(hint);
    renderPanel();
    return { closeHelp: function () { if (help) help.close(false); } };
  } };
})(window);
