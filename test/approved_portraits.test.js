"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const dir = path.join(__dirname, "../public/assets/messages/portraits"),
  manifest = require("../public/assets/messages/portraits/approved-assets.json"),
  messages = require("../public/assets/heavenly-messages-data");
describe("Seven supplied final portraits", function () {
  it("commits exactly the seven approved byte-identical transparent WebP files", function () {
    const files = fs
      .readdirSync(dir)
      .filter((x) => x.endsWith(".webp"))
      .sort();
    assert.deepEqual(files, manifest.files.map((x) => x.filename).sort());
    for (const f of manifest.files) {
      const bytes = fs.readFileSync(path.join(dir, f.filename));
      assert.equal(
        crypto.createHash("sha256").update(bytes).digest("hex"),
        f.sha256,
      );
      assert.equal(bytes.length, f.size_bytes);
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      assert(
        bytes.toString("ascii", 12, 16) === "VP8L"
          ? (bytes.readUInt32LE(21) >>> 28) & 1
          : bytes[20] & 16,
        "WebP alpha flag must be present",
      );
    }
  });
  it("wires exact approved Khezu illustrated vs Ao Oni retro lines and portraits", function () {
    const ao = messages.items.find((x) => x.id === "msg_ao_oni").action.steps,
      kh = messages.items.find((x) => x.id === "msg_khezu").action.steps;
    assert.deepEqual(
      ao.map((x) => x.asset),
      ["you-retro", "cloudy-retro"],
    );
    assert.equal(ao[1].text, "you don't know ball");
    assert.deepEqual(
      kh.map((x) => x.asset),
      ["hunter-smug", "you-suspicious", "cloudy-speed-meme"],
    );
    assert.equal(kh[2].text, "yo wth 😭");
    const slots = require("../public/assets/messages/portraits/manifest.json");
    assert.equal(slots.cloudy, "cloudy-main.webp");
    assert.equal(slots.hunter, "hunter-smug.webp");
    assert(!Object.values(slots).some((x) => /serious|base/.test(x)));
  });
});
