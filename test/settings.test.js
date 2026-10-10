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

    it('should configure UBG98, UBGames, Unbleeked, and disableQuickSaveWidget for Movish in DEFAULT_BOOKMARK_DATA across client files', function() {
        var indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
        var clientJs = fs.readFileSync(path.join(__dirname, '../custom-client/unblocker-client.js'), 'utf8');

        [indexHtml, html, clientJs].forEach(function(content, i) {
            var label = i === 0 ? 'index.html' : (i === 1 ? 'settings.html' : 'unblocker-client.js');
            assert.ok(content.includes('id: "bm_ubg98"'), label + ' should contain bm_ubg98');
            assert.ok(content.includes('title: "UBG98"'), label + ' should contain UBG98 title');
            assert.ok(content.includes('https://ubg98.com'), label + ' should contain ubg98 URL');
            assert.ok(content.includes('id: "bm_ubgames"'), label + ' should contain bm_ubgames');
            assert.ok(content.includes('title: "UBGames"'), label + ' should contain UBGames title');
            assert.ok(content.includes('https://ubgames.uk'), label + ' should contain ubgames URL');
            assert.ok(content.includes('id: "bm_unbleeked"'), label + ' should contain bm_unbleeked');
            assert.ok(content.includes('title: "Unbleeked"'), label + ' should contain Unbleeked title');
            assert.ok(content.includes('https://unbleeked.vercel.app/'), label + ' should contain unbleeked URL');
            assert.ok(content.includes('id: "bm_duckmath"'), label + ' should contain bm_duckmath');
            assert.ok(content.includes('title: "DuckMath"'), label + ' should contain DuckMath title');
            assert.ok(content.includes('https://duckmath.org/'), label + ' should contain duckmath URL');
            assert.ok(!content.includes('title: "DuckMath a1"'), label + ' should not contain redundant DuckMath a1 sub-bookmark');
            assert.ok(content.includes('id: "bm_movish_anime", categoryId: "cat_anime", title: "Movish", url: "https://movish.to/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=movish.to&sz=64", builtIn: true, hidden: false, order: 7'), label + ' should configure bm_movish_anime');
            assert.ok(content.includes('id: "bm_movish_movies", categoryId: "cat_movies", title: "Movish", url: "https://movish.to/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=movish.to&sz=64", builtIn: true, hidden: false, order: 2'), label + ' should configure bm_movish_movies');
            assert.ok(content.includes('Latest Movies'), label + ' should include Latest Movies mirror link under Movish');
            assert.ok(content.includes('id: "bm_bloxcraftstudios"') && content.includes('type: "bookmark"'), label + ' should contain bm_bloxcraftstudios as type bookmark');
        });
    });

    it('should deduplicate bookmarks and categories on reset in settings.html', function() {
        assert.ok(html.includes('if (!freshData.bookmarks.some(function (fb) { return fb.id === b.id; }))'), 'reset action should deduplicate bookmarks by ID');
        assert.ok(html.includes('if (!freshData.categories.some(function (fc) { return fc.id === c.id; }))'), 'reset action should deduplicate categories by ID');
    });

    it('should attach keydown Escape key listener to close export/import modals and custom preset dropdown menu', function() {
        assert.ok(html.includes("if (e.key === 'Escape' || e.keyCode === 27)"), 'settings.html should listen for Escape key');
        assert.ok(html.includes('closeExportModal()'), 'Escape key should close export modal if active');
        assert.ok(html.includes('closeImportModal()'), 'Escape key should close import modal if active');
        assert.ok(html.includes('closePresetDropdown()'), 'Escape key should close custom preset dropdown menu if active');
    });

    it('should configure heavenly-logo.png as site favicon and header brand mark across public files and app.js', function() {
        var indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
        var appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

        assert.ok(fs.existsSync(path.join(__dirname, '../public/assets/heavenly-logo.png')), 'heavenly-logo.png file must exist in public/assets/');

        [indexHtml, html, appJs].forEach(function(content, i) {
            var label = i === 0 ? 'index.html' : (i === 1 ? 'settings.html' : 'app.js');
            assert.ok(content.includes('<link rel="icon" type="image/png" href="/assets/heavenly-logo.png">'), label + ' should set heavenly-logo.png as default favicon');
            assert.ok(content.includes('<img src="/assets/heavenly-logo.png" alt="Heavenly Logo" class="brand-logo-img">'), label + ' should render heavenly-logo.png in brand-icon');
        });
    });

    it('should contain full tab cloaking presets, randomizer pool controls, and reset branding button', function() {
        assert.ok(html.includes('docs: { title: "Google Docs"'), 'DEFAULT_PRESETS should include Google Docs');
        assert.ok(html.includes('gmail: { title: "Gmail"'), 'DEFAULT_PRESETS should include Gmail');
        assert.ok(html.includes('canvas: { title: "Dashboard"'), 'DEFAULT_PRESETS should include Canvas');
        assert.ok(html.includes('quizlet: { title: "Flashcards, learning tools and textbook solutions | Quizlet"'), 'DEFAULT_PRESETS should include Quizlet');
        assert.ok(html.includes('wikipedia: { title: "Wikipedia"'), 'DEFAULT_PRESETS should include Wikipedia');
        assert.ok(html.includes('youtube: { title: "YouTube"'), 'DEFAULT_PRESETS should include YouTube');
        assert.ok(html.includes('outlook: { title: "Outlook"'), 'DEFAULT_PRESETS should include Outlook');
        assert.ok(html.includes('notion: { title: "Notion"'), 'DEFAULT_PRESETS should include Notion');

        assert.ok(html.includes('id="random-pool-chips"'), 'random-pool-chips element should exist');
        assert.ok(html.includes('id="pool-select-all-btn"'), 'pool-select-all-btn should exist');
        assert.ok(html.includes('id="pool-deselect-all-btn"'), 'pool-deselect-all-btn should exist');
        assert.ok(html.includes('id="reset-branding-btn"'), 'reset-branding-btn should exist');
        assert.ok(html.includes('Restored Heavenly default branding!'), 'reset-branding-btn should restore default branding');
    });
});
