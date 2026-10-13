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
  it('Panic Key reuses the stored shortcut ID and existing activation preference without redirecting', function () {
    const item = model.items.find(item => item.id === 'pill-panic-settings');
    assert.strictEqual(item.href, undefined);
    assert.strictEqual(item.key, 'panicKeyEnable');
    assert.strictEqual(item.configure, 'panic');
    assert(item.help.includes('does not trigger a panic redirect'));
  });
  it('adds Auto Tab Cloaking without enabling or reordering existing shortcuts on upgrade', function () {
    const item = model.items.find(item => item.id === 'pill-tab-cloak');
    assert.strictEqual(item.key, 'autoCloak');
    assert.strictEqual(item.configure, 'cloaking');
    const saved = { quickSettings: { order: ['pill-widgets', 'pill-proxy-url'], visible: ['pill-widgets'], showInfoIcons: true } };
    assert.deepStrictEqual(model.layout(saved).order.slice(0, 2), saved.quickSettings.order);
    assert(!model.layout(saved).visible.includes(item.id));
    assert(model.layout({ quickSettings: { visible: [item.id] } }).visible.includes(item.id));
  });
  it('contextual widget patches update only edited existing settings', function () {
    const baseline = model.configValues('widgets', { dockPosition: 'left', showMagnifier: false });
    const draft = Object.assign({}, baseline, { dockPosition: 'right', showNavHome: false });
    assert.deepStrictEqual(model.configPatch('widgets', baseline, draft), { dockPosition: 'right', showNavHome: false });
    assert.strictEqual(baseline.showMagnifier, false);
    assert.strictEqual(baseline.useWidgetDock, true);
    assert(!('quickSettings' in draft));
  });
  it('choosing a cloak preset changes neither Auto nor Persistent Cloaking', function () {
    const baseline = model.configValues('cloaking', { autoCloak: true, persistentCloak: false, selectedPreset: 'classroom' });
    assert.deepStrictEqual(model.configPatch('cloaking', baseline, Object.assign({}, baseline, { selectedPreset: 'custom' })), { selectedPreset: 'custom' });
  });

  it('collects interleaved shortcuts into unique groups without changing saved layout or visibility', function () {
    const settings = { quickSettings: { order: ['pill-touch-panic', 'pill-bm-blank', 'pill-tab-cloak', 'pill-widgets', 'pill-persistent-cloak'], visible: ['pill-touch-panic', 'pill-bm-blank', 'pill-tab-cloak', 'pill-persistent-cloak'] } };
    const original = JSON.stringify(settings), grouped = model.groups(settings);
    assert.deepStrictEqual(grouped.map(group => group.name), ['Privacy', 'Bookmarks']);
    assert.deepStrictEqual(grouped[0].items.map(item => item.id), ['pill-touch-panic', 'pill-tab-cloak']);
    assert.strictEqual(JSON.stringify(settings), original);
    assert.deepStrictEqual(model.groups({ quickSettings: { visible: [] } }), []);
  });
  it('shows effective Persistent state without changing the Auto toggle or master preference', function () {
    const item = model.items.find(item => item.key === 'autoCloak');
    const state = model.state(item, { autoCloak: false, persistentCloak: true });
    assert.strictEqual(state.enabled, false); assert.strictEqual(state.effectiveEnabled, true); assert.strictEqual(state.badge, 'Persistent');
    assert.strictEqual(model.state(item, { autoCloak: true, persistentCloak: true }).badge, 'Auto + Persistent');
    const paused = model.state(item, { autoCloak: false, persistentCloak: true, disableAllFeatures: true });
    assert.strictEqual(paused.effectiveEnabled, false); assert.strictEqual(paused.disabled, true); assert.strictEqual(paused.badge, 'Paused');
  });
  it('reports a missing panic key as setup rather than active while preserving legacy default', function () {
    const item = model.items.find(item => item.key === 'panicKeyEnable');
    assert.strictEqual(model.state(item, { panicKeyEnable: true }).enabled, true);
    assert.strictEqual(model.state(item, { panicKeyEnable: true, panicKey: '' }).badge, 'Set key');
    assert.strictEqual(model.state(item, { panicKeyEnable: true, panicKey: ' ', disableAllFeatures: true }).badge, 'Paused');
  });
  it('disabling either panic feature saves only its activation flag and retains key and destination', function () {
    const baseline = model.configValues('panic', { panicKeyEnable: true, panicKey: 'Escape', panicUrl: 'https://example.com', touchPanic: true });
    assert.deepStrictEqual(model.configPatch('panic', baseline, { ...baseline, panicKeyEnable: false }), { panicKeyEnable: false });
    assert.deepStrictEqual(model.configPatch('panic', baseline, { ...baseline, touchPanic: false }), { touchPanic: false });
    assert.strictEqual(model.configValues('panic', { panicKey: '' }).panicKey, '');
  });
  it('migrates a visible retired shortcut in place without changing underlying settings or future layout fields', function () {
    const saved = { persistentCloak: true, autoCloak: false, quickSettings: { order: ['pill-widgets', 'pill-persistent-cloak', 'pill-bm-blank', 'pill-tab-cloak', 'future-shortcut'], visible: ['pill-persistent-cloak', 'pill-bm-blank', 'future-shortcut'], future: true } };
    const copy = JSON.stringify(saved), layout = model.layout(saved);
    assert(!model.items.some(item => item.id === 'pill-persistent-cloak'));
    assert.deepStrictEqual(layout.order.slice(0, 3), ['pill-widgets', 'pill-tab-cloak', 'pill-bm-blank']);
    assert.deepStrictEqual(layout.visible, ['pill-tab-cloak', 'pill-bm-blank']);
    const merged = model.mergeLayout(saved, layout);
    assert(!merged.order.includes('pill-persistent-cloak')); assert(!merged.visible.includes('pill-persistent-cloak'));
    assert(merged.order.includes('future-shortcut')); assert(merged.visible.includes('future-shortcut')); assert.strictEqual(merged.future, true);
    assert.strictEqual(JSON.stringify(saved), copy);
  });
  it('retains an already visible Tab Cloaking position and never reveals either hidden cloak shortcut', function () {
    const settings = { quickSettings: { order: ['pill-persistent-cloak', 'pill-widgets', 'pill-tab-cloak'], visible: ['pill-persistent-cloak', 'pill-tab-cloak'] } };
    assert.deepStrictEqual(model.layout(settings).order.slice(0, 2), ['pill-widgets', 'pill-tab-cloak']);
    assert.deepStrictEqual(model.layout(settings).visible, ['pill-tab-cloak']);
    settings.quickSettings.visible = ['pill-widgets'];
    assert.deepStrictEqual(model.layout(settings).visible, ['pill-widgets']);
  });
  it('compares staged pool arrays by value and writes only deliberate edits', function () {
    const baseline = model.configValues('cloaking', { randomPool: ['google', 'custom', 'unavailable'], randomizePresetEachSession: true });
    const equal = { ...baseline, randomPool: baseline.randomPool.slice() };
    assert.deepStrictEqual(model.configPatch('cloaking', baseline, equal), {});
    assert.deepStrictEqual(model.configPatch('cloaking', baseline, { ...equal, randomizePresetEachSession: false }), { randomizePresetEachSession: false });
    assert.deepStrictEqual(model.configPatch('cloaking', baseline, { ...equal, randomPool: [] }), { randomPool: [] });
  });
  it('shares existing defaults and preserves saved custom/unavailable pool entries during individual edits', function () {
    const pool = require('../public/assets/cloak-pool');
    assert.deepStrictEqual(model.configValues('cloaking', {}).randomPool, pool.defaults);
    const saved = ['google', 'custom', 'unavailable'];
    assert.deepStrictEqual(pool.toggle(saved, 'google'), ['custom', 'unavailable']);
    assert.deepStrictEqual(pool.all(saved, { google: { title: 'Google' }, docs: { title: 'Docs' }, custom: { title: 'Saved' } }), ['google', 'custom', 'unavailable', 'docs']);
    assert.deepStrictEqual(saved, ['google', 'custom', 'unavailable']);
    assert.deepStrictEqual(pool.values({ randomPool: [] }), []);
  });
});
