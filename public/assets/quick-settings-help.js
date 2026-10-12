/* Body-mounted, non-modal help: works without native popover support or dependencies. */
(function (root) {
  'use strict';
  root.HeavenlyQuickSettingsHelp = { init: function (tray) {
    var doc = tray.ownerDocument;
    var popover = doc.createElement('div');
    popover.id = 'qs-help-popover';
    popover.className = 'qs-help-popover';
    popover.hidden = true;
    popover.tabIndex = -1;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-labelledby', 'qs-help-title');
    popover.setAttribute('aria-describedby', 'qs-help-text');
    popover.innerHTML = '<div class="qs-help-heading"><span id="qs-help-title" class="qs-help-title"></span><button type="button" class="qs-help-close" aria-label="Close explanation">×</button></div><p id="qs-help-text"></p>';
    doc.body.appendChild(popover);
    var trigger = null, hideTimer = null, frame = null;

    function close(restoreFocus) {
      if (!trigger) return;
      var previous = trigger;
      trigger = null;
      previous.setAttribute('aria-expanded', 'false');
      popover.classList.remove('is-open');
      // Remove closing content from keyboard navigation and accessibility immediately.
      popover.setAttribute('aria-hidden', 'true');
      popover.querySelector('button').tabIndex = -1;
      hideTimer = root.setTimeout(function () { popover.hidden = true; }, 140);
      if (restoreFocus) previous.focus({ preventScroll: true });
    }
    function position() {
      frame = null;
      if (!trigger) return;
      var viewport = root.visualViewport;
      var left = viewport ? viewport.offsetLeft : 0;
      var top = viewport ? viewport.offsetTop : 0;
      var width = viewport ? viewport.width : root.innerWidth;
      var height = viewport ? viewport.height : root.innerHeight;
      var edge = 10, gap = 8;
      var anchor = trigger.getBoundingClientRect();
      if (!trigger.getClientRects().length || anchor.bottom < top || anchor.top > top + height) { close(false); return; }
      popover.style.width = Math.min(296, width - edge * 2) + 'px';
      popover.style.maxHeight = Math.max(44, height - edge * 2) + 'px';
      var box = popover.getBoundingClientRect();
      var x = Math.max(left + edge, Math.min(anchor.left + anchor.width / 2 - box.width / 2, left + width - box.width - edge));
      var y = anchor.top - box.height - gap;
      if (y < top + edge) y = anchor.bottom + gap;
      y = Math.max(top + edge, Math.min(y, top + height - box.height - edge));
      popover.style.left = x + 'px';
      popover.style.top = y + 'px';
    }
    function schedulePosition() {
      if (trigger && frame === null) frame = root.requestAnimationFrame(position);
    }
    tray.querySelectorAll('[data-qs-help]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (trigger === button) { close(true); return; }
        close(false);
        root.clearTimeout(hideTimer);
        trigger = button;
        var pill = doc.getElementById(button.getAttribute('data-qs-help'));
        doc.getElementById('qs-help-title').textContent = pill.getAttribute('aria-label');
        var explanation = doc.getElementById(pill.id + '-help').textContent;
        if (pill.disabled) explanation += ' New Tab is currently required by about:blank.';
        doc.getElementById('qs-help-text').textContent = explanation;
        popover.hidden = false;
        popover.removeAttribute('aria-hidden');
        popover.querySelector('button').tabIndex = 0;
        button.setAttribute('aria-expanded', 'true');
        position();
        popover.classList.add('is-open');
        popover.focus({ preventScroll: true });
      });
    });
    popover.querySelector('button').addEventListener('click', function () { close(true); });
    doc.addEventListener('pointerdown', function (event) {
      if (trigger && !popover.contains(event.target) && !trigger.contains(event.target)) close(false);
    });
    doc.addEventListener('keydown', function (event) {
      if (trigger && event.key === 'Escape') { event.preventDefault(); close(true); }
      // Continue the tray's natural tab order instead of jumping to browser chrome
      // from this body-mounted dialog. Shift+Tab also returns to the controls.
      if (trigger && event.key === 'Tab' && popover.contains(event.target) &&
          (event.shiftKey || event.target === popover.querySelector('button'))) {
        close(true);
      }
    });
    doc.addEventListener('focusin', function (event) {
      if (trigger && !popover.contains(event.target) && event.target !== trigger) close(false);
    });
    doc.addEventListener('scroll', schedulePosition, true);
    root.addEventListener('resize', schedulePosition);
    if (root.visualViewport) {
      root.visualViewport.addEventListener('resize', schedulePosition);
      root.visualViewport.addEventListener('scroll', schedulePosition);
    }
    return { close: close };
  } };
})(window);
