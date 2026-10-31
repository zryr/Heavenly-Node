"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  pw = require("playwright"),
  app = require("../../app");
const report = { engines: [], physicalDevices: [] };
let server;
(async () => {
  server = app.listen(0);
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const engine of ["chromium", "firefox", "webkit"]) {
    let browser;
    const r = { engine, checks: [], errors: [] };
    report.engines.push(r);
    const pass = (s) => {
      r.checks.push(s);
      console.log("PASS " + engine + " " + s);
    };
    try {
      browser = await pw[engine].launch(
        engine === "chromium"
          ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
          : engine === "webkit"
            ? { executablePath: process.env.HEAVENLY_WEBKIT_EXECUTABLE }
            : {},
      );
      const context = await browser.newContext();
      await context.addInitScript(() =>
        sessionStorage.setItem("heavenly_decoy_unlocked", "true"),
      );
      const p = await context.newPage();
      p.setDefaultTimeout(9000);
      p.on("pageerror", (e) => r.errors.push(e.message));
      await p.goto(origin);
      await p.locator("#heavenly-loading-screen").waitFor({ state: "hidden" });
      const id = await p.evaluate(() => {
        return HeavenlyCollections.transact(
          localStorage,
          (d) =>
            HeavenlyCollections.create(d, { title: "Quick destination" }).id,
        ).result;
      });
      await p.locator("#open-arcade-btn").click();
      await p
        .locator('#heavenly-arcade [data-item-id="bm_gn_math"]')
        .getByRole("button", { name: "Save", exact: true })
        .click();
      const save = p.locator("#heavenly-quick-save");
      await save.getByLabel("Search collections").fill("Quick destination");
      await save.locator("input[type=radio]").check();
      await save.getByText("Edit selected collection", { exact: true }).click();
      await save
        .getByLabel("Destination name", { exact: true })
        .fill("Quick renamed");
      await save.getByLabel("Destination icon", { exact: true }).fill("☁");
      await save.getByRole("button", { name: "Save", exact: true }).click();
      assert.deepEqual(
        await p.evaluate((id) => {
          const c = HeavenlySaveUI.load()._collections.collections.find(
            (c) => c.id === id,
          );
          return { title: c.title, icon: c.icon, items: c.itemIds };
        }, id),
        { title: "Quick renamed", icon: "☁", items: ["bm_gn_math"] },
      );
      pass(
        "Quick Save edits existing destination name and icon while adding membership in one save",
      );
      await p
        .locator('#heavenly-arcade [data-item-id="bm_gn_math"]')
        .getByRole("button", { name: "Save", exact: true })
        .click();
      await save.getByLabel("Search collections").fill("Quick renamed");
      await save.locator("input[type=radio]").check();
      await save.getByText("Edit selected collection", { exact: true }).click();
      await save
        .getByLabel("Destination name", { exact: true })
        .fill("Never save this");
      const original = await p.evaluate(() =>
        localStorage.getItem("heavenly_bookmarks"),
      );
      for (let i = 0; i < 12; i++) {
        await p.keyboard.press("Tab");
        assert(await save.evaluate((n) => document.activeElement === n));
      }
      await save.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.equal(
        await p.evaluate(() => localStorage.getItem("heavenly_bookmarks")),
        original,
      );
      pass(
        "Cancel discards destination edits; native dialog keeps keyboard focus within the save flow",
      );
      await p.keyboard.press("Escape");
      await p.evaluate(() => {
        HeavenlyCollections.transact(localStorage, (d) => {
          d.bookmarks.push({
            id: "invalid_game",
            title: "Repairable game",
            kind: "game",
            categoryId: "cat_games",
            url: "javascript:alert(1)",
            builtIn: false,
          });
        });
      });
      await p.locator("#open-arcade-btn").click();
      const card = p.locator('#heavenly-arcade [data-item-id="invalid_game"]');
      assert(
        await card
          .getByRole("button", { name: /Play Repairable/ })
          .isDisabled(),
      );
      await card.locator(".info").click();
      assert(
        await p
          .locator("#heavenly-game-details")
          .getByText("javascript:alert(1)", { exact: true })
          .isVisible(),
      );
      assert.equal(
        await p
          .locator('#heavenly-game-details a[href^="javascript:"]')
          .count(),
        0,
      );
      pass(
        "Unsupported legacy game stays visible and repairable with disabled Play and no unsafe link",
      );
      assert.deepEqual(r.errors, []);
      r.status = "passed";
    } catch (e) {
      r.status = "failed";
      r.failure = e.stack;
      console.error(engine, e.stack);
      process.exitCode = 1;
    } finally {
      await browser?.close();
    }
  }
})().finally(() => {
  fs.writeFileSync(
    path.resolve("docs/final-handoff/evidence/quick-save-results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  server?.closeAllConnections();
  server?.close();
});
