"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  pw = require("playwright"),
  app = require("../../app"),
  C = require("../../public/assets/heavenly-catalog");
const result = { engines: [], physicalDevices: [] };
let server;
const picks = {
  schema: 1,
  version: "2026.10.31.2",
  items: [
    {
      id: "pick_reviewed_fixture",
      title: "Reviewed curation fixture",
      url: "https://www.newgrounds.com/portal/view/1",
      description:
        "Controlled catalog fixture; no gameplay or availability claim.",
      icon: "",
      thumbnail: "",
      tags: [],
      enabled: true,
      order: 0,
    },
  ],
};
(async () => {
  server = app.listen(0);
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const engine of ["chromium", "firefox", "webkit"]) {
    let browser;
    const r = { engine, checks: [], errors: [] };
    result.engines.push(r);
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
      async function page(old) {
        const context = await browser.newContext();
        await context.route("**/assets/heavenly-picks.js", (route) =>
          route.fulfill({
            contentType: "application/javascript",
            body: "window.HeavenlyPicks=" + JSON.stringify(picks) + ";",
          }),
        );
        await context.addInitScript((data) => {
          sessionStorage.setItem("heavenly_decoy_unlocked", "true");
          if (data)
            localStorage.setItem("heavenly_bookmarks", JSON.stringify(data));
        }, old || null);
        const p = await context.newPage();
        p.on("pageerror", (e) => r.errors.push(e.message));
        p.setDefaultTimeout(10000);
        await p.goto(origin);
        await p
          .locator("#heavenly-loading-screen")
          .waitFor({ state: "hidden" });
        return { context, p };
      }
      let { context, p } = await page();
      await p.locator("#open-arcade-btn").click();
      let a = p.locator("#heavenly-arcade");
      await a.getByRole("tab", { name: "Featured", exact: true }).click();
      assert.equal(await a.locator(".game").count(), 1);
      await a
        .locator(".spotlight")
        .getByRole("button", { name: "Reviewed curation fixture", exact: true })
        .click();
      await p
        .locator("#heavenly-game-details")
        .getByLabel("Launch method for this item")
        .selectOption("direct");
      await p.keyboard.press("Escape");
      await a
        .getByRole("button", {
          name: "Favorite Reviewed curation fixture",
          exact: true,
        })
        .click();
      assert.equal(
        await p.evaluate(
          () =>
            HeavenlyCollections.preference(
              HeavenlySaveUI.load(),
              "pick_reviewed_fixture",
            ).mode,
        ),
        "direct",
      );
      await a.getByRole("tab", { name: "All", exact: true }).click();
      assert.equal(
        await a.locator('[data-item-id="pick_reviewed_fixture"]').count(),
        1,
      );
      await context.close();
      pass(
        "Published recommendation appears in canonical All/Featured/details with one identity, favorite and per-game launch mode",
      );
      ({ context, p } = await page(C.fresh()));
      const updates = p.locator("#catalog-update-modal");
      await updates.waitFor({ state: "visible" });
      await updates
        .getByRole("button", { name: "Skip This Version", exact: true })
        .click();
      await updates.waitFor({ state: "hidden" });
      await p.locator("#open-arcade-btn").click();
      a = p.locator("#heavenly-arcade");
      assert.equal(
        await a.locator('[data-item-id="pick_reviewed_fixture"]').count(),
        0,
      );
      assert(await a.getByText(/New recommendations are ready/).isVisible());
      assert(
        await a
          .getByRole("link", { name: "Review Bookmark Updates", exact: true })
          .isVisible(),
      );
      await context.close();
      pass(
        "Existing visitor can Skip a new Pick; Arcade explains pending curation without silently installing it",
      );
      ({ context, p } = await page(C.fresh()));
      await p
        .locator("#catalog-update-modal")
        .getByRole("button", { name: "Apply Update", exact: true })
        .click();
      await p.locator("#catalog-update-modal").waitFor({ state: "hidden" });
      await p.locator("#open-arcade-btn").click();
      assert.equal(
        await p
          .locator('#heavenly-arcade [data-item-id="pick_reviewed_fixture"]')
          .count(),
        1,
      );
      await context.close();
      pass(
        "Real catalog Apply installs a reviewed recommendation into the shared Arcade records",
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
    path.resolve("docs/final-handoff/evidence/curation-results.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  server?.closeAllConnections();
  server?.close();
});
