(function () {
  'use strict';
  if (window.__heavenlyDevDiagnosticsInstalled) return;
  window.__heavenlyDevDiagnosticsInstalled = true;
  var optIn = 'heavenly_dev_diagnostics', key = 'heavenly_dev_events';
  var kinds = ['navigation', 'history', 'script-error', 'resource-error', 'unhandled-rejection', 'widget', 'frame-load', 'frame-error', 'console-error', 'fetch-error', 'http-error'];
  var counts = Object.create(null), writes = 0, seenFrames = new WeakSet();
  var sampledResources = new Map(), resourceObserver = null, resourceSamples = 0, repeatedResources = 0;
  function read() {
    try {
      var entries = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (!Array.isArray(entries)) return [];
      return entries.slice(-30).filter(function (entry) {
        return entry && kinds.indexOf(entry.kind) >= 0 && typeof entry.time === 'number';
      }).map(function (entry) { return { kind: entry.kind, time: entry.time }; });
    } catch (_) { return []; }
  }
  function record(kind) {
    counts[kind] = Math.min(10000, (counts[kind] || 0) + 1);
    // Error floods must not cause synchronous storage/JSON work indefinitely.
    // Counters stay in memory; only thirty events per document reach storage.
    if (writes >= 30) return;
    writes++;
    try {
      var entries = read();
      entries.push({ kind: kind, time: Date.now() });
      sessionStorage.setItem(key, JSON.stringify(entries.slice(-30)));
    } catch (_) {}
  }
  var active = false;
  try { active = sessionStorage.getItem(optIn) === 'true'; } catch (_) {}
  if (active) {
    record('navigation');
    addEventListener('popstate', function () { record('history'); });
    addEventListener('hashchange', function () { record('history'); });
    addEventListener('error', function (event) { record(event.target === window ? 'script-error' : event.target && event.target.tagName === 'IFRAME' ? 'frame-error' : 'resource-error'); }, true);
    addEventListener('load', function (event) {
      if (!event.target || event.target.tagName !== 'IFRAME') return;
      if (seenFrames.has(event.target)) counts['subsequent-frame-load'] = Math.min(10000, (counts['subsequent-frame-load'] || 0) + 1);
      seenFrames.add(event.target);
      record('frame-load');
    }, true);
    addEventListener('unhandledrejection', function () { record('unhandled-rejection'); });
    addEventListener('click', function (event) {
      if (event.target && /^heavenly-(?:nav|dock|scroll-lock)-root$/.test(event.target.id)) record('widget');
    }, true);
    if (window.console && typeof window.console.error === 'function') {
      var nativeError = window.console.error;
      window.console.error = function () {
        record('console-error');
        return nativeError.apply(window.console, arguments);
      };
    }
    if (typeof window.fetch === 'function') {
      var nativeFetch = window.fetch;
      window.fetch = function () {
        return nativeFetch.apply(window, arguments).then(function (response) {
          // Opaque no-cors responses have status 0, not a known HTTP failure.
          if (response.status >= 400 && response.status <= 599) record('http-error');
          return response;
        }, function (error) { record('fetch-error'); throw error; });
      };
    }
    if (typeof window.PerformanceObserver === 'function') {
      try {
        resourceObserver = new window.PerformanceObserver(function (list) { sampleResources(list.getEntries()); });
        resourceObserver.observe({ type: 'resource', buffered: true });
      } catch (_) { resourceObserver = null; }
    }
    window.__heavenlyDevDiagnostics = { snapshot: snapshot, report: loadingReport, counters: function () { return Object.assign({}, counts); } };
  }
  function sampleResources(entries) {
    entries.forEach(function (entry) {
      // Exact names are used only as bounded, document-local duplicate keys.
      // They never enter snapshots, storage, console output or copied reports.
      if (typeof entry.name !== 'string' || entry.name.length > 2048) return;
      if (sampledResources.has(entry.name)) repeatedResources = Math.min(10000, repeatedResources + 1);
      else if (sampledResources.size < 64) sampledResources.set(entry.name, true);
      resourceSamples = Math.min(10000, resourceSamples + 1);
    });
  }
  function snapshot() {
    if (resourceObserver) sampleResources(resourceObserver.takeRecords());
    var canvases = 0, frames = 0, unreadableFrames = 0, childCounts = Object.create(null);
    if (document.querySelectorAll) {
      canvases = document.querySelectorAll('canvas').length;
      var elements = document.querySelectorAll('iframe');
      frames = elements.length;
      // On-demand inspection only, capped at eight immediate child documents.
      for (var i = 0; i < Math.min(frames, 8); i++) {
        try {
          var child = elements[i].contentDocument;
          if (child) {
            canvases += child.querySelectorAll('canvas').length;
            var helper = child.defaultView && child.defaultView.__heavenlyDevDiagnostics;
            var values = helper && helper.counters();
            if (values) kinds.concat(['subsequent-frame-load']).forEach(function (kind) {
              if (typeof values[kind] === 'number' && Number.isFinite(values[kind])) childCounts[kind] = Math.min(10000, (childCounts[kind] || 0) + Math.max(0, values[kind]));
            });
          }
          else unreadableFrames++;
        } catch (_) { unreadableFrames++; }
      }
    }
    return { counts: Object.assign({}, counts), childCounts: childCounts, frames: frames, inspectedFrames: Math.min(frames, 8), unreadableFrames: unreadableFrames, canvases: canvases,
      resourceTimingAvailable: !!resourceObserver, sampledRequests: resourceSamples, repeatedRequests: repeatedResources, sampledUniqueLimit: 64,
      gameInitialized: 'Unavailable', interactiveGameplay: 'Unavailable', events: read() };
  }
  function loadingReport() {
    var data = snapshot();
    return 'Heavenly Node — Development Loading Diagnostics\n\n' +
      'Scope: this document and up to eight immediate child documents. Tab-local opt-in.\n' +
      'Game initialization and interactive gameplay cannot be inferred from a canvas.\n' +
      'Repeated timing entries are observations, not proof of duplicate downloads.\n' +
      'Subsequent iframe loads may be legitimate navigation.\n' +
      'Exact cause unavailable.\n\n' + JSON.stringify(data, null, 2) +
      '\n\nPrivacy: no URLs, paths, query values, error text, stacks, cookies, headers, bodies or unrelated storage contents.';
  }
  function mountLoadingPanel() {
    if (!active || !document.body || !document.createElement || document.getElementById('heavenly-dev-details')) return;
    // Embedded documents collect their own coarse counters without mounting
    // another overlay over the game. The top document provides the view.
    if (window.parent && window.parent !== window) return;
    var section = document.createElement('details');
    section.id = 'heavenly-dev-loading-details';
    section.style.cssText = 'position:fixed;right:12px;bottom:74px;z-index:2147483646;max-width:calc(100vw - 24px);width:350px;max-height:65vh;overflow:auto;box-sizing:border-box;padding:12px;border:1px solid #475569;border-radius:12px;background:#0f172a;color:#e2e8f0;font:13px/1.5 system-ui;';
    var summary = document.createElement('summary');
    summary.textContent = 'Development loading diagnostics'; summary.style.cssText = 'cursor:pointer;min-height:44px;';
    var report = document.createElement('textarea');
    report.readOnly = true; report.rows = 10; report.setAttribute('aria-label', 'Sanitized loading report');
    report.style.cssText = 'width:100%;box-sizing:border-box;background:#020617;color:#e2e8f0;font:12px/1.5 monospace;';
    var refresh = document.createElement('button'); refresh.type = 'button'; refresh.textContent = 'Refresh snapshot';
    var copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy Diagnostics';
    var status = document.createElement('span'); status.setAttribute('role', 'status');
    [refresh, copy].forEach(function (button) { button.style.cssText = 'min-height:44px;margin:6px 6px 6px 0;'; });
    function update() { report.value = loadingReport(); }
    section.addEventListener('toggle', function () { if (section.open) update(); });
    refresh.onclick = update;
    copy.onclick = function () {
      update();
      function select() { report.focus(); report.select(); status.textContent = 'Report selected. Use your device’s Copy action.'; }
      if (!navigator.clipboard || !navigator.clipboard.writeText) { select(); return; }
      navigator.clipboard.writeText(report.value).then(function () { status.textContent = 'Diagnostics copied.'; }, select);
    };
    [summary, report, refresh, copy, status].forEach(function (node) { section.appendChild(node); });
    document.body.appendChild(section);
  }
  function panel() {
    var section = document.getElementById('heavenly-dev-details');
    if (!section) return;
    var pre = document.getElementById('heavenly-dev-json'), server;
    try { server = JSON.parse(pre.textContent); } catch (_) { return; }
    var toggle = document.getElementById('heavenly-dev-opt-in');
    toggle.checked = active;
    toggle.onchange = function () {
      try {
        sessionStorage.setItem(optIn, String(toggle.checked));
        if (!toggle.checked) sessionStorage.removeItem(key);
        document.getElementById('heavenly-dev-copy-status').textContent = 'Preference saved. Reload to apply.';
      } catch (_) { document.getElementById('heavenly-dev-copy-status').textContent = 'Tab storage is unavailable.'; }
    };
    pre.textContent = JSON.stringify(Object.assign({}, server, { clientEvents: active ? read() : [] }), null, 2);
    document.getElementById('heavenly-dev-copy').onclick = function () {
      var status = document.getElementById('heavenly-dev-copy-status');
      if (!navigator.clipboard || !navigator.clipboard.writeText) { status.textContent = 'Select the diagnostic text to copy it.'; return; }
      navigator.clipboard.writeText(pre.textContent).then(function () { status.textContent = 'Diagnostics copied.'; }, function () { status.textContent = 'Select the diagnostic text to copy it.'; });
    };
  }
  function setup() { panel(); mountLoadingPanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
