var assert = require('assert');
var fs = require('fs');
var path = require('path');

describe('index.html accessibility and ARIA attributes', function() {
    var html;

    before(function() {
        html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    });

    it('should have an aria-label on the main url search input', function() {
        assert.ok(
            /id="url"[^>]*aria-label="URL or search query"/.test(html) ||
            /aria-label="URL or search query"[^>]*id="url"/.test(html),
            'url input should have aria-label="URL or search query"'
        );
    });

    it('should have aria modal controls on open-settings-btn', function() {
        assert.ok(html.includes('id="open-settings-btn"'), 'open-settings-btn should exist');
        assert.ok(html.includes('aria-haspopup="dialog"'), 'open-settings-btn should have aria-haspopup="dialog"');
        assert.ok(html.includes('aria-controls="settings-modal"'), 'open-settings-btn should have aria-controls="settings-modal"');
        assert.ok(html.includes('aria-expanded="false"'), 'open-settings-btn should default to aria-expanded="false"');
    });

    it('should include focus-visible CSS rules for interactive elements', function() {
        assert.ok(html.includes('button:focus-visible'), 'CSS should include button:focus-visible rule');
        assert.ok(html.includes('select:focus-visible'), 'CSS should include select:focus-visible rule');
    });

    it('should associate labels with form inputs using for attributes', function() {
        assert.ok(html.includes('for="set-panic-key"'), 'label for set-panic-key should exist');
        assert.ok(html.includes('for="set-dock-position"'), 'label for set-dock-position should exist');
    });

    it('should have aria-label attributes on custom inputs and dropdowns', function() {
        assert.ok(html.includes('aria-label="Cloak preset"'), 'preset-select should have aria-label');
        assert.ok(html.includes('aria-label="Custom preset title"'), 'custom-title input should have aria-label');
        assert.ok(html.includes('aria-label="Custom preset icon URL"'), 'custom-icon input should have aria-label');
        assert.ok(html.includes('aria-label="Panic redirect URL"'), 'set-panic-url input should have aria-label');
      assert.ok(html.includes('aria-label\', \'Remove item from history\''), 'history delete button should set aria-label');
    });
});
