(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeavenlyNavigation = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function readSettings(storage) {
    try {
      var value = JSON.parse(storage.getItem('heavenly_settings') || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (e) { return {}; }
  }

  function navigationSettings(saved) {
    saved = saved || {};
    var legacyBlank = saved.openInAboutBlank === true;
    return Object.assign({}, saved, {
      openBookmarksInNewTab: saved.openBookmarksInNewTab !== false,
      openSearchInNewTab: saved.openSearchInNewTab === true,
      openBookmarksInAboutBlank: typeof saved.openBookmarksInAboutBlank === 'boolean' ? saved.openBookmarksInAboutBlank : legacyBlank,
      openSearchInAboutBlank: typeof saved.openSearchInAboutBlank === 'boolean' ? saved.openSearchInAboutBlank : legacyBlank,
      showProxiedUrl: saved.showProxiedUrl !== false
    });
  }

  function updateSettings(storage, patch) {
    var settings = Object.assign({}, readSettings(storage), patch);
    storage.setItem('heavenly_settings', JSON.stringify(settings));
    return settings;
  }

  function remoteUrl(value, origin, prefix) {
    if (typeof value !== 'string' || !value.trim()) return '';
    prefix = prefix || '/proxy/';
    value = value.trim();
    if (value.indexOf(prefix) === 0) value = value.slice(prefix.length);
    else if (origin && value.indexOf(origin + prefix) === 0) value = value.slice((origin + prefix).length);
    value = value.replace(/^(https?:\/)([^/])/i, '$1/$2');
    try {
      var parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
      return parsed.href;
    } catch (e) { return ''; }
  }

  function currentRemoteUrl(win, config) {
    var loc = win.location;
    var prefix = (config && config.prefix) || '/proxy/';
    var path = loc._rawpathname !== undefined ? loc._rawpathname : loc.pathname;
    var search = loc._rawsearch !== undefined ? loc._rawsearch : loc.search;
    var hash = loc._rawhash !== undefined ? loc._rawhash : loc.hash;
    if (path && path.indexOf(prefix) === 0) return remoteUrl(path + (search || '') + (hash || ''), '', prefix);
    return remoteUrl(config && String(config.url || ''), config && config.proxyOrigin, prefix);
  }

  function isCoolmathUrl(value) {
    try {
      var url = new URL(value);
      return (url.protocol === 'http:' || url.protocol === 'https:') &&
        (url.hostname === 'coolmathgames.com' || url.hostname === 'www.coolmathgames.com');
    } catch (e) { return false; }
  }

  function bookmarkKey(value) {
    var input = value;
    value = remoteUrl(value);
    if (!value && typeof input === 'string' && /^[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/.test(input.trim())) value = remoteUrl('https://' + input.trim());
    if (!value) return '';
    var url = new URL(value);
    if (isCoolmathUrl(value)) { url.hostname = 'www.coolmathgames.com'; url.protocol = 'https:'; }
    return url.href;
  }

  function findBookmarkByUrl(data, value) {
    var key = bookmarkKey(value);
    if (!key) return null;
    var found = null;
    (data.bookmarks || []).some(function (bookmark) {
      if (bookmarkKey(bookmark.url) === key) { found = bookmark; return true; }
      return (bookmark.subBookmarks || []).some(function (child) {
        if (bookmarkKey(child.url) === key) { found = child; return true; }
        return false;
      });
    });
    return found;
  }

  function prepareMissingBookmark(data, definition) {
    var bookmark = JSON.parse(JSON.stringify(definition));
    if (bookmark.id === 'bm_coolmath') {
      bookmark.order = (data.bookmarks || []).reduce(function (order, item) {
        return item.categoryId === bookmark.categoryId ? Math.max(order, Number(item.order) || 0) : order;
      }, bookmark.order - 1) + 1;
      bookmark.subSectionId = 'builtin';
    }
    return bookmark;
  }

  // Only known shipped paths migrate. Custom icons and all other saved fields survive.
  function migrateBookmarkIcons(data) {
    var changed = false;
    function migrate(bookmark) {
      var icon = bookmark.icon;
      if (typeof icon !== 'string') return;
      var next = icon.replace(/^\/assets\/(artic|aether|doc-of-docs|nexus|opium)-logo\.png$/, '/assets/icons/$1-icon.png');
      if ((bookmark.id === 'bm_fmhy_movies' || bookmark.id === 'bm_fmhy_anime') &&
          (icon === '/proxy/https://fmhy.net/hall.png' || icon === 'https://fmhy.net/hall.png')) next = '/assets/icons/fmhy-halloween-icon.png';
      if (next !== icon) { bookmark.icon = next; changed = true; }
    }
    (data.bookmarks || []).forEach(function (bookmark) {
      migrate(bookmark);
      (bookmark.subBookmarks || []).forEach(migrate);
    });
    return changed;
  }

  function loadHistory(storage, origin) {
    try {
      var history = JSON.parse(storage.getItem('heavenly_history') || '[]');
      if (!Array.isArray(history)) return [];
      var seen = Object.create(null);
      return history.reduce(function (valid, item) {
        if (!item || typeof item !== 'object') return valid;
        var url = remoteUrl(item.url, origin);
        if (!url || seen[url]) return valid;
        seen[url] = true;
        valid.push(Object.assign({}, item, { url: url, title: typeof item.title === 'string' && item.title.trim() ? item.title : url }));
        return valid;
      }, []);
    } catch (e) { return []; }
  }

  function recordHistory(storage, url, title, metadataOnly, origin) {
    url = remoteUrl(url, origin);
    if (!url) return;
    var history = loadHistory(storage, origin);
    var index = history.findIndex(function (item) { return item.url === url; });
    if (metadataOnly && index < 0) return; // Clearing/deleting history stays effective until the next visit.
    title = typeof title === 'string' && title.trim() ? title : url;
    if (index === 0 && history[0].title === title) return;
    var entry = Object.assign({}, index >= 0 ? history[index] : {}, { url: url, title: title });
    if (metadataOnly) history[index] = entry;
    else {
      if (index >= 0) history.splice(index, 1);
      history.unshift(entry);
      history = history.slice(0, 20);
    }
    storage.setItem('heavenly_history', JSON.stringify(history));
  }

  function launchMode(settings, kind, forceNewTab) {
    settings = navigationSettings(settings);
    var bookmark = kind === 'bookmark';
    var aboutBlank = bookmark ? settings.openBookmarksInAboutBlank : settings.openSearchInAboutBlank;
    return {
      aboutBlank: aboutBlank,
      newTab: aboutBlank || !!forceNewTab || (bookmark ? settings.openBookmarksInNewTab : settings.openSearchInNewTab),
      showProxiedUrl: settings.showProxiedUrl
    };
  }

  function notice(win, message) {
    var doc = win.document;
    if (!doc || !doc.createElement || !doc.body) return;
    var el = doc.getElementById('heavenly-navigation-notice');
    if (!el) {
      el = doc.createElement('div');
      el.id = 'heavenly-navigation-notice';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:90vw;padding:12px 18px;border:1px solid #38bdf8;border-radius:14px;background:#0f172a;color:#e2e8f0;font:14px system-ui;box-shadow:0 8px 30px #0008;';
      doc.body.appendChild(el);
    }
    el.textContent = message;
    win.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6000);
  }

  // Both the existing about:blank launcher and the stable browsing page use this container.
  // Never use document.open/write: they change the blank document's effective URL.
  function mountWrapper(win, url, options) {
    options = options || {};
    var doc = win.document;
    if (!doc || !doc.createElement || !doc.head || !doc.body) throw new Error('Wrapper document is unavailable');
    var origin = new URL(url).origin;
    var prefix = '/proxy/';
    var initialTarget = remoteUrl(url, origin, prefix);
    if (!initialTarget || new URL(url).pathname.indexOf(prefix) !== 0) throw new Error('Only proxied pages can be embedded');
    doc.title = options.title || 'Heavenly';
    doc.documentElement.lang = 'en';
    var viewport = doc.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    doc.head.appendChild(viewport);
    if (options.icon) {
      var icon = doc.createElement('link');
      icon.rel = 'icon';
      icon.href = new URL(options.icon, origin).href;
      doc.head.appendChild(icon);
    }
    var style = doc.createElement('style');
    style.textContent = 'html,body{margin:0;width:100%;height:100%;background:#030712;color:#e2e8f0;font:13px system-ui}body{display:flex;flex-direction:column}#heavenly-wrapper-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px max(12px,env(safe-area-inset-right));background:#0f172af5;border-bottom:1px solid #38bdf84d}#heavenly-wrapper-bar a,#heavenly-wrapper-bar button{color:#7dd3fc;background:#1e293b;border:1px solid #38bdf84d;border-radius:9px;padding:8px 10px;font:inherit;text-decoration:none;cursor:pointer;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center}#heavenly-wrapper-bar a:focus-visible,#heavenly-wrapper-bar button:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}#heavenly-wrapper-status{flex:1;min-width:110px;overflow-wrap:anywhere}#heavenly-wrapper-frame{flex:1;width:100%;min-height:0;border:0;background:white}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}';
    doc.head.appendChild(style);
    doc.body.style.cssText = '';
    doc.body.textContent = '';
    var bar = doc.createElement('nav');
    bar.id = 'heavenly-wrapper-bar';
    bar.setAttribute('aria-label', 'Browsing and recovery controls');
    var home = doc.createElement('a');
    home.href = origin + '/';
    home.textContent = 'Heavenly';
    var back = doc.createElement('button');
    back.type = 'button';
    back.textContent = 'Back';
    var forward = doc.createElement('button');
    forward.type = 'button';
    forward.textContent = 'Forward';
    var status = doc.createElement('span');
    status.id = 'heavenly-wrapper-status';
    status.setAttribute('role', 'status');
    status.textContent = 'Loading website…';
    var recovery = doc.createElement('a');
    recovery.id = 'heavenly-wrapper-recovery';
    recovery.href = url;
    recovery.textContent = 'Open normally';
    recovery.title = 'Use normal navigation if the website cannot load here';
    [home, back, forward, status, recovery].forEach(function (el) { bar.appendChild(el); });
    doc.body.appendChild(bar);
    var frame = doc.createElement('iframe');
    frame.id = 'heavenly-wrapper-frame';
    frame.title = 'Proxied website';
    frame.setAttribute('allowfullscreen', '');
    // Keep ordinary links, history and user-opened tabs inside their intended
    // context, while preventing an embedded site's automatic top navigation.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-pointer-lock allow-presentation');
    var wrapper = { frame: frame, url: url, ready: false };
    win.__heavenlyWrapper = wrapper;
    function store() {
      if (options.storageKey) {
        try { win.sessionStorage.setItem(options.storageKey, JSON.stringify({ url: wrapper.url, title: options.title, icon: options.icon })); } catch (e) {}
      }
    }
    wrapper.update = function (proxied, target) {
      if (!remoteUrl(proxied, origin) || new URL(proxied).origin !== origin || new URL(proxied).pathname.indexOf(prefix) !== 0) return;
      wrapper.url = proxied;
      wrapper.ready = true;
      recovery.href = proxied;
      status.textContent = options.showProxiedUrl === false ? 'Browsing website' : prefix + target;
      store();
    };
    wrapper.fail = function () {
      status.textContent = 'This website could not load in a frame. Choose Open normally to continue.';
    };
    wrapper.home = function () { returnHome(win, origin); };
    // Handle widget Home in the parent event loop. A sandboxed child cannot
    // navigate its parent even by calling a function defined in that parent.
    win.addEventListener('message', function (event) {
      if (event.source === frame.contentWindow && event.origin === origin && event.data === 'heavenly:home') wrapper.home();
    });
    home.onclick = function (event) { event.preventDefault(); wrapper.home(); };
    recovery.onclick = function (event) { event.preventDefault(); win.location.href = wrapper.url; };
    function moveHistory(method) {
      try { frame.contentWindow.history[method](); }
      catch (e) { status.textContent = 'Use Open normally to continue browsing.'; }
    }
    back.onclick = function () { moveHistory('back'); };
    forward.onclick = function () { moveHistory('forward'); };
    frame.onload = function () {
      try {
        var href = frame.contentWindow.location.href;
        // A newly appended iframe can emit its initial blank load before the
        // requested document/redirect has committed. It is not a failed load.
        if (href === 'about:blank') return;
        var current = new URL(href);
        if (current.origin === origin && current.pathname.indexOf(prefix) !== 0) {
          if (current.pathname === '/' || current.pathname === '/index.html') { wrapper.home(); return; }
          wrapper.fail(); return;
        }
        var target = remoteUrl(href, origin);
        if (!target || new URL(href).origin !== origin) { wrapper.fail(); return; }
        wrapper.update(href, target);
      } catch (e) { wrapper.fail(); }
    };
    frame.onerror = wrapper.fail;
    frame.src = url;
    store();
    doc.body.appendChild(frame);
    win.addEventListener('storage', function (event) {
      if (event.key !== 'heavenly_settings') return;
      options.showProxiedUrl = navigationSettings(readSettings(win.localStorage)).showProxiedUrl;
      if (options.storageKey && options.showProxiedUrl) { win.location.href = wrapper.url; return; }
      if (wrapper.ready) wrapper.update(wrapper.url, remoteUrl(wrapper.url, origin));
    });
    win.setTimeout(function () {
      if (!wrapper.ready) status.textContent = 'Still loading? Choose Open normally to continue.';
    }, 12000);
    return wrapper;
  }

  function openBlank(win, url, options) {
    var blank;
    try { blank = (win.__nativeWinOpen || win.open).call(win, 'about:blank', '_blank'); } catch (e) {}
    if (!blank) {
      if (win.confirm && win.confirm('Popup blocked! Allow popups for Heavenly, or open this website in the current tab?')) win.location.href = url;
      else if (win.alert && !win.confirm) win.alert('Popup blocked! Please allow popups for this site.');
      return null;
    }
    registerHomeReturn(win, blank, new URL(url).origin);
    var mounted = false;
    function initialize() {
      if (mounted) return;
      mounted = true;
      try { mountWrapper(blank, url, options); }
      catch (e) {
        notice(win, 'Framed browsing is unavailable. Opening the new tab normally.');
        try { blank.location.href = url; } catch (err) { try { blank.close(); } catch (ignored) {} notice(win, 'The new tab could not open. Please allow popups and try again.'); }
      }
    }
    // Chromium's newly opened initial empty document has no session-history
    // entry. Navigating it once to a real about:blank document lets subsequent
    // iframe navigations create Back/Forward entries, without document.write.
    if (blank.history && blank.history.length === 0 && blank.addEventListener) {
      blank.addEventListener('load', initialize, { once: true });
      try { blank.location.replace('about:blank'); }
      catch (e) { initialize(); }
      // A single recovery for browsers that omit the blank document load event.
      if (win.setTimeout) win.setTimeout(initialize, 1500);
    } else initialize();
    return blank;
  }

  // Only tabs opened by this homepage receive a return capability. Message source
  // checks bind it to that exact WindowProxy; copied session storage is insufficient.
  function registerHomeReturn(win, target, origin) {
    if (target === win || !win.location || win.location.origin !== origin || !/^\/(?:index\.html)?$/.test(win.location.pathname)) return;
    try {
      var registry = win.__heavenlyHomeReturns;
      if (!registry) {
        registry = win.__heavenlyHomeReturns = new Map();
        win.addEventListener('message', function (event) {
          var data = event.data;
          if (event.origin !== origin || !data || data.type !== 'heavenly:return-home') return;
          var child = registry.get(data.token);
          if (!child || child !== event.source || child.closed) return;
          try {
            // Do not close a launch tab which has since become an unrelated page.
            var current = child.location;
            if (current.href !== 'about:blank' && (current.origin !== origin || !/^\/(?:proxy\/|browse\.html)/.test(current.pathname))) return;
            win.focus();
            if (!win.document.hasFocus()) { child.postMessage({ type:'heavenly:home-unavailable', token:data.token }, origin); return; }
            child.close(); registry.delete(data.token);
          } catch (e) {}
        });
      }
      var token = win.crypto && win.crypto.randomUUID ? win.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
      registry.forEach(function (child, key) { if (child.closed) registry.delete(key); });
      registry.set(token, target);
      target.sessionStorage.setItem('heavenly_home_return', JSON.stringify({ token:token, origin:origin }));
      return true;
    } catch (e) { /* Return Home retains current-tab navigation when access is unavailable. */ }
  }
  function returnHome(win, homeOrigin) {
    var origin = homeOrigin || win.location.origin;
    function fallback() {
      try { (win.top || win).location.href = origin + '/'; }
      catch (e) { win.location.href = origin + '/'; }
    }
    // The existing wrapper owns top-level navigation for sandboxed frames.
    if (win.parent && win.parent !== win) { win.parent.postMessage('heavenly:home', origin); return; }
    var saved;
    try { saved = JSON.parse(win.sessionStorage.getItem('heavenly_home_return')); } catch (e) {}
    if (!saved || saved.origin !== origin || !win.opener || win.opener.closed) { fallback(); return; }
    var timer;
    function cleanup() { win.clearTimeout(timer); win.removeEventListener('message', response); win.removeEventListener('pagehide', cleanup); }
    function response(event) {
      if (event.origin === origin && event.source === win.opener && event.data && event.data.type === 'heavenly:home-unavailable' && event.data.token === saved.token) { cleanup(); fallback(); }
    }
    win.addEventListener('message', response); win.addEventListener('pagehide', cleanup, { once:true });
    timer = win.setTimeout(function () { cleanup(); if (!win.closed) fallback(); }, 350);
    try { win.opener.postMessage({ type:'heavenly:return-home', token:saved.token }, origin); }
    catch (e) { cleanup(); fallback(); }
  }

  function launch(win, url, options) {
    options = options || {};
    var resolved;
    try { resolved = new URL(url, win.location.href); } catch (e) { return false; }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return false;
    url = resolved.href;
    var mode = launchMode(options.settings || readSettings(win.localStorage), options.kind, options.newTab);
    if (options.aboutBlank !== undefined) mode.aboutBlank = options.aboutBlank;
    var origin = options.origin || win.location.origin;
    var proxied = resolved.origin === origin && resolved.pathname.indexOf('/proxy/') === 0;
    // Intentional launch boundary only: resource rewriting and in-site navigation never call this.
    // Explicit aboutBlank:false remains the normal proxied recovery path.
    if (proxied && options.aboutBlank === undefined && isCoolmathUrl(remoteUrl(url, origin))) mode.aboutBlank = true;
    if (mode.aboutBlank && proxied) return openBlank(win, url, options);
    if (!proxied && (mode.aboutBlank || !mode.showProxiedUrl)) notice(win, 'Direct websites open normally for compatibility.');
    var framed = proxied && !mode.showProxiedUrl;
    var target = win;
    if (mode.newTab) {
      try { target = (win.__nativeWinOpen || win.open).call(win, 'about:blank', '_blank'); } catch (e) { target = null; }
      if (!target) {
        if (!win.confirm || !win.confirm('Popup blocked! Open this website in the current tab instead?')) return false;
        target = win;
      }
    }
    var returnRegistered = proxied && target !== win && registerHomeReturn(win, target, origin);
    if (target !== win && !returnRegistered) { try { target.opener = null; } catch (e) {} }
    if (framed) {
      try {
        var key = 'heavenly_browse_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
        target.sessionStorage.setItem(key, JSON.stringify({ url: url, title: options.title, icon: options.icon }));
        target.location.href = origin + '/browse.html#' + key;
        return target;
      } catch (e) { notice(win, 'Private browsing storage is unavailable. Opening normally.'); }
    }
    target.location.href = url;
    return target;
  }

  function restoreBrowse(win) {
    try {
      var key = win.location.hash.slice(1);
      if (!/^heavenly_browse_[a-z0-9]+$/.test(key)) throw new Error('Missing website');
      var saved = JSON.parse(win.sessionStorage.getItem(key));
      var url = new URL(saved.url);
      if (url.origin !== win.location.origin || url.pathname.indexOf('/proxy/') !== 0 || !remoteUrl(url.href, url.origin)) throw new Error('Invalid website');
      mountWrapper(win, url.href, { title: saved.title, icon: saved.icon, storageKey: key, showProxiedUrl: navigationSettings(readSettings(win.localStorage)).showProxiedUrl });
    } catch (e) {
      var message = win.document.getElementById('browse-message');
      if (message) message.textContent = 'This browsing session is unavailable. Return to Heavenly to open a website.';
    }
  }

  return { returnHome: returnHome, readSettings: readSettings, navigationSettings: navigationSettings, updateSettings: updateSettings,
    isCoolmathUrl: isCoolmathUrl, bookmarkKey: bookmarkKey, findBookmarkByUrl: findBookmarkByUrl,
    prepareMissingBookmark: prepareMissingBookmark, migrateBookmarkIcons: migrateBookmarkIcons,
    remoteUrl: remoteUrl, currentRemoteUrl: currentRemoteUrl, loadHistory: loadHistory, recordHistory: recordHistory,
    launchMode: launchMode, mountWrapper: mountWrapper, openBlank: openBlank, launch: launch, restoreBrowse: restoreBrowse };
});
