(function (root) {
  'use strict';
  var movement = new WeakMap();

  function reducedMotion() {
    return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Measure layout independently of the temporary insertion-space translation.
  function rect(node) {
    var box = node.getBoundingClientRect();
    var host = node.dataset && node.dataset.bmId ? node.parentElement : node;
    var translated = root.getComputedStyle ? root.getComputedStyle(host).translate : 'none';
    var values = (translated || 'none').split(' ');
    var x = parseFloat(values[0]) || 0, y = parseFloat(values[1]) || 0;
    return { left:box.left-x, right:box.right-x, top:box.top-y, bottom:box.bottom-y, width:box.width, height:box.height };
  }

  function flip(nodes, previous, key) {
    // Rapid keyboard moves replace earlier motion instead of accumulating it.
    nodes.forEach(function (node) {
      var animation = movement.get(node);
      if (animation) animation.cancel();
      movement.delete(node);
    });
    if (reducedMotion()) return;
    var plans = nodes.map(function (node) {
      var old = previous.get(key(node)), next = rect(node);
      return old && { node:node, x:old.left-next.left, y:old.top-next.top };
    }).filter(Boolean);
    plans.forEach(function (plan) {
      if (!plan.node.animate || (Math.abs(plan.x) <= 1 && Math.abs(plan.y) <= 1)) return;
      movement.set(plan.node, plan.node.animate([
        { translate:plan.x+'px '+plan.y+'px' }, { translate:'0px 0px' }
      ], { duration:170, easing:'cubic-bezier(.2,.7,.3,1)' }));
    });
  }

  function settle(node) {
    if (node && node.animate && !reducedMotion()) {
      node.animate([{ opacity:.65, scale:'.985' }, { opacity:1, scale:'1' }], { duration:160, easing:'ease-out' });
    }
  }

  // Make modest insertion space without a layout-changing placeholder.
  // Stable measurements keep animation from feeding back into drop placement.
  function space() {
    var shifted = new Map();
    function update(items, target, after, horizontal) {
      var index = items.indexOf(target) + (after ? 1 : 0);
      var targetBox = target && rect(target), visible = new Set(items), plans = [];
      shifted.forEach(function (saved, node) {
        if (!visible.has(node)) {
          node.style.translate = saved;
          node.classList.remove('heavenly-displaced');
          shifted.delete(node);
        }
      });
      items.forEach(function (node, i) {
        if (!shifted.has(node)) shifted.set(node, node.style.translate);
        var inRow = !horizontal || Math.abs(rect(node).top-targetBox.top) < Math.max(8,targetBox.height/2);
        var amount = inRow ? (i < index ? -1 : 1) * (horizontal ? 9 : 12) : 0;
        plans.push({ node:node, value:horizontal ? amount+'px 0px' : '0px '+amount+'px' });
      });
      plans.forEach(function (plan) {
        plan.node.classList.add('heavenly-displaced');
        plan.node.style.translate = plan.value;
      });
    }
    function clear() {
      shifted.forEach(function (saved, node) {
        node.style.translate = saved;
        node.classList.remove('heavenly-displaced');
      });
      shifted.clear();
    }
    return { update:update, clear:clear };
  }

  // Metadata-driven HTML preview: never a screenshot, handle clone or child search.
  function create(options) {
    var doc = root.document, compact = options.input === 'touch' || root.innerWidth <= 600;
    var bookmark = options.kind === 'bookmark' || options.kind === 'mirror';
    var ghost = doc.createElement('div');
    ghost.id = options.id || 'heavenly-drag-avatar';
    ghost.className = 'drag-popout-avatar heavenly-drag-preview ' + (bookmark ? 'drag-bookmark' : 'drag-section');
    ghost.dataset.kind = options.kind;
    ghost.dataset.compact = String(compact);
    ghost.dataset.input = options.input || 'mouse';
    ghost.setAttribute('aria-hidden','true');
    ghost.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;box-sizing:border-box;border:1px solid currentColor;border-radius:12px;background:#10192bf5;box-shadow:0 8px 22px #0005;color:'+(bookmark?'#c4b5fd':'#7dd3fc')+';font:600 13px/1.3 system-ui;max-width:'+(compact?'180px':'240px')+';';
    var content = doc.createElement('div');
    content.className = 'heavenly-drag-preview-content';
    content.style.cssText = 'display:flex;align-items:center;gap:8px;padding:'+(compact?'8px 10px':'10px 13px')+';min-width:0;';
    var icon = options.icon;
    if (icon) {
      icon = icon.cloneNode(true);
      icon.removeAttribute('id');
      icon.style.cssText = 'width:22px;height:22px;flex-shrink:0;object-fit:contain;display:inline-flex;align-items:center;justify-content:center';
    } else {
      icon = doc.createElement('span');
      icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'+(bookmark?'<path d="m18 21-6-4-6 4V3h12z"/>':'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>')+'</svg>';
      icon.style.display = 'flex';
    }
    content.appendChild(icon);
    var label = doc.createElement('span');
    label.textContent = options.label || 'Move item';
    label.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;';
    content.appendChild(label);
    ghost.appendChild(content);
    doc.body.appendChild(ghost);
    var width = ghost.offsetWidth || (compact ? 180 : 240), height = ghost.offsetHeight || 42;
    var frame = 0, x = 0, y = 0, removed = false;
    ghost.style.visibility = 'hidden';
    if (content.animate && !reducedMotion()) {
      content.animate([{ scale:'.98', opacity:.7 }, { scale:'1.03', opacity:1 }, { scale:'1', opacity:1 }], { duration:150, easing:'ease-out' });
    }
    function paint() {
      frame = 0;
      if (!removed) {
        ghost.style.visibility = 'visible';
        ghost.style.transform = 'translate3d('+x+'px,'+y+'px,0)';
      }
    }
    function move(px, py) {
      x = Math.max(6, Math.min(root.innerWidth-width-6, px+12));
      y = Math.max(6, Math.min(root.innerHeight-height-6, py+(options.input==='touch'?-height-18:12)));
      if (!frame) frame = root.requestAnimationFrame(paint);
    }
    move(options.x, options.y);
    return {
      element:ghost,
      move:move,
      destroy:function () {
        removed = true;
        root.cancelAnimationFrame(frame);
        ghost.remove();
      }
    };
  }
  root.HeavenlyDrag = { create:create, rect:rect, space:space, settle:settle, flip:flip };
})(typeof window === 'undefined' ? this : window);
