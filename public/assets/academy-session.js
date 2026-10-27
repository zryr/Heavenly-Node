(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AcademySession = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var key = 'heavenly_decoy_unlocked';
  function isUnlocked(win) {
    try { return win.sessionStorage.getItem(key) === 'true'; } catch (_) { return false; }
  }
  function unlock(win) {
    try { win.sessionStorage.setItem(key, 'true'); return true; } catch (_) { return false; }
  }
  function gateHome(win) {
    var url = new URL(win.location.href);
    // A navigation fallback when this browser refuses session storage. This is
    // presentation state, never an authentication or authorization boundary.
    var requested = url.searchParams.get('academy') === 'continue';
    if (requested) {
      unlock(win);
      url.searchParams.delete('academy');
      try { win.history.replaceState(null, '', url.pathname + url.search + url.hash); } catch (_) {}
    }
    if (requested || isUnlocked(win)) return false;
    win.document.documentElement.style.visibility = 'hidden';
    win.location.replace('/academy');
    return true;
  }
  function homeUrl(win) { return unlock(win) ? '/' : '/?academy=continue'; }
  function autoUnlockEnabled(win) {
    try {
      var saved = JSON.parse(win.localStorage.getItem('heavenly_settings') || '{}');
      return !!saved && saved.decoyAutoTimer === true;
    } catch (_) { return false; }
  }
  return { isUnlocked: isUnlocked, unlock: unlock, gateHome: gateHome, homeUrl: homeUrl, autoUnlockEnabled: autoUnlockEnabled };
});
