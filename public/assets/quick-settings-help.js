/* Shared, body-mounted help with native keyboard/touch accordions in the guide. */
(function (root) {
  'use strict';
  root.HeavenlyQuickSettingsHelp = { init: function (tray, describe) {
    var doc = tray.ownerDocument;
    var popover = doc.createElement('div');
    popover.id = 'qs-help-popover'; popover.className = 'qs-help-popover';
    popover.hidden = true; popover.tabIndex = -1;
    popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-labelledby', 'qs-help-title');
    popover.innerHTML = '<div class="qs-help-heading"><span id="qs-help-title" class="qs-help-title"></span><button type="button" class="qs-help-close" aria-label="Close Quick Settings help">×</button></div><p id="qs-help-intro" hidden>Choose a shortcut to learn how it works. Only your visible shortcuts are shown.</p><div id="qs-help-text"></div>';
    doc.body.appendChild(popover);
    var trigger = null, hideTimer = null, frame = null, guide = false;
    function close(restoreFocus) {
      if (!trigger) return;
      var previous = trigger; trigger = null;
      previous.setAttribute('aria-expanded', 'false'); popover.classList.remove('is-open');
      popover.setAttribute('aria-hidden', 'true');
      popover.querySelectorAll('button, summary').forEach(function (node) { node.tabIndex = -1; });
      hideTimer = root.setTimeout(function () { popover.hidden = true; }, 140);
      if (restoreFocus) previous.focus({ preventScroll: true });
    }
    function position() {
      frame = null; if (!trigger) return;
      var viewport = root.visualViewport;
      var left = viewport ? viewport.offsetLeft : 0, top = viewport ? viewport.offsetTop : 0;
      var width = viewport ? viewport.width : root.innerWidth, height = viewport ? viewport.height : root.innerHeight;
      var edge = 10, gap = 8, anchor = trigger.getBoundingClientRect();
      if (!trigger.getClientRects().length || anchor.bottom < top || anchor.top > top + height) { close(false); return; }
      popover.style.width = Math.max(44, Math.min(guide ? 400 : 296, width - edge * 2)) + 'px';
      popover.style.maxHeight = Math.max(44, Math.min(guide ? 560 : 420, height - edge * 2)) + 'px';
      var box = popover.getBoundingClientRect();
      var x = Math.max(left + edge, Math.min(anchor.left + anchor.width / 2 - box.width / 2, left + width - box.width - edge));
      var y = guide ? anchor.bottom + gap : anchor.top - box.height - gap;
      if (guide && y + box.height > top + height - edge) y = anchor.top - box.height - gap;
      if (y < top + edge) y = anchor.bottom + gap;
      y = Math.max(top + edge, Math.min(y, top + height - box.height - edge));
      popover.style.left = x + 'px'; popover.style.top = y + 'px';
    }
    function schedulePosition() { if (trigger && frame === null) frame = root.requestAnimationFrame(position); }
    function render(content) {
      guide = !!content.guide;
      popover.classList.toggle('qs-help-guide', guide);
      doc.getElementById('qs-help-title').textContent = content.title;
      doc.getElementById('qs-help-intro').hidden = !guide;
      popover.setAttribute('aria-describedby', guide ? 'qs-help-intro' : 'qs-help-text');
      var text = doc.getElementById('qs-help-text'); text.tabIndex = -1; text.textContent = ''; text.scrollTop = 0;
      var category = null, categoryName = null;
      content.entries.forEach(function (entry) {
        var section = doc.createElement(guide && entry.id ? 'details' : 'div'); section.className = 'qs-help-entry';
        if (guide && entry.id) {
          if (categoryName !== entry.group) {
            categoryName = entry.group; category = doc.createElement('section'); category.className = 'qs-guide-category';
            var heading = doc.createElement('h3'); heading.className = 'qs-group-label'; heading.textContent = categoryName; category.appendChild(heading); text.appendChild(category);
          }
          section.dataset.helpEntry = entry.id;
          var summary = doc.createElement('summary'); summary.tabIndex = 0;
          summary.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24">' + entry.icon + '</svg>';
          var name = doc.createElement('span'); name.textContent = entry.name; summary.appendChild(name);
          var arrow = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); arrow.setAttribute('viewBox', '0 0 24 24'); arrow.setAttribute('aria-hidden', 'true'); arrow.classList.add('qs-guide-arrow');
          var path = doc.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'm9 5 7 7-7 7'); arrow.appendChild(path); summary.appendChild(arrow);
          section.appendChild(summary);
          section.addEventListener('toggle', function () {
            if (section.open) text.querySelectorAll('details[open]').forEach(function (other) { if (other !== section) other.open = false; });
            schedulePosition();
          });
        }
        var paragraph = doc.createElement('p'); paragraph.textContent = entry.text; section.appendChild(paragraph);
        (guide && entry.id ? category : text).appendChild(section);
      });
    }
    tray.addEventListener('click', function (event) {
      var button = event.target.closest('[data-qs-help]'); if (!button || !tray.contains(button)) return;
      if (trigger === button) { close(true); return; }
      close(false); root.clearTimeout(hideTimer); trigger = button;
      render(describe(button.getAttribute('data-qs-help')));
      popover.hidden = false; popover.removeAttribute('aria-hidden'); popover.querySelector('button').tabIndex = 0;
      button.setAttribute('aria-expanded', 'true'); position(); popover.classList.add('is-open'); popover.focus({ preventScroll: true });
    });
    popover.querySelector('button').addEventListener('click', function () { close(true); });
    doc.addEventListener('pointerdown', function (event) { if (trigger && !popover.contains(event.target) && !trigger.contains(event.target)) close(false); });
    doc.addEventListener('keydown', function (event) {
      if (trigger && event.key === 'Escape') { event.preventDefault(); close(true); }
      // Traverse the guide normally; at either edge resume the trigger's page order.
      if (trigger && event.key === 'Tab' && popover.contains(event.target)) {
        var focusable = popover.querySelectorAll('button, summary');
        if ((event.shiftKey && (event.target === focusable[0] || event.target === popover)) || (!event.shiftKey && event.target === focusable[focusable.length - 1])) close(true);
      }
    });
    doc.addEventListener('focusin', function (event) { if (trigger && !popover.contains(event.target) && event.target !== trigger) close(false); });
    doc.addEventListener('scroll', function (event) { if (!popover.contains(event.target)) schedulePosition(); }, true);
    root.addEventListener('resize', schedulePosition);
    if (root.visualViewport) { root.visualViewport.addEventListener('resize', schedulePosition); root.visualViewport.addEventListener('scroll', schedulePosition); }
    return { close: close };
  } };
})(window);
