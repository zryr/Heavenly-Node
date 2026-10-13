/* Shared existing preset-pool UI and set operations; callers own staging/storage. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeavenlyCloakPool = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var defaults = ['classroom', 'google', 'docs', 'drive', 'gmail', 'outlook', 'canva'];
  function values(settings) { return Array.isArray(settings.randomPool) ? settings.randomPool.slice() : defaults.slice(); }
  function keys(presets) { return Object.keys(presets).filter(function (key) { return presets[key] && typeof presets[key].title === 'string'; }); }
  function toggle(pool, key) { return pool.indexOf(key) === -1 ? pool.concat(key) : pool.filter(function (value) { return value !== key; }); }
  function all(pool, presets) { return pool.concat(keys(presets).filter(function (key) { return pool.indexOf(key) === -1; })); }
  function selected(pool, presets) { return keys(presets).filter(function (key) { return pool.indexOf(key) !== -1; }).length; }
  function render(container, presets, pool, onChange) {
    var doc = container.ownerDocument, active = doc.activeElement;
    var focusKey = active && container.contains(active) ? active.dataset.poolPreset : null;
    container.textContent = ''; container.classList.add('cloak-pool-grid');
    keys(presets).forEach(function (key) {
      var preset = presets[key], included = pool.indexOf(key) !== -1;
      var chip = doc.createElement('button'); chip.type = 'button'; chip.className = 'cloak-pool-chip'; chip.dataset.poolPreset = key;
      chip.setAttribute('aria-pressed', String(included)); chip.setAttribute('aria-label', preset.title + (included ? ' (Included in pool)' : ' (Excluded from pool)'));
      var img = doc.createElement('img'); img.alt = ''; img.width = 16; img.height = 16;
      img.src = typeof preset.icon === 'string' ? preset.icon : '/assets/heavenly-logo.png';
      img.onerror = function () { img.onerror = null; img.src = '/assets/heavenly-logo.png'; };
      var text = doc.createElement('span'); text.textContent = preset.title.split(' - ')[0].split(' | ')[0].split(' – ')[0];
      var mark = doc.createElement('span'); mark.className = 'cloak-pool-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = included ? '✓' : '○';
      chip.appendChild(img); chip.appendChild(text); chip.appendChild(mark);
      chip.onclick = function () { onChange(toggle(pool, key)); }; container.appendChild(chip);
    });
    if (focusKey !== null) { var next = Array.from(container.children).find(function (node) { return node.dataset.poolPreset === focusKey; }); if (next) next.focus({ preventScroll: true }); }
  }
  return { defaults: defaults, values: values, keys: keys, toggle: toggle, all: all, selected: selected, render: render };
});
