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

  const catalog=require('../public/assets/heavenly-catalog');
  it('defines Nae-Nae as a collapsed built-in section',()=>{const section=catalog.defaults.categories.find(c=>c.id==='cat_movies').subSections.find(s=>s.id==='naenae');assert.equal(section.defaultCollapsed,true);assert.equal(section.title,'Nae-Nae');});
  it('keeps the Nae-Nae destinations in their section',()=>{for(const id of ['bm_zig_and_sharko','bm_larva','bm_spongebob'])assert.equal(catalog.defaults.bookmarks.find(b=>b.id===id).subSectionId,'naenae');});
  it('repairs a missing legacy section without adding optional content',()=>{const data=catalog.fresh();delete data.bookmarks.find(b=>b.id==='bm_project_idk').subSectionId;const repaired=catalog.prepare(data);assert.equal(repaired.bookmarks.find(b=>b.id==='bm_project_idk').subSectionId,'docs_games');});


  it("should configure accordion sections and synchronized toggle logic in Preset Bookmark Manager", function () {
    assert.strictEqual(settingsHtml.includes('details.className = \'bm-mgr-section\';'), true);
    assert.strictEqual(settingsHtml.includes('cat.hidden = !isChecked;'), true);
    assert.strictEqual(settingsHtml.includes('var allUnchecked = catBms.every(function (b) { return b.hidden; });'), true);
  });

  it("should default tab cloaking randomizer pool to 7 specific tools", function () {
    var expected = "['classroom', 'google', 'docs', 'drive', 'gmail', 'outlook', 'canva']";
    assert.deepStrictEqual(require('../public/assets/cloak-pool').defaults, ['classroom', 'google', 'docs', 'drive', 'gmail', 'outlook', 'canva']);
    assert.strictEqual(indexHtml.includes('var DEFAULT_RANDOM_POOL = HeavenlyCloakPool.defaults.slice();'), true, 'Homepage should reuse the shared default pool');
    assert.strictEqual(settingsHtml.includes('var DEFAULT_RANDOM_POOL = HeavenlyCloakPool.defaults.slice();'), true, 'Settings should reuse the shared default pool');
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
