(function (root) {
  'use strict';
  var current = null;
  function open(options) {
    if (current) current.close();
    var doc = root.document, origin = doc.activeElement;
    var node = doc.createElement('div');
    node.id = options.id; node.className = 'modal-backdrop heavenly-collection-overlay';
    var card = doc.createElement('section');
    card.className = 'modal-card heavenly-collection-card'; card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', options.id + '-title');
    card.tabIndex = -1;
    var header = doc.createElement('header'); header.className = 'heavenly-collection-header';
    var title = doc.createElement('h2'); title.id = options.id + '-title'; title.textContent = options.title;
    var exit = doc.createElement('button'); exit.type = 'button'; exit.className = 'modal-close-btn';
    exit.textContent = '×'; exit.setAttribute('aria-label', 'Close ' + options.title);
    header.append(title, exit); card.appendChild(header); node.appendChild(card);
    var suspended = Array.from(doc.body.children).filter(function (entry) { return !/^(SCRIPT|STYLE)$/.test(entry.tagName); }).map(function (entry) {
      var state = { node:entry, inert:entry.inert, aria:entry.getAttribute('aria-hidden') };
      entry.inert = true;
      if (entry.classList.contains('modal-backdrop')) entry.setAttribute('aria-hidden', 'true');
      return state;
    });
    doc.body.appendChild(node);
    var closed = false, api = { node:node, card:card, close:close };
    function close() {
      if (closed) return;
      closed = true; doc.removeEventListener('keydown', key, true);
      root.HeavenlyDialogs.close(node);
      // The closing frame may remain for its animation. Retire its identities
      // now so an immediate reopen has one unambiguous dialog and title.
      node.removeAttribute('id'); title.removeAttribute('id');
      suspended.forEach(function (state) {
        if (!state.node.isConnected) return;
        state.node.inert = state.inert;
        if (state.aria === null) state.node.removeAttribute('aria-hidden');
        else state.node.setAttribute('aria-hidden', state.aria);
      });
      if (current === api) current = null;
      if (options.onClose) options.onClose();
      var target = origin && origin.isConnected && origin.getClientRects().length && !origin.closest('[inert]') ? origin : options.returnFocus && options.returnFocus();
      if (target) target.focus({ preventScroll:true });
      root.setTimeout(function () { node.remove(); }, 1250);
    }
    function key(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      var controls = Array.from(card.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')).filter(function (entry) { return !entry.disabled && !entry.hidden && entry.getClientRects().length && !entry.closest('[hidden],[inert]'); });
      var first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); card.focus(); }
      else if (event.shiftKey && (doc.activeElement === first || !card.contains(doc.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (doc.activeElement === last || !card.contains(doc.activeElement))) { event.preventDefault(); first.focus(); }
    }
    exit.onclick = close;
    node.addEventListener('click', function (event) { if (event.target === node) close(); });
    doc.addEventListener('keydown', key, true);
    current = api;
    if (options.render) options.render(card, close);
    root.HeavenlyDialogs.open(node);
    root.requestAnimationFrame(function () { if (!closed) (card.querySelector('[data-initial-focus]') || exit).focus({ preventScroll:true }); });
    return api;
  }
  root.HeavenlyCollectionDialog = { open:open };
})(window);
