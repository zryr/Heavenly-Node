const assert = require("assert");
const unblockerClient = require("../custom-client/unblocker-client.js");

describe("FMHY Bookmarks & Link Interception", function () {
  it('provides both FMHY destinations through the shared client catalog',()=>{const data=require('../public/assets/heavenly-catalog').defaults;assert.equal(data.bookmarks.find(b=>b.id==='bm_fmhy_movies').url,'https://fmhy.net/video');assert.equal(data.bookmarks.find(b=>b.id==='bm_fmhy_anime').url,'https://fmhy.net/video#anime-streaming');});


  it("should contain openFmhyLinkModal and isFmhyPage functions in unblocker-client.js", function () {
    const fs = require("fs");
    const content = fs.readFileSync("./custom-client/unblocker-client.js", "utf8");

    assert.strictEqual(content.includes("function isFmhyPage"), true, "isFmhyPage function should be defined");
    assert.strictEqual(content.includes("function openFmhyLinkModal"), true, "openFmhyLinkModal function should be defined");
    assert.strictEqual(content.includes("FMHY Link Intercept"), true, "FMHY link intercept title should exist");
  });

  it("should exclude clicks originating from FMHY search containers", function () {
    const fs = require("fs");
    const content = fs.readFileSync("./custom-client/unblocker-client.js", "utf8");

    assert.strictEqual(content.includes(".closest('.shell')"), true, "should exclude .shell search container");
    assert.strictEqual(content.includes(".closest('.search-bar')"), true, "should exclude .search-bar container");
    assert.strictEqual(content.includes(".closest('#localsearch-input')"), true, "should exclude #localsearch-input container");
    assert.strictEqual(content.includes(".closest('.results')"), true, "should exclude .results container");
  });
});
