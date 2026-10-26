(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AcademyInformation = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var titles = { about: 'Our approach', terms: 'Terms of Service', privacy: 'Privacy & local preferences', accessibility: 'Accessibility', credits: 'Image & content credits' };
  function allowed(value, origin) {
    try {
      var url = new URL(value, origin);
      var match = /^\/academy\/(about|terms|privacy|accessibility|credits)$/.exec(url.pathname);
      return url.origin === origin && !!match && !url.username && !url.password;
    } catch (_) { return false; }
  }
  function titleFor(url) { return titles[new URL(url).pathname.split('/').pop()] + ' · Morrowfield Academy'; }
  function ownedShell(win) {
    try {
      var shell = win.parent !== win && win.parent.__academyInfoShell;
      return shell && shell.frame.contentWindow === win ? shell : null;
    } catch (_) { return null; }
  }
  function mountShell(target, value, origin) {
    if (!allowed(value, origin)) throw Error('Unsupported information page');
    value = new URL(value, origin).href;
    var doc = target.document;
    if (!doc || !doc.head || !doc.body) throw Error('The new tab is unavailable');
    doc.documentElement.lang = 'en';
    doc.title = titleFor(value);
    var viewport = doc.createElement('meta');
    viewport.name = 'viewport'; viewport.content = 'width=device-width,initial-scale=1,viewport-fit=cover'; doc.head.appendChild(viewport);
    var icon = doc.createElement('link'); icon.rel = 'icon'; icon.href = origin + '/assets/academy-mark.svg'; doc.head.appendChild(icon);
    var style = doc.createElement('style');
    style.textContent = 'html,body{margin:0;height:100%;background:#f7f4ec;color:#142b3b;font:13px Arial,sans-serif}body{display:flex;flex-direction:column}nav{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px max(12px,env(safe-area-inset-right));padding-top:max(8px,env(safe-area-inset-top));border-bottom:1px solid #d8d8ce;background:#fffefa}nav a,nav button{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px;padding:9px 12px;border:1px solid #cbd1ca;color:inherit;background:transparent;font:inherit;text-decoration:none;cursor:pointer}nav a:focus-visible,nav button:focus-visible{outline:3px solid #a36519;outline-offset:2px}#academy-information-status{flex:1;min-width:100px;padding:5px}iframe{width:100%;flex:1;min-height:0;border:0}';
    doc.head.appendChild(style); doc.body.textContent = '';
    var bar = doc.createElement('nav'); bar.setAttribute('aria-label', 'Information page navigation');
    var back = doc.createElement('button'); back.type = 'button'; back.textContent = 'Back';
    var home = doc.createElement('a'); home.href = origin + '/academy'; home.textContent = 'Academy home';
    var status = doc.createElement('span'); status.id = 'academy-information-status'; status.setAttribute('role', 'status'); status.textContent = 'Loading information…';
    var recovery = doc.createElement('a'); recovery.href = value; recovery.textContent = 'Open normally'; recovery.id = 'academy-information-recovery';
    [back, home, status, recovery].forEach(function (node) { bar.appendChild(node); }); doc.body.appendChild(bar);
    var frame = doc.createElement('iframe'); frame.id = 'academy-information-frame'; frame.title = titleFor(value);
    // Only our allowlisted, trusted information documents enter this shell.
    // Arbitrary HTML and proxy content never use this Academy-only container.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    var entries = [{ url: value }], historyIndex = 0, pendingIndex = null;
    var historyKey = 'academy-information-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    var shell = { frame: frame, current: value, navigate: function (url) {
      if (!allowed(url, origin)) { target.location.href = url; return; }
      url = new URL(url, origin).href;
      if (url !== shell.current) {
        entries.splice(historyIndex + 1); entries.push({ url: url }); pendingIndex = entries.length - 1;
      }
      // Let the child create the actual browser entry. The top document stays
      // about:blank, whose initial entry cannot reliably own pushState history.
      frame.contentWindow.location.assign(url);
    }, leave: function (url) { target.location.href = url; } };
    target.__academyInfoShell = shell;
    back.onclick = function () {
      if (historyIndex < 1) { target.location.href = origin + '/academy'; return; }
      frame.contentWindow.history.back();
    };
    home.onclick = function (event) { event.preventDefault(); target.location.href = origin + '/academy'; };
    recovery.onclick = function (event) { event.preventDefault(); target.location.href = shell.current; };
    function recordCurrent() {
      try {
        var current = frame.contentWindow.location.href;
        if (current === 'about:blank') return;
        if (!allowed(current, origin)) { status.textContent = 'This page needs normal navigation. Choose Open normally.'; return; }
        var childHistory = frame.contentWindow.history;
        var state = childHistory.state;
        // IDs distinguish repeated URLs. Navigation intent seeds a new entry;
        // native Back/Forward reads the ID already stored in the old entry.
        if (state && state.academyInformation === historyKey && entries[state.index]) {
          historyIndex = state.index; pendingIndex = null;
        } else {
          if (pendingIndex !== null && entries[pendingIndex].url === current) historyIndex = pendingIndex;
          else if (current !== entries[historyIndex].url) return;
          pendingIndex = null;
          childHistory.replaceState({ academyInformation: historyKey, index: historyIndex }, '');
        }
        shell.current = current; recovery.href = current; doc.title = frame.contentDocument.title; frame.title = doc.title; status.textContent = doc.title;
        back.textContent = historyIndex > 0 ? 'Back' : 'Back to Academy';
      } catch (_) { status.textContent = 'The page could not load here. Choose Open normally.'; }
    }
    shell.ready = function () {
      recordCurrent();
      try {
        frame.contentWindow.addEventListener('popstate', recordCurrent);
        frame.contentWindow.addEventListener('hashchange', recordCurrent);
      } catch (_) {}
    };
    frame.onload = shell.ready;
    frame.onerror = function () { status.textContent = 'The page could not load here. Choose Open normally.'; };
    frame.src = value; doc.body.appendChild(frame);
    target.setTimeout(function () { if (status.textContent === 'Loading information…') status.textContent = 'Still loading? Choose Open normally.'; }, 10000);
    return shell;
  }
  function launch(win, value, navigation) {
    var origin = win.location.origin;
    if (!allowed(value, origin)) return false;
    var url = new URL(value, origin).href;
    var shell = ownedShell(win);
    if (shell) { shell.navigate(url); return true; }
    var saved = {};
    // A browser may deny the Storage getter itself, before readSettings can
    // handle a getItem failure. Real links still navigate in that case.
    try { saved = navigation.readSettings(win.localStorage); } catch (_) {}
    var mode = navigation.launchMode(saved, 'search');
    if (!mode.newTab) { win.location.assign(url); return true; }
    // Called only during a real link click: preserve the native user activation.
    var target;
    try { target = win.open('about:blank', '_blank'); } catch (_) {}
    if (!target) { win.location.assign(url); return true; }
    try {
      if (mode.aboutBlank) {
        var mounted = false;
        function initialize() {
          if (mounted) return;
          mounted = true;
          try { mountShell(target, url, origin); target.opener = null; }
          catch (_) { try { target.opener = null; target.location.href = url; } catch (_) { win.location.assign(url); } }
        }
        // Chromium's initial empty popup has no session-history entry. Finish
        // a real about:blank navigation before mounting trusted DOM, as the
        // shared website launcher does, so iframe Back/Forward has entries.
        if (target.history && target.history.length === 0 && target.addEventListener) {
          target.addEventListener('load', initialize, { once: true });
          try { target.location.replace('about:blank'); } catch (_) { initialize(); }
          if (win.setTimeout) win.setTimeout(initialize, 1500);
        } else initialize();
      } else { target.opener = null; target.location.replace(url); }
    } catch (_) { try { target.location.href = url; } catch (_) { win.location.assign(url); } }
    return true;
  }
  return { allowed: allowed, launch: launch, ownedShell: ownedShell, mountShell: mountShell };
});
