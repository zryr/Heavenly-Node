const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Quick Settings & Auto-Hide Broken Bookmarks Tests', function () {
  let indexHtml;

  before(function () {
    indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  });

  it('should contain Quick Settings section, toggle button, and pills in public/index.html', function () {
    assert.ok(indexHtml.includes('id="quick-settings-section"'), 'index.html should contain quick-settings-section ID');
    assert.ok(indexHtml.includes('id="quick-settings-toggle-btn"'), 'index.html should contain quick-settings-toggle-btn ID');
    assert.ok(indexHtml.includes('id="quick-settings-tray"'), 'index.html should contain quick-settings-tray ID');

    assert.ok(indexHtml.includes('id="pill-bm-newtab"'), 'index.html should contain pill-bm-newtab ID');
    assert.ok(indexHtml.includes('id="pill-search-newtab"'), 'index.html should contain pill-search-newtab ID');

    assert.ok(indexHtml.includes('Bookmarks in New Tab'), 'index.html should contain Bookmarks in New Tab pill text');
    assert.ok(indexHtml.includes('Search in New Tab'), 'index.html should contain Search in New Tab pill text');
  });

  it('should define initQuickSettingsTray with state persistence and pill click handlers', function () {
    assert.ok(indexHtml.includes('function initQuickSettingsTray()'), 'index.html should define initQuickSettingsTray function');
    assert.ok(indexHtml.includes('heavenly_quick_settings_expanded'), 'initQuickSettingsTray should use heavenly_quick_settings_expanded key');
    assert.ok(indexHtml.includes('openBookmarksInNewTab'), 'pill-bm-newtab should update openBookmarksInNewTab setting');
    assert.ok(indexHtml.includes('openSearchInNewTab'), 'pill-search-newtab should update openSearchInNewTab setting');
  });

  it('should contain Auto-Hide broken bookmark container and action button in builtin-test-modal', function () {
    assert.ok(indexHtml.includes('id="builtin-hide-container"'), 'builtin-test-modal should contain builtin-hide-container ID');
    assert.ok(indexHtml.includes('id="builtin-hide-bm-btn"'), 'builtin-test-modal should contain builtin-hide-bm-btn ID');
    assert.ok(indexHtml.includes('<span>Hide Bookmark</span>'), 'Hide Bookmark button text should be present');
    assert.ok(indexHtml.includes('All available links for this bookmark are marked as broken'), 'Warning message for broken bookmark should be present');
  });

  it('should render single-URL broken link toggle button and check if all versions are broken in openBuiltinTestModal', function () {
    assert.ok(indexHtml.includes('var allAreBroken = allVersions.length > 0 && allVersions.every('), 'openBuiltinTestModal should check if all versions are broken');
    assert.ok(indexHtml.includes('bmToHide.hidden = true'), 'builtin-hide-bm-btn click handler should set hidden = true on target bookmark');
    assert.ok(indexHtml.includes('toggleBrokenLinkState'), 'openBuiltinTestModal should provide broken link toggle button for single-URL bookmarks');
  });

  it('should define micro-animation keyframes and classes for Mark as Working/Broken and smooth transition on search newtab button', function () {
    assert.ok(indexHtml.includes('@keyframes markWorkingSuccess'), 'index.html should define @keyframes markWorkingSuccess');
    assert.ok(indexHtml.includes('@keyframes markBrokenWarning'), 'index.html should define @keyframes markBrokenWarning');
    assert.ok(indexHtml.includes('.mark-working-animate'), 'index.html should define .mark-working-animate CSS class');
    assert.ok(indexHtml.includes('.mark-broken-animate'), 'index.html should define .mark-broken-animate CSS class');
    assert.ok(indexHtml.includes('card.classList.add(isBroken ? \'mark-working-animate\' : \'mark-broken-animate\')'), 'toggleBrokenBtn should trigger micro-animation class before re-rendering');
    assert.ok(indexHtml.includes('sCard.classList.add(sVer.isBroken ? \'mark-working-animate\' : \'mark-broken-animate\')'), 'sToggleBtn should trigger micro-animation class before re-rendering');
    assert.ok(indexHtml.includes('#search-newtab-btn'), 'index.html should style #search-newtab-btn');
    assert.ok(indexHtml.includes('#search-newtab-btn.collapsed'), 'index.html should define #search-newtab-btn.collapsed transition');
  });
});
