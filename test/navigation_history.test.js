const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const navigation = require('../public/assets/heavenly-navigation');
const blankWindow = require('./helpers/wrapper.cjs');
const { initForWindow } = require('../custom-client/unblocker-client');
function storage(initial = {}) {
  const data = new Map(Object.entries(initial).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, String(value)) };
}
function mockWindow(saved = {}) {
  const win = blankWindow();
  win.localStorage = storage({ heavenly_settings: saved });
  win.location = { href: 'https://heavenly.test/', origin: 'https://heavenly.test' };
  win.confirm = () => false;
  win.open = () => null;
  return win;
}
function proxyWindow(settings = {}) {
  const events = {};
  const loc = new URL('https://heavenly.test/proxy/https://example.test/first');
  const win = {
    location: loc,
    localStorage: storage({ heavenly_settings: { disableAllWidgets: true, disableAllFeatures: true, ...settings } }),
    document: { title: 'First page', readyState: 'complete', documentElement: { addEventListener() {} } },
    addEventListener(type, fn) { (events[type] ||= []).push(fn); },
    emit(type, e = {}) { (events[type] || []).forEach(fn => fn(e)); },
    history: {
      state: null,
      pushState(state, title, url) {
        if (url !== undefined && url !== null && url !== '') {
          const next = new URL(url, loc.href);
          if (next.origin !== loc.origin) throw new Error('SecurityError');
          loc.href = next.href;
        }
        this.state = state;
        return 'native result';
      },
      replaceState(state, title, url) { return this.pushNative(state, title, url); }
    }
  };
  win.history.pushNative = win.history.pushState;
  win.top = win;
  win.parent = win;
  initForWindow({ prefix: '/proxy/', url: 'https://example.test/first' }, win);
  return win;
}

describe('Navigation settings compatibility', () => {
  it('uses consistent defaults and inherits explicit legacy about:blank preferences', () => {
    const defaults = navigation.navigationSettings({});
    assert.equal(defaults.showProxiedUrl, true);
    assert.equal(defaults.openBookmarksInAboutBlank, false);
    assert.equal(defaults.openSearchInAboutBlank, false);
    for (const legacy of [true, false]) {
      const settings = navigation.navigationSettings({ openInAboutBlank: legacy });
      assert.equal(settings.openBookmarksInAboutBlank, legacy);
      assert.equal(settings.openSearchInAboutBlank, legacy);
    }
    const split = navigation.navigationSettings({ openInAboutBlank: true, openSearchInAboutBlank: false });
    assert.equal(split.openBookmarksInAboutBlank, true);
    assert.equal(split.openSearchInAboutBlank, false);
  });
  it('retains unrelated and future settings when changing a preference', () => {
    const saved = { panicKeyEnable: true, dockPosition: 'left', customPresets: { demo: { title: 'Demo' } }, futureFeature: [1, 2], openInAboutBlank: true };
    const store = storage({ heavenly_settings: saved, heavenly_bookmarks: { bookmarks: [1] }, heavenly_tabs: [2] });
    navigation.updateSettings(store, { openSearchInAboutBlank: false });
    assert.deepEqual(navigation.readSettings(store), { ...saved, openSearchInAboutBlank: false });
    assert.equal(store.getItem('heavenly_bookmarks'), '{"bookmarks":[1]}');
    assert.equal(store.getItem('heavenly_tabs'), '[2]');
  });
  it('handles invalid settings objects without throwing', () => {
    for (const value of ['null', '[]', 'true', '{']) assert.deepEqual(navigation.readSettings(storage({ heavenly_settings: value })), {});
  });
  it('keeps bookmark and search decisions independent, including explicit New Tab', () => {
    const settings = { openBookmarksInAboutBlank: true, openSearchInAboutBlank: false, openBookmarksInNewTab: false, openSearchInNewTab: false };
    assert.equal(navigation.launchMode(settings, 'bookmark').aboutBlank, true);
    assert.equal(navigation.launchMode(settings, 'bookmark').newTab, true);
    assert.equal(navigation.launchMode(settings, 'search').aboutBlank, false);
    assert.equal(navigation.launchMode(settings, 'search', true).newTab, true);
  });
  for (const page of ['index.html', 'settings.html']) {
    it(`keeps ${page} usable when the browser denies access to the storage object itself`, () => {
      const html = fs.readFileSync(require.resolve('../public/' + page), 'utf8');
      const start = html.indexOf('    function loadSettings(');
      const end = html.indexOf('\n    }', start) + 6;
      const sandbox = { HeavenlyNavigation: navigation, DEFAULT_RANDOM_POOL: [], settingsSaveFeedback() {} };
      Object.defineProperty(sandbox, 'localStorage', { get() { throw new Error('SecurityError'); } });
      vm.createContext(sandbox);
      vm.runInContext(html.slice(start, end), sandbox);
      assert.equal(sandbox.loadSettings().showProxiedUrl, true);
      assert.equal(sandbox.loadSettings().openSearchInAboutBlank, false);
    });
    it(`retains unknown preferences through the ${page} settings reader`, () => {
      const html = fs.readFileSync(require.resolve('../public/' + page), 'utf8');
      const start = html.indexOf('    function loadSettings(');
      const end = html.indexOf('\n    }', start) + 6;
      const sandbox = { localStorage: storage({ heavenly_settings: { futureFeature: true, panicKeyEnable: true, openInAboutBlank: true } }), HeavenlyNavigation: navigation, DEFAULT_RANDOM_POOL: [] };
      vm.createContext(sandbox);
      vm.runInContext(html.slice(start, end), sandbox);
      assert.equal(sandbox.loadSettings().futureFeature, true);
      assert.equal(sandbox.loadSettings().openSearchInAboutBlank, true);
      assert.equal(sandbox.loadSettings().panicKeyEnable, true);
    });
  }
});

