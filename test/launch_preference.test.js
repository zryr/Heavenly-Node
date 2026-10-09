const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Launch Preference & Scoped Edit Modal Tests', function () {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

  it('should contain long-press CSS classes and discovery hint in builtin-test-modal', function () {
    assert.ok(indexHtml.includes('.long-press-btn::before'), 'index.html should contain long-press CSS fill rule');
    assert.ok(indexHtml.includes('.long-press-btn.pressing::before'), 'index.html should contain long-press pressing CSS animation rule');
    assert.ok(indexHtml.includes('builtin-discovery-hint'), 'index.html should contain discovery hint element');
    assert.ok(indexHtml.includes('Tip: Long-press an option to make it the default for this bookmark.'), 'index.html should contain discovery hint text');
  });

  it('should contain Launch Mode control in form-add-bm in public/index.html', function () {
    assert.ok(indexHtml.includes('id="bm-launch-pref"'), 'form-add-bm should contain bm-launch-pref select input');
    assert.ok(indexHtml.includes('Always Ask [Default]'), 'bm-launch-pref should contain Always Ask option');
    assert.ok(indexHtml.includes('Always Proxy'), 'bm-launch-pref should contain Always Proxy option');
    assert.ok(indexHtml.includes('Always Direct'), 'bm-launch-pref should contain Always Direct option');
  });

  it('should implement long-press listener, bookmark launchPreference persistence, and direct launch bypass in index.html', function () {
    assert.ok(indexHtml.includes('attachLongPressListener'), 'index.html should define attachLongPressListener function');
    assert.ok(indexHtml.includes('saveBookmarkLaunchPref'), 'index.html should define saveBookmarkLaunchPref function');
    assert.ok(indexHtml.includes('bm.launchPreference === \'direct\''), 'index.html should check bm.launchPreference === direct');
    assert.ok(indexHtml.includes('bm.launchPreference === \'proxy\''), 'index.html should check bm.launchPreference === proxy');
  });

  it('should use threshold timers before adding pressing class to prevent fill animation on quick clicks', function () {
    assert.ok(indexHtml.includes('cardAnimTimer'), 'index.html should define cardAnimTimer threshold timer for main bookmark cards');
    assert.ok(indexHtml.includes('sbAnimTimer'), 'index.html should define sbAnimTimer threshold timer for sub-bookmark cards');
    assert.ok(indexHtml.includes('animTimer'), 'index.html should define animTimer threshold timer in bindLongPressToElement');
  });

  it('should scope edit modal UI by hiding action tabs when editing an existing bookmark', function () {
    assert.ok(indexHtml.includes('id="add-modal-tabs-container"'), 'add-modal should wrap tab buttons in tabs container');
    assert.ok(indexHtml.includes('tabsContainer.style.display = editBmId ? \'none\' : \'flex\';'), 'openAddModal should hide tabs container in edit mode');
  });
});
