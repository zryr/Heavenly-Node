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

  describe("Shared Heavenly Loading Screen", function () {
    it("uses the same accessible winged mark and shimmer on home and Settings", function () {
      const settingsHtml = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');
      const overlay = html => html.slice(html.indexOf('<div id="heavenly-loading-screen"'), html.indexOf('<div class="glow-orb glow-orb-1"'))
        .replace(/Entering Heavenly\.\.\.|Initializing Heavenly\.\.\./g, 'Loading Heavenly...').replace(/\s+/g, ' ').trim();
      assert.strictEqual(overlay(indexHtml), overlay(settingsHtml), 'Both routes share the same loader structure, with route-specific status copy');
      for (const html of [indexHtml, settingsHtml]) {
        assert(html.includes('href="/assets/heavenly-loading.css"'), 'Both routes load the shared stylesheet');
        assert(!html.includes('.loading-overlay {'), 'Loader styling is defined once');
        assert(html.includes('class="loading-overlay" role="status" aria-live="polite"'));
        assert(html.includes('loading-wings-wrapper') && html.includes('loading-wing-right'));
        assert(html.includes('loading-shimmer-line'));
      }
    });

    it("settles the mark once, preserves wing mirroring and keeps prompt dismissal", function () {
      const css = fs.readFileSync(path.join(__dirname, '../public/assets/heavenly-loading.css'), 'utf8');
      assert(indexHtml.includes('Entering Heavenly...'), 'The homepage keeps its existing welcome copy');
      const loopingLines = css.split('\n').filter(line => /animation:.*infinite/.test(line));
      assert.strictEqual(loopingLines.length, 1, 'Only the indeterminate waiting indicator repeats');
      assert(loopingLines[0].includes('heavenly-loading-shimmer'));
      const rightWing = css.match(/@keyframes heavenly-loading-wing-right \{([^\n]+)\}/)[1];
      assert.strictEqual((rightWing.match(/scaleX\(-1\)/g) || []).length, 2, 'Both resting and moving keyframes retain the mirrored wing');
      assert(css.includes('heavenly-loading-dismiss 500ms'), 'Dismissal retains the existing fade duration');
      assert(css.includes('@media (prefers-reduced-motion: reduce)'));
      assert(css.includes('.loading-overlay *, .loading-overlay.fade-out { animation: none; }'));
    });
  });

  describe("Codex Developer HQ command and safe QA tools", function () {
    it("opens the local workshop from the codex command", function () {
      assert(indexHtml.includes('id="codex-dev-modal"'));
      assert(indexHtml.includes('Codex Developer HQ'));
      assert(indexHtml.includes("url.toLowerCase() === 'codex'"));
      assert(indexHtml.includes('openCodexDevModal()'));
    });
    it("uses scoped data operations and preserves bookmark recovery", function () {
      assert(!indexHtml.includes('localStorage.clear()'));
      assert(!indexHtml.includes('sessionStorage.clear()'));
      assert(indexHtml.includes('heavenly_dev_hq_bookmark_recovery'));
      const controller=fs.readFileSync(path.join(__dirname,'../public/assets/heavenly-dev-hq.js'),'utf8');
      assert(controller.includes('confirmScope'));
      assert(controller.includes('Clear temporary data'));
      assert(controller.includes('Restore QA recovery copy'));
    });
  });
});
