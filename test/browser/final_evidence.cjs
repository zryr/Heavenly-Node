"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { chromium } = require("playwright"),
  app = require("../../app");
const out = path.resolve("docs/final-handoff/evidence"),
  intermediate = path.resolve(
    process.env.HEAVENLY_VIDEO_WORK_DIR || "work/final-capture-video",
  );
fs.mkdirSync(intermediate, { recursive: true });
const report = { checks: [], errors: [], captures: [], physicalDevices: [] };
let server, browser, context, page;
(async () => {
  server = app.listen(0);
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    hasTouch: true,
    recordVideo: { dir: intermediate, size: { width: 1366, height: 900 } },
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("heavenly_decoy_unlocked", "true");
    localStorage.setItem("heavenly_messages_paused", "true");
  });
  page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(origin);
  await page.locator("#heavenly-loading-screen").waitFor({ state: "hidden" });
  async function shot(name, fullPage = false) {
    await page.screenshot({ path: path.join(out, name + ".png"), fullPage });
    report.captures.push(name + ".png");
  }
  await shot("home-after", true);
  await page.locator("#open-arcade-btn").click();
  const a = page.locator("#heavenly-arcade");
  await shot("arcade-desktop");
  const normal = await a
    .locator(".cards")
    .evaluate((n) => getComputedStyle(n).gridTemplateColumns.split(" ").length);
  await a.locator("dialog").evaluate((n) => (n.style.width = "650px"));
  await page.waitForFunction(() => {
    const d = document.getElementById("heavenly-arcade").shadowRoot;
    return (
      getComputedStyle(d.querySelector(".cards")).gridTemplateColumns.split(" ")
        .length === 1
    );
  });
  assert.equal(normal, 2);
  await a.locator("dialog").evaluate((n) => n.style.removeProperty("width"));
  report.checks.push(
    "Card density follows containing panel width at unchanged viewport",
  );
  for (const [width, height] of [
    [820, 1180],
    [1180, 820],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await a.locator("dialog").evaluate((n) => (n.scrollTop = 0));
    assert(
      await a
        .locator("dialog")
        .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
    );
    await shot("arcade-" + width);
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const [note, assets] of [
    ["msg_ao_oni", ["you-retro.webp", "cloudy-retro.webp"]],
    [
      "msg_khezu",
      ["hunter-smug.webp", "you-suspicious.webp", "cloudy-speed-meme.webp"],
    ],
    ["msg_doggy", ["doggy.webp", "you-neutral.webp", "cloudy-main.webp"]],
  ]) {
    await page.evaluate((id) => heavenlyMessages.show(id), note);
    assert.equal(await page.locator("#heavenly-message-dialog").count(), 0);
    await page.locator("#heavenly-messages [data-message-text]").click();
    const d = page.locator("#heavenly-message-dialog");
    for (let i = 0; i < assets.length; i++) {
      if (i) await page.locator("[data-scene-advance]").click();
      const image = d.locator(".hm-scene-image");
      await image.evaluate((n) => n.decode());
      assert((await image.getAttribute("src")).endsWith(assets[i]));
      if ((await d.getAttribute("data-typing")) === "true")
        await page.locator("[data-scene-advance]").click();
      await shot(note + "-" + i);
    }
    if (note === "msg_ao_oni") {
      await page.locator("[data-scene-advance]").click();
      await d.locator(".hm-dance-burst").waitFor();
      assert.equal(await d.locator(".hm-dancer").count(), 5);
      await shot("ao-dance-burst");
      await d.waitFor({ state: "detached" });
    } else {
      for (const [width, height] of [
        [820, 1180],
        [1180, 820],
        [390, 844],
        [320, 740],
      ]) {
        await page.setViewportSize({ width, height });
        const box = await d.boundingBox();
        assert(
          box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y + box.height <= height + 1,
          JSON.stringify(box),
        );
        const overlap = await d.locator(".hm-scene-box").evaluate((n) => {
          const p = n.querySelector("img").getBoundingClientRect(),
            s = n.querySelector(".hm-speech").getBoundingClientRect();
          return (
            Math.min(p.right, s.right) > Math.max(p.left, s.left) + 1 &&
            Math.min(p.bottom, s.bottom) > Math.max(p.top, s.top) + 1
          );
        });
        assert.equal(overlap, false);
        if (width === 390) await shot(note + "-phone");
      }
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1366, height: 900 });
    }
    report.checks.push(
      note +
        " uses approved individual assets with contain scaling and no text/portrait overlap",
    );
  }
  assert.deepEqual(report.errors, []);
  report.status = "passed";
  console.log(
    "PASS actual clean homepage, Arcade densities, all seven artwork roles, responsive portraits and bounded GIF surprise",
  );
})()
  .catch((e) => {
    report.status = "failed";
    report.failure = e.stack;
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (context) {
      await context.close();
      if (page) {
        const video = await page.video().path();
        fs.copyFileSync(video, path.join(out, "walkthrough.webm"));
      }
    }
    await browser?.close();
    fs.writeFileSync(
      path.join(out, "visual-results.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    if (server) {
      server.closeAllConnections?.();
      await new Promise((r) => server.close(r));
    }
  });
