(function (root) {
  'use strict';
  var transitions = new WeakMap(), previousOverflow = null;
  function reduced() { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function stop(node) {
    var running = transitions.get(node);
    if (!running) return;
    clearTimeout(running.timer);
    running.animations.forEach(function (animation) { animation.cancel(); });
    transitions.delete(node);
  }
  function unlock() {
    if (root.document.querySelector('.modal-backdrop.active,.modal-backdrop.modal-closing')) return;
    if (previousOverflow !== null) root.document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  }
  function animate(node, closing, done) {
    var card = node.querySelector('.modal-card');
    if (reduced() || !card || !card.animate) { done(); return; }
    var duration = closing ? 170 : 190;
    var state = { animations:[], timer:null };
    transitions.set(node, state);
    var from = { opacity:0, transform:'translateY(7px) scale(.985)' };
    var to = { opacity:1, transform:'translateY(0) scale(1)' };
    state.animations.push(node.animate([{opacity:closing?1:0},{opacity:closing?0:1}], {duration:duration,easing:'ease-out'}));
    state.animations.push(card.animate(closing ? [to,from] : [from,to], {duration:duration,easing:'cubic-bezier(.2,.7,.3,1)'}));
    function finish() {
      if (transitions.get(node) !== state) return;
      stop(node); done();
    }
    state.animations[1].onfinish = finish;
    state.timer = setTimeout(finish, duration+40);
  }
  function open(node) {
    if (!node) return;
    if (node.classList.contains('active')) return;
    stop(node);
    if (previousOverflow === null) previousOverflow = root.document.body.style.overflow;
    root.document.body.style.overflow = 'hidden';
    node.classList.remove('modal-closing');
    node.classList.add('active');
    node.inert = false;
    node.setAttribute('aria-hidden','false');
    animate(node, false, function () {});
  }
  function close(node) {
    if (!node || !node.classList.contains('active')) return;
    stop(node);
    node.classList.add('modal-closing');
    node.classList.remove('active');
    node.inert = true;
    node.setAttribute('aria-hidden','true');
    animate(node, true, function () { node.classList.remove('modal-closing'); unlock(); });
  }
  root.HeavenlyDialogs = { open:open, close:close };
})(window);
