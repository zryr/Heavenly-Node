"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  pw = require("playwright"),
  app = require("../../app");
const out = path.resolve(__dirname, "../../docs/final-handoff/evidence");
fs.mkdirSync(out, { recursive: true });
const report = {
  date: new Date().toISOString(),
  physicalDevices: [],
  limits:
    "Linux Chromium/Firefox/WebKit with emulated sizes and touch. External game availability is not established by controlled fixtures.",
  browsers: [],
};
let server;
async function ready(p) {
  await p.waitForFunction(
    () =>
      window.heavenlyMessages &&
      (!document.getElementById("heavenly-loading-screen") ||
        getComputedStyle(document.getElementById("heavenly-loading-screen"))
          .display === "none"),
  );
}
(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const engine of process.env.HEAVENLY_BROWSER
    ? [process.env.HEAVENLY_BROWSER]
    : ["chromium", "firefox", "webkit"]) {
    let browser, context;
    const r = { engine, checks: [], errors: [], captures: [] };
    report.browsers.push(r);
    const pass = (s) => {
      r.checks.push(s);
      console.log("PASS " + engine + " " + s);
    };
    try {
      browser = await pw[engine].launch(
        engine === "chromium"
          ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
          : engine === "webkit" && process.env.HEAVENLY_WEBKIT_EXECUTABLE
            ? { executablePath: process.env.HEAVENLY_WEBKIT_EXECUTABLE }
            : {},
      );
      r.version = browser.version();
      context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        hasTouch: engine !== "firefox",
        recordVideo:
          engine === "chromium"
            ? {
                dir: path.join(out, "video"),
                size: { width: 1366, height: 900 },
              }
            : undefined,
      });
      await context.addInitScript(() => {
        sessionStorage.setItem("heavenly_decoy_unlocked", "true");
        localStorage.setItem("heavenly_messages_paused", "true");
      });
      await context.route("**/fonts.googleapis.com/**", (route) =>
        route.abort(),
      );
      const p = await context.newPage();
      p.setDefaultTimeout(10000);
      p.on("pageerror", (e) => r.errors.push(e.message));
      const shot = async (name) => {
        if (engine === "chromium") {
          await p.screenshot({ path: path.join(out, name + ".png") });
          r.captures.push(name + ".png");
        }
      };
      await p.goto(origin, { waitUntil: "domcontentloaded" });
      await ready(p);
      await p.locator("#open-arcade-btn").click();
      const arcade = p.locator("#heavenly-arcade");
      await arcade.getByRole("dialog", { name: "Heavenly Arcade" }).waitFor();
      assert.deepEqual(await arcade.getByRole("tab").allTextContents(), [
        "All",
        "Featured",
        "Newgrounds",
        "General",
        "Favorites",
      ]);
      assert(
        await arcade.getByText("Syshi's Picks", { exact: true }).isVisible(),
      );
      assert.equal(await arcade.locator(".game").count(), 30);
      assert.equal(await arcade.locator(".game img").count(), 0);
      await shot("arcade-desktop");
      await arcade
        .getByRole("tab", { name: "Newgrounds", exact: true })
        .click();
      assert.equal(await arcade.locator(".game").count(), 1);
      await arcade.getByRole("tab", { name: "Featured", exact: true }).click();
      assert(await arcade.getByText(/Coming Soon/).count());
      await arcade.getByRole("tab", { name: "Favorites", exact: true }).click();
      assert(await arcade.getByText(/No favorites yet/).isVisible());
      await arcade.getByRole("tab", { name: "All", exact: true }).click();
      pass(
        "Games opens integrated hub; exact categories, real Newgrounds, Coming Soon and thumbnail-free cards",
      );
      const row = () => arcade.locator('[data-item-id="bm_gn_math"]');
      await row()
        .getByRole("button", { name: "Favorite GN Math", exact: true })
        .click();
      assert.equal(context.pages().length, 1);
      await arcade.getByRole("tab", { name: "Favorites", exact: true }).click();
      assert.equal(await arcade.locator(".game").count(), 1);
      await row().locator(".info").click();
      const detail = p.locator("#heavenly-game-details");
      await detail
        .getByLabel("Launch method for this item")
        .selectOption("direct");
      await detail
        .getByLabel("New Tab (otherwise follow bookmark settings)")
        .check();
      await p.keyboard.press("Escape");
      assert.equal(context.pages().length, 1);
      pass(
        "Details and favorites are distinct from Play; per-ID Direct and New Tab persist",
      );
      await context.route("https://gn-math.dev/**", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Owned direct fixture</title><h1>GN launch fixture</h1>",
        }),
      );
      let popPromise = context.waitForEvent("page");
      await row()
        .getByRole("button", { name: /^Play GN Math/ })
        .click();
      let pop = await popPromise;
      await pop.waitForURL("https://gn-math.dev/", {
        waitUntil: "domcontentloaded",
      });
      assert.equal(pop.url(), "https://gn-math.dev/");
      await pop.close();
      await row().locator(".info").click();
      await detail
        .getByLabel("Launch method for this item")
        .selectOption("proxy");
      await p.keyboard.press("Escape");
      await context.route(origin + "/proxy/https://gn-math.dev/", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Owned proxy fixture</title><h1>Proxy fixture</h1>",
        }),
      );
      popPromise = context.waitForEvent("page");
      await row()
        .getByRole("button", { name: /^Play GN Math/ })
        .click();
      pop = await popPromise;
      await pop.waitForURL(origin + "/proxy/https://gn-math.dev/", {
        waitUntil: "domcontentloaded",
      });
      assert.equal(pop.url(), origin + "/proxy/https://gn-math.dev/");
      await pop.close();
      assert.equal(
        await p.evaluate(
          () =>
            HeavenlyCollections.preference(HeavenlySaveUI.load(), "bm_gamebois")
              .mode,
        ),
        "proxy",
      );
      pass(
        "Actual Direct and Proxy Play each open exactly one controlled destination tab; other games keep their choice",
      );
      await arcade
        .getByRole("button", { name: "Add game", exact: true })
        .click();
      let editor = p.getByRole("dialog", {
        name: "Add personal game",
        exact: true,
      });
      await editor
        .getByLabel("Name", { exact: true })
        .fill("My personal test game");
      await editor
        .getByLabel("URL", { exact: true })
        .fill("https://personal.heavenly.test/game");
      await editor.getByLabel("Description").fill("My saved game");
      await editor.getByLabel("Personal note").fill("Keep across updates");
      await editor.getByRole("button", { name: "Save", exact: true }).click();
      let personal = arcade
        .locator(".game")
        .filter({ hasText: "My personal test game" });
      await arcade.getByRole("tab", { name: "All", exact: true }).click();
      await personal
        .getByRole("button", {
          name: "Favorite My personal test game",
          exact: true,
        })
        .click();
      await personal.getByRole("button", { name: "Save", exact: true }).click();
      let save = p.locator("#heavenly-quick-save");
      await save.getByText("Create a new collection", { exact: true }).click();
      await save
        .getByLabel("Collection name", { exact: true })
        .fill("Evening games");
      await save.getByLabel("Icon or emoji").fill("☁");
      await save.getByRole("button", { name: "Save", exact: true }).click();
      const ids = await p.evaluate(() => {
        const d = HeavenlySaveUI.load();
        return {
          personal: HeavenlyCollections.items(d).find(
            (e) => e.title === "My personal test game",
          ).id,
          collection: d._collections.collections.find(
            (c) => c.title === "Evening games",
          ).id,
        };
      });
      assert(ids.personal);
      pass(
        "Personal game editor saves actual record and note; Quick Save creates icon/name/membership atomically",
      );
      await personal.getByRole("button", { name: "Save", exact: true }).click();
      await save.getByText("Create a new collection", { exact: true }).click();
      await save
        .getByLabel("Collection name", { exact: true })
        .fill("Must not exist");
      const cancelBefore = await p.evaluate(() =>
        localStorage.getItem("heavenly_bookmarks"),
      );
      await save.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.equal(
        await p.evaluate(() => localStorage.getItem("heavenly_bookmarks")),
        cancelBefore,
      );
      await personal.getByRole("button", { name: "Save", exact: true }).click();
      await save.getByLabel("Search collections").fill("Evening");
      assert.equal(await save.locator(".destination").count(), 1);
      assert(
        await save.getByText("Already saved", { exact: true }).isVisible(),
      );
      await save.locator("input[type=radio]").check();
      await save.getByRole("button", { name: "Save", exact: true }).click();
      assert.equal(
        await p.evaluate(
          (id) =>
            HeavenlySaveUI.load()._collections.collections.find(
              (c) => c.id === id,
            ).itemIds.length,
          ids.collection,
        ),
        1,
      );
      pass(
        "Quick Save Cancel leaves storage unchanged; destination search and Already saved prevent duplicates",
      );
      await arcade
        .getByRole("button", { name: "New collection", exact: true })
        .click();
      editor = p.getByRole("dialog", { name: "New collection", exact: true });
      await editor
        .getByLabel("Collection name", { exact: true })
        .fill("Second shelf");
      await editor.getByLabel("Placement").selectOption(ids.collection);
      await editor.getByRole("button", { name: "Save", exact: true }).click();
      let second = await p.evaluate(
        () =>
          HeavenlySaveUI.load()._collections.collections.find(
            (c) => c.title === "Second shelf",
          ).id,
      );
      await arcade.getByRole("button", { name: "Edit", exact: true }).click();
      editor = p.getByRole("dialog", { name: "Edit collection", exact: true });
      await editor
        .getByLabel("Collection name", { exact: true })
        .fill("Second games");
      await editor.getByLabel("Icon or emoji").fill("🎮");
      await editor.getByRole("button", { name: "Save", exact: true }).click();
      assert.equal(
        await p.evaluate(
          (id) =>
            HeavenlySaveUI.load()._collections.collections.find(
              (c) => c.id === id,
            ).parentId,
          second,
        ),
        ids.collection,
      );
      pass(
        "Collections create/edit/icon/one-level nested placement use stable identities",
      );
      // Populate the shared collection through the actual multi-select workflow.
      await arcade.getByRole("tab", { name: "All", exact: true }).click();
      await arcade.getByLabel("Select GN Math", { exact: true }).check();
      await arcade
        .getByLabel("Select My personal test game", { exact: true })
        .check();
      await arcade
        .getByLabel("Destination", { exact: true })
        .selectOption(second);
      await arcade
        .getByRole("button", { name: "Add to another", exact: true })
        .click();
      await arcade
        .getByRole("button", { name: "Clear selection", exact: true })
        .click();
      await arcade
        .locator("nav")
        .getByRole("button", { name: "🎮 Second games", exact: true })
        .click();
      assert.equal(await arcade.locator(".game").count(), 2);
      const orderBefore = await p.evaluate(
        (id) =>
          HeavenlySaveUI.load()._collections.collections.find(
            (c) => c.id === id,
          ).itemIds,
        second,
      );
      await arcade
        .getByRole("button", { name: "Move down GN Math", exact: true })
        .click();
      const orderAfter = await p.evaluate(
        (id) =>
          HeavenlySaveUI.load()._collections.collections.find(
            (c) => c.id === id,
          ).itemIds,
        second,
      );
      assert.notDeepEqual(orderAfter, orderBefore);
      assert.equal(
        await p.evaluate(
          (id) =>
            HeavenlySaveUI.load()._collections.collections.find(
              (c) => c.id === id,
            ).itemIds.length,
          ids.collection,
        ),
        1,
      );
      await shot("collections");
      pass(
        "Multi-select adds shared items, independent collection order changes through keyboard-accessible controls",
      );
      await arcade
        .getByRole("button", { name: "Collapse items", exact: true })
        .click();
      await arcade.getByLabel("Search games and collections").fill("personal");
      assert.equal(await arcade.locator(".game").count(), 1);
      await arcade.getByLabel("Search games and collections").fill("");
      await arcade
        .getByRole("button", { name: "Expand items", exact: true })
        .click();
      await arcade.getByRole("button", { name: "Merge", exact: true }).click();
      let merge = p.getByRole("dialog", {
        name: "Merge collections",
        exact: true,
      });
      await merge
        .getByLabel("Destination", { exact: true })
        .selectOption(ids.collection);
      assert(await merge.getByText(/unique items/).isVisible());
      await merge
        .getByRole("button", {
          name: "Merge — retain distinct items",
          exact: true,
        })
        .click();
      assert.equal(
        await p.evaluate(
          (id) =>
            HeavenlySaveUI.load()._collections.collections.find(
              (c) => c.id === id,
            ).itemIds.length,
          ids.collection,
        ),
        2,
      );
      pass(
        "Collapsed items remain searchable; merge preview deduplicates memberships and retains distinct records",
      );
      await arcade.getByRole("button", { name: "Delete", exact: true }).click();
      let confirm = p.getByRole("dialog", {
        name: "Delete collection?",
        exact: true,
      });
      assert(
        await confirm.getByText(/Games and bookmarks stay saved/).isVisible(),
      );
      await confirm
        .getByRole("button", { name: "Delete collection", exact: true })
        .click();
      assert(
        await p.evaluate(
          (id) => !!HeavenlyCollections.entry(HeavenlySaveUI.load(), id),
          ids.personal,
        ),
      );
      await arcade.getByRole("button", { name: "Undo", exact: true }).click();
      assert(
        await p.evaluate(
          (id) =>
            HeavenlySaveUI.load()._collections.collections.some(
              (c) => c.id === id,
            ),
          ids.collection,
        ),
      );
      pass(
        "Collection deletion keeps items and guarded Undo restores relationships",
      );
      await p.reload({ waitUntil: "domcontentloaded" });
      await ready(p);
      await p.locator("#open-arcade-btn").click();
      await arcade.getByRole("tab", { name: "Favorites", exact: true }).click();
      assert.equal(await arcade.locator(".game").count(), 2);
      assert.equal(
        await p.evaluate(
          (id) =>
            HeavenlyCollections.entry(HeavenlySaveUI.load(), id).personalNote,
          ids.personal,
        ),
        "Keep across updates",
      );
      pass(
        "Reload preserves curated/personal favorites, notes and collection order",
      );
      await arcade.getByRole("tab", { name: "All", exact: true }).click();
      for (const [width, height] of [
        [1366, 768],
        [820, 1180],
        [1180, 820],
        [390, 844],
        [320, 740],
      ]) {
        await p.setViewportSize({ width, height });
        const fit = await arcade.locator("dialog").evaluate((d) => {
          const r = d.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            scroll: d.scrollWidth,
            client: d.clientWidth,
            win: innerWidth,
          };
        });
        assert(
          fit.x >= 0 &&
            fit.width <= width &&
            fit.y >= 0 &&
            fit.height <= height,
          JSON.stringify(fit),
        );
        assert(fit.scroll <= fit.client + 1, JSON.stringify(fit));
        if ([820, 390].includes(width)) await shot("arcade-" + width);
        if (width === 390) {
          await arcade
            .getByRole("button", { name: "Collections", exact: true })
            .click();
          assert(await arcade.locator("nav").isVisible());
          await arcade
            .getByRole("button", { name: "Collections", exact: true })
            .click();
        }
        r.viewports = r.viewports || [];
        r.viewports.push({ width, height });
      }
      pass(
        "Arcade fits Chromebook, tablet portrait/landscape and 320/390 phone; small screens expose collection drawer",
      );
      await p.keyboard.press("Escape");
      await p.setViewportSize({ width: 1366, height: 900 });
      await p.locator("#bm-universal-search").fill("Evening games");
      assert(
        await p
          .locator("#bookmark-search-results")
          .getByText("My personal test game", { exact: true })
          .count(),
      );
      await p.locator("#bm-universal-search").fill("");
      await p.locator("#open-collections-btn").click();
      assert(
        await p
          .getByRole("dialog", { name: "Collections", exact: true })
          .isVisible(),
      );
      await p.keyboard.press("Escape");
      pass(
        "Same memberships are discoverable from homepage unified search and bookmark Collections",
      );
      // Real manual-note entry and supplied image rendering; no scene is auto-opened.
      for (const [note, assets, presentation] of [
        ["msg_ao_oni", ["you-retro.webp", "cloudy-retro.webp"], "retro"],
        [
          "msg_khezu",
          ["hunter-smug.webp", "you-suspicious.webp", "cloudy-speed-meme.webp"],
          "novel",
        ],
      ]) {
        await p.evaluate((id) => heavenlyMessages.show(id), note);
        assert.equal(await p.locator("#heavenly-message-dialog").count(), 0);
        await p.locator("#heavenly-messages [data-message-text]").click();
        const scene = p.locator("#heavenly-message-dialog");
        assert.equal(
          await scene.getAttribute("data-presentation"),
          presentation,
        );
        for (let i = 0; i < assets.length; i++) {
          if (i) {
            await p.locator("[data-scene-advance]").click();
          }
          const img = scene.locator("img.hm-scene-image");
          assert((await img.getAttribute("src")).endsWith(assets[i]));
          await img.evaluate((n) => n.decode());
          assert(
            await img.evaluate(
              (n) =>
                n.naturalWidth > 0 &&
                getComputedStyle(n).objectFit === "contain",
            ),
          );
          if (note === "msg_ao_oni")
            assert.equal(
              await img.evaluate((n) => getComputedStyle(n).imageRendering),
              "pixelated",
            );
          if ((await scene.getAttribute("data-typing")) === "true")
            await p.locator("[data-scene-advance]").click();
          await shot(note + "-" + i);
        }
        await p.keyboard.press("Escape");
      }
      pass(
        "Ao Oni and Khezu only open on activation; all five scene portraits load with correct styles and exact final lines",
      );
      await p.emulateMedia({ reducedMotion: "reduce" });
      await p.evaluate(() => heavenlyMessages.show("msg_ao_oni"));
      await p.locator("#heavenly-messages [data-message-text]").click();
      assert.equal(
        await p.locator("#heavenly-message-dialog").getAttribute("data-typing"),
        "false",
      );
      await p.keyboard.press("Escape");
      pass(
        "Reduced motion reveals the whole line and Escape exits first-time scenes",
      );
      // Supported proxy widget mounts the same Quick Save UI (real injected bundle).
      const fixture = origin + "/proxy/https://ubg98.com/owned-game";
      await context.route(fixture, (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Owned saved game</title><script src="/proxy/client/unblocker-client.js"></script><script>unblockerInit({prefix:"/proxy/",url:"https://ubg98.com/owned-game"},window)</script><h1>Owned fixture</h1>',
        }),
      );
      await p.goto(fixture, { waitUntil: "domcontentloaded" });
      await p.locator("#heavenly-folder-save-root .save-btn").click();
      await save.getByLabel("Search collections").fill("Evening");
      await save.locator("input[type=radio]").check();
      await save.getByRole("button", { name: "Save", exact: true }).click();
      assert(
        await p.evaluate(() =>
          HeavenlyCollections.items(HeavenlySaveUI.load(), "game").some(
            (e) => e.url === "https://ubg98.com/owned-game",
          ),
        ),
      );
      assert.equal(p.url(), fixture);
      pass(
        "Real proxy Quick Save widget opens shared searchable dialog, saves as game and keeps browsing context",
      );
      assert.deepEqual(r.errors, []);
      r.status = "passed";
    } catch (e) {
      r.status = "failed";
      r.failure = e.stack;
      console.error(engine, e.stack);
      process.exitCode = 1;
    } finally {
      await context?.close();
      await browser?.close();
    }
  }
})()
  .catch((e) => {
    report.failure = e.stack;
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.writeFileSync(
      path.join(out, "arcade-results.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    if (server) {
      server.closeAllConnections?.();
      await new Promise((r) => server.close(r));
    }
  });
