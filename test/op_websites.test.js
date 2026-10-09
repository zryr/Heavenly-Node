const assert = require("assert");
const fs = require("fs");

describe("OP Websites Category, Bookmarks & Advice Modals", function () {
  const indexHtml = fs.readFileSync("./public/index.html", "utf8");
  const settingsHtml = fs.readFileSync("./public/settings.html", "utf8");
  const clientJs = fs.readFileSync("./custom-client/unblocker-client.js", "utf8");

  it("should configure cat_op_websites category in DEFAULT_BOOKMARK_DATA across all client files", function () {
    [indexHtml, settingsHtml, clientJs].forEach((content, idx) => {
      const fileName = ["index.html", "settings.html", "unblocker-client.js"][idx];
      assert.strictEqual(content.includes('id: "cat_op_websites"'), true, `${fileName} should contain cat_op_websites category`);
      assert.strictEqual(content.includes('title: "OP Websites"'), true, `${fileName} should contain OP Websites title`);
      assert.strictEqual(content.includes('id: "browser_games"'), true, `${fileName} should contain browser_games sub-section`);
      assert.strictEqual(content.includes('id: "docs_games"'), true, `${fileName} should contain docs_games sub-section`);
    });
  });

  it("should register all required Browser/Games and Docs/Games bookmarks across client files", function () {
    const requiredBookmarks = [
      "bm_aether",
      "bm_korona",
      "bm_nexus",
      "bm_flux",
      "bm_opium",
      "bm_polaris",
      "bm_arctic",
      "bm_pgis2",
      "bm_ubgdir",
      "bm_the_wagon",
      "bm_ultimate_doc_of_docs",
      "bm_project_19",
      "bm_project_idk"
    ];

    requiredBookmarks.forEach((bmId) => {
      [indexHtml, settingsHtml, clientJs].forEach((content, idx) => {
        const fileName = ["index.html", "settings.html", "unblocker-client.js"][idx];
        assert.strictEqual(content.includes(bmId), true, `${fileName} should contain bookmark ${bmId}`);
      });
    });
  });

  it("should disable quick save widget for Project 19 and Project IDK", function () {
    [indexHtml, settingsHtml, clientJs].forEach((content, idx) => {
      const fileName = ["index.html", "settings.html", "unblocker-client.js"][idx];
      assert.ok(
        content.includes('id: "bm_project_19"') && content.includes('disableQuickSaveWidget: true'),
        `${fileName} should have disableQuickSaveWidget: true for Project 19`
      );
      assert.ok(
        content.includes('id: "bm_project_idk"') && content.includes('disableQuickSaveWidget: true'),
        `${fileName} should have disableQuickSaveWidget: true for Project IDK`
      );
    });
  });

  it("should contain OP Websites Notes modal and button in index.html", function () {
    assert.strictEqual(indexHtml.includes('id="op-websites-notes-modal"'), true, "index.html should contain op-websites-notes-modal");
    assert.strictEqual(indexHtml.includes("OP Websites Notes"), true, "index.html should contain OP Websites Notes title");
    assert.strictEqual(indexHtml.includes("Test sites directly first before using proxy mode."), true, "index.html should contain first advice bullet");
    assert.strictEqual(indexHtml.includes("libcurl proxy option in Aether settings"), true, "index.html should contain Aether libcurl tip");
    assert.strictEqual(indexHtml.includes("aniclover.cc"), true, "index.html should contain aniclover tip");
  });

  it("should contain Distrosea modal, recommendations, and direct/proxy buttons in index.html", function () {
    assert.strictEqual(indexHtml.includes('id="distrosea-info-modal"'), true, "index.html should contain distrosea-info-modal");
    assert.strictEqual(indexHtml.includes("Nobara Linux"), true, "index.html should recommend Nobara Linux");
    assert.strictEqual(indexHtml.includes("Linux Mint"), true, "index.html should recommend Linux Mint");
    assert.strictEqual(indexHtml.includes("Lubuntu"), true, "index.html should recommend Lubuntu");
    assert.strictEqual(indexHtml.includes('id="distrosea-direct-btn"'), true, "index.html should contain distrosea-direct-btn");
    assert.strictEqual(indexHtml.includes('id="distrosea-proxy-btn"'), true, "index.html should contain distrosea-proxy-btn");
    assert.strictEqual(indexHtml.includes("https://distrosea.com/"), true, "index.html should reference distrosea URL");
  });

  it("should contain UBGDir credit in index.html footer", function () {
    assert.strictEqual(indexHtml.includes('Credits to <a href="https://0800webdev.github.io/UBGdir/"'), true, "index.html footer should credit UBGDir");
  });
});
