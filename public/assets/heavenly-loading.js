/* Readiness belongs to each page initializer, never to decorative animation. */
(function (root) {
  'use strict';
  if (root.HeavenlyLoading) return;
  var timer, fallback, generation = 0;
  function element() { return root.document.getElementById('heavenly-loading-screen'); }
  function dismiss() {
    var loader = element(), version = ++generation;
    root.clearTimeout(timer); root.clearTimeout(fallback);
    if (!loader) return;
    loader.setAttribute('aria-hidden', 'true');
    loader.classList.add('fade-out');
    loader.style.pointerEvents = 'none';
    var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function finish() { if (version === generation) loader.style.display = 'none'; }
    if (reduced) finish();
    else timer = root.setTimeout(finish, 220);
  }
  function show() {
    var loader = element();
    ++generation; root.clearTimeout(timer); root.clearTimeout(fallback);
    if (!loader) return;
    loader.classList.remove('fade-out');
    loader.removeAttribute('aria-hidden');
    loader.style.pointerEvents = '';
    loader.style.display = 'flex';
    fallback = root.setTimeout(dismiss, 4000);
  }
  root.HeavenlyLoading = { show: show, dismiss: dismiss };
  // A broken page initializer cannot strand the overlay. CSS also supplies a no-JS fallback.
  fallback = root.setTimeout(dismiss, 4000);
})(window);
