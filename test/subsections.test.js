var assert = require("assert");
var fs = require("fs");
var path = require("path");

describe("Sub-Sections Functionality & Data Model", function () {
  var indexHtml;
  var settingsHtml;
  var clientJs;

  before(function () {
    indexHtml = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
    settingsHtml = fs.readFileSync(path.join(__dirname, "../public/settings.html"), "utf8");
    clientJs = fs.readFileSync(path.join(__dirname, "../custom-client/unblocker-client.js"), "utf8");
  });

  it("should configure default subSections in DEFAULT_BOOKMARK_DATA across all client files", function () {
    assert.strictEqual(indexHtml.includes('{ id: "naenae", title: "Nae-Nae", builtIn: true, defaultCollapsed: true }'), true);
    assert.strictEqual(settingsHtml.includes('{ id: "naenae", title: "Nae-Nae", builtIn: true, defaultCollapsed: true }'), true);
    assert.strictEqual(clientJs.includes('{ id: "naenae", title: "Nae-Nae", builtIn: true, defaultCollapsed: true }'), true);
  });

  it("should configure Nae-Nae default bookmarks across client files", function () {
    [indexHtml, settingsHtml, clientJs].forEach(function (content, i) {
      var name = i === 0 ? "index.html" : (i === 1 ? "settings.html" : "unblocker-client.js");
      assert.strictEqual(content.includes('id: "bm_zig_and_sharko"'), true, name + ' missing bm_zig_and_sharko');
      assert.strictEqual(content.includes('title: "Zig & Sharko"'), true, name + ' missing Zig & Sharko title');
      assert.strictEqual(content.includes('id: "bm_larva"'), true, name + ' missing bm_larva');
      assert.strictEqual(content.includes('title: "Larva"'), true, name + ' missing Larva title');
      assert.strictEqual(content.includes('id: "bm_spongebob"'), true, name + ' missing bm_spongebob');
      assert.strictEqual(content.includes('title: "SpongeBob"'), true, name + ' missing SpongeBob title');
      assert.strictEqual(content.includes('subSectionId: "naenae"'), true, name + ' missing naenae subSectionId');
    });
  });

  it("should reconcile subSectionId on bookmarks during loadBookmarkData", function () {
    assert.strictEqual(indexHtml.includes("bm.subSectionId = bm.builtIn ? 'builtin' : 'user';"), true);
    assert.strictEqual(settingsHtml.includes("bm.subSectionId = bm.builtIn ? 'builtin' : 'user';"), true);
    assert.strictEqual(clientJs.includes("bm.subSectionId = bm.builtIn ? 'builtin' : 'user';"), true);
  });

  it("should configure accordion sections and synchronized toggle logic in Preset Bookmark Manager", function () {
    assert.strictEqual(settingsHtml.includes('details.className = \'bm-mgr-section\';'), true);
    assert.strictEqual(settingsHtml.includes('cat.hidden = !isChecked;'), true);
    assert.strictEqual(settingsHtml.includes('var allUnchecked = catBms.every(function (b) { return b.hidden; });'), true);
  });

  it("should default tab cloaking randomizer pool to 7 specific tools", function () {
    var expected = "['classroom', 'google', 'docs', 'drive', 'gmail', 'outlook', 'canva']";
    assert.strictEqual(indexHtml.includes(expected), true, 'index.html missing DEFAULT_RANDOM_POOL');
    assert.strictEqual(settingsHtml.includes(expected), true, 'settings.html missing DEFAULT_RANDOM_POOL');
    assert.strictEqual(clientJs.includes(expected), true, 'unblocker-client.js missing DEFAULT_RANDOM_POOL');
  });

  it("should support adding custom sub-sections in index.html form and empty-state bookmark creation", function () {
    assert.strictEqual(indexHtml.includes('id="tab-add-subsec"'), true);
    assert.strictEqual(indexHtml.includes('id="form-add-subsec"'), true);
    assert.strictEqual(indexHtml.includes('Add Bookmark'), true);
    assert.strictEqual(indexHtml.includes("!subSec.builtIn || subSec.id === 'user'"), true);
  });

  it("should configure desktop hover-reveal CSS and subsec-edit-btn class for collapsed sub-sections", function () {
    assert.strictEqual(indexHtml.includes('className = \'subsec-edit-btn\';'), true, 'index.html missing subsec-edit-btn class assignment');
    assert.strictEqual(indexHtml.includes('@media (hover: hover)'), true, 'index.html missing @media (hover: hover) query');
    assert.strictEqual(indexHtml.includes('.subsection-divider[aria-expanded="false"] .subsec-edit-btn'), true, 'index.html missing collapsed subsection edit button CSS rule');
  });
});
