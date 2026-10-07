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
    assert.strictEqual(indexHtml.includes('subSections: [{ id: "builtin", title: "Built-In", builtIn: true }, { id: "user", title: "Your Bookmarks", builtIn: true }]'), true);
    assert.strictEqual(settingsHtml.includes('subSections: [{ id: "builtin", title: "Built-In", builtIn: true }, { id: "user", title: "Your Bookmarks", builtIn: true }]'), true);
    assert.strictEqual(clientJs.includes('subSections: [{ id: "builtin", title: "Built-In", builtIn: true }, { id: "user", title: "Your Bookmarks", builtIn: true }]'), true);
  });

  it("should reconcile subSectionId on bookmarks during loadBookmarkData", function () {
    assert.strictEqual(indexHtml.includes("bm.subSectionId = bm.builtIn ? 'builtin' : 'user';"), true);
    assert.strictEqual(settingsHtml.includes("bm.subSectionId = bm.builtIn ? 'builtin' : 'user';"), true);
    assert.strictEqual(clientJs.includes("bm.subSectionId = bm.builtIn ? 'builtin' : 'user';"), true);
  });

  it("should support adding custom sub-sections in index.html form and empty-state bookmark creation", function () {
    assert.strictEqual(indexHtml.includes('id="tab-add-subsec"'), true);
    assert.strictEqual(indexHtml.includes('id="form-add-subsec"'), true);
    assert.strictEqual(indexHtml.includes('Add Bookmark'), true);
    assert.strictEqual(indexHtml.includes("!subSec.builtIn || subSec.id === 'user'"), true);
  });
});
