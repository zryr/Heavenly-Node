const assert = require("assert");
const fs = require("fs");

describe("New Default Bookmarks (SitesDotCom, GRIND1, GN Math)", function () {
  it("should contain bm_sitesdotcom, bm_grind1, and bm_gn_math in DEFAULT_BOOKMARK_DATA across client files", function () {
    const files = [
      "./public/index.html",
      "./public/settings.html",
      "./custom-client/unblocker-client.js"
    ];

    files.forEach(function (filePath) {
      const content = fs.readFileSync(filePath, "utf8");

      assert.ok(content.includes('id: "bm_sitesdotcom"'), filePath + ' should contain bm_sitesdotcom ID');
      assert.ok(content.includes('title: "SitesDotCom"'), filePath + ' should contain SitesDotCom title');
      assert.ok(content.includes('https://games-b3749.web.app/'), filePath + ' should contain SitesDotCom URL');
      assert.ok(content.includes('preset:globe'), filePath + ' should contain SitesDotCom preset:globe icon');

      assert.ok(content.includes('id: "bm_grind1"'), filePath + ' should contain bm_grind1 ID');
      assert.ok(content.includes('title: "GRIND1"'), filePath + ' should contain GRIND1 title');
      assert.ok(content.includes('https://zbr.base44.app'), filePath + ' should contain GRIND1 URL');
      assert.ok(content.includes('yt3.googleusercontent.com'), filePath + ' should contain GRIND1 custom icon URL');

      assert.ok(content.includes('id: "bm_gn_math"'), filePath + ' should contain bm_gn_math ID');
      assert.ok(content.includes('title: "GN Math"'), filePath + ' should contain GN Math title');
      assert.ok(content.includes('https://gn-math.dev/'), filePath + ' should contain GN Math URL');
    });
  });
});
