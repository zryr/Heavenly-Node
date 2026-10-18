(function (root) {
  'use strict';
  // One lightweight preview renderer for bookmarks, section ordering and shortcuts.
  // Input comes from the current event, never from the device's touch capability.
  function create(options) {
    var doc = root.document, source = options.source;
    var compact = options.input === 'touch' || root.innerWidth <= 600;
    var ghost = doc.createElement('div');
    ghost.id = options.id || 'heavenly-drag-avatar';
    ghost.className = 'drag-popout-avatar heavenly-drag-preview ' + (options.kind === 'bookmark' ? 'drag-bookmark' : 'drag-section');
    ghost.dataset.compact = String(compact);
    ghost.dataset.input = options.input || 'mouse';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;box-sizing:border-box;display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid currentColor;border-radius:12px;background:#10192bea;box-shadow:0 6px 18px #0005;color:' + (options.kind === 'bookmark' ? '#c4b5fd' : '#7dd3fc') + ';font:600 13px/1.3 system-ui;max-width:240px;';
    var icon = source && source.querySelector('.bookmark-icon,.bookmark-icon-svg');
    if (icon && !compact) { icon = icon.cloneNode(true); icon.removeAttribute('id'); icon.style.cssText = 'width:22px;height:22px;flex-shrink:0;object-fit:contain'; ghost.appendChild(icon); }
    else { var symbol = doc.createElement('span'); symbol.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' + (options.kind === 'bookmark' ? '<path d="m18 21-6-4-6 4V3h12z"/>' : '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>') + '</svg>'; symbol.style.display = 'flex'; ghost.appendChild(symbol); }
    var label = doc.createElement('span'); label.textContent = options.label || 'Move item';
    label.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    if (!compact) ghost.appendChild(label);
    else { ghost.style.width = '40px'; ghost.style.height = '40px'; ghost.style.borderRadius = '50%'; ghost.style.justifyContent = 'center'; ghost.style.padding = '8px'; }
    doc.body.appendChild(ghost);
    var frame = 0, x = 0, y = 0, removed = false;
    ghost.style.visibility = 'hidden';
    function paint() { frame = 0; if (!removed) { ghost.style.visibility = 'visible'; ghost.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; } }
    function move(px, py) {
      x = Math.max(4, Math.min(root.innerWidth - (compact ? 44 : 244), px + 16));
      y = Math.max(4, py + (options.input === 'touch' ? -58 : 16));
      if (!frame) frame = root.requestAnimationFrame(paint);
    }
    move(options.x, options.y);
    return { element: ghost, move: move, destroy: function () { removed = true; root.cancelAnimationFrame(frame); ghost.remove(); } };
  }
  root.HeavenlyDrag = { create: create };
})(typeof window === 'undefined' ? this : window);
