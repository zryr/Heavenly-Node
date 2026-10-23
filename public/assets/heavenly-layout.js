/* Content-sized homepage columns. Viewport pressure never changes the saved intent. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeavenlyLayout = factory(root);
})(typeof window !== 'undefined' ? window : this, function (root) {
  'use strict';
  var KEY = 'heavenly_home_layout_v1', MIN = 240, MAX = 400, CENTER = 440, RAIL = 44, GAP = 16;
  var sides = ['left', 'right'];
  function defaults() { return { version: 1, priority: 'left', left: { width: 256, collapsed: false, compactOpen: false }, right: { width: 256, collapsed: false, compactOpen: false } }; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function normalize(value) {
    var result = defaults();
    if (!value || value.version !== 1) return result;
    if (value.priority === 'right') result.priority = 'right';
    sides.forEach(function (side) {
      var saved = value[side];
      if (!saved || typeof saved !== 'object') return;
      if (typeof saved.width === 'number' && isFinite(saved.width)) result[side].width = clamp(saved.width, MIN, MAX);
      result[side].collapsed = saved.collapsed === true;
      result[side].compactOpen = saved.compactOpen === true;
    });
    return result;
  }
  // Pure layout calculation, also used by the keyboard separator's limits.
  function calculate(available, preferences, priority) {
    preferences = normalize(preferences);
    var compact = available < CENTER + MIN + RAIL + GAP * 2;
    var result = { compact: compact, left: {}, right: {} };
    sides.forEach(function (side) { result[side] = { open: !preferences[side].collapsed && !compact, width: preferences[side].width }; });
    if (compact) return result;
    function total() { return sides.reduce(function (sum, side) { return sum + (result[side].open ? result[side].width : RAIL); }, CENTER + GAP * 2); }
    // Reduce surplus width before hiding useful content. Prefer the most recently opened panel.
    var order = (priority || preferences.priority) === 'right' ? ['left', 'right'] : ['right', 'left'];
    order.forEach(function (side) { if (result[side].open) result[side].width -= Math.min(result[side].width - MIN, Math.max(0, total() - available)); });
    order.forEach(function (side) { if (total() > available && result[side].open) result[side].open = false; });
    order.slice().reverse().forEach(function (side) {
      if (result[side].open) result[side].width += Math.min(preferences[side].width - result[side].width, Math.max(0, available - total()));
    });
    return result;
  }
  var api = { defaults: defaults, normalize: normalize, calculate: calculate, key: KEY, min: MIN, max: MAX };
  if (!root || !root.document) return api;
  function init() {
    var doc = root.document, layout = doc.querySelector('.app-layout');
    if (!layout) return;
    var preferences;
    try { preferences = normalize(JSON.parse(root.localStorage.getItem(KEY))); } catch (e) { preferences = defaults(); }
    var current, priority = preferences.priority, resize = null, pendingFrame = 0, lastWidth = 0;
    var status = doc.getElementById('layout-status');
    function save() { try { root.localStorage.setItem(KEY, JSON.stringify(preferences)); } catch (e) {} }
    function announce(message) { status.textContent = message; }
    function panel(side) { return doc.getElementById(side + '-sidebar'); }
    function separator(side) { return doc.getElementById(side + '-resize'); }
    function maxWidth(side) {
      var other = side === 'left' ? 'right' : 'left';
      return clamp(layout.clientWidth - CENTER - GAP * 2 - (current[other].open ? current[other].width : RAIL), MIN, MAX);
    }
    function apply() {
      pendingFrame = 0;
      var width = layout.clientWidth;
      current = calculate(width, preferences, priority);
      layout.classList.toggle('layout-compact', current.compact);
      sides.forEach(function (side) {
        var state = current[side], shell = panel(side);
        var focused = doc.activeElement, ownedFocus = shell.contains(focused);
        if (current.compact) state.open = preferences[side].compactOpen && !preferences[side].collapsed;
        shell.classList.toggle('is-collapsed', !state.open);
        shell.dataset.collapse = !state.open ? (preferences[side].collapsed ? 'manual' : 'automatic') : 'none';
        layout.style.setProperty('--' + side + '-track', (state.open ? state.width : RAIL) + 'px');
        var column = doc.getElementById(side + '-column');
        column.inert = !state.open;
        column.setAttribute('aria-hidden', String(!state.open));
        shell.querySelector('.sidebar-content').hidden = !state.open;
        shell.querySelector('.sidebar-tab').hidden = state.open || current.compact;
        doc.querySelectorAll('[data-sidebar-toggle="' + side + '"]').forEach(function (button) {
          button.setAttribute('aria-expanded', String(state.open));
          button.setAttribute('aria-label', (state.open ? 'Collapse ' : 'Expand ') + side + ' bookmarks');
        });
        var handle = separator(side);
        handle.hidden = !state.open || current.compact;
        handle.setAttribute('aria-valuenow', String(Math.round(state.width)));
        handle.setAttribute('aria-valuemax', String(maxWidth(side)));
        handle.setAttribute('aria-valuetext', Math.round(state.width) + ' pixels');
        if (ownedFocus && (focused.closest('[hidden]') || (!state.open && focused !== shell.querySelector('.sidebar-tab')))) {
          var focusTarget = state.open ? shell.querySelector('.sidebar-heading button') : current.compact ? doc.querySelector('.layout-toolbar [data-sidebar-toggle="' + side + '"]') : shell.querySelector('.sidebar-tab');
          focusTarget.focus({ preventScroll: true });
        }
      });
      lastWidth = width;
    }
    function schedule() { if (!pendingFrame) pendingFrame = root.requestAnimationFrame(apply); }
    function cancelResize() {
      if (!resize) return;
      var previous = resize;
      resize = null;
      root.cancelAnimationFrame(pendingFrame); pendingFrame = 0;
      preferences[previous.side].width = previous.saved;
      cleanupResize(previous);
      apply();
    }
    function cleanupResize(state) {
      try { if (state.handle.hasPointerCapture(state.id)) state.handle.releasePointerCapture(state.id); } catch (e) {}
      layout.classList.remove('is-resizing'); panel(state.side).classList.remove('is-resizing');
      doc.body.classList.remove('homepage-resizing');
      if (root.HeavenlyGestures) root.HeavenlyGestures.release('sidebar-resize');
    }
    function toggle(side) {
      if (root.HeavenlyGestures && root.HeavenlyGestures.owner) return;
      var open = current[side].open;
      preferences[side].collapsed = open;
      if (current.compact) preferences[side].compactOpen = !open;
      else if (open) preferences[side].compactOpen = false;
      priority = side;
      preferences.priority = side;
      // An explicit expansion has priority over the other panel when only one fits.
      save(); apply();
      if (doc.activeElement && panel(side).contains(doc.activeElement) && !current[side].open) {
        var replacement = current.compact ? doc.querySelector('.layout-toolbar [data-sidebar-toggle="' + side + '"]') : panel(side).querySelector('.sidebar-tab');
        replacement.focus({ preventScroll: true });
      }
      announce((current[side].open ? 'Expanded ' : 'Collapsed ') + side + ' bookmarks.');
      if (current.compact && current[side].open) panel(side).scrollIntoView({ block: 'start', behavior: root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    doc.querySelectorAll('[data-sidebar-toggle]').forEach(function (button) { button.addEventListener('click', function () { toggle(button.dataset.sidebarToggle); }); });
    sides.forEach(function (side) {
      var handle = separator(side);
      // Reserve native touch defaults only on the divider. Pointer Events own
      // movement; this prevents the browser from retaining a pending tap/scroll
      // recognizer when capture is interrupted by another contact or rotation.
      handle.addEventListener('touchstart', function (event) {
        if (resize && event.touches.length === 1 && event.cancelable) event.preventDefault();
      }, { passive: false });
      handle.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || event.isPrimary === false || !current[side].open || current.compact) return;
        if (root.HeavenlyGestures && !root.HeavenlyGestures.acquire('sidebar-resize', cancelResize)) return;
        event.preventDefault(); event.stopPropagation();
        resize = { side: side, id: event.pointerId, x: event.clientX, start: current[side].width, saved: preferences[side].width, handle: handle };
        layout.classList.add('is-resizing'); panel(side).classList.add('is-resizing'); doc.body.classList.add('homepage-resizing');
        try { handle.setPointerCapture(event.pointerId); } catch (e) {}
      });
      handle.addEventListener('pointermove', function (event) {
        if (!resize || event.pointerId !== resize.id) return;
        event.preventDefault();
        preferences[side].width = clamp(resize.start + (event.clientX - resize.x) * (side === 'left' ? 1 : -1), MIN, maxWidth(side));
        schedule();
      });
      handle.addEventListener('pointerup', function (event) {
        if (!resize || event.pointerId !== resize.id) return;
        var previous = resize; resize = null;
        cleanupResize(previous); save(); apply();
        announce(side + ' bookmarks width ' + Math.round(current[side].width) + ' pixels.');
      });
      handle.addEventListener('pointercancel', cancelResize);
      handle.addEventListener('lostpointercapture', function () { if (resize) cancelResize(); });
      handle.addEventListener('keydown', function (event) {
        if (root.HeavenlyGestures && root.HeavenlyGestures.owner) return;
        var direction = side === 'left' ? 1 : -1, next = current[side].width;
        if (event.key === 'ArrowLeft') next -= (event.shiftKey ? 32 : 16) * direction;
        else if (event.key === 'ArrowRight') next += (event.shiftKey ? 32 : 16) * direction;
        else if (event.key === 'Home') next = MIN;
        else if (event.key === 'End') next = maxWidth(side);
        else return;
        event.preventDefault();
        preferences[side].width = clamp(next, MIN, maxWidth(side)); save(); apply();
      });
    });
    doc.getElementById('reset-home-layout').addEventListener('click', function () {
      if (root.HeavenlyGestures && root.HeavenlyGestures.owner) return;
      preferences = defaults(); priority = 'left'; save(); apply(); announce('Homepage layout reset.');
    });
    function viewportChanged() {
      if (resize) cancelResize();
      if (root.HeavenlyGestures && root.HeavenlyGestures.owner === 'bookmark-drag') root.HeavenlyGestures.cancel();
      schedule();
    }
    if (root.ResizeObserver) new root.ResizeObserver(function () { if (Math.abs(layout.clientWidth - lastWidth) > 1) viewportChanged(); }).observe(layout);
    root.addEventListener('resize', viewportChanged);
    root.addEventListener('orientationchange', viewportChanged);
    root.addEventListener('blur', cancelResize);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) cancelResize(); });
    doc.addEventListener('keydown', function (event) { if (event.key === 'Escape') cancelResize(); });
    doc.addEventListener('pointerdown', function (event) { if (resize && event.pointerId !== resize.id) cancelResize(); }, true);
    root.addEventListener('storage', function (event) { if (event.key === KEY) { cancelResize(); try { preferences = normalize(JSON.parse(event.newValue)); } catch (e) { preferences = defaults(); } priority = preferences.priority; apply(); } });
    apply();
    layout.classList.add('layout-grip-intro');
    root.setTimeout(function () { layout.classList.remove('layout-grip-intro'); }, 2600);
    api.getState = function () { return { preferences: normalize(preferences), actual: current }; };
    api.refresh = apply;
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
  return api;
});
