/* Shared modal lifecycle for shortcut customization and contextual configuration. */
(function (root) {
  'use strict';
  root.HeavenlyQuickSettingsDialog = { create: function (modal, options) {
    var doc = modal.ownerDocument, previous = null, previousId = '', background = [], overflow = '';
    var card = modal.querySelector('[role="dialog"]');
    function close() {
      if (modal.hidden) return;
      modal.hidden = true;
      doc.body.style.overflow = overflow;
      background.forEach(function (saved) {
        saved.node.inert = saved.inert;
        if (saved.aria === null) saved.node.removeAttribute('aria-hidden'); else saved.node.setAttribute('aria-hidden', saved.aria);
      });
      background = [];
      if (options.onClose) options.onClose();
      var target = previous && previous.isConnected ? previous : previousId && doc.getElementById(previousId);
      if (!target || !target.getClientRects().length) target = options.fallbackFocus && options.fallbackFocus();
      if (target) target.focus({ preventScroll: true });
    }
    function open(trigger) {
      if (!modal.hidden) return;
      previous = trigger || doc.activeElement; previousId = previous && previous.id;
      overflow = doc.body.style.overflow;
      modal.hidden = false; doc.body.style.overflow = 'hidden';
      background = Array.from(doc.body.children).filter(function (node) { return node !== modal && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE'; }).map(function (node) {
        var saved = { node: node, inert: node.inert, aria: node.getAttribute('aria-hidden') };
        node.inert = true; node.setAttribute('aria-hidden', 'true'); return saved;
      });
      card.querySelector('[data-dialog-close], [data-editor-close]').focus({ preventScroll: true });
    }
    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('[data-dialog-close], [data-editor-close]')) close();
    });
    modal.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === 'Tab') {
        var nodes = Array.from(card.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary')).filter(function (node) { return node.getClientRects().length; });
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    return { open: open, close: close };
  } };
})(window);
