/* A textarea workspace with opaque-origin execution. No preview message performs a privileged action. */
(function () {
  'use strict';
  var SOURCE_KEY = 'heavenly_html_viewer_code';
  var MODE_KEY = 'heavenly_html_viewer_view_mode';
  var SPLIT_KEY = 'heavenly_html_viewer_split';
  var RECOVERY_KEY = 'heavenly_html_viewer_recovery';
  var $ = function (id) { return document.getElementById(id); };
  var input = $('code-input');
  var workspace = $('workspace');
  var splitter = $('workspace-resize');
  var narrow = window.matchMedia('(max-width: 900px)');
  var mode = 'split', split = 50, saved = null, recovery = null, saveTimer, saveFailed = false, sourceReadFailed = false, dirty = false;
  var lineCount = 1, drawFrame, tabEscapeOnce = false, previewSession = null, resizeGesture = null;
  var SAMPLE_STARTER_CODE = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>A small celestial experiment</title>\n  <style>\n    * { box-sizing: border-box; }\n    body { margin: 0; min-height: 100vh; display: grid; place-items: center;\n      padding: 28px; background: #0b1529; color: #eaf4ff;\n      font: 16px/1.6 system-ui, sans-serif; }\n    main { max-width: 430px; }\n    .orbit { width: 44px; height: 44px; border: 1px solid #739eba;\n      border-radius: 50%; display: grid; place-items: center; color: #a6e4f1; }\n    h1 { font-size: clamp(30px, 7vw, 42px); line-height: 1.15;\n      letter-spacing: -.04em; margin: 24px 0 16px; }\n    p { color: #b3c5dc; }\n    button { margin-top: 12px; padding: 12px 19px; border: 0;\n      border-radius: 10px; background: #a2dfeb; color: #10243b;\n      font: inherit; font-weight: 600; cursor: pointer; }\n    button:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }\n  </style>\n</head>\n<body>\n  <main>\n    <span class="orbit" aria-hidden="true">✦</span>\n    <h1>Small ideas.<br>Room to grow.</h1>\n    <p>Make this corner of the web your own. Change a color,\n      write a headline, or try a little JavaScript.</p>\n    <button id="try-it">Try a little interaction</button>\n  </main>\n  <script>\n    document.getElementById("try-it").onclick = function () {\n      this.textContent = "Your JavaScript is running ✨";\n    };\n  <\/script>\n</body>\n</html>';

  function storageWarning(text) {
    $('storage-warning').hidden = !text;
    $('storage-warning').textContent = text || '';
  }
  function updateEditorStatus(text, dotClass) {
    var status = document.querySelector('.editor-pane .status-indicator');
    var dot = 'status-dot' + (dotClass ? ' ' + dotClass : '');
    if (status.querySelector('.status-dot').className !== dot) status.querySelector('.status-dot').className = dot;
    if (status.lastElementChild.textContent !== text) status.lastElementChild.textContent = text;
  }
  function persistSource() {
    clearTimeout(saveTimer);
    if (!dirty) return true;
    if (sourceReadFailed) {
      saveFailed = true;
      storageWarning('Your saved code could not be read and has been left untouched. Your edits are only in this tab. Copy them before leaving, then reload to try opening the saved code again.');
      updateEditorStatus('Unsaved changes; saved code could not be read', 'busy');
      return false;
    }
    try {
      localStorage.setItem(SOURCE_KEY, input.value);
      dirty = false;
      saveFailed = false;
      storageWarning('');
      updateEditorStatus('Saved in this browser', 'idle');
      return true;
    } catch (_) {
      saveFailed = true;
      storageWarning('Your latest changes could not be saved. Copy your code before leaving. Check this browser’s storage space, then edit again to retry.');
      updateEditorStatus('Unsaved changes', 'busy');
      return false;
    }
  }
  function changed(immediate) {
    dirty = true;
    updateLineNumbers();
    if (immediate) persistSource();
    else { clearTimeout(saveTimer); saveTimer = setTimeout(persistSource, 250); }
  }
  function renderGutter() {
    drawFrame = null;
    var lineHeight = parseFloat(getComputedStyle(input).lineHeight) || 23;
    var first = Math.max(0, Math.floor(input.scrollTop / lineHeight) - 3);
    var end = Math.min(lineCount, first + Math.ceil(input.clientHeight / lineHeight) + 8);
    var numbers = [];
    for (var n = first + 1; n <= end; n++) numbers.push(n);
    var gutter = $('line-numbers').firstElementChild;
    gutter.textContent = numbers.join('\n');
    gutter.style.transform = 'translateY(' + (first * lineHeight - input.scrollTop) + 'px)';
  }
  function syncScroll() {
    if (!drawFrame) drawFrame = requestAnimationFrame(renderGutter);
  }
  function updateLineNumbers() {
    // Reading a textarea's DOM value inside the character loop can repeatedly
    // normalize/copy the whole document. Cache once so large pastes stay linear.
    var code = input.value;
    lineCount = 1;
    for (var i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) lineCount++;
    $('char-count').textContent = code.length.toLocaleString() + ' characters · ' + lineCount.toLocaleString() + (lineCount === 1 ? ' line' : ' lines');
    $('editor-container').style.setProperty('--gutter-width', Math.max(44, String(lineCount).length * 9 + 22) + 'px');
    syncScroll();
  }

  var PREVIEW_POLICY = "default-src https: http: data: blob:; script-src 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; style-src 'unsafe-inline' https: http: data:; img-src https: http: data: blob:; font-src https: http: data:; connect-src https: http: data:; object-src 'none'; worker-src 'none'; base-uri 'none'; form-action https: http:";
  // This function is serialized into the opaque child before any authored code.
  // The private port is captured in a closure. Payloads remain untrusted display text.
  function previewBridge(token, lineOffset) {
    'use strict';
    var channel = new MessageChannel();
    var send = channel.port1.postMessage.bind(channel.port1);
    var emitted = 0;
    function report(type, text, line) {
      if (emitted++ > 35) return;
      try { send({type:type, text:String(text || '').slice(0, 420), line:Number.isFinite(line) ? line : 0}); } catch (_) {}
    }
    parent.postMessage({type:'heavenly-preview-connect', token:token}, '*', [channel.port2]);
    addEventListener('error', function (event) {
      if (event.target !== window) report('resource', 'A script, image, or other file did not load. The browser may not tell us why.');
      else {
        var hidden = !event.message || event.message === 'Script error.';
        report('error', hidden ? 'A script failed. This browser hid the error details in the isolated preview. Check your code or open the browser console.' : event.message,
          hidden ? 0 : event.filename === 'about:srcdoc' ? Math.max(1, event.lineno - lineOffset) : event.lineno);
      }
    }, true);
    addEventListener('unhandledrejection', function (event) {
      var text = 'A background task failed (unhandled promise rejection).';
      try { text = event.reason && event.reason.message || String(event.reason || text); } catch (_) {}
      report('error', text);
    });
    addEventListener('securitypolicyviolation', function (event) {
      report('blocked', 'Blocked by preview rules (policy): ' + event.violatedDirective + '. The sandbox limits popups, browser storage, background workers, and device access.');
    });
    ['error', 'warn'].forEach(function (level) {
      var original = console[level].bind(console);
      console[level] = function () {
        original.apply(console, arguments);
        var message = 'Console ' + level;
        try { message += ': ' + String(arguments[0] === undefined ? '' : arguments[0]); } catch (_) {}
        report(level === 'error' ? 'error' : 'warning', message);
      };
    });
    addEventListener('DOMContentLoaded', function () { report('ready', 'Document rendered'); }, {once:true});
  }
  function makeToken() {
    var bytes = new Uint32Array(4);
    crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (n) { return n.toString(16); }).join('-');
  }
  function buildDocument(code, token) {
    var prefix = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="' + PREVIEW_POLICY + '">';
    if (token) {
      var bridge = previewBridge.toString();
      var offset = (bridge.match(/\n/g) || []).length;
      prefix += '<script>(' + bridge + ')(' + JSON.stringify(token) + ',' + offset + ');<\/script>';
    }
    if (!code.trim()) code = '<style>body{margin:0;min-height:100vh;display:grid;place-content:center;padding:28px;background:#f3f7fb;color:#31455e;font:16px/1.6 system-ui}h1{font-size:24px;letter-spacing:-.03em}p{max-width:32ch;color:#627389}</style><h1>A blank canvas.</h1><p>Add some HTML in the editor, then choose Run Code.</p>';
    return prefix + code;
  }
  function previewStatus(text, state) {
    $('preview-status-text').textContent = text;
    $('preview-status-dot').className = 'status-dot' + (state ? ' ' + state : '');
  }
  function addDiagnostic(session, text, state) {
    if (session !== previewSession || session.diagnostics.length >= 6) return;
    session.diagnostics.push(text);
    $('preview-diagnostics').hidden = false;
    $('preview-diagnostics').textContent = session.diagnostics.join('\n');
    previewStatus('Rendered with ' + session.diagnostics.length + (session.diagnostics.length === 1 ? ' notice' : ' notices'), state || 'busy');
  }
  function closePreviewSession() {
    if (!previewSession) return;
    clearTimeout(previewSession.timer);
    if (previewSession.port) previewSession.port.close();
    previewSession = null;
  }
  function receivePreviewConnection(event) {
    var session = previewSession;
    if (!session || session.port || event.source !== session.frame.contentWindow || event.origin !== 'null' || !event.data || event.data.type !== 'heavenly-preview-connect' || event.data.token !== session.token || event.ports.length !== 1) return;
    session.port = event.ports[0];
    var received = 0;
    session.port.onmessage = function (message) {
      if (previewSession !== session) return;
      if (++received > 40) { session.port.close(); return; }
      var data = message.data;
      if (!data || typeof data.type !== 'string' || typeof data.text !== 'string' || data.text.length > 420 || !['ready','error','resource','blocked','warning'].includes(data.type) || !Number.isFinite(data.line) || data.line < 0 || data.line > 10000000) return;
      if (data.type === 'ready') {
        session.ready = true;
        clearTimeout(session.timer);
        if (!session.diagnostics.length) previewStatus(session.empty ? 'Blank canvas' : 'Rendered', '');
      } else {
        var prefix = data.type === 'error' ? 'Script' : data.type === 'blocked' ? 'Policy' : data.type === 'resource' ? 'Resource' : 'Console';
        addDiagnostic(session, prefix + (data.line ? ' · line ' + data.line : '') + ': ' + data.text, data.type === 'error' ? 'error' : 'busy');
      }
    };
    session.port.start();
  }
  function runCode() {
    persistSource();
    closePreviewSession();
    var previous = $('preview-iframe');
    var frame = previous.cloneNode(false);
    frame.removeAttribute('src');
    frame.removeAttribute('srcdoc');
    if ('credentialless' in frame) frame.credentialless = true;
    var session = {frame:frame, token:makeToken(), diagnostics:[], ready:false, empty:!input.value.trim(), loads:0};
    previewSession = session;
    $('preview-diagnostics').hidden = true;
    $('preview-diagnostics').textContent = '';
    previewStatus('Rendering…', 'busy');
    frame.addEventListener('load', function () {
      if (previewSession !== session) return;
      session.loads++;
      if (session.loads > 1) {
        if (session.port) session.port.close();
        previewStatus('Document navigated', 'idle');
        addDiagnostic(session, 'This preview opened another page. Choose Run Code to restart your code and its error notices.');
      }
    });
    frame.addEventListener('error', function () { addDiagnostic(session, 'The preview could not load. Run again or check your code and browser restrictions.', 'error'); });
    session.timer = setTimeout(function () {
      if (previewSession === session && !session.ready) addDiagnostic(session, 'The preview has not reported that it is ready. Code or a file may still be loading. Run again to restart it. Reload or close this tab if code stops it from responding.');
    }, 6000);
    frame.srcdoc = buildDocument(input.value, session.token);
    // Set the new document before insertion, so cloned srcdoc never executes.
    // Removing the old browsing context stops its timers and listeners.
    previous.replaceWith(frame);
    if (!saveFailed) updateEditorStatus('Code run', '');
    if (narrow.matches && mode !== 'preview') setViewMode('preview', false);
  }

  function recoveryNotice(text) {
    $('recovery-notice').hidden = !recovery;
    $('recovery-text').textContent = text || 'Your previous code is available to restore.';
  }
  function replaceSource(next, label) {
    if (next === input.value) { updateEditorStatus('Code is already ' + (next ? 'the sample' : 'empty'), 'idle'); return; }
    var previous = {code:input.value, time:Date.now()};
    try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(previous)); }
    catch (_) {
      if (!window.confirm('The previous version could not be saved for recovery. Replace this code anyway? Copy your work first if you need it.')) return;
    }
    recovery = previous;
    input.value = next;
    input.scrollTop = 0;
    changed(true);
    recoveryNotice(label + '. You can restore your previous code.');
    if (label === 'Editor Cleared') {
      runCode();
      if (!saveFailed) updateEditorStatus('Editor Cleared', 'idle');
    } else { runCode(); if (!saveFailed) updateEditorStatus('Sample loaded', 'idle'); }
    if (narrow.matches) setViewMode('editor', false);
    input.focus();
  }
  function clearCode() { replaceSource('', 'Editor Cleared'); }
  function undoReplacement() {
    if (!recovery || typeof recovery.code !== 'string') return;
    var previous = input.value;
    input.value = recovery.code;
    changed(true);
    // Keep the persisted recovery until the restored source is safely saved.
    // Quota errors must never erase the only durable copy of the original.
    if (!saveFailed) {
      recovery = {code:previous,time:Date.now()};
      try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(recovery)); } catch (_) {}
      recoveryNotice('Previous code restored. You can switch back if needed.');
    } else recoveryNotice('Code restored in this tab. The saved recovery copy is unchanged. Copy your work before leaving.');
    runCode();
    if (narrow.matches) setViewMode('editor', false);
    input.focus();
  }
  function setViewMode(next, persist) {
    if (!['split','editor','preview'].includes(next)) next = 'split';
    mode = next;
    workspace.classList.toggle('mode-editor', next === 'editor');
    workspace.classList.toggle('mode-preview', next === 'preview');
    ['split','editor','preview'].forEach(function (name) {
      var btn = $('view-' + name);
      var active = next === name || (narrow.matches && next === 'split' && name === 'editor');
      if (narrow.matches && name === 'split') active = false;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    });
    if (persist !== false) try { localStorage.setItem(MODE_KEY, next); } catch (_) {}
    syncScroll();
  }
  function setSplit(value, persist) {
    split = Math.min(75, Math.max(25, value));
    workspace.style.setProperty('--editor-share', split + '%');
    splitter.setAttribute('aria-valuenow', String(Math.round(split)));
    splitter.setAttribute('aria-valuetext', Math.round(split) + '% editor, ' + Math.round(100 - split) + '% preview');
    if (persist) try { localStorage.setItem(SPLIT_KEY, String(split)); } catch (_) { updateEditorStatus('Width changed for this session', 'idle'); }
    syncScroll();
  }
  function finishResize(event, cancelled) {
    if (!resizeGesture || (event && event.pointerId !== resizeGesture.id)) return;
    var gesture = resizeGesture;
    resizeGesture = null;
    workspace.classList.remove('is-resizing');
    try { if (splitter.hasPointerCapture(gesture.id)) splitter.releasePointerCapture(gesture.id); } catch (_) {}
    if (cancelled) setSplit(gesture.start, false);
    else setSplit(split, true);
  }
  function indentSelection(unindent) {
    var text = input.value, start = input.selectionStart, end = input.selectionEnd;
    var blockStart = text.lastIndexOf('\n', start - 1) + 1;
    if (!unindent && start === end) {
      input.setRangeText('  ', start, end, 'end');
    } else {
      var blockEnd = end;
      if (end > start && text[end - 1] === '\n') blockEnd--;
      var lines = text.slice(blockStart, blockEnd).split('\n');
      var firstRemoved = 0, delta = 0;
      var edited = lines.map(function (line, i) {
        if (!unindent) { delta += 2; return '  ' + line; }
        var count = (line.match(/^(?: {1,2}|\t)/) || [''])[0].length;
        if (!i) firstRemoved = count;
        delta -= count;
        return line.slice(count);
      }).join('\n');
      input.setRangeText(edited, blockStart, blockEnd, 'preserve');
      input.selectionStart = Math.max(blockStart, start + (unindent ? -firstRemoved : 2));
      input.selectionEnd = Math.max(input.selectionStart, end + delta);
    }
    changed(true);
  }
  function copyCode() {
    var code = input.value;
    function copied() { updateEditorStatus('Code copied', ''); }
    function fallback() {
      var start = input.selectionStart, end = input.selectionEnd, active = document.activeElement;
      input.select();
      var success = false;
      try { success = document.execCommand('copy'); } catch (_) {}
      input.setSelectionRange(start, end);
      if (active && active.focus) active.focus();
      if (success) copied();
      else { setViewMode('editor', false); input.focus(); input.select(); updateEditorStatus('Copy unavailable; use Ctrl/Cmd+C', 'busy'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(copied, fallback);
    else fallback();
  }

  // Trusted shell only: untrusted code is assigned to an opaque-origin iframe,
  // never written into the new tab's same-origin document. The opener is severed.
  function openExecutionShell(allowAppPopups) {
    var win = window.open('about:blank', '_blank');
    if (!win) { updateEditorStatus('Popup blocked; allow a new tab and try again', 'busy'); return null; }
    win.opener = null;
    var doc = win.document;
    var head = doc.createElement('head'), body = doc.createElement('body');
    var shellTitle = doc.createElement('title'); shellTitle.textContent = 'Heavenly — isolated preview'; head.appendChild(shellTitle);
    doc.documentElement.lang = 'en';
    var meta = doc.createElement('meta'); meta.name = 'viewport'; meta.content = 'width=device-width,initial-scale=1'; head.appendChild(meta);
    var style = doc.createElement('style'); style.textContent = 'html,body{margin:0;height:100%;font:13px system-ui;background:#0b1529;color:#c5d8ed}body{display:flex;flex-direction:column}.notice{display:flex;gap:12px;justify-content:space-between;padding:10px 16px;flex:none}.notice span:last-child{color:#9bb1ca}iframe{width:100%;flex:1;border:0;background:white}'; head.appendChild(style);
    var notice = doc.createElement('div'); notice.className = 'notice';
    var title = doc.createElement('span'); title.textContent = 'Heavenly · Isolated preview';
    var help = doc.createElement('span'); help.textContent = 'Close this tab to return'; notice.append(title, help);
    // Only the explicit VUS launcher needs app windows. Those windows inherit
    // this opaque sandbox; no same-origin or popup escape permission is granted.
    var frame = doc.createElement('iframe'); frame.title = 'Isolated full-window HTML preview'; frame.setAttribute('sandbox', allowAppPopups ? 'allow-scripts allow-forms allow-popups' : 'allow-scripts allow-forms'); frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('allow', "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'");
    if ('credentialless' in frame) frame.credentialless = true;
    body.append(notice, frame);
    doc.documentElement.replaceChildren(head, body);
    return {window:win, frame:frame, status:title};
  }
  function launchInAboutBlank(code) {
    code = typeof code === 'string' ? code : input.value;
    if (!code.trim()) { updateEditorStatus('Add source before opening a new tab', 'busy'); return; }
    var shell = openExecutionShell();
    if (!shell) return;
    shell.frame.srcdoc = buildDocument(code);
    updateEditorStatus('Opened an isolated preview tab', '');
  }
  function launchVUSWaterfall() {
    var shell = openExecutionShell(true);
    if (!shell) return;
    $('btn-vus').disabled = true;
    $('vus-btn-text').textContent = 'Loading VUS…';
    var urls = ['https://raw.githubusercontent.com/Cra-Z-Gaming/VUS/main/index.html', location.origin + '/proxy/https://raw.githubusercontent.com/Cra-Z-Gaming/VUS/main/index.html', '/vendor/vus.html'];
    shell.status.textContent = 'Heavenly · Loading VUS…';
    function finish() { $('btn-vus').disabled = false; $('vus-btn-text').textContent = 'Launch VUS'; }
    function attempt(index) {
      if (shell.window.closed) { finish(); return; }
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 8000);
      fetch(urls[index], {cache:'no-store',signal:controller.signal}).then(function (response) {
        if (!response.ok) throw new Error('Load failed');
        return response.text();
      }).then(function (code) {
        clearTimeout(timer); finish();
        if (shell.window.closed) return;
        shell.status.textContent = 'Heavenly · VUS isolated preview';
        shell.frame.srcdoc = buildDocument(code);
        updateEditorStatus('VUS opened; browser restrictions apply', '');
      }).catch(function () {
        clearTimeout(timer);
        if (index + 1 < urls.length) attempt(index + 1);
        else {
          finish();
          if (!shell.window.closed) shell.status.textContent = 'VUS could not load. Close this tab and try again later.';
          updateEditorStatus('VUS could not load; try again later', 'busy');
        }
      });
    }
    attempt(0);
  }

  var DEFAULT_PRESETS = {
    classroom:{title:'Google Classroom',icon:'https://ssl.gstatic.com/classroom/favicon.png'},
    google:{title:'Google',icon:'https://www.google.com/favicon.ico'},
    docs:{title:'Google Docs',icon:'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'},
    slides:{title:'Google Slides',icon:'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico'},
    drive:{title:'My Drive - Google Drive',icon:'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png'},
    gmail:{title:'Gmail',icon:'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico'}
  };
  function applyCloak() {
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('heavenly_settings') || '{}') || {}; } catch (_) {}
    var preset = Object.assign({}, DEFAULT_PRESETS, settings.customPresets || {})[settings.selectedPreset] || DEFAULT_PRESETS.classroom;
    var shouldCloak = !settings.disableAllFeatures && (settings.persistentCloak || (settings.autoCloak && document.hidden));
    document.title = shouldCloak ? String(preset.title || '') : 'Heavenly - HTML Viewer';
    var icon = $('heavenly-cloak-icon');
    if (shouldCloak) {
      if (!icon) { icon = document.createElement('link'); icon.id = 'heavenly-cloak-icon'; icon.rel = 'shortcut icon'; document.head.appendChild(icon); }
      icon.href = preset.icon;
    } else if (icon) icon.remove();
  }

  window.addEventListener('message', receivePreviewConnection);
  input.addEventListener('input', function () { changed(false); });
  input.addEventListener('scroll', syncScroll, {passive:true});
  input.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); return; }
    if (e.key === 'Escape') { tabEscapeOnce = true; updateEditorStatus('Press Tab to leave the editor', 'idle'); return; }
    if (e.key === 'Tab') {
      if (tabEscapeOnce) { tabEscapeOnce = false; return; }
      e.preventDefault(); indentSelection(e.shiftKey); return;
    }
    tabEscapeOnce = false;
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var before = input.value.slice(0, input.selectionStart);
      var current = before.slice(before.lastIndexOf('\n') + 1);
      var indent = (current.match(/^\s*/) || [''])[0];
      if (/\{\s*$/.test(current)) indent += '  ';
      if (indent) { e.preventDefault(); input.setRangeText('\n' + indent, input.selectionStart, input.selectionEnd, 'end'); changed(true); }
    }
  });
  $('btn-run').addEventListener('click', runCode);
  $('btn-clear').addEventListener('click', clearCode);
  $('btn-blank').addEventListener('click', function () { launchInAboutBlank(); });
  $('btn-vus').addEventListener('click', launchVUSWaterfall);
  $('btn-copy-code').addEventListener('click', copyCode);
  $('btn-load-sample').addEventListener('click', function () { replaceSource(SAMPLE_STARTER_CODE, 'Sample loaded'); });
  $('btn-undo-replace').addEventListener('click', undoReplacement);
  $('btn-refresh-preview').addEventListener('click', runCode);
  ['split','editor','preview'].forEach(function (name) {
    $('view-' + name).addEventListener('click', function () { setViewMode(name); });
  });
  document.querySelector('.view-switcher').addEventListener('keydown', function (e) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault();
    var names = narrow.matches ? ['editor','preview'] : ['split','editor','preview'];
    var current = names.indexOf(document.activeElement.id.replace('view-',''));
    var next = e.key === 'Home' ? 0 : e.key === 'End' ? names.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : -1) + names.length) % names.length;
    setViewMode(names[next]); $('view-' + names[next]).focus();
  });
  document.querySelectorAll('.tool-menu button').forEach(function (button) {
    button.addEventListener('click', function () {
      var menu = $('viewer-tools');
      var restoreFocus = menu.querySelector('.tool-menu').contains(document.activeElement);
      menu.open = false;
      if (restoreFocus) menu.querySelector('summary').focus();
    });
  });
  $('viewer-tools').addEventListener('focusout', function () {
    var menu = $('viewer-tools');
    if (!menu.open) return;
    setTimeout(function () {
      if (menu.open && !menu.contains(document.activeElement)) {
        menu.open = false;
      }
    }, 10);
  });
  document.addEventListener('click', function (e) { if (!$('viewer-tools').contains(e.target)) $('viewer-tools').open = false; });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); return; }
    if (e.key !== 'Escape') return;
    if ($('viewer-tools').open) { $('viewer-tools').open = false; $('viewer-tools').querySelector('summary').focus(); }
    var pane = document.querySelector('.preview-pane');
    if (pane.classList.contains('native-fullscreen-overlay')) { pane.classList.remove('native-fullscreen-overlay'); updateFullscreenButton(); $('btn-fullscreen-preview').focus(); }
    if (resizeGesture) finishResize(null, true);
  });
  splitter.addEventListener('keydown', function (e) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault(); setSplit(e.key === 'Home' ? 25 : e.key === 'End' ? 75 : split + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 5 : 2), true);
  });
  splitter.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || resizeGesture) return;
    e.preventDefault(); resizeGesture = {id:e.pointerId,start:split}; splitter.setPointerCapture(e.pointerId); splitter.focus(); workspace.classList.add('is-resizing');
  });
  splitter.addEventListener('pointermove', function (e) {
    if (!resizeGesture || resizeGesture.id !== e.pointerId) return;
    var rect = workspace.getBoundingClientRect(); setSplit((e.clientX - rect.left) / rect.width * 100, false);
  });
  splitter.addEventListener('pointerup', function (e) { finishResize(e, false); });
  splitter.addEventListener('pointercancel', function (e) { finishResize(e, true); });
  splitter.addEventListener('lostpointercapture', function (e) { finishResize(e, true); });
  window.addEventListener('blur', function () { finishResize(null, true); });
  window.addEventListener('resize', function () { finishResize(null, true); setViewMode(mode, false); syncScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncScroll);
  function updateFullscreenButton() {
    var pane = document.querySelector('.preview-pane');
    var active = !!(document.fullscreenElement || document.webkitFullscreenElement || pane.classList.contains('native-fullscreen-overlay'));
    $('fullscreen-btn-text').textContent = active ? 'Exit Fullscreen' : 'Fullscreen';
    $('btn-fullscreen-preview').setAttribute('aria-pressed', String(active));
  }
  $('btn-fullscreen-preview').addEventListener('click', function () {
    var pane = document.querySelector('.preview-pane');
    if (pane.classList.contains('native-fullscreen-overlay')) { pane.classList.remove('native-fullscreen-overlay'); updateFullscreenButton(); return; }
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) Promise.resolve(exit.call(document)).catch(function () { updateEditorStatus('Use Escape to leave fullscreen', 'idle'); });
      return;
    }
    function fallback() { pane.classList.add('native-fullscreen-overlay'); updateFullscreenButton(); $('btn-fullscreen-preview').focus(); }
    var request = pane.requestFullscreen || pane.webkitRequestFullscreen;
    if (!request) fallback();
    else { try { Promise.resolve(request.call(pane)).then(updateFullscreenButton, fallback); } catch (_) { fallback(); } }
  });
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  document.addEventListener('visibilitychange', function () { applyCloak(); if (document.hidden) persistSource(); });
  window.addEventListener('pagehide', function () { persistSource(); closePreviewSession(); });
  window.addEventListener('beforeunload', function (e) { persistSource(); if (dirty && saveFailed) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('storage', function (e) {
    if (e.key === 'heavenly_settings') applyCloak();
    if (e.key === SOURCE_KEY && e.newValue !== input.value) storageWarning('Another tab changed the saved code. This editor still has your work. Copy it before reloading.');
  });

  try { saved = localStorage.getItem(SOURCE_KEY); }
  catch (_) {
    sourceReadFailed = true; saveFailed = true;
    storageWarning('Your saved code could not be read and has been left untouched. Copy any new work before leaving, then reload to try opening the saved code again.');
  }
  try {
    var storedMode = localStorage.getItem(MODE_KEY);
    if (['split','editor','preview'].includes(storedMode)) mode = storedMode;
    var storedSplit = Number(localStorage.getItem(SPLIT_KEY));
    if (storedSplit >= 25 && storedSplit <= 75) split = storedSplit;
    var storedRecovery = JSON.parse(localStorage.getItem(RECOVERY_KEY) || 'null');
    if (storedRecovery && typeof storedRecovery.code === 'string') recovery = storedRecovery;
  } catch (_) { if (!sourceReadFailed) storageWarning('This browser’s storage is unavailable. Copy your code before leaving this page.'); }
  input.value = saved === null ? SAMPLE_STARTER_CODE : saved;
  setViewMode(mode, false);
  setSplit(split, false);
  updateLineNumbers();
  applyCloak();
  recoveryNotice();
  if (/Mac|iPhone|iPad/.test(navigator.platform)) $('run-shortcut').textContent = '⌘ + Enter';
  // Restore source without waiting for fonts or unrelated resources, and preserve
  // the user's mode instead of switching to Preview during initialization.
  var initialMode = mode;
  runCode();
  setViewMode(initialMode, false);
  window.runCode = runCode;
  window.clearCode = clearCode;
  window.setViewMode = setViewMode;
  window.launchVUSWaterfall = launchVUSWaterfall;
  window.launchInAboutBlank = launchInAboutBlank;
})();
