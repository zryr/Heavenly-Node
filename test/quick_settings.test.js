const assert = require('assert');
const model = require('../public/assets/quick-settings-model');
const navigation = require('../public/assets/heavenly-navigation');
describe('Quick Settings customization model', function () {
  it('defaults to five existing shortcuts with info icons off without altering settings', function () {
    const saved = { persistentCloak: true, touchPanic: false, dockPosition: 'left' };
    const copy = JSON.stringify(saved), layout = model.layout(saved);
    assert.deepStrictEqual(layout.visible, model.items.slice(0, 5).map(item => item.id));
    assert.strictEqual(layout.showInfoIcons, false);
    assert.strictEqual(JSON.stringify(saved), copy);
  });
  it('accepts an intentionally empty panel and normalizes invalid/duplicate identifiers', function () {
    const layout = model.layout({ quickSettings: { order: ['pill-widgets', 'invalid', 'pill-widgets', 2], visible: [], showInfoIcons: 'true' } });
    assert.strictEqual(layout.order[0], 'pill-widgets');
    assert.strictEqual(layout.order.length, model.items.length);
    assert.deepStrictEqual(layout.visible, []);
    assert.strictEqual(layout.showInfoIcons, false);
  });
  it('recovers malformed legacy layouts with safe defaults', function () {
    [null, [], 'bad', { order: {}, visible: false }].forEach(quickSettings => assert.strictEqual(model.layout({ quickSettings }).visible.length, 5));
  });
  it('preserves unknown future layout fields and identifiers when saving known shortcuts', function () {
    const saved = { quickSettings: { futureOption: { keep: true }, order: ['future-widget', 'pill-widgets'], visible: ['future-widget', 'pill-widgets'] } };
    const next = model.mergeLayout(saved, model.layout({}));
    assert.deepStrictEqual(next.futureOption, { keep: true });
    assert(next.order.includes('future-widget'));
    assert(next.visible.includes('future-widget'));
    assert.strictEqual(next.showInfoIcons, false);
  });
  it('resetting layout keeps feature preferences, tabs, bookmarks and history untouched', function () {
    const saved = { persistentCloak: true, disableAllWidgets: true, dockPosition: 'right', quickSettings: { visible: [] }, customPresets: { custom: { title: 'Saved' } } };
    const values = { heavenly_settings: JSON.stringify(saved), heavenly_tabs: '["tab"]', heavenly_bookmarks: '{"kept":true}', heavenly_history: '["visit"]' };
    navigation.updateSettings({ getItem: key => values[key], setItem: (key, value) => { values[key] = value; } }, { quickSettings: model.mergeLayout(saved, model.layout({})) });
    const next = JSON.parse(values.heavenly_settings);
    delete next.quickSettings; delete saved.quickSettings;
    assert.deepStrictEqual(next, saved);
    assert.strictEqual(values.heavenly_tabs, '["tab"]');
    assert.strictEqual(values.heavenly_bookmarks, '{"kept":true}');
    assert.strictEqual(values.heavenly_history, '["visit"]');
  });
  it('about:blank overrides New Tab presentation without modifying either saved preference or URL visibility', function () {
    const saved = { openBookmarksInNewTab: false, openBookmarksInAboutBlank: true, openSearchInAboutBlank: false, showProxiedUrl: true };
    assert.deepStrictEqual(model.state(model.items[0], saved).badge, 'Required');
    assert.strictEqual(model.state(model.items[0], saved).enabled, true);
    assert.strictEqual(model.state(model.items[2], saved).disabled, false);
    assert.strictEqual(model.state(model.items[4], saved).enabled, true);
    assert.strictEqual(saved.openBookmarksInNewTab, false);
  });
  it('widget master controls pause shortcuts while retaining saved feature values', function () {
    const dock = model.items.find(item => item.key === 'useWidgetDock');
    assert.strictEqual(model.state(dock, { disableAllWidgets: true, useWidgetDock: true }).badge, 'Paused');
    assert.strictEqual(model.state(dock, { disableAllWidgets: false, useWidgetDock: true }).enabled, true);
    const widgets = model.items.find(item => item.key === 'disableAllWidgets');
    assert.strictEqual(model.state(widgets, {}).enabled, true);
    assert.strictEqual(model.state(widgets, { disableAllWidgets: true }).enabled, false);
    assert.strictEqual(model.state(widgets, { disableAllFeatures: true }).disabled, true);
  });
  it('Panic Controls is a configuration link with no setting or redirect action', function () {
    const item = model.items.find(item => item.id === 'pill-panic-settings');
    assert.strictEqual(item.href, '/settings.html#panic-controls');
    assert.strictEqual(item.key, undefined);
    assert(item.help.includes('does not trigger a panic redirect'));
  });
});
