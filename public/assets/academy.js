(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  var information = window.AcademyInformation;
  var informationShell = information && information.ownedShell(window);
  // Register this document before accepting navigation, without waiting for
  // optional images or other assets to finish the iframe's load event.
  if (informationShell && informationShell.ready) informationShell.ready();
  var menu = document.getElementById('academy-menu-toggle');
  var nav = document.getElementById('academy-nav');
  if (menu && nav) {
    menu.hidden = false;
    menu.addEventListener('click', function () {
      var expanded = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(expanded));
      nav.classList.toggle('is-open', expanded);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); menu.focus();
      }
    });
  }
  var session = window.AcademySession;
  var retry = document.getElementById('academy-retry');
  if (retry) retry.addEventListener('click', function () { window.location.reload(); });
  var timer;
  function cancelTimer() { if (timer) { window.clearTimeout(timer); timer = null; } }
  document.querySelectorAll('[data-academy-terms]').forEach(function (link) {
    link.addEventListener('click', function () { cancelTimer(); if (session) session.unlock(window); });
  });
  var home = document.getElementById('academy-home-return');
  if (home && session) {
    // Terms remains a real, readable destination. The established session unlock
    // is retained without immediately taking the reader away from that page.
    session.unlock(window);
    home.addEventListener('click', function (event) {
      event.preventDefault(); cancelTimer();
      var destination = new URL(session.homeUrl(window), window.location.origin).href;
      var shell = window.AcademyInformation && window.AcademyInformation.ownedShell(window);
      if (shell) shell.leave(destination);
      else window.location.assign(destination);
    });
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download')) return;
    var info = window.AcademyInformation;
    if (!info) return;
    var url = new URL(link.href, window.location.href);
    if (link.getAttribute('href').charAt(0) === '#') {
      var hashShell = info.ownedShell(window);
      if (hashShell) { event.preventDefault(); hashShell.navigate(url.href); }
      return;
    }
    if (info.allowed(url.href, window.location.origin) && window.HeavenlyNavigation) {
      event.preventDefault(); info.launch(window, url.href, window.HeavenlyNavigation);
    } else {
      var shell = info.ownedShell(window);
      if (shell && (url.protocol === 'http:' || url.protocol === 'https:')) { event.preventDefault(); shell.leave(url.href); }
    }
  });
  function startTimer() {
    cancelTimer();
    if (session && document.body.dataset.page === 'home' && !session.isUnlocked(window) && session.autoUnlockEnabled(window)) {
      timer = window.setTimeout(function () { window.location.replace(session.homeUrl(window)); }, 2600);
    }
  }
  startTimer();
  window.addEventListener('pagehide', cancelTimer);
  window.addEventListener('pageshow', function (event) { if (event.persisted) startTimer(); });
  var service = document.getElementById('academy-service-name');
  if (service) {
    var services = {
      'student-portal': ['Student portal', 'Student accounts and assignments are planned for a future version. There is no sign-in service or student record system on this site.'],
      'family-portal': ['Family portal', 'Family accounts are planned for a future version. This site does not collect family details or provide student records.'],
      'applications': ['Applications', 'Applications and campus visits are not available through this site. You can explore the learning pathways and use the free study resources today.'],
      'clubs': ['Clubs & societies', 'A fuller collection of independent project guides is being prepared. Explore the student hub for activities you can try now.']
    };
    var selected = services[new URLSearchParams(window.location.search).get('service')] || ['More learning tools', 'This feature is planned for a future version. The learning pathways, resource library and student guides are available now.'];
    service.textContent = selected[0];
    document.getElementById('academy-service-description').textContent = selected[1];
    document.title = selected[0] + ' · Morrowfield Academy';
  }
})();
