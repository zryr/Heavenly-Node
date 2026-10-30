(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./heavenly-navigation'), require('./cloak-pool'));
  else root.HeavenlyQuickSettingsModel = factory(root.HeavenlyNavigation, root.HeavenlyCloakPool);
})(typeof window !== 'undefined' ? window : this, function (navigation, pool) {
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
    { id: 'pill-bm-newtab', group: 'Bookmarks', label: 'New Tab', name: 'Bookmarks in New Tab', key: 'openBookmarksInNewTab', icon: 'tab', requiredBy: 'openBookmarksInAboutBlank', help: 'Open bookmarks in a new tab. about:blank always needs a new tab. Your usual New Tab choice is kept for when you turn about:blank off.' },
    { id: 'pill-bm-blank', group: 'Bookmarks', label: 'about:blank', name: 'Bookmarks in about:blank', key: 'openBookmarksInAboutBlank', icon: 'blank', help: 'Open proxy bookmarks inside a new about:blank tab when supported. Direct links open normally. If a website cannot load inside the tab, Heavenly opens it normally. This does not make browsing private.' },
    { id: 'pill-search-newtab', group: 'Search', label: 'New Tab', name: 'Search in New Tab', key: 'openSearchInNewTab', icon: 'tab', requiredBy: 'openSearchInAboutBlank', help: 'Open websites from the main search bar in a new tab. about:blank always needs a new tab. Your usual New Tab choice is kept for when you turn about:blank off.' },
    { id: 'pill-search-blank', group: 'Search', label: 'about:blank', name: 'Search in about:blank', key: 'openSearchInAboutBlank', icon: 'blank', help: 'Open searches and website addresses inside a new about:blank tab when supported. If a website cannot load inside the tab, Heavenly opens it normally. This does not make browsing private.' },
    { id: 'pill-proxy-url', group: 'General', label: 'Show Proxied URL', name: 'Show Proxied URL', key: 'showProxiedUrl', icon: 'link', help: 'On: show the proxy website address in the browser bar. Off: use Heavenly’s browsing page when supported. In about:blank, the browser bar stays about:blank and the proxy address appears inside Heavenly. Websites may still open normally if they cannot load inside the page.' },
    { id: 'pill-tab-cloak', group: 'Privacy', label: 'Tab Cloaking', name: 'Tab Cloaking', key: 'autoCloak', icon: 'cloak', master: 'features', configure: 'cloaking', help: 'Turn Auto Tab Cloaking on or off: change the tab title and icon when you leave, then restore them when you return. Persistent Cloaking keeps the disguise on all the time; its badge shows when it is on. Use the gear to choose either mode, a saved disguise (preset), or a random choice each session. Choosing a preset does not turn either mode on or off.' },
    { id: 'pill-panic-settings', group: 'Privacy', label: 'Panic Key', name: 'Panic Key', key: 'panicKeyEnable', icon: 'panic', master: 'features', configure: 'panic', help: 'Turn on your saved panic key for supported proxy pages. Pressing that key opens your saved website or document workspace. This shortcut only turns the feature on or off. Use its gear to choose the key, website, or separate touch panic button. Turning it off keeps your choices.' },
    { id: 'pill-touch-panic', group: 'Privacy', label: 'Touch Panic Overlay', name: 'Touch Panic Overlay', key: 'touchPanic', defaultValue: true, icon: 'touch', master: 'features', help: 'Show a floating panic button on supported proxy pages. Tap it to open your saved website or document workspace. Refresh an open proxy page to apply this change.' },
    { id: 'pill-widget-dock', group: 'Widgets', label: 'Widget Dock', name: 'Widget Dock', key: 'useWidgetDock', defaultValue: true, icon: 'dock', master: 'widgets', help: 'Keep proxy page tools together in a dock. Turn this off to use separate floating tools. Their saved positions are kept. Refresh an open proxy page to apply this change.' },
    { id: 'pill-widgets', group: 'Widgets', label: 'Proxied Widgets', name: 'Proxied Widgets', key: 'disableAllWidgets', inverted: true, icon: 'widgets', master: 'features', help: 'On: show your chosen proxy page tools. Off: hide them all and keep their settings and positions. Refresh an open proxy page to apply this change. The switch to turn off cloaking, panic & widgets in Settings can also pause these tools.' }
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
    // Replace a visible legacy Persistent shortcut in place. If Tab Cloaking
    // was already visible, retain its chosen position and remove only the retired ID.
    var legacy = 'pill-persistent-cloak', cloak = 'pill-tab-cloak';
    var replaceLegacy = Array.isArray(saved.visible) && saved.visible.indexOf(legacy) !== -1 && saved.visible.indexOf(cloak) === -1;
    function migrate(value) {
      if (!Array.isArray(value)) return value;
      return value.filter(function (id) { return !(replaceLegacy && id === cloak); }).map(function (id) { return id === legacy && replaceLegacy ? cloak : id; }).filter(function (id) { return id !== legacy; });
    }
    var order = Array.isArray(saved.order) ? validIds(migrate(saved.order)) : [];
    return {
      order: order.concat(ids.filter(function (id) { return order.indexOf(id) === -1; })),
      visible: Array.isArray(saved.visible) ? validIds(migrate(saved.visible)) : defaults.slice(),
      showInfoIcons: saved.showInfoIcons === true
    };
  }
  function mergeLayout(settings, draft) {
    var saved = settings && settings.quickSettings;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    var normalized = layout({ quickSettings: draft });
    // Keep unknown fields/shortcut IDs for forward compatibility during a downgrade.
    function unknown(value) { return Array.isArray(value) ? value.filter(function (id) { return typeof id === 'string' && id !== 'pill-persistent-cloak' && ids.indexOf(id) === -1; }) : []; }
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
    if (!paused && needsKey) return { enabled: false, disabled: false, badge: 'Set key', reason: 'Use the gear beside this shortcut to choose a panic key first.' };
    var reason = required ? 'about:blank needs a new tab. Your usual New Tab choice is kept.' : '';
    if (paused) reason = settings.disableAllFeatures ? 'This feature is paused by the switch to turn off cloaking, panic & widgets in Settings. Your saved choice is kept. Open its settings to turn it back on.' : 'Proxied Widgets is off in Settings. Turn it on to use the dock again. Your saved choices are kept.';
    var badge = required ? 'Required' : paused ? 'Paused' : '';
    var effectiveEnabled = !paused && (required || enabled);
    if (item.key === 'autoCloak' && !paused && settings.persistentCloak) {
      effectiveEnabled = true; badge = enabled ? 'Auto + Persistent' : 'Persistent';
      reason = 'Persistent Cloaking is on; Auto Tab Cloaking is ' + (enabled ? 'on' : 'off') + '. This shortcut changes Auto only. Use the gear to choose either mode.';
    }
    return { enabled: !paused && (required || enabled), effectiveEnabled: effectiveEnabled, disabled: required || paused, badge: badge, reason: reason };
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
      { key: 'randomizePresetEachSession', label: 'Randomize Preset Each Session', type: 'checkbox', defaultValue: false },
      { key: 'randomPool', label: 'Randomizer Preset Pool', type: 'pool' },
      { key: 'selectedPreset', label: 'Cloak preset', type: 'select', defaultValue: 'classroom' }
    ]
  };
  function configValues(kind, settings) {
    var result = {};
    configurations[kind].forEach(function (field) { result[field.key] = field.type === 'pool' ? pool.values(settings) : settings[field.key] === undefined ? field.defaultValue : settings[field.key]; });
    return result;
  }
  function same(a, b) { return Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b; }
  function configPatch(kind, baseline, draft) {
    var patch = {};
    configurations[kind].forEach(function (field) { if (!same(draft[field.key], baseline[field.key])) patch[field.key] = draft[field.key]; });
    return patch;
  }
  return { same: same, groups: groups, configurations: configurations, configValues: configValues, configPatch: configPatch, items: items, icons: icons, layout: layout, mergeLayout: mergeLayout, state: state };
});
