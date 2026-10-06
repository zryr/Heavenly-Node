var assert = require('assert');
var fs = require('fs');
var path = require('path');
var request = require('supertest');
var app = require('../app');

describe('settings.html standalone page', function() {
    var html;

    before(function() {
        html = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');
    });

    it('should serve settings.html via express static server', function(done) {
        request(app)
            .get('/settings.html')
            .expect(200)
            .expect('Content-Type', /html/)
            .end(function(err, res) {
                if (err) return done(err);
                assert.ok(res.text.includes('Settings & Privacy'));
                done();
            });
    });

    it('should have a back button linking to homepage', function() {
        assert.ok(html.includes('href="/"') || html.includes('href="index.html"'), 'settings.html should have link back to home');
        assert.ok(html.includes('Back to Home'), 'Back to Home text should be present');
    });

    it('should contain all essential setting controls and inputs', function() {
        assert.ok(html.includes('id="set-auto-cloak"'), 'set-auto-cloak checkbox should exist');
        assert.ok(html.includes('id="set-persistent-cloak"'), 'set-persistent-cloak checkbox should exist');
        assert.ok(html.includes('id="preset-select"'), 'preset-select dropdown should exist');
        assert.ok(html.includes('id="save-custom-preset-btn"'), 'save-custom-preset-btn should exist');
        assert.ok(html.includes('id="set-panic-key-enable"'), 'set-panic-key-enable checkbox should exist');
        assert.ok(html.includes('id="set-touch-panic"'), 'set-touch-panic checkbox should exist');
        assert.ok(html.includes('id="set-panic-url"'), 'set-panic-url input should exist');
        assert.ok(html.includes('id="set-show-scroll-lock"'), 'set-show-scroll-lock checkbox should exist');
        assert.ok(html.includes('id="set-show-magnifier"'), 'set-show-magnifier checkbox should exist');
        assert.ok(html.includes('id="set-use-widget-dock"'), 'set-use-widget-dock checkbox should exist');
        assert.ok(html.includes('id="reset-widget-pos-btn"'), 'reset-widget-pos-btn should exist');
    });

    it('should associate labels with form inputs using for attributes in settings.html', function() {
        assert.ok(html.includes('for="set-panic-key"'), 'label for set-panic-key should exist');
        assert.ok(html.includes('for="set-use-widget-dock"'), 'label for set-use-widget-dock should exist');
    });

    it('should have accessible aria-labels on settings form controls', function() {
        assert.ok(html.includes('aria-label="Cloak preset"'), 'preset-select should have aria-label');
        assert.ok(html.includes('aria-label="Custom preset title"'), 'custom-title input should have aria-label');
        assert.ok(html.includes('aria-label="Custom preset icon URL"'), 'custom-icon input should have aria-label');
        assert.ok(html.includes('aria-label="Panic redirect URL"'), 'set-panic-url input should have aria-label');
    });

    it('should include accessible aria-live status notification element in settings.html', function() {
        assert.ok(html.includes('id="preset-status-msg"'), 'preset-status-msg element should exist');
        assert.ok(html.includes('aria-live="polite"'), 'status element should have aria-live="polite"');
        assert.ok(html.includes('role="status"'), 'status element should have role="status"');
    });

    it('should assign role="switch" to switch toggle checkboxes in settings.html', function() {
        assert.ok(html.includes('id="set-auto-cloak" role="switch"'), 'set-auto-cloak should have role="switch"');
        assert.ok(html.includes('id="set-persistent-cloak" role="switch"'), 'set-persistent-cloak should have role="switch"');
        assert.ok(html.includes('id="set-use-widget-dock" role="switch"'), 'set-use-widget-dock should have role="switch"');
    });

    it('should attach Enter key event listener to custom preset title and icon inputs', function() {
        assert.ok(html.includes('save-custom-preset-btn\').click()'), 'Enter key on custom inputs should trigger save-custom-preset-btn click');
    });

    it('should configure delete button disabled state and tooltip for built-in presets', function() {
        assert.ok(html.includes('deleteBtn.disabled = isBuiltIn'), 'deleteBtn should set disabled based on isBuiltIn');
        assert.ok(html.includes('Built-in presets cannot be deleted'), 'deleteBtn tooltip should explain built-in preset restriction');
    });

    it('should configure Newgrounds authentic favicon and strict icon preservation in DEFAULT_BOOKMARK_DATA and loadBookmarkData', function() {
        var indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
        assert.ok(indexHtml.includes('https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64'), 'Newgrounds should use authentic favicon URL');
        assert.ok(indexHtml.includes('(!userBm.icon || userBm.icon.trim() === \'\')'), 'loadBookmarkData should strictly backfill icons only when stored icon is empty');
        assert.ok(indexHtml.includes('settings.skipBuiltinTestPrompt'), 'index.html bookmark click handler should respect skipBuiltinTestPrompt');
    });

    it('should deduplicate bookmarks and categories on reset in settings.html', function() {
        assert.ok(html.includes('if (!freshData.bookmarks.some(function (fb) { return fb.id === b.id; }))'), 'reset action should deduplicate bookmarks by ID');
        assert.ok(html.includes('if (!freshData.categories.some(function (fc) { return fc.id === c.id; }))'), 'reset action should deduplicate categories by ID');
    });
});
