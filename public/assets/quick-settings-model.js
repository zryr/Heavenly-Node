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
    { id: 'pill-persistent-cloak', group: 'Privacy', label: 'Persistent Cloaking', name: 'Persistent Cloaking', key: 'persistentCloak', icon: 'cloak', master: 'features', help: 'Keep your selected tab title and icon on Heavenly and supported proxied pages. Choose the title and icon in Settings. Turning this off preserves your selected preset.' },
    { id: 'pill-panic-settings', group: 'Privacy', label: 'Panic Controls', name: 'Panic Controls configuration', href: '/settings.html#panic-controls', icon: 'panic', help: 'Open the existing Panic Controls settings to configure the panic key, touch button, and destination. This shortcut does not trigger a panic redirect or change your panic key.' },
    { id: 'pill-touch-panic', group: 'Privacy', label: 'Touch Panic Overlay', name: 'Touch Panic Overlay', key: 'touchPanic', defaultValue: true, icon: 'touch', master: 'features', help: 'Show the existing emergency touch button on supported proxied pages. The button uses your saved panic destination. Refresh an already open proxied website to apply this change.' },
    { id: 'pill-widget-dock', group: 'Widgets', label: 'Widget Dock', name: 'Widget Dock', key: 'useWidgetDock', defaultValue: true, icon: 'dock', master: 'widgets', help: 'Group enabled proxied-page widgets in the existing collapsible dock. Turning this off uses floating widgets. Saved widget and dock positions are kept. Refresh an already open proxied website to apply this change.' },
    { id: 'pill-widgets', group: 'Widgets', label: 'Proxied Widgets', name: 'Proxied Widgets', key: 'disableAllWidgets', inverted: true, icon: 'widgets', master: 'features', help: 'On: allow your saved proxied-page widgets to appear. Off: hide all proxied-page widgets. Individual widget preferences and positions are kept. Refresh an already open proxied website to apply this change. Disable All Features still takes precedence.' }
  ];
  var ids = items.map(function (item) { return item.id; });
  var defaults = ids.slice(0, 5);
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
    return { enabled: !paused && (required || enabled), disabled: required || paused, badge: required ? 'Required' : paused ? 'Paused' : '', reason: required ? 'New Tab is currently required by about:blank; your preference is remembered.' : paused ? 'A master control in Settings temporarily disables this feature; your preference is remembered.' : '' };
  }
  return { items: items, icons: icons, layout: layout, mergeLayout: mergeLayout, state: state };
});
