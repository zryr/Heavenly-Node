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

  it("should configure specific icons for Aether, Flux, UBGDir, and Docs bookmarks across client files", function () {
    [indexHtml, settingsHtml, clientJs].forEach((content, idx) => {
      const fileName = ["index.html", "settings.html", "unblocker-client.js"][idx];
      assert.strictEqual(content.includes("/assets/aether-logo.png"), true, `${fileName} should contain Aether custom icon`);
      assert.strictEqual(content.includes("/proxy/https://web.flux.focuznow.com/assets/flux-mark.webp"), true, `${fileName} should contain Flux custom icon`);
      assert.strictEqual(content.includes("/proxy/https://0800webdev.github.io/UBGdir/favicon.png"), true, `${fileName} should contain UBGDir custom icon`);
      assert.strictEqual(content.includes("https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico"), true, `${fileName} should contain Google Docs favicon`);
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

  it("should configure Opium as a folder bookmark with primary URL and 22 mirrors across client files", function () {
    [indexHtml, settingsHtml, clientJs].forEach((content, idx) => {
      const fileName = ["index.html", "settings.html", "unblocker-client.js"][idx];
      assert.strictEqual(content.includes('https://opium.best/'), true, `${fileName} should contain primary Opium URL`);
      assert.strictEqual(content.includes('sub_opium_1'), true, `${fileName} should contain sub_opium_1`);
      assert.strictEqual(content.includes('sub_opium_22'), true, `${fileName} should contain sub_opium_22`);
    });
  });

  it("should configure local assets, Polaris SVG, subsection icons, and proxied icons across client files", function () {
    [indexHtml, settingsHtml, clientJs].forEach((content, idx) => {
      const fileName = ["index.html", "settings.html", "unblocker-client.js"][idx];
      assert.strictEqual(content.includes('/assets/artic-logo.png'), true, `${fileName} should contain Artic logo asset`);
      assert.strictEqual(content.includes('/assets/doc-of-docs-logo.png'), true, `${fileName} should contain Doc of Docs logo asset`);
      assert.strictEqual(content.includes('/assets/nexus-logo.png'), true, `${fileName} should contain Nexus logo asset`);
      assert.strictEqual(content.includes('/assets/opium-logo.png'), true, `${fileName} should contain Opium logo asset`);
      assert.strictEqual(content.includes('/assets/polaris.svg'), true, `${fileName} should contain Polaris SVG asset`);
      assert.strictEqual(content.includes('/proxy/https://fmhy.net/hall.png'), true, `${fileName} should contain FMHY proxied icon`);
      assert.strictEqual(content.includes('/proxy/https://everythingmoe.com/favicon.ico'), true, `${fileName} should contain EverythingMoe proxied icon`);
      assert.strictEqual(content.includes('/proxy/https://pinkdev.d13qic2f6zga3.amplifyapp.com/favicon.png'), true, `${fileName} should contain Interdimensional Lite proxied icon`);
      assert.strictEqual(content.includes('icon: "file-text"'), true, `${fileName} should contain file-text icon for docs_games sub-section`);
    });
  });

  it("should contain OP Websites Notes modal with updated titles, concluding copy, and Discord Tip in index.html", function () {
    assert.strictEqual(indexHtml.includes('id="op-websites-notes-modal"'), true, "index.html should contain op-websites-notes-modal");
    assert.ok(indexHtml.includes("Syshi’s Notes: OP Websites") || indexHtml.includes("Syshi's Notes: OP Websites"), "index.html should contain OP Websites modal title");
    assert.ok(indexHtml.includes("Syshi’s Notes: Anime") || indexHtml.includes("Syshi's Notes: Anime"), "index.html should contain Anime modal title");
    assert.strictEqual(indexHtml.includes("Test sites directly first before using proxy mode."), true, "index.html should contain first advice bullet");
    assert.strictEqual(indexHtml.includes("libcurl proxy option in Aether settings"), true, "index.html should contain Aether libcurl tip");
    assert.strictEqual(indexHtml.includes("The point is you have to play around with the sites to find what works best on your specific device."), true, "index.html should contain concluding copy in card 2");
    assert.strictEqual(indexHtml.includes("aniclover.cc"), true, "index.html should contain aniclover tip");
    assert.strictEqual(indexHtml.includes("Discord Tip: If an OP website features a Discord link, join their server"), true, "index.html should contain Discord tip");
  });

  it("should contain Distrosea modal, recommendations, direct/proxy buttons, and responsive side column CSS in index.html", function () {
    assert.strictEqual(indexHtml.includes('id="distrosea-info-modal"'), true, "index.html should contain distrosea-info-modal");
    assert.strictEqual(indexHtml.includes("Nobara Linux"), true, "index.html should recommend Nobara Linux");
    assert.strictEqual(indexHtml.includes("Linux Mint"), true, "index.html should recommend Linux Mint");
    assert.strictEqual(indexHtml.includes("Lubuntu"), true, "index.html should recommend Lubuntu");
    assert.strictEqual(indexHtml.includes('id="distrosea-direct-btn"'), true, "index.html should contain distrosea-direct-btn");
    assert.strictEqual(indexHtml.includes('id="distrosea-proxy-btn"'), true, "index.html should contain distrosea-proxy-btn");
    assert.strictEqual(indexHtml.includes(".side-column .distrosea-btn span"), true, "index.html should contain responsive side column CSS for Distrosea button");
  });

  it("should contain UBGDir credit in index.html footer", function () {
    assert.strictEqual(indexHtml.includes('Credits to <a href="https://0800webdev.github.io/UBGdir/"'), true, "index.html footer should credit UBGDir");
  });
});
