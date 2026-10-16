/* Compact editors for existing settings; save only edited fields, never shortcut layout. */
(function (root) {
  'use strict';
  var gear = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
  var model = root.HeavenlyQuickSettingsModel;
  function read() { try { return root.HeavenlyNavigation.readSettings(root.localStorage); } catch (e) { return {}; } }
  root.HeavenlyQuickSettingsConfig = { init: function (options) {
    var doc = root.document, kind = null, baseline = {}, draft = {}, saving = false, conflicts = [];
    var modal = doc.createElement('div'); modal.id = 'qs-context-editor'; modal.className = 'qs-editor-backdrop'; modal.hidden = true;
    modal.innerHTML = '<section class="qs-editor-card qs-context-card" role="dialog" aria-modal="true" aria-labelledby="qs-context-title" aria-describedby="qs-context-description">' +
      '<header class="qs-editor-header"><div><h2 id="qs-context-title"></h2><p id="qs-context-description"></p></div><button type="button" data-dialog-close aria-label="Cancel configuration">×</button></header>' +
      '<div class="qs-editor-body"><div id="qs-context-conflict" role="status" hidden><p>These settings changed elsewhere. Your edits are kept. Load the saved values or choose to keep your edits.</p><button type="button" id="qs-context-load">Load saved settings</button><button type="button" id="qs-context-keep">Keep my changes</button></div>' +
      '<p id="qs-context-master" class="qs-context-notice" role="status" hidden></p><a id="qs-context-master-link" href="/settings.html#master-controls" hidden>Manage master controls</a><div id="qs-context-controls"></div><div id="qs-context-preview" class="qs-cloak-preview" hidden><span class="qs-group-label">Selected preset preview</span><div><img id="qs-context-icon" alt="" width="20" height="20"><span id="qs-context-preview-title"></span></div></div>' +
      '<details id="qs-context-pool" hidden><summary>Randomizer Preset Pool <span id="qs-context-pool-count"></span></summary><div class="qs-pool-actions"><button type="button" id="qs-context-pool-all">Select All</button><button type="button" id="qs-context-pool-none">Deselect All</button></div><div id="qs-context-pool-chips"></div><p id="qs-context-pool-note" class="qs-editor-note"></p></details>' +
      '<p id="qs-context-note" class="qs-editor-note"></p><p id="qs-context-error" role="alert" hidden></p></div>' +
      '<footer class="qs-editor-footer"><a id="qs-context-advanced" href="/settings.html">Advanced settings</a><div><button type="button" data-dialog-close>Cancel</button><button type="button" id="qs-context-save" class="qs-primary">Save</button></div></footer></section>';
    doc.body.appendChild(modal);
    function get(id) { return doc.getElementById('qs-context-' + id); }
    var dialog = root.HeavenlyQuickSettingsDialog.create(modal, { fallbackFocus: options.fallbackFocus, onClose: function () { kind = null; conflicts = []; } });
    function presets(settings) {
      var custom = settings.customPresets;
      if (!custom || typeof custom !== 'object' || Array.isArray(custom)) custom = {};
      return Object.assign({}, options.presets || {}, custom);
    }
    function dirty(key) { return !model.same(draft[key], baseline[key]); }
    function blocked(field, settings) {
      if (field.key === 'selectedPreset' || field.type === 'pool' || (kind === 'panic' && field.type === 'text')) return false;
      if (settings.disableAllFeatures) return true;
      if (kind === 'widgets' && field.key !== 'disableAllWidgets') return !!draft.disableAllWidgets;
      return false;
    }
    function updatePreview(settings) {
      if (kind !== 'cloaking') return;
      var preset = presets(settings)[draft.selectedPreset];
      get('preview-title').textContent = preset && typeof preset.title === 'string' ? preset.title : 'Preset unavailable — choose another or open advanced settings.';
      var icon = get('icon');
      var source = preset && typeof preset.icon === 'string' ? preset.icon : '';
      icon.hidden = !source || (icon.getAttribute('src') === source && icon.complete && !icon.naturalWidth);
      if (source && icon.getAttribute('src') !== source) { icon.onerror = function () { icon.hidden = true; }; icon.src = source; }
    }
    function render(settings, rebuild) {
      var definitions = model.configurations[kind], controls = get('controls'), allPresets = presets(settings);
      var focusedKey = doc.activeElement && doc.activeElement.getAttribute('data-config-field');
      if (rebuild) controls.textContent = '';
      if (rebuild && kind === 'cloaking') { var heading = doc.createElement('h3'); heading.className = 'qs-context-group-title'; heading.textContent = 'Cloaking Behavior'; controls.appendChild(heading); }
      definitions.forEach(function (field) {
        if (field.type === 'pool') return;
        if (rebuild && kind === 'cloaking' && field.key === 'selectedPreset') { var heading = doc.createElement('h3'); heading.className = 'qs-context-group-title'; heading.textContent = 'Cloaking Identity'; controls.appendChild(heading); }
        var input = controls.querySelector('[data-config-field="' + field.key + '"]');
        if (!input) {
          var label = doc.createElement('label'); label.className = 'qs-context-field';
          var text = doc.createElement('span'); text.textContent = field.label; label.appendChild(text);
          input = doc.createElement(field.type === 'select' ? 'select' : 'input');
          if (field.type !== 'select') input.type = field.type;
          if (field.maxLength) input.maxLength = field.maxLength;
          if (field.inputMode) input.inputMode = field.inputMode;
          input.dataset.configField = field.key;
          input.id = 'qs-config-' + field.key; label.htmlFor = input.id;
          input.setAttribute('aria-describedby', 'qs-context-note');
          if (field.type === 'checkbox') {
            // Keep the native, labelled input and its existing change handler.
            // A scoped visual switch avoids platform checkbox glyph clipping.
            var toggle = doc.createElement('span'); toggle.className = 'qs-switch';
            var track = doc.createElement('span'); track.className = 'qs-switch-track'; track.setAttribute('aria-hidden', 'true');
            input.setAttribute('role', 'switch'); toggle.appendChild(input); toggle.appendChild(track); label.appendChild(toggle);
          } else {
            label.classList.add('qs-context-form-field'); label.appendChild(input);
          }
          controls.appendChild(label);
          input.addEventListener(field.type === 'text' ? 'input' : 'change', function () {
            draft[field.key] = field.type === 'checkbox' ? (field.inverted ? !input.checked : input.checked) : input.value;
            get('error').hidden = true; refresh();
          });
        }
        if (field.type === 'select') {
          var available = field.values ? field.values.map(function (value) { return [value, value.charAt(0).toUpperCase() + value.slice(1)]; }) : Object.keys(allPresets).filter(function (key) { var preset = allPresets[key]; return preset && typeof preset.title === 'string'; }).map(function (key) { var preset = allPresets[key]; return [key, preset.title + (Object.prototype.hasOwnProperty.call(options.presets || {}, key) ? '' : ' (Custom)')]; });
          input.textContent = '';
          if (!available.some(function (option) { return option[0] === draft[field.key]; })) available.unshift([draft[field.key], 'Saved option unavailable']);
          available.forEach(function (entry) { var option = doc.createElement('option'); option.value = entry[0]; option.textContent = entry[1]; input.appendChild(option); });
          input.value = draft[field.key];
        } else if (field.type === 'checkbox') input.checked = field.inverted ? !draft[field.key] : !!draft[field.key];
        else if (input.value !== draft[field.key]) input.value = draft[field.key];
        input.disabled = blocked(field, settings);
      });
      get('master-link').hidden = !settings.disableAllFeatures;
      get('master').hidden = !settings.disableAllFeatures && !(kind === 'widgets' && draft.disableAllWidgets);
      get('master').textContent = settings.disableAllFeatures ? 'Disable All Privacy & Widget Overlays pauses these controls. Your saved choices are kept; manage the master control in advanced settings.' : 'Proxied Widgets is off. Individual widget and dock choices are kept for when widgets are enabled.';
      get('note').textContent = kind === 'widgets' ? 'Refresh an already open proxied website to apply widget changes. Saved floating positions are kept. These controls change features, not shortcut visibility.' : kind === 'panic' ? 'Use an existing key name (such as Escape) or keyboard code (such as Backquote). Configuring these values never redirects you. Disabling Panic Key keeps the key and destination. Refresh an open proxied page to apply Touch Panic Overlay visibility changes.' : 'Changing the preset keeps Auto and Persistent Cloaking unchanged. Create or edit custom presets in advanced settings.' + ' Randomization chooses from your saved pool for each applicable session and takes precedence over the manual preset while enabled. The manual choice and pool are kept when it is off.';
      get('conflict').hidden = conflicts.length === 0; get('save').disabled = conflicts.length !== 0;
      updatePreview(settings);
      if (kind === 'cloaking') {
        var pool = root.HeavenlyCloakPool;
        get('pool-count').textContent = pool.selected(draft.randomPool, allPresets) + ' selected';
        if (get('pool').open) pool.render(get('pool-chips'), allPresets, draft.randomPool, function (next) { draft.randomPool = next; get('error').hidden = true; refresh(); });
        var selected = pool.selected(draft.randomPool, allPresets);
        var unavailable = draft.randomPool.some(function (key) { return pool.keys(allPresets).indexOf(key) === -1; });
        get('pool-note').textContent = (selected ? 'Only selected presets are eligible.' : 'No matching selections: the existing randomizer uses all available presets.') + (unavailable ? ' Saved unavailable entries are kept.' : '') + ' Editing the pool never enables randomization.';
      }
      if (rebuild && focusedKey) { var focused = controls.querySelector('[data-config-field="' + focusedKey + '"]'); if (focused && !focused.disabled) focused.focus(); }
    }
    function refresh() {
      if (modal.hidden || saving) return;
      var current = read(), values = model.configValues(kind, current);
      conflicts = [];
      Object.keys(values).forEach(function (key) {
        if (dirty(key)) { if (!model.same(values[key], baseline[key]) && !model.same(values[key], draft[key])) conflicts.push(key); }
        else { baseline[key] = values[key]; draft[key] = values[key]; }
      });
      render(current, false);
    }
    function open(mode, trigger) {
      if (!model.configurations[mode] || !modal.hidden || doc.querySelector('.qs-editor-backdrop:not([hidden])')) return;
      if (options.beforeOpen) options.beforeOpen();
      kind = mode; var current = read(); baseline = model.configValues(kind, current); draft = Object.assign({}, baseline); conflicts = [];
      get('title').textContent = kind === 'widgets' ? 'Widget settings' : kind === 'panic' ? 'Panic Controls' : 'Tab Cloaking';
      get('description').textContent = kind === 'widgets' ? 'Configure the existing dock and proxied-page widgets.' : kind === 'panic' ? 'Configure the existing keyboard shortcut and touch button.' : 'Choose when to cloak tabs and which saved preset to use.';
      get('pool').hidden = kind !== 'cloaking'; get('pool').open = false; get('pool-chips').textContent = '';
      get('preview').hidden = kind !== 'cloaking'; get('error').hidden = true;
      get('advanced').href = '/settings.html#' + (kind === 'widgets' ? 'widget-settings' : kind === 'panic' ? 'panic-controls' : 'tab-cloaking');
      render(current, true); dialog.open(trigger);
    }
    // A full-Settings link may only change the hash on this page. Close the
    // modal before native navigation so its backdrop never traps that route.
    get('advanced').onclick = get('master-link').onclick = function () { dialog.close(); };
    get('pool').addEventListener('toggle', function () { if (kind === 'cloaking' && get('pool').open && !modal.hidden) refresh(); });
    get('pool-all').onclick = function () { draft.randomPool = root.HeavenlyCloakPool.all(draft.randomPool, presets(read())); refresh(); };
    get('pool-none').onclick = function () { draft.randomPool = []; refresh(); };
    get('load').onclick = function () { var current = read(); baseline = model.configValues(kind, current); draft = Object.assign({}, baseline); conflicts = []; render(current, false); get('save').focus(); };
    get('keep').onclick = function () {
      var values = model.configValues(kind, read());
      conflicts.forEach(function (key) { baseline[key] = values[key]; }); conflicts = []; refresh(); get('save').focus();
    };
    get('save').onclick = function () {
      refresh(); if (conflicts.length) return;
      var current = read();
      if (kind === 'panic') {
        if (dirty('panicKey')) draft.panicKey = draft.panicKey.trim();
        if (dirty('panicUrl')) draft.panicUrl = draft.panicUrl.trim() || 'https://classroom.google.com';
        if (draft.panicKeyEnable && !draft.panicKey.trim()) { get('error').hidden = false; get('error').textContent = 'Choose a panic key before enabling the keyboard shortcut.'; get('controls').querySelector('[data-config-field="panicKey"]').focus(); return; }
      }
      var patch = model.configPatch(kind, baseline, draft);
      var paused = model.configurations[kind].some(function (field) { return field.key in patch && field.key !== 'selectedPreset' && field.type !== 'pool' && !(kind === 'panic' && field.type === 'text') && (current.disableAllFeatures || (kind === 'widgets' && field.key !== 'disableAllWidgets' && current.disableAllWidgets && !dirty('disableAllWidgets'))); });
      if (paused) { get('error').hidden = false; get('error').textContent = 'A master control pauses an edited feature. Enable the feature or use advanced settings before saving; your draft is kept.'; return; }
      if (patch.selectedPreset && !presets(current)[patch.selectedPreset]) { get('error').hidden = false; get('error').textContent = 'This preset is no longer available. Choose another preset; your other edits are kept.'; return; }
      saving = true;
      var success = !Object.keys(patch).length || options.write(patch);
      saving = false;
      if (success) dialog.close(); else { get('error').hidden = false; get('error').textContent = 'Could not save. Your draft is kept. Check that browser storage is available and try again.'; }
    };
    doc.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-qs-config]'); if (trigger) open(trigger.getAttribute('data-qs-config'), trigger);
    });
    function button(mode, label, id) {
      var node = doc.createElement('button'); node.type = 'button'; node.id = id; node.className = 'qs-config-button'; node.innerHTML = gear;
      node.setAttribute('aria-label', label); node.title = label; node.setAttribute('data-qs-config', mode); node.setAttribute('aria-haspopup', 'dialog'); node.setAttribute('aria-controls', 'qs-context-editor');
      return node;
    }
    return { button: button, refresh: refresh, open: open };
  } };
})(window);
