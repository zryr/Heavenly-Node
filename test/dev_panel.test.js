const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe("Developer QA Panel, Loading Screen Redesign & Touch Drop Indicators", function () {
  let indexHtml;

  before(function () {
    indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  });

  describe("Touch Drag Precision & Colored Drop Indicators", function () {
    it("uses one restrained insertion space, with distinct category and bookmark identity", function () {
      const css=fs.readFileSync(path.join(__dirname,'../public/assets/bookmark-dialogs.css'),'utf8');
      assert(css.includes('.heavenly-placement-slot[data-kind="category"]'));
      assert(indexHtml.includes("indicator.dataset.kind=position.type"));
      assert(!indexHtml.includes('Drop Section Here'));assert(!indexHtml.includes('Drop Bookmark Here'));
    });

    it("uses stable shared measurements and animated neighboring items", function () {
      assert(indexHtml.includes('HeavenlyDrag.rect(node)'));assert(indexHtml.includes('bookmarkSpace.update'));
      assert(indexHtml.includes('HeavenlyDrag.flip'));
    });

    it("should use the shared adaptive preview renderer with actual input context", function () {
      assert(indexHtml.includes('HeavenlyDrag.create'), "Uses the shared preview renderer");
      assert(indexHtml.includes('bookmarkInputType = event.pointerType'), "Uses actual pointer input");
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
