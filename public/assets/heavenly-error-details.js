(function () {
  'use strict';
  // This script only enhances this error's already-sanitized text. It captures
  // no events, reads no storage and sends no requests.
  function setup() {
    var text = document.getElementById('heavenly-advanced-report');
    var button = document.getElementById('heavenly-advanced-copy');
    var status = document.getElementById('heavenly-advanced-copy-status');
    if (!text || !button || !status) return;
    var ua = navigator.userAgent || '';
    var family = /Edg(?:A|iOS)?\//.test(ua) ? 'Edge' : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Unavailable';
    text.value = text.value.replace('Browser: Unavailable', 'Browser: ' + family);
    button.hidden = false;
    function selectText() {
      if (text.closest) text.closest('.diagnostic-report').open = true;
      text.focus();
      text.select();
      text.setSelectionRange(0, text.value.length);
      status.textContent = 'Diagnostics selected. Copy the selected text using your device’s Copy action.';
    }
    button.addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { selectText(); return; }
      navigator.clipboard.writeText(text.value).then(function () { status.textContent = 'Diagnostics copied.'; }, selectText);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
