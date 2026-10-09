const assert = require("assert");
const fs = require("fs");

describe("Syshi's Notes, Isshonime Bookmark & De-emphasized Broken Links", function () {
  it("should contain Isshonime link only in Syshi's Notes modal in index.html and not in default bookmarks", function () {
    const files = [
      "./public/index.html",
      "./public/settings.html",
      "./custom-client/unblocker-client.js"
    ];

    files.forEach(function (filePath) {
      const content = fs.readFileSync(filePath, "utf8");
      assert.strictEqual(content.includes('id: "bm_isshonime"'), false, filePath + ' should not contain bm_isshonime in DEFAULT_BOOKMARK_DATA');
    });

    const indexContent = fs.readFileSync("./public/index.html", "utf8");
    assert.ok(indexContent.includes('https://www.isshonime.com/'), 'index.html should contain Isshonime URL in Syshi\'s Notes modal');
  });

  it("should contain Syshi\'s Notes button, modal, and tip content in index.html", function () {
    const content = fs.readFileSync("./public/index.html", "utf8");

    assert.ok(content.includes('syshis-notes-modal'), "index.html should contain syshis-notes-modal ID");
    assert.ok(content.includes("Syshi's Notes"), "index.html should contain Syshi's Notes title");
    assert.ok(content.includes("Isshonime") && content.includes("to help decide what anime to watch next"), "index.html should contain Isshonime tip note");
    assert.ok(content.includes("AniList") && content.includes("to keep track of your watched anime and ratings"), "index.html should contain AniList tip note");
    assert.ok(content.includes("openSyshisNotesModal"), "index.html should define openSyshisNotesModal function");
    assert.ok(content.includes("closeSyshisNotesModal"), "index.html should define closeSyshisNotesModal function");
  });

  it("should apply de-emphasized styling for broken mirror links in index.html", function () {
    const content = fs.readFileSync("./public/index.html", "utf8");

    assert.ok(content.includes("opacity: 0.45"), "index.html should set lower opacity for broken links");
    assert.ok(content.includes("filter: grayscale(50%)"), "index.html should set grayscale filter for broken links");
  });
});
