const assert = require("assert");
const fs = require("fs");

describe("Share, Distrosea, and Syshi Modal Accessibility Enhancements", function () {
  const indexHtml = fs.readFileSync("./public/index.html", "utf8");

  it("should configure share-copy-status with role='status' and aria-live='polite' in index.html", function () {
    assert.strictEqual(
      indexHtml.includes('id="share-copy-status" role="status" aria-live="polite"'),
      true,
      "index.html should have role='status' and aria-live='polite' on share-copy-status"
    );
  });

  it("should configure descriptive aria-label attributes on Share modal controls in index.html", function () {
    assert.strictEqual(
      indexHtml.includes('id="share-select-all-btn" type="button" aria-label="Select all bookmarks and categories to share"'),
      true,
      "index.html should contain aria-label on share-select-all-btn"
    );
    assert.strictEqual(
      indexHtml.includes('id="share-deselect-all-btn" type="button" aria-label="Deselect all bookmarks and categories"'),
      true,
      "index.html should contain aria-label on share-deselect-all-btn"
    );
    assert.strictEqual(
      indexHtml.includes('id="copy-share-code-btn" type="button" aria-label="Copy share code to clipboard"'),
      true,
      "index.html should contain aria-label on copy-share-code-btn"
    );
    assert.strictEqual(
      indexHtml.includes('id="copy-share-link-btn" type="button" aria-label="Copy share link to clipboard"'),
      true,
      "index.html should contain aria-label on copy-share-link-btn"
    );
    assert.strictEqual(
      indexHtml.includes('id="share-code-input" aria-label="Paste share code or share link"'),
      true,
      "index.html should contain aria-label on share-code-input"
    );
    assert.strictEqual(
      indexHtml.includes('id="apply-share-code-btn" type="button" aria-label="Import shared bookmarks"'),
      true,
      "index.html should contain aria-label on apply-share-code-btn"
    );
  });

  it("should configure descriptive aria-label attributes on Distrosea and Syshi modal buttons in index.html", function () {
    assert.strictEqual(
      indexHtml.includes('id="distrosea-direct-btn" type="button" aria-label="Test Distrosea direct site"'),
      true,
      "index.html should contain aria-label on distrosea-direct-btn"
    );
    assert.strictEqual(
      indexHtml.includes('id="distrosea-proxy-btn" type="button" aria-label="Open Distrosea with proxy"'),
      true,
      "index.html should contain aria-label on distrosea-proxy-btn"
    );
    assert.strictEqual(
      indexHtml.includes('id="syshi-open-isshonime-btn" type="button" aria-label="Open Isshonime site"'),
      true,
      "index.html should contain aria-label on syshi-open-isshonime-btn"
    );
    assert.strictEqual(
      indexHtml.includes('id="syshi-open-anilist-btn" type="button" aria-label="Open AniList site"'),
      true,
      "index.html should contain aria-label on syshi-open-anilist-btn"
    );
  });
});
