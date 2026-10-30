var assert = require('assert');
var supertest = require('supertest');
var fs = require('fs');
var path = require('path');
var app = require('../app.js');

describe('html-viewer.html & VUS Fallback Waterfall', function() {
  it('should serve public/html-viewer.html via express static server', function(done) {
    supertest(app)
      .get('/html-viewer.html')
      .expect(200)
      .expect('Content-Type', /html/)
      .end(function(err, res) {
        if (err) return done(err);
        assert.ok(res.text.includes('<title>Heavenly - HTML Viewer</title>'));
        assert.ok(res.text.includes('id="code-input"'));
        assert.ok(res.text.includes('id="preview-iframe"'));
        assert.ok(res.text.includes('id="btn-run"'));
        assert.ok(res.text.includes('id="btn-clear"'));
        assert.ok(res.text.includes('id="btn-blank"'));
        assert.ok(res.text.includes('id="btn-vus"'));
        assert.ok(res.text.includes('src="/assets/heavenly-viewer.js"'));
        done();
      });
  });

  it('should serve public/vendor/vus.html local fallback asset', function(done) {
    supertest(app)
      .get('/vendor/vus.html')
      .expect(200)
      .expect('Content-Type', /html/)
      .end(function(err, res) {
        if (err) return done(err);
        assert.ok(res.text.includes('<title>VUS Hub</title>'));
        assert.ok(res.text.includes('class="sname" id="siteName">VUS Hub</span>'));
        done();
      });
  });

  it('should contain HTML Viewer navigation button in public/index.html and not in settings.html', function() {
    var indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    var settingsHtml = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');

    assert.ok(indexHtml.includes('href="html-viewer.html"'));
    assert.ok(indexHtml.includes('HTML Viewer'));

    assert.strictEqual(settingsHtml.includes('href="html-viewer.html"'), false);
  });

  it('should configure layout view switcher tabs with ARIA attributes in public/html-viewer.html', function() {
    var html = fs.readFileSync(path.join(__dirname, '../public/html-viewer.html'), 'utf8');

    assert.ok(html.includes('role="tablist"'), 'view-switcher should specify role="tablist"');
    assert.ok(html.includes('id="view-split"') && html.includes('role="tab"') && html.includes('aria-selected="true"') && html.includes('aria-controls="workspace"'), 'view-split should specify role="tab", aria-selected, and aria-controls');
    assert.ok(html.includes('id="view-editor"') && html.includes('role="tab"') && html.includes('aria-selected="false"') && html.includes('aria-controls="workspace"'), 'view-editor should specify role="tab", aria-selected, and aria-controls');
    assert.ok(html.includes('id="view-preview"') && html.includes('role="tab"') && html.includes('aria-selected="false"') && html.includes('aria-controls="workspace"'), 'view-preview should specify role="tab", aria-selected, and aria-controls');
    assert.ok(html.includes('tabindex="-1"'), 'inactive tabs should start outside the tab order');
  });

  it('should configure code textarea, action buttons, control bar role, and status indicators with accessible ARIA attributes', function() {
    var html = fs.readFileSync(path.join(__dirname, '../public/html-viewer.html'), 'utf8');

    assert.ok(html.includes('role="toolbar"') && html.includes('aria-label="Workspace controls"'), 'control-bar should specify role="toolbar" and aria-label');
    assert.ok(html.includes('id="code-input"') && html.includes('aria-label="HTML, CSS, and JavaScript code editor"'), 'code-input textarea should specify descriptive aria-label');
    assert.ok(html.includes('id="btn-run"') && html.includes('aria-label="Run your code in the preview"'), 'btn-run should specify descriptive aria-label');
    assert.ok(html.includes('id="btn-clear"') && html.includes('aria-label="Clear all code from the editor"'), 'btn-clear should specify descriptive aria-label');
    assert.strictEqual(html.match(/class="status-indicator" aria-live="polite"/g).length, 2, 'both editor and preview status indicators should specify aria-live="polite"');
  });

  it('should support Ctrl/Cmd+Enter keyboard execution shortcut and dynamic updateEditorStatus announcements', function() {
    var html = fs.readFileSync(path.join(__dirname, '../public/assets/heavenly-viewer.js'), 'utf8');

    assert.ok(html.includes('function updateEditorStatus'), 'should define updateEditorStatus helper');
    assert.ok(html.includes('(e.ctrlKey || e.metaKey) && e.key === \'Enter\''), 'code-input should handle Ctrl/Cmd+Enter shortcut');
    assert.ok(html.includes('updateEditorStatus(\'Code run\''), 'runCode should announce Code run');
    assert.ok(html.includes('updateEditorStatus(\'Editor Cleared\''), 'clearCode should announce Editor Cleared');
  });
});


describe('HTML Viewer deployed execution boundary', function() {
  it('serves the shared workspace assets', function(done) {
    supertest(app).get('/assets/heavenly-viewer.js').expect(200).expect('Content-Type', /javascript/).end(done);
  });

  it('defaults preview to an opaque scripted sandbox with no popup or top-navigation grants', function() {
    var html = fs.readFileSync(path.join(__dirname, '../public/html-viewer.html'), 'utf8');
    var sandbox = html.match(/id="preview-iframe"[^>]+sandbox="([^"]+)"/)[1].split(' ');
    assert.deepStrictEqual(sandbox, ['allow-scripts', 'allow-forms']);
    assert.ok(html.includes('referrerpolicy="no-referrer"'));
    assert.ok(html.includes('id="workspace-resize"') && html.includes('role="separator"'));
  });
});
