/* Small, opt-in homepage helpers. Never starts media or writes bookmark APIs. */
(function () {
  'use strict';
  var actions = document.querySelector('.header-actions-group');
  var about = document.querySelector('.about-details');
  if (!actions || !about) return;
  function node(tag, className, text) { var el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }
  function popup(title, trigger, fill) {
    var dialog = node('dialog', 'heavenly-extra-dialog');
    var heading = node('h2', '', title), close = node('button', 'heavenly-extra-close', 'Close');
    heading.id = 'heavenly-extra-title'; dialog.setAttribute('aria-labelledby', heading.id); close.type = 'button';
    var header = node('div', 'heavenly-extra-header'); header.append(heading, close); dialog.appendChild(header); fill(dialog);
    close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) { var rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    dialog.addEventListener('close', function () { dialog.remove(); if (trigger.isConnected && !trigger.hidden) trigger.focus({preventScroll:true}); }, {once:true});
    document.body.appendChild(dialog); dialog.showModal();
  }
  var music = node('button', 'settings-btn heavenly-music-shortcut'); music.id = 'heavenly-music-shortcut'; music.type = 'button'; music.setAttribute('aria-label', 'Music · Monochrome'); music.setAttribute('aria-haspopup', 'dialog'); music.title = 'Music · Monochrome';
  var note = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); note.setAttribute('viewBox', '0 0 24 24'); note.setAttribute('aria-hidden', 'true'); var path = document.createElementNS(note.namespaceURI, 'path'); path.setAttribute('d', 'M9 18V5l11-2v13M9 9l11-2M9 18c0 1.7-1.6 3-3.5 3S2 20.2 2 18.5 3.6 16 5.5 16 9 16.3 9 18Zm11-2c0 1.7-1.6 3-3.5 3s-3.5-.8-3.5-2.5S14.6 14 16.5 14 20 14.3 20 16Z'); note.appendChild(path); music.appendChild(note); actions.appendChild(music);
  music.addEventListener('click', function () { popup('A little music', music, function (dialog) {
    dialog.id = 'heavenly-music-dialog'; dialog.appendChild(node('p', '', "If the music doesn't play, try downloading it instead"));
    var link = node('a', 'heavenly-extra-link', 'Open Monochrome'); link.href = 'https://monochrome.tf/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', 'Open Monochrome (opens in a new tab)'); dialog.appendChild(link);
  }); });
  function visibility() {
    try { var settings = JSON.parse(localStorage.getItem('heavenly_settings') || '{}'); music.hidden = !!settings && settings.showMusicShortcut === false; } catch (error) { /* Preserve a malformed saved value for recovery. */ }
  }
  visibility(); window.addEventListener('storage', function (event) { if (event.key === 'heavenly_settings' || event.key === null) visibility(); }); window.addEventListener('heavenly:settings-change', visibility); window.addEventListener('pageshow', visibility);
  var save = node('button', 'heavenly-save-action', 'Save Heavenly'); save.type = 'button'; save.id = 'save-heavenly'; save.setAttribute('aria-haspopup', 'dialog'); about.appendChild(save);
  save.addEventListener('click', function () { popup('Save Heavenly', save, function (dialog) {
    dialog.id = 'save-heavenly-dialog';
    var appleTouch = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    var android = /Android/.test(navigator.userAgent), mac = /Mac/.test(navigator.platform);
    var instructions = appleTouch ? 'In Safari, tap Share, then Add Bookmark or Add to Favorites. In Chrome, open the menu and choose Add to Bookmarks.' : android ? 'In Chrome, open the three-dot menu and tap the star to bookmark this page.' : 'Press '+(mac ? '⌘D' : 'Ctrl+D')+' to bookmark this page in Chrome, Firefox, or Safari. You can also use your browser’s bookmark menu.';
    dialog.appendChild(node('p', '', instructions));
    if (!appleTouch && !android) {
      var drag = node('a', 'heavenly-extra-link heavenly-bookmark-drag', '★ Heavenly Node'); drag.href = location.origin + '/'; drag.title = 'Heavenly Node'; drag.draggable = true; drag.id = 'heavenly-bookmark-drag';
      drag.addEventListener('dragstart', function (event) { if (event.dataTransfer) { event.dataTransfer.setData('text/uri-list', drag.href); event.dataTransfer.setData('text/plain', drag.href); event.dataTransfer.effectAllowed = 'link'; } });
      dialog.append(drag, node('p', 'heavenly-extra-hint', 'Or drag this link to your bookmarks bar, if your desktop browser supports it.'));
    }
    dialog.appendChild(node('p', 'heavenly-extra-hint', 'Your browser saves the bookmark. Heavenly cannot add it automatically. A bookmark does not back up your saved links or settings.'));
  }); });
}());
