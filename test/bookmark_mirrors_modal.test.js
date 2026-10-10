const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Bookmark Mirror Modal Upgrades Tests', function () {
  let indexHtml;

  before(function () {
    indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  });

  it('should define Click-to-Copy URL Pill styling and copy handler in index.html', function () {
    assert.ok(indexHtml.includes('.url-copy-pill'), 'index.html should define .url-copy-pill CSS class');
    assert.ok(indexHtml.includes('createUrlCopyPill'), 'openBuiltinTestModal should define createUrlCopyPill helper function');
    assert.ok(indexHtml.includes('navigator.clipboard.writeText(urlToCopy)'), 'createUrlCopyPill should copy URL to clipboard');
  });

  it('should render Primary Site header card and support auto-failover promotion', function () {
    assert.ok(indexHtml.includes('<span>Primary Site</span>'), 'openBuiltinTestModal should render Primary Site label');
    assert.ok(indexHtml.includes('primaryCandidate'), 'openBuiltinTestModal should determine primaryCandidate');
    assert.ok(indexHtml.includes('Promoted Primary'), 'openBuiltinTestModal should promote mirror when primary site is broken');
  });

  it('should render Collapsible Your Mirrors and Built-in Mirrors sections with + Add Custom Mirror form', function () {
    assert.ok(indexHtml.includes('Your Mirrors'), 'openBuiltinTestModal should render Your Mirrors section');
    assert.ok(indexHtml.includes('Built-in Mirrors'), 'openBuiltinTestModal should render Built-in Mirrors section');
    assert.ok(indexHtml.includes('createMirrorSection'), 'openBuiltinTestModal should define createMirrorSection helper function');
    assert.ok(indexHtml.includes('+ Add Custom Mirror'), 'Your Mirrors section should contain + Add Custom Mirror form button');
  });
});
