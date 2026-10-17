(function () {
  'use strict';
  var optIn = 'heavenly_dev_diagnostics', key = 'heavenly_dev_events';
  var kinds = ['navigation', 'history', 'script-error', 'resource-error', 'unhandled-rejection', 'widget'];
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
    addEventListener('error', function (event) { record(event.target === window ? 'script-error' : 'resource-error'); }, true);
    addEventListener('unhandledrejection', function () { record('unhandled-rejection'); });
    addEventListener('click', function (event) {
      if (event.target && /^heavenly-(?:nav|dock|scroll-lock)-root$/.test(event.target.id)) record('widget');
    }, true);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', panel);
  else panel();
})();
