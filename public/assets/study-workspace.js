(function () {
  'use strict';
  var editor = document.getElementById('study-document'), link = document.getElementById('document-return'), selection = null;
  try {
    var value = sessionStorage.getItem('heavenly_panic_return');
    if (typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\r\n\\]/.test(value)) {
      var target = new URL(value, location.origin);
      if (target.origin === location.origin && target.pathname !== '/study-workspace.html') link.href = target.href;
    }
  } catch (error) {}
  document.addEventListener('selectionchange', function () {
    var current = window.getSelection();
    if (!current.rangeCount || !editor.contains(current.anchorNode) || !editor.contains(current.focusNode)) return;
    selection = current.getRangeAt(0).cloneRange();
    document.querySelectorAll('[aria-pressed][data-command]').forEach(function (button) { button.setAttribute('aria-pressed', String(document.queryCommandState(button.dataset.command))); });
  });
  function format(command, value) {
    editor.focus();
    if (selection && editor.contains(selection.commonAncestorContainer)) { var current = window.getSelection(); current.removeAllRanges(); current.addRange(selection); }
    document.execCommand(command, false, value || null);
  }
  document.querySelectorAll('[data-command]').forEach(function (button) { button.addEventListener('click', function () { format(button.dataset.command); }); });
  document.getElementById('paragraph-style').addEventListener('change', function (event) { format('formatBlock', event.target.value); });
  // Authored clipboard/drop HTML never enters the local document as markup.
  editor.addEventListener('paste', function (event) { event.preventDefault(); if (event.clipboardData) document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); });
  editor.addEventListener('drop', function (event) { event.preventDefault(); });
  editor.addEventListener('input', function () { document.getElementById('document-edit-status').textContent = 'Edited in this tab. Changes are not saved after you leave.'; });
  document.getElementById('document-title').addEventListener('input', function (event) { document.title = (event.target.value.trim() || 'Study document') + ' — Study document'; });
}());
