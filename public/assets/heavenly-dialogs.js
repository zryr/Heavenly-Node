(function (root) {
  'use strict';
  var transitions = new WeakMap(), previousOverflow = null;
  function reduced() { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function stop(node) {
    var running = transitions.get(node);
    if (!running) return;
    transitions.delete(node);
    clearTimeout(running.timer);
    running.animations.forEach(function (animation) { animation.onfinish = animation.oncancel = null; animation.cancel(); });
  }
  function unlock() {
    if (root.document.querySelector('.modal-backdrop.active,.modal-backdrop.modal-closing')) return;
    if (previousOverflow !== null) root.document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  }
  function sample(node) {
    var card = node.querySelector('.modal-card'), backdrop = root.getComputedStyle(node);
    var style = card && root.getComputedStyle(card);
    return { backdrop:{opacity:backdrop.opacity}, card:style && {opacity:style.opacity,transform:style.transform} };
  }
  function animate(node, closing, done, previous) {
    var card = node.querySelector('.modal-card');
    if (reduced() || root.document.visibilityState === 'hidden' || !card || !card.animate) { done(); return; }
    var duration = closing ? 170 : 190;
    var state = { animations:[], timer:null };
    transitions.set(node, state);
    var from = { opacity:0, transform:'translateY(7px) scale(.985)' };
    var to = { opacity:1, transform:'translateY(0) scale(1)' };
    state.animations.push(node.animate([previous ? previous.backdrop : {opacity:closing?1:0},{opacity:closing?0:1}], {duration:duration,easing:'ease-out',fill:'both'}));
    state.animations.push(card.animate([previous && previous.card || (closing ? to : from),closing ? from : to], {duration:duration,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'}));
    function finish() {
      if (transitions.get(node) !== state) return;
      stop(node); done();
    }
    // Cancellation and completion use the same guarded retirement. A browser
    // cancel event must not leave an inert closing sheet visible indefinitely.
    state.animations[1].onfinish = finish;
    state.animations.forEach(function (animation) { animation.oncancel = finish; });
    if (state.animations.every(function (animation) { return animation.finished && animation.finished.then; })) {
      Promise.all(state.animations.map(function (animation) { return animation.finished; })).then(finish, finish);
    }
    state.timer = setTimeout(finish, 1200);
  }
  function open(node) {
    if (!node) return;
    if (node.classList.contains('active')) return;
    var previous = node.classList.contains('modal-closing') ? sample(node) : null;
    stop(node);
    if (previousOverflow === null) previousOverflow = root.document.body.style.overflow;
    root.document.body.style.overflow = 'hidden';
    node.classList.remove('modal-closing');
    node.classList.add('active');
    node.inert = false;
    node.setAttribute('aria-hidden','false');
    animate(node, false, function () {}, previous);
  }
  function close(node) {
    if (!node || !node.classList.contains('active')) return;
    var previous = sample(node);
    stop(node);
    node.classList.add('modal-closing');
    node.classList.remove('active');
    node.inert = true;
    node.setAttribute('aria-hidden','true');
    animate(node, true, function () { node.classList.remove('modal-closing'); unlock(); }, previous);
  }
  function settle() {
    root.document.querySelectorAll('.modal-backdrop').forEach(function (node) {
      stop(node);
      if (node.classList.contains('modal-closing')) { node.classList.remove('modal-closing'); unlock(); }
    });
  }
  root.document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var activeBackdrops = Array.prototype.slice.call(root.document.querySelectorAll('.modal-backdrop.active'));
    if (!activeBackdrops.length) return;
    var topModal = activeBackdrops[activeBackdrops.length - 1];
    var focusables = Array.prototype.slice.call(topModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex="0"]:not([disabled])')).filter(function (el) {
      if (el.getAttribute('tabindex') === '-1') return false;
      if (el.offsetParent === null && !el.offsetHeight && !el.offsetWidth && !el.getClientRects().length) return false;
      return true;
    });
    if (!focusables.length) {
      e.preventDefault();
      var card = topModal.querySelector('.modal-card') || topModal;
      card.focus();
      return;
    }
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var current = root.document.activeElement;

    if (e.shiftKey) {
      if (current === first || !topModal.contains(current)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (current === last || !topModal.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  root.document.addEventListener('visibilitychange', function () {
    if (root.document.visibilityState === 'hidden') settle();
  });
  var preference = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference) {
    var changePreference = function () { if (preference.matches) settle(); };
    if (preference.addEventListener) preference.addEventListener('change', changePreference);
    else if (preference.addListener) preference.addListener(changePreference);
  }
  root.HeavenlyDialogs = { open:open, close:close };
})(window);
