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
        assert.ok(html.includes('id="set-bookmarks-about-blank"'), 'set-bookmarks-about-blank checkbox should exist');
        assert.ok(html.includes('id="set-search-about-blank"'), 'set-search-about-blank checkbox should exist');
        assert.ok(html.includes('id="set-show-proxied-url"'), 'set-show-proxied-url checkbox should exist');
        assert.ok(html.includes('id="set-decoy-auto-timer"'), 'set-decoy-auto-timer checkbox should exist');
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
        assert.ok(html.includes('for="set-bookmarks-about-blank"'), 'label for set-bookmarks-about-blank should exist');
        assert.ok(html.includes('for="set-search-about-blank"'), 'label for set-search-about-blank should exist');
        assert.ok(html.includes('for="set-show-proxied-url"'), 'label for set-show-proxied-url should exist');
        assert.ok(html.includes('for="set-decoy-auto-timer"'), 'label for set-decoy-auto-timer should exist');
    });

    it('should have accessible aria-labels on settings form controls', function() {
        assert.ok(html.includes('aria-label="Cloak preset"'), 'preset-select should have aria-label');
        assert.ok(html.includes('aria-label="Custom preset title"'), 'custom-title input should have aria-label');
        assert.ok(html.includes('aria-label="Custom preset icon URL"'), 'custom-icon input should have aria-label');
        assert.ok(html.includes('aria-label="Panic redirect URL"'), 'set-panic-url input should have aria-label');
        assert.ok(html.includes('aria-label="Select all randomizer pool presets"'), 'pool-select-all-btn should have aria-label');
        assert.ok(html.includes('aria-label="Deselect all randomizer pool presets"'), 'pool-deselect-all-btn should have aria-label');
        assert.ok(html.includes('aria-label="Save custom preset"'), 'save-custom-preset-btn should have aria-label');
        assert.ok(html.includes('aria-label="Delete selected custom preset"'), 'delete-custom-preset-btn should have aria-label');
        assert.ok(html.includes('aria-label="Reset to Heavenly default branding"'), 'reset-branding-btn should have aria-label');
        assert.ok(html.includes('aria-label="Reset built-in bookmarks to default"'), 'reset-builtin-bookmarks-btn should have aria-label');
        assert.ok(html.includes('aria-label="Reset all widget screen positions"'), 'reset-widget-pos-btn should have aria-label');
        assert.ok(html.includes('aria-label="Export bookmarks and settings"'), 'open-export-modal-btn should have aria-label');
        assert.ok(html.includes('aria-label="Import bookmarks and settings from file"'), 'open-import-modal-btn should have aria-label');
        assert.ok(html.includes('aria-label="Select all export items"'), 'export-select-all-btn should have aria-label');
        assert.ok(html.includes('aria-label="Deselect all export items"'), 'export-deselect-all-btn should have aria-label');
        assert.ok(html.includes('aria-label="Download JSON backup file"'), 'download-export-btn should have aria-label');
        assert.ok(html.includes('aria-label="Select all import items"'), 'import-select-all-btn should have aria-label');
        assert.ok(html.includes('aria-label="Deselect all import items"'), 'import-deselect-all-btn should have aria-label');
        assert.ok(html.includes('aria-label="Apply selected import"'), 'apply-import-btn should have aria-label');
    });

    it('should include accessible aria-live status notification element in settings.html', function() {
        assert.ok(html.includes('id="preset-status-msg"'), 'preset-status-msg element should exist');
        assert.ok(html.includes('aria-live="polite"'), 'status element should have aria-live="polite"');
        assert.ok(html.includes('role="status"'), 'status element should have role="status"');
    });

    it('should assign role="switch" to switch toggle checkboxes in settings.html', function() {
        assert.ok(html.includes('id="set-auto-cloak" role="switch"'), 'set-auto-cloak should have role="switch"');
        assert.ok(html.includes('id="set-persistent-cloak" role="switch"'), 'set-persistent-cloak should have role="switch"');
        assert.ok(html.includes('id="set-bookmarks-about-blank" role="switch"'), 'set-bookmarks-about-blank should have role="switch"');
        assert.ok(html.includes('id="set-search-about-blank" role="switch"'), 'set-search-about-blank should have role="switch"');
        assert.ok(html.includes('id="set-show-proxied-url" role="switch"'), 'set-show-proxied-url should have role="switch"');
        assert.ok(html.includes('id="set-decoy-auto-timer" role="switch"'), 'set-decoy-auto-timer should have role="switch"');
        assert.ok(html.includes('id="set-use-widget-dock" role="switch"'), 'set-use-widget-dock should have role="switch"');
    });

    it('should configure Timed Decoy Auto-Unlock setting card and default decoyAutoTimer to false', function() {
        assert.ok(html.includes('Timed Decoy Auto-Unlock'), 'Card label should be Timed Decoy Auto-Unlock');
        assert.ok(html.includes('Automatically opens Heavenly after a few seconds without clicking Terms of Service.'), 'Card description should match specification');
        assert.ok(html.includes('decoyAutoTimer: saved.decoyAutoTimer !== undefined ? Boolean(saved.decoyAutoTimer) : false'), 'loadSettings should default decoyAutoTimer to false');
        assert.ok(html.includes("settings.decoyAutoTimer = $('set-decoy-auto-timer') ? $('set-decoy-auto-timer').checked : false;"), 'updateHandler should persist decoyAutoTimer');
        assert.ok(html.includes("decoyAutoTimerCb.checked = Boolean(settings.decoyAutoTimer);"), 'syncSettingsToUI should reflect decoyAutoTimer state');
        assert.ok(html.includes("'set-decoy-auto-timer'"), 'set-decoy-auto-timer should be wired into onchange event listeners');
    });

    it('should attach Enter key event listener to custom preset title and icon inputs', function() {
        assert.ok(html.includes('save-custom-preset-btn\').click()'), 'Enter key on custom inputs should trigger save-custom-preset-btn click');
    });

    it('should configure delete button disabled state and tooltip for built-in presets', function() {
        assert.ok(html.includes('deleteBtn.disabled = isBuiltIn'), 'deleteBtn should set disabled based on isBuiltIn');
        assert.ok(html.includes('Built-in presets cannot be deleted'), 'deleteBtn tooltip should explain built-in preset restriction');
    });

    it('uses the same current defaults and protects customized icons',function(){
        const catalog=require('../public/assets/heavenly-catalog');
        assert.equal(catalog.defaults.bookmarks.find(b=>b.id==='bm_ng').icon,'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64');
        const data=catalog.fresh();data.bookmarks.find(b=>b.id==='bm_ng').icon='https://custom.test/icon';assert.equal(catalog.prepare(data).bookmarks.find(b=>b.id==='bm_ng').icon,'https://custom.test/icon');
        for(const id of ['bm_ubg98','bm_ubgames','bm_unbleeked','bm_duckmath','bm_movish_anime','bm_movish_movies','bm_bloxcraftstudios'])assert(catalog.defaults.bookmarks.some(b=>b.id===id));
        assert(html.includes('HeavenlyCatalog.defaults'));
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
            assert.ok(content.includes('src="/assets/heavenly-logo.png"') && content.includes('alt="Heavenly Logo"') && content.includes('class="brand-logo-img"'), label + ' should render heavenly-logo.png in brand-icon');
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

    it('should configure modal focus tracking and restoration for export and import modals in settings.html', function() {
        assert.ok(html.includes('var lastFocusedElement = null;'), 'settings.html should track lastFocusedElement');
        assert.ok(html.includes('function restoreLastFocus()'), 'settings.html should define restoreLastFocus helper');
        assert.ok(html.includes("var closeBtn = $('close-export-modal-btn');"), 'export modal open handler should query close button');
        assert.ok(html.includes("var closeBtn = $('close-import-modal-btn');"), 'import modal open handler should query close button');
        assert.ok(html.includes('lastFocusedElement = document.activeElement;'), 'modal open handlers should record trigger element');
    });
});
