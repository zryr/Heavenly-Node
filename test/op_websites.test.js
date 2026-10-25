const assert = require("assert");
const fs = require("fs");

describe("OP Websites Category, Bookmarks & Advice Modals", function () {
  const indexHtml = fs.readFileSync("./public/index.html", "utf8");
  const settingsHtml = fs.readFileSync("./public/settings.html", "utf8");
  const clientJs = fs.readFileSync("./custom-client/unblocker-client.js", "utf8");

  const data=require('../public/assets/heavenly-catalog').defaults;
  const item=id=>data.bookmarks.find(b=>b.id===id);
  it('defines OP Websites and its sections once',()=>{const c=data.categories.find(c=>c.id==='cat_op_websites');assert.equal(c.title,'OP Websites');assert(c.subSections.some(s=>s.id==='browser_games'));assert(c.subSections.some(s=>s.id==='docs_games'));});
  it('registers all OP websites',()=>{for(const id of ['bm_aether','bm_korona','bm_nexus','bm_flux','bm_opium','bm_polaris','bm_arctic','bm_pgis2','bm_ubgdir','bm_the_wagon','bm_ultimate_doc_of_docs','bm_project_19','bm_project_idk']) assert(item(id),id);});
  it('keeps destination-specific icons',()=>{assert.equal(item('bm_aether').icon,'/assets/icons/aether-icon.png');assert(item('bm_flux').icon.includes('flux-mark.webp'));assert(item('bm_ubgdir').icon.includes('UBGdir/favicon.png'));assert(item('bm_project_idk').icon.includes('kix-favicon7.ico'));});
  it('disables quick save for both project documents',()=>{for(const id of ['bm_project_19','bm_project_idk'])assert.equal(item(id).disableQuickSaveWidget,true);});
  it('keeps all 22 Opium mirrors and canonical destination',()=>{assert.equal(item('bm_opium').url,'https://opium.best/');assert.equal(item('bm_opium').subBookmarks.length,22);assert(item('bm_opium').subBookmarks.some(b=>b.id==='sub_opium_22'));});
  it('keeps legitimate SVG and proxied icons',()=>{assert.equal(item('bm_polaris').icon,'/assets/polaris.svg');assert(item('bm_everythingmoe').icon.startsWith('/proxy/'));assert.equal(data.categories.find(c=>c.id==='cat_op_websites').subSections.find(s=>s.id==='docs_games').icon,'file-text');});


  it("should contain Distrosea modal, recommendations, direct/proxy buttons, and responsive side column CSS in index.html", function () {
    assert.strictEqual(indexHtml.includes('id="distrosea-info-modal"'), true, "index.html should contain distrosea-info-modal");
    assert.strictEqual(indexHtml.includes("Nobara Linux"), true, "index.html should recommend Nobara Linux");
    assert.strictEqual(indexHtml.includes("Linux Mint"), true, "index.html should recommend Linux Mint");
    assert.strictEqual(indexHtml.includes("Lubuntu"), true, "index.html should recommend Lubuntu");
    assert.strictEqual(indexHtml.includes('id="distrosea-direct-btn"'), true, "index.html should contain distrosea-direct-btn");
    assert.strictEqual(indexHtml.includes('id="distrosea-proxy-btn"'), true, "index.html should contain distrosea-proxy-btn");
    assert.strictEqual(indexHtml.includes(".side-column .distrosea-btn span"), true, "index.html should contain responsive side column CSS for Distrosea button");
  });

  it("removes the optional UBGDir product credit while preserving authorship and license notices", function () {
    assert.strictEqual(indexHtml.includes('Credits to <a href="https://0800webdev.github.io/UBGdir/"'), false);
    assert(indexHtml.includes('Originally created by <a href="http://www.nfriedly.com/"'));
    assert.equal(require('../package.json').license, 'AGPL-3.0');
    assert(fs.readFileSync('./README.md', 'utf8').includes('GNU Affero General Public License'));
  });
});
