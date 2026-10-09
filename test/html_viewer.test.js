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
        assert.ok(res.text.includes('launchVUSWaterfall'));
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
});
