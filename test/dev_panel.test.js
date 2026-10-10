const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe("Developer QA Panel, Loading Screen Redesign & Touch Drop Indicators", function () {
  let indexHtml;

  before(function () {
    indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  });

  describe("Touch Drag Precision & Colored Drop Indicators", function () {
    it("should define glowing cyan and purple drop indicator dot CSS classes", function () {
      assert(indexHtml.includes('.drop-indicator-cyan'), "Index.html should define .drop-indicator-cyan");
      assert(indexHtml.includes('.drop-indicator-purple'), "Index.html should define .drop-indicator-purple");
      assert(indexHtml.includes('drop-indicator-dot'), "Index.html should define .drop-indicator-dot");
    });

    it("should update ghost helper functions with glowing indicator dots and drop labels", function () {
      assert(indexHtml.includes('drop-indicator-cyan'), "getBookmarkGhost should contain drop-indicator-cyan");
      assert(indexHtml.includes('drop-indicator-purple'), "getSectionGhost should contain drop-indicator-purple");
      assert(indexHtml.includes('Drop Bookmark Here'), "getBookmarkGhost should say Drop Bookmark Here");
      assert(indexHtml.includes('Drop Section Here'), "getSectionGhost should say Drop Section Here");
    });
  });

  describe("Ethereal Loading Screen Redesign", function () {
    it("should remove sharp angular wings and cyber initializing text", function () {
      assert(!indexHtml.includes('loading-wings-wrapper'), "Wireframe wings wrapper should be removed");
      assert(!indexHtml.includes('Initializing Heavenly...'), "Robotic initializing text should be removed");
    });

    it("should include celestial aura element and updated copy", function () {
      assert(indexHtml.includes('loading-celestial-aura'), "Should include celestial aura backdrop");
      assert(indexHtml.includes('loading-shimmer-line'), "Should include shimmering gradient line");
      assert(indexHtml.includes('Entering Heavenly...'), "Should include updated copy 'Entering Heavenly...'");
    });
  });

  describe("Secret Developer QA Panel (jules trigger)", function () {
    it("should include the hidden glassmorphic Developer QA Panel modal markup", function () {
      assert(indexHtml.includes('id="jules-dev-modal"'), "Should contain jules-dev-modal element");
      assert(indexHtml.includes('Developer QA Panel'), "Should contain modal title Developer QA Panel");
      assert(indexHtml.includes('id="jules-preview-loading-btn"'), "Should contain Preview Loading Screen button");
      assert(indexHtml.includes('id="jules-clear-storage-btn"'), "Should contain Clear Local Storage button");
      assert(indexHtml.includes('id="jules-exit-preview-btn"'), "Should contain Exit Loading Preview button");
    });

    it("should check for jules trigger in processSearchSubmission", function () {
      assert(indexHtml.includes("url.toLowerCase() === 'jules'"), "processSearchSubmission should check for jules keyword");
      assert(indexHtml.includes("openJulesDevModal()"), "processSearchSubmission should invoke openJulesDevModal()");
    });
  });
});
