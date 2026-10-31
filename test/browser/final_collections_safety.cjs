"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { chromium } = require("playwright"),
  app = require("../../app");
const { revealSettingsControl } = require("./settings_test_helpers.cjs");
const output = path.resolve("docs/final-handoff/evidence"),
  result = { checks: [], errors: [], physicalDevices: [] };
let server, browser;
const pass = (s) => {
  result.checks.push(s);
  console.log("PASS " + s);
};
(async () => {
  server = app.listen(0);
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("heavenly_decoy_unlocked", "true");
    localStorage.setItem("heavenly_messages_paused", "true");
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => result.errors.push(e.message));
  p.setDefaultTimeout(10000);
  await p.goto(origin);
  await p.locator("#heavenly-loading-screen").waitFor({ state: "hidden" });
  const ids = await p.evaluate(() => {
    let ids = [];
    const tx = HeavenlyCollections.transact(localStorage, (d) => {
      const c = HeavenlyCollections.create(d, {
        title: "Touch safety",
        icon: "☁",
      });
      for (let i = 0; i < 18; i++) {
        const e = HeavenlyCollections.saveItem(d, {
          title: "Touch game " + String(i + 1).padStart(2, "0"),
          url: "https://touch.heavenly.test/" + i,
          kind: "game",
        });
        ids.push(e.id);
        HeavenlyCollections.add(d, c.id, [e.id]);
      }
      return c.id;
    });
    return { collection: tx.result, items: ids };
  });
  await p.locator("#open-arcade-btn").click();
  let arcade = p.locator("#heavenly-arcade");
  await arcade
    .locator("nav")
    .getByRole("button", { name: "☁ Touch safety", exact: true })
    .click();
  const cards = arcade.locator(".game"),
    handle = cards.first().locator(".drag");
  await handle.scrollIntoViewIfNeeded();
  const cdp = await context.newCDPSession(p);
  const touch = (type, points = []) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const point = (x, y) => ({ x, y, radiusX: 2, radiusY: 2 });
  let rect = await handle.boundingBox(),
    x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  const before = await p.evaluate(() =>
    localStorage.getItem("heavenly_bookmarks"),
  );
  let scrollBefore = await arcade
    .locator("dialog")
    .evaluate((d) => d.scrollTop);
  await touch("touchStart", [point(x, y)]);
  for (let i = 1; i <= 8; i++) await touch("touchMove", [point(x, y - i * 14)]);
  await touch("touchEnd");
  await p.waitForTimeout(100);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("heavenly_bookmarks")),
    before,
  );
  assert.equal(await arcade.locator(".picked").count(), 0);
  assert(
    await arcade
      .locator("dialog")
      .evaluate((d, b) => d.scrollTop > b, scrollBefore),
  );
  assert.equal(await p.locator("#heavenly-game-details").count(), 0);
  pass(
    "Native emulated handle swipe scrolls and cancels pickup without opening a game or mutating order",
  );
  await handle.scrollIntoViewIfNeeded();
  rect = await handle.boundingBox();
  x = rect.x + rect.width / 2;
  y = rect.y + rect.height / 2;
  await touch("touchStart", [point(x, y)]);
  await p.waitForTimeout(450);
  assert.equal(await arcade.locator(".picked").count(), 1);
  await touch("touchCancel");
  assert.equal(await arcade.locator(".picked").count(), 0);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("heavenly_bookmarks")),
    before,
  );
  pass(
    "Deliberate hold picks up; pointer/touch cancellation clears gesture state and leaves storage intact",
  );
  await handle.scrollIntoViewIfNeeded();
  rect = await handle.boundingBox();
  x = rect.x + rect.width / 2;
  y = rect.y + rect.height / 2;
  await touch("touchStart", [point(x, y)]);
  await p.waitForTimeout(450);
  let target = await cards.nth(2).boundingBox();
  await touch("touchMove", [
    point(target.x + target.width / 2, target.y + target.height / 2),
  ]);
  await touch("touchEnd");
  await p.waitForTimeout(100);
  const order = await p.evaluate(
    (id) =>
      HeavenlySaveUI.load()._collections.collections.find((c) => c.id === id)
        .itemIds,
    ids.collection,
  );
  assert.notDeepEqual(order, ids.items);
  assert.equal(order[2], ids.items[0]);
  assert.equal(await arcade.locator(".picked,.drop-target").count(), 0);
  pass(
    "Native touch hold/drop changes only the selected collection’s persisted order",
  );
  await p.keyboard.press("Escape");
  await p.goto(origin + "/settings.html");
  await p.locator("#heavenly-loading-screen").waitFor({ state: "hidden" });
  await revealSettingsControl(p, "#open-export-modal-btn");
  await p.locator("#open-export-modal-btn").click();
  const downloadPromise = p.waitForEvent("download");
  await p.locator("#download-export-btn").click();
  const dl = await downloadPromise,
    backup = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  assert(backup._collections);
  assert.deepEqual(
    backup._collections.collections.find((c) => c.id === ids.collection)
      .itemIds,
    order,
  );
  pass(
    "Actual private JSON download includes full memberships, stable IDs and independent collection order",
  );
  const importFile = async (data, mode = "merge") => {
    await p.locator("#open-import-modal-btn").click();
    await p
      .locator("#import-file-input")
      .setInputFiles({
        name: "collections.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(data)),
      });
    await p.locator("#import-mode-select").selectOption(mode);
    if (mode === "overwrite") p.once("dialog", (d) => d.accept());
    await p.locator("#apply-import-btn").click();
  };
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("heavenly_bookmarks"));
    d._collections.collections = d._collections.collections.filter(
      (c) => c.title !== "Touch safety",
    );
    localStorage.setItem("heavenly_bookmarks", JSON.stringify(d));
  });
  await importFile(backup, "overwrite");
  assert.deepEqual(
    await p.evaluate(
      (id) =>
        JSON.parse(
          localStorage.getItem("heavenly_bookmarks"),
        )._collections.collections.find((c) => c.id === id).itemIds,
      ids.collection,
    ),
    order,
  );
  await importFile(backup, "merge");
  assert.equal(
    await p.evaluate(
      (id) =>
        JSON.parse(
          localStorage.getItem("heavenly_bookmarks"),
        )._collections.collections.filter((c) => c.id === id).length,
      ids.collection,
    ),
    1,
  );
  pass(
    "Actual overwrite and merge import restore relationships and order without duplicate collections",
  );
  const bad = JSON.parse(JSON.stringify(backup));
  const parent = bad._collections.collections.find(
    (c) => c.id === ids.collection,
  );
  bad._collections.collections.push(
    {
      id: "nested1",
      title: "Child",
      icon: "✦",
      parentId: parent.id,
      itemIds: [],
    },
    {
      id: "nested2",
      title: "Grandchild",
      icon: "✦",
      parentId: "nested1",
      itemIds: [],
    },
  );
  const beforeBad = await p.evaluate(() =>
    localStorage.getItem("heavenly_bookmarks"),
  );
  let alert = "";
  p.once("dialog", async (d) => {
    alert = d.message();
    await d.accept();
  });
  await importFile(bad);
  assert.match(alert, /one folder level/);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("heavenly_bookmarks")),
    beforeBad,
  );
  await p.keyboard.press("Escape");
  pass(
    "Imported grandchildren are rejected with a recovery message and original collection bytes restored",
  );
  await p.goto(origin);
  await p.locator("#heavenly-loading-screen").waitFor({ state: "hidden" });
  await p.locator("#open-arcade-btn").click();
  await arcade.getByLabel("Search games and collections").fill("Touch game 01");
  await arcade.locator(".game .info").click();
  await p
    .locator("#heavenly-game-details")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const editor = p.getByRole("dialog", {
    name: "Edit Touch game 01",
    exact: true,
  });
  await editor.getByLabel("Name", { exact: true }).fill("Unsaved draft");
  await p.evaluate(
    (id) =>
      HeavenlyCollections.transact(localStorage, (d) => {
        HeavenlyCollections.entry(d, id).title = "Another tab title";
      }),
    ids.items[0],
  );
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  assert.equal(
    await editor.getByLabel("Name", { exact: true }).inputValue(),
    "Unsaved draft",
  );
  assert(await editor.getByText(/changed in another tab/).isVisible());
  assert.equal(
    await p.evaluate(
      (id) => HeavenlyCollections.entry(HeavenlySaveUI.load(), id).title,
      ids.items[0],
    ),
    "Another tab title",
  );
  pass(
    "Concurrent item edits preserve the open unsaved draft and refuse to overwrite newer saved content",
  );
  assert.deepEqual(result.errors, []);
  result.status = "passed";
})()
  .catch((e) => {
    result.status = "failed";
    result.failure = e.stack;
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.writeFileSync(
      path.join(output, "collections-safety-results.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    await browser?.close();
    if (server) {
      server.closeAllConnections?.();
      await new Promise((r) => server.close(r));
    }
  });
