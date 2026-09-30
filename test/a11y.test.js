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

    it('should have a direct link to settings.html on open-settings-btn', function() {
        assert.ok(html.includes('id="open-settings-btn"'), 'open-settings-btn should exist');
        assert.ok(html.includes('href="settings.html"'), 'open-settings-btn should link to settings.html');
        assert.ok(!html.includes('id="settings-modal"'), 'settings-modal element should not be in index.html');
    });

    it('should include focus-visible CSS rules for interactive elements', function() {
        assert.ok(html.includes('button:focus-visible') || html.includes('a:focus-visible'), 'CSS should include focus-visible rule');
    });

    it('should set aria-label attribute on history delete button', function() {
        assert.ok(html.includes('aria-label\', \'Remove item from history\''), 'history delete button should set aria-label');
    });

    it('should configure history cards with keyboard navigation and ARIA attributes', function() {
        assert.ok(html.includes('card.setAttribute(\'role\', \'button\')'), 'history card should have role="button"');
        assert.ok(html.includes('card.setAttribute(\'tabindex\', \'0\')'), 'history card should have tabindex="0"');
        assert.ok(html.includes('card.setAttribute(\'aria-label\''), 'history card should have aria-label set');
        assert.ok(html.includes('card.onkeydown'), 'history card should handle keyboard event onkeydown');
        assert.ok(html.includes('.history-card:focus-visible'), 'CSS should include .history-card:focus-visible rule');
    });

    it('should configure search bar input arrow key and delete key navigation for history', function() {
        assert.ok(html.includes('ArrowDown'), 'input should handle ArrowDown for history navigation');
        assert.ok(html.includes('ArrowUp'), 'input should handle ArrowUp for history navigation');
        assert.ok(html.includes('Delete'), 'input should handle Delete key for deleting history items');
        assert.ok(html.includes('navigateAndSubmit'), 'should trigger navigation and submission on selection');
    });

    it('should include custom scrollbar styling for history dropdown matching Heavenly theme', function() {
        assert.ok(html.includes('.history-dropdown::-webkit-scrollbar'), 'should style webkit scrollbar');
        assert.ok(html.includes('.history-dropdown::-webkit-scrollbar-thumb'), 'should style scrollbar thumb');
        assert.ok(html.includes('scrollbar-color'), 'should include Firefox scrollbar-color rule');
    });

    it('should configure url input with aria-expanded, aria-controls, and handle Escape key to close history dropdown', function() {
        assert.ok(html.includes('aria-expanded="false"'), 'url input should have initial aria-expanded="false"');
        assert.ok(html.includes('aria-controls="history-dropdown"'), 'url input should specify aria-controls="history-dropdown"');
        assert.ok(html.includes('input.setAttribute(\'aria-expanded\', \'true\')'), 'showDropdown should set aria-expanded="true"');
        assert.ok(html.includes('input.setAttribute(\'aria-expanded\', \'false\')'), 'hideDropdown should set aria-expanded="false"');
        assert.ok(html.includes('e.key === \'Escape\'') || html.includes('e.keyCode === 27'), 'keydown listener should handle Escape key');
    });
});
