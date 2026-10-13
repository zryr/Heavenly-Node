(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./heavenly-navigation'));
  else root.HeavenlyQuickSettingsModel = factory(root.HeavenlyNavigation);
})(typeof window !== 'undefined' ? window : this, function (navigation) {
  'use strict';
  var icons = {
    tab: '<path d="M15 3h6v6M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    blank: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M7 6h.01M11 6h.01"/>',
    link: '<path d="m10 13 4-4M15 7l2-2a4.24 4.24 0 0 1 6 6l-4 4a4.24 4.24 0 0 1-6 0M9 17l-2 2a4.24 4.24 0 0 1-6-6l4-4a4.24 4.24 0 0 1 6 0"/>',
    cloak: '<path d="M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m9 12 2 2 4-4"/>',
    touch: '<path d="M9 11V5a2 2 0 0 1 4 0v6l2-1 5 3-1 7H9l-5-6a2 2 0 0 1 3-2z"/>',
    panic: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/>',
    dock: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16h18M8 19h.01M12 19h.01M16 19h.01"/>',
    widgets: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };
  // One catalog supplies both the panel and editor, including all help content.
  var items = [
    { id: 'pill-bm-newtab', group: 'Bookmarks', label: 'New Tab', name: 'Bookmarks in New Tab', key: 'openBookmarksInNewTab', icon: 'tab', requiredBy: 'openBookmarksInAboutBlank', help: 'Open bookmarks in a new browser tab. With about:blank on, a new tab is required; your New Tab preference is remembered for when you turn about:blank off.' },
    { id: 'pill-bm-blank', group: 'Bookmarks', label: 'about:blank', name: 'Bookmarks in about:blank', key: 'openBookmarksInAboutBlank', icon: 'blank', help: 'Open proxied bookmarks inside an about:blank tab when supported. This always opens a new tab. Direct websites open normally; if the wrapper cannot load a site, Heavenly opens it normally instead.' },
    { id: 'pill-search-newtab', group: 'Search', label: 'New Tab', name: 'Search in New Tab', key: 'openSearchInNewTab', icon: 'tab', requiredBy: 'openSearchInAboutBlank', help: 'Open websites from the main address or search field in a new browser tab. With about:blank on, a new tab is required; your New Tab preference is remembered for when you turn about:blank off.' },
    { id: 'pill-search-blank', group: 'Search', label: 'about:blank', name: 'Search in about:blank', key: 'openSearchInAboutBlank', icon: 'blank', help: 'Open destinations from the main address or search field inside an about:blank tab when supported. This always opens a new tab. If the wrapper cannot load a site, Heavenly opens it normally instead.' },
    { id: 'pill-proxy-url', group: 'General', label: 'Show Proxied URL', name: 'Show Proxied URL', key: 'showProxiedUrl', icon: 'link', help: 'On: normal navigation shows the website’s proxied address in the browser address bar. Off: Heavenly uses a browsing wrapper when supported. In about:blank, the address bar stays about:blank; this setting shows the proxied address inside Heavenly instead. Browser restrictions and compatibility fallbacks still apply.' },
    { id: 'pill-tab-cloak', group: 'Privacy', label: 'Tab Cloaking', name: 'Auto Tab Cloaking', key: 'autoCloak', icon: 'cloak', master: 'features', configure: 'cloaking', help: 'Use your selected tab title and icon when a supported Heavenly tab is in the background, then restore its original appearance when you return. Persistent Cloaking keeps the disguise on all the time. Use the settings button to choose a preset; changing a preset keeps both cloak preferences unchanged.' },
    { id: 'pill-persistent-cloak', group: 'Privacy', label: 'Persistent Cloaking', name: 'Persistent Cloaking', key: 'persistentCloak', icon: 'cloak', master: 'features', help: 'Keep your selected tab title and icon on Heavenly and supported proxied pages. Choose the title and icon in Settings. Auto Tab Cloaking only cloaks background tabs. These modes are independent; turning either off preserves the other mode and your selected preset.' },
    { id: 'pill-panic-settings', group: 'Privacy', label: 'Panic Key', name: 'Panic Key', key: 'panicKeyEnable', icon: 'panic', master: 'features', configure: 'panic', help: 'Enable the saved keyboard shortcut on supported proxied pages. This pill does not trigger a panic redirect. Use its settings button to change the key, destination, or independent Touch Panic Overlay. Disabling the shortcut keeps your key and destination.' },
    { id: 'pill-touch-panic', group: 'Privacy', label: 'Touch Panic Overlay', name: 'Touch Panic Overlay', key: 'touchPanic', defaultValue: true, icon: 'touch', master: 'features', help: 'Show the existing emergency touch button on supported proxied pages. The button uses your saved panic destination. Refresh an already open proxied website to apply this change.' },
    { id: 'pill-widget-dock', group: 'Widgets', label: 'Widget Dock', name: 'Widget Dock', key: 'useWidgetDock', defaultValue: true, icon: 'dock', master: 'widgets', help: 'Group enabled proxied-page widgets in the existing collapsible dock. Turning this off uses floating widgets. Saved widget and dock positions are kept. Refresh an already open proxied website to apply this change.' },
    { id: 'pill-widgets', group: 'Widgets', label: 'Proxied Widgets', name: 'Proxied Widgets', key: 'disableAllWidgets', inverted: true, icon: 'widgets', master: 'features', help: 'On: allow your saved proxied-page widgets to appear. Off: hide all proxied-page widgets. Individual widget preferences and positions are kept. Refresh an already open proxied website to apply this change. Disable All Privacy & Widget Overlays still takes precedence.' }
  ];
  var ids = items.map(function (item) { return item.id; });
  var defaults = ids.slice(0, 5);
  // First occurrence orders groups; saved relative order within each group is kept.
  function groups(settings) {
    var saved = layout(settings), result = [];
    saved.order.forEach(function (id) {
      if (saved.visible.indexOf(id) === -1) return;
      var item = items.find(function (entry) { return entry.id === id; });
      var group = result.find(function (entry) { return entry.name === item.group; });
      if (!group) { group = { name: item.group, items: [] }; result.push(group); }
      group.items.push(item);
    });
    return result;
  }
  function validIds(value) {
    return value.filter(function (id, index) { return ids.indexOf(id) !== -1 && value.indexOf(id) === index; });
  }
  function layout(settings) {
    var saved = settings && settings.quickSettings;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    var order = Array.isArray(saved.order) ? validIds(saved.order) : [];
    return {
      order: order.concat(ids.filter(function (id) { return order.indexOf(id) === -1; })),
      visible: Array.isArray(saved.visible) ? validIds(saved.visible) : defaults.slice(),
      showInfoIcons: saved.showInfoIcons === true
    };
  }
  function mergeLayout(settings, draft) {
    var saved = settings && settings.quickSettings;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    var normalized = layout({ quickSettings: draft });
    // Keep unknown fields/shortcut IDs for forward compatibility during a downgrade.
    function unknown(value) { return Array.isArray(value) ? value.filter(function (id) { return typeof id === 'string' && ids.indexOf(id) === -1; }) : []; }
    return Object.assign({}, saved, normalized, {
      order: normalized.order.concat(unknown(saved.order)),
      visible: normalized.visible.concat(unknown(saved.visible))
    });
  }
  function state(item, settings) {
    settings = navigation.navigationSettings(settings);
    var savedValue = settings[item.key] === undefined ? !!item.defaultValue : !!settings[item.key];
    var enabled = item.inverted ? !savedValue : savedValue;
    var required = !!(item.requiredBy && settings[item.requiredBy]);
    var paused = !!(item.master && (settings.disableAllFeatures || (item.master === 'widgets' && settings.disableAllWidgets)));
    var needsKey = item.key === 'panicKeyEnable' && typeof settings.panicKey === 'string' && !settings.panicKey.trim();
    if (!paused && needsKey) return { enabled: false, disabled: false, badge: 'Set key', reason: 'Choose a panic key using the adjacent settings button before enabling this shortcut.' };
    var reason = required ? 'New Tab is currently required by about:blank; your preference is remembered.' : '';
    if (paused) reason = settings.disableAllFeatures ? 'Disable All Privacy & Widget Overlays in Settings pauses this feature; your saved preference is kept. Open its configuration or Settings master controls to resume it.' : 'Proxied Widgets is off in Settings. Enable it to resume the dock; your saved choices are kept.';
    return { enabled: !paused && (required || enabled), disabled: required || paused, badge: required ? 'Required' : paused ? 'Paused' : '', reason: reason };
  }
  var configurations = {
    widgets: [
      { key: 'disableAllWidgets', label: 'Proxied Widgets', type: 'checkbox', inverted: true, defaultValue: false },
      { key: 'useWidgetDock', label: 'Widget Dock', type: 'checkbox', defaultValue: true },
      { key: 'dockPosition', label: 'Dock edge', type: 'select', defaultValue: 'bottom', values: ['bottom', 'top', 'left', 'right'] },
      { key: 'showScrollLock', label: 'Scroll Lock', type: 'checkbox', defaultValue: true },
      { key: 'showMagnifier', label: 'Magnifier', type: 'checkbox', defaultValue: true },
      { key: 'showNavBookmark', label: 'Bookmark Page button', type: 'checkbox', defaultValue: true },
      { key: 'showNavSearch', label: 'Quick Search bar', type: 'checkbox', defaultValue: true },
      { key: 'showNavHome', label: 'Home button', type: 'checkbox', defaultValue: true }
    ],
    panic: [
      { key: 'panicKeyEnable', label: 'Panic Key Shortcut', type: 'checkbox', defaultValue: false },
      { key: 'panicKey', label: 'Panic key (key name or code)', type: 'text', maxLength: 10, defaultValue: '`' },
      { key: 'panicUrl', label: 'Panic Redirect URL', type: 'text', inputMode: 'url', defaultValue: 'https://classroom.google.com' },
      { key: 'touchPanic', label: 'Touch Panic Overlay', type: 'checkbox', defaultValue: true }
    ],
    cloaking: [
      { key: 'autoCloak', label: 'Auto Tab Cloaking', type: 'checkbox', defaultValue: false },
      { key: 'persistentCloak', label: 'Persistent Cloaking', type: 'checkbox', defaultValue: false },
      { key: 'selectedPreset', label: 'Cloak preset', type: 'select', defaultValue: 'classroom' }
    ]
  };
  function configValues(kind, settings) {
    var result = {};
    configurations[kind].forEach(function (field) { result[field.key] = settings[field.key] === undefined ? field.defaultValue : settings[field.key]; });
    return result;
  }
  function configPatch(kind, baseline, draft) {
    var patch = {};
    configurations[kind].forEach(function (field) { if (draft[field.key] !== baseline[field.key]) patch[field.key] = draft[field.key]; });
    return patch;
  }
  return { groups: groups, configurations: configurations, configValues: configValues, configPatch: configPatch, items: items, icons: icons, layout: layout, mergeLayout: mergeLayout, state: state };
});