describe('Safe launch and wrapper recovery', () => {
  const url = 'https://heavenly.test/proxy/https://example.test/page';
  it('opens proxied pages in about:blank even if the remembered New Tab setting is off', () => {
    const win = mockWindow();
    const blank = blankWindow();
    win.open = () => blank;
    assert.equal(navigation.launch(win, url, { kind: 'bookmark', settings: { openBookmarksInAboutBlank: true, openBookmarksInNewTab: false } }), blank);
    assert.equal(blank.location.href, 'about:blank');
    assert.equal(blank.document.getElementById('heavenly-wrapper-frame').src, url);
  });
  it('opens direct bookmarks normally instead of putting incompatible external sites in frames', () => {
    const win = mockWindow();
    const tab = blankWindow();
    win.open = () => tab;
    navigation.launch(win, 'https://external.test/', { kind: 'bookmark', settings: { openBookmarksInAboutBlank: true, openBookmarksInNewTab: false, showProxiedUrl: false } });
    assert.equal(win.location.href, 'https://heavenly.test/');
    assert.equal(tab.location.href, 'https://external.test/');
    assert.equal(tab.document.getElementById('heavenly-wrapper-frame'), undefined);
  });
  it('lets users cancel a blocked popup without navigating or recording a visit', () => {
    const win = mockWindow();
    assert.equal(navigation.openBlank(win, url, {}), null);
    assert.equal(win.location.href, 'https://heavenly.test/');
    assert.equal(win.localStorage.getItem('heavenly_history'), null);
  });
  it('falls back to the current tab when the user accepts the blocked-popup recovery', () => {
    const win = mockWindow();
    win.confirm = () => true;
    navigation.openBlank(win, url, {});
    assert.equal(win.location.href, url);
  });
  it('navigates the new tab normally when wrapper initialization is unsupported', () => {
    const win = mockWindow();
    const blank = { location: {} };
    win.open = () => blank;
    assert.equal(navigation.openBlank(win, url, {}), blank);
    assert.equal(blank.location.href, url);
  });
  it('retains the wrapper and offers explicit recovery on an iframe error', () => {
    const win = blankWindow();
    navigation.mountWrapper(win, url, {});
    win.document.getElementById('heavenly-wrapper-frame').onerror();
    assert.equal(win.location.href, 'about:blank');
    assert.match(win.document.getElementById('heavenly-wrapper-status').textContent, /Choose Open normally/);
    win.document.getElementById('heavenly-wrapper-recovery').onclick({ preventDefault() {} });
    assert.equal(win.location.href, url);
  });
  it('restores hosted browsing without putting the target URL in the address', () => {
    const win = mockWindow({ showProxiedUrl: false });
    navigation.launch(win, url, { settings: { showProxiedUrl: false, openSearchInNewTab: false }, kind: 'search' });
    assert.match(win.location.href, /^https:\/\/heavenly.test\/browse.html#heavenly_browse_[a-z0-9]+$/);
    assert.equal(win.location.href.includes('example.test'), false);
  });
  it('falls back to normal navigation when session storage is unavailable', () => {
    const win = mockWindow();
    win.sessionStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    navigation.launch(win, url, { settings: { showProxiedUrl: false }, kind: 'search' });
    assert.equal(win.location.href, url);
  });
  it('rejects unsafe schemes without opening a new window', () => {
    const win = mockWindow();
    win.open = () => { throw new Error('must not open'); };
    for (const value of ['javascript:alert(1)', 'data:text/html,hi', 'about:blank']) assert.equal(navigation.launch(win, value), false);
    assert.equal(win.location.href, 'https://heavenly.test/');
  });
  it('updates recovery links and saved sessions after in-frame navigation', () => {
    const win = blankWindow();
    const saved = {};
    win.sessionStorage.setItem = (key, value) => saved[key] = JSON.parse(value);
    const wrapper = navigation.mountWrapper(win, url, { storageKey: 'session', showProxiedUrl: false });
    wrapper.update('https://heavenly.test/proxy/https://example.test/second', 'https://example.test/second');
    assert.equal(saved.session.url, wrapper.url);
    assert.equal(win.document.getElementById('heavenly-wrapper-recovery').href, wrapper.url);
    assert.equal(win.document.getElementById('heavenly-wrapper-status').textContent, 'Browsing website');
  });
});

describe('History normalization and persistence', () => {
  it('keeps the history dropdown usable when access to storage is denied', () => {
    const html = fs.readFileSync(require.resolve('../public/index.html'), 'utf8');
    const start = html.indexOf('    function loadHistory(');
    const end = html.indexOf('\n    }', start) + 6;
    const sandbox = { HeavenlyNavigation: navigation, location: { origin: 'https://heavenly.test' } };
    Object.defineProperty(sandbox, 'localStorage', { get() { throw new Error('SecurityError'); } });
    vm.createContext(sandbox);
    vm.runInContext(html.slice(start, end), sandbox);
    assert.equal(sandbox.loadHistory().length, 0);
  });
  it('keeps valid legacy entries and metadata while rejecting malformed entries and duplicates', () => {
    const store = storage({ heavenly_history: [null, { url: 'javascript:alert(1)' }, { url: 'https://example.test', title: 'Example', timestamp: 123 }, { url: 'https://example.test/', title: 'Duplicate' }] });
    assert.deepEqual(navigation.loadHistory(store), [{ url: 'https://example.test/', title: 'Example', timestamp: 123 }]);
    for (const raw of ['{}', 'null', 'false', '{']) assert.deepEqual(navigation.loadHistory(storage({ heavenly_history: raw })), []);
  });
  it('preserves query, fragment, and legitimate remote /proxy/ paths', () => {
    assert.equal(navigation.remoteUrl('/proxy/https://example.test/proxy/real?q=one%20two#part'), 'https://example.test/proxy/real?q=one%20two#part');
  });
  it('normalizes stored proxied URLs to the real target instead of nesting proxies on reopening', () => {
    const store = storage({ heavenly_history: [{ url: 'https://heavenly.test/proxy/https://example.test/?q=1', title: 'Legacy' }] });
    assert.equal(navigation.loadHistory(store, 'https://heavenly.test')[0].url, 'https://example.test/?q=1');
  });
  it('deduplicates revisits, keeps metadata, persists titles, and retains the existing 20-item limit', () => {
    const store = storage({ heavenly_history: [{ url: 'https://example.test/0', title: 'Old', timestamp: 123 }] });
    for (let i = 1; i <= 20; i++) navigation.recordHistory(store, 'https://example.test/' + i, 'Page ' + i);
    assert.equal(navigation.loadHistory(store).length, 20);
    navigation.recordHistory(store, 'https://example.test/10', 'New title');
    navigation.recordHistory(store, 'https://example.test/10', 'New title');
    assert.equal(navigation.loadHistory(store).filter(item => item.url === 'https://example.test/10').length, 1);
    assert.equal(navigation.loadHistory(store)[0].title, 'New title');
    const legacy = storage({ heavenly_history: [{ url: 'https://example.test/', title: 'Old', timestamp: 123 }] });
    navigation.recordHistory(legacy, 'https://example.test/', 'New');
    assert.equal(navigation.loadHistory(legacy)[0].timestamp, 123);
  });
  it('does not resurrect cleared or deleted entries when a title changes', () => {
    const store = storage();
    navigation.recordHistory(store, 'https://example.test/', 'Late title', true);
    assert.equal(store.getItem('heavenly_history'), null);
    navigation.recordHistory(store, 'https://example.test/', 'New visit');
    store.setItem('heavenly_history', '[]');
    navigation.recordHistory(store, 'https://example.test/', 'Another late title', true);
    assert.deepEqual(navigation.loadHistory(store), []);
  });
  it('updates metadata without reordering history or discarding existing fields', () => {
    const store = storage({ heavenly_history: [{ url: 'https://two.test/', title: 'Two' }, { url: 'https://one.test/', title: 'Old', timestamp: 123 }] });
    navigation.recordHistory(store, 'https://one.test/', 'One', true);
    assert.deepEqual(navigation.loadHistory(store), [{ url: 'https://two.test/', title: 'Two' }, { url: 'https://one.test/', title: 'One', timestamp: 123 }]);
  });
});

describe('Native History API and navigation recording', () => {
  it('records URL-only navigation even when widgets and cloaking are disabled', () => {
    const win = proxyWindow();
    assert.equal(win.history.pushState({ page: 2 }, '', '/second?q=1#part'), 'native result');
    const history = navigation.loadHistory(win.localStorage);
    assert.deepEqual(history.map(item => item.url), ['https://example.test/second?q=1#part', 'https://example.test/first']);
  });
  it('preserves state-only calls and does not add meaningless history entries', () => {
    const win = proxyWindow();
    const before = win.localStorage.getItem('heavenly_history');
    for (const url of [undefined, null, '']) {
      assert.equal(win.history.pushState({ page: 2 }, '', url), 'native result');
      assert.deepEqual(win.history.state, { page: 2 });
      assert.equal(win.localStorage.getItem('heavenly_history'), before);
    }
  });
  it('records replaceState and back/forward without duplicating existing URLs', () => {
    const win = proxyWindow();
    win.history.replaceState({ page: 2 }, '', '/second');
    win.location.href = 'https://heavenly.test/proxy/https://example.test/first';
    win.emit('popstate');
    win.location.href = 'https://heavenly.test/proxy/https://example.test/second';
    win.emit('popstate');
    assert.deepEqual(navigation.loadHistory(win.localStorage).map(item => item.url), ['https://example.test/second', 'https://example.test/first']);
  });
  it('leaves rejected history changes out of the recorded history', () => {
    const win = proxyWindow();
    const before = win.localStorage.getItem('heavenly_history');
    win.history.pushNative = () => { throw new Error('SecurityError'); };
    assert.throws(() => win.history.replaceState({}, '', '/rejected'), /SecurityError/);
    assert.equal(win.localStorage.getItem('heavenly_history'), before);
  });
});
