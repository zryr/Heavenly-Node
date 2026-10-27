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
    it("uses the same accessible celestial mark and shimmer on home and Settings", function () {
      const settingsHtml = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');
      function overlay(html) {
        const source = html.slice(html.indexOf('<div id="heavenly-loading-screen"'));
        let depth = 0;
        for (const match of source.matchAll(/<\/?div\b[^>]*>/g)) {
          depth += match[0].startsWith('</') ? -1 : 1;
          if (!depth) return source.slice(0, match.index + match[0].length)
            .replace(/Entering Heavenly\.\.\.|Initializing Heavenly\.\.\.|Loading settings…/g, 'Loading Heavenly...').replace(/\s+/g, ' ').trim();
        }
        throw new Error('Loader markup is incomplete');
      }
      assert.strictEqual(overlay(indexHtml), overlay(settingsHtml), 'Both routes share the same loader structure, with route-specific status copy');
      for (const html of [indexHtml, settingsHtml]) {
        assert(html.includes('href="/assets/heavenly-loading.css"'), 'Both routes load the shared stylesheet');
        assert(html.includes('src="/assets/heavenly-loading.js"'), 'Both routes share readiness and fallback behavior');
        assert(!html.includes('.loading-overlay {'), 'Loader styling is defined once');
        assert(html.includes('class="loading-overlay" role="status" aria-live="polite"'));
        assert(html.includes('loading-logo-img') && !html.includes('loading-wings-wrapper'));
        assert(html.includes('loading-shimmer-line'));
        assert(!html.includes('setTimeout(hideLoadingScreen, 300)'), 'Readiness has no artificial wait');
      }
    });

    it("keeps the mark still, limits repeated motion and supplies a bounded fallback", function () {
      const css = fs.readFileSync(path.join(__dirname, '../public/assets/heavenly-loading.css'), 'utf8');
      assert(indexHtml.includes('Entering Heavenly...'), 'The homepage keeps its existing welcome copy');
      const loopingLines = css.split('\n').filter(line => /animation:.*infinite/.test(line));
      assert.strictEqual(loopingLines.length, 1, 'Only the indeterminate waiting indicator repeats');
      assert(loopingLines[0].includes('heavenly-loading-shimmer'));
      assert(!/animation:[^;]*heavenly-loading-(?:wing|mark)/.test(css), 'The emblem does not flap or pulse');
      assert(css.includes('heavenly-loading-dismiss 220ms'), 'Dismissal is prompt and independent of the shimmer');
      assert(css.includes('heavenly-loading-failsafe 0s 4s'), 'Failed JavaScript cannot strand a blocking overlay');
      assert(css.includes('@media (prefers-reduced-motion: reduce)'));
      assert(css.includes('.loading-overlay * { animation: none; }'));
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
