# Verification matrix

All reported browser runs use fresh synthetic data or explicit legacy fixtures. No real user browsing data was exported. The base is merged PR #207, `3ed9bc5`; its baseline had 571 passing tests. Final `npm test` has **602 passing tests**.

| Command / suite | Result | Coverage |
| --- | --- | --- |
| `npm test` | 602 passed | Existing Node/Mocha tests plus shared identity, legacy migration, malformed data, atomic save/Undo, nesting, merge, aliases, favorites, official updates/restores, reviewed Picks and artwork checksums |
| `node scripts/build-official-order.cjs --check` | Passed | Reviewed order source/bridge parity and real HQ export round-trip |
| `node scripts/build-messages.cjs` | Passed | Exact approved copy and safe generated browser data |
| Script parsing and `git diff --check` | Passed | New browser modules, proxy bundle, inline homepage/settings scripts and whitespace |
| `test/browser/final_arcade.cjs` | 15 groups per engine, 45 total | Games/categories, Picks empty state, distinct Play/Details/Favorite, real controlled Direct/Proxy tabs, per-item choices, personal games, shared Collections, Quick Save, reload, responsive layouts and actual proxy widget saving |
| `test/browser/final_curation.cjs` | 3 groups per engine, 9 total | Real published-source fixture becomes a canonical official game; All/Featured/details/favorite/mode share identity; existing visitors Apply or Skip through catalog review |
| `test/browser/final_quick_save.cjs` | 3 groups per engine, 9 total | Rename/icon editing of existing destination, atomic Cancel, keyboard containment and visible repairable unsupported-game fallback |
| `test/browser/final_collections_safety.cjs` | 9 Chromium groups | Native touch scroll vs hold/drop, pointer cancellation, second contact, real backup download/import, invalid nesting rollback, concurrent draft protection and actual Reset built-ins preservation |
| `test/browser/final_evidence.cjs` | Passed | Container density at unchanged viewport; all seven portrait roles decode; no portrait/text overlap at tested sizes; bounded GIF burst; real screenshots and WebM |
| `test/browser/phase8_messages.cjs` | 8 groups per engine, 24 total | Every ordinary note at six sizes, manual scenes, progressive reveal/advance, focus-aware keyboard, completion/replay, bounded five-dancer GIF and real fade, reduced motion, safe live preview and cleanup |
| `test/browser/phase8_hq_live.cjs` | 7 groups per engine, 21 total | Real-homepage Preview/Cancel/Restore/Save, safe literal authored HTML, no visitor completion/state writes from preview, layouts and refresh recovery |
| `test/browser/phase8_features.cjs` | 7 groups per engine, 21 total | Music shortcut and setting, Save Heavenly, real injected Panic fallback, editing/formatting/return, existing saved panic site, cloak preset keyboard navigation |
| `test/browser/phase8_layout.cjs` | 8 Chromium groups | Independent bottom widths, actual one/two-column container transitions, mouse/touch resize cancellation, horizontal reorder, refresh and rotation-like viewport changes |
| `test/browser/phase8_layout_backups.cjs` | 5 Chromium groups | Actual layout download/import, merge vs overwrite, older backups, unsupported schema refusal and storage-failure rollback |
| `test/browser/phase8_regressions.cjs` selected suites | 19 jobs, 261 groups passed | Navigation history, Quick Settings customization, cloaking, Viewer isolation/security, proxy platform behavior, catalog updates/motion, homepage search/limits |

The three engines are Linux **Chromium 154.0.8037.57**, **Firefox 153.0**, and **WebKit 26.5**, using Playwright 1.62.1 provided by the execution environment. Test scripts require Playwright and installed browser runtimes; no browser automation dependency was added to production. Chromium uses `/usr/bin/chromium`; new scripts accept `HEAVENLY_WEBKIT_EXECUTABLE` for WebKit. This environment lacked system WebKit libraries and root package-install access, so extracted Debian runtime libraries and a launcher under `work/` were used without modifying the application or disabling its security boundaries.

The existing regression runner was invoked with:

```sh
PHASE8_ENGINES=chromium,firefox,webkit \
PHASE8_SUITES=navigation_history,quick_settings_customization,cloaking_consolidation,viewer_independent_security,proxy_platform_regression,catalog_updates,homepage_search_limits \
node test/browser/phase8_regressions.cjs
```

Catalog and search suites were rerun after their relevant changes; [the consolidated matrix](evidence/regressions-results.json) records the final result for each job, with [logs](evidence/regressions/). The historical accordion check now uses Movies with an explicit one-card limit, because Games intentionally opens Arcade. The feature test waits for the deliberate share-code modal before dismissing it; checking its existence before the scheduled open was racy. A browser-discovered 50ms cloak-menu focus callback was removed so it cannot override subsequent keyboard navigation.

## Input, layout and accessibility

Tested widths include 1440, 1366, 1180, 820, 390 and 320 CSS pixels; tablet portrait/landscape and Chromebook-sized viewports are included. Native Chromium touch streams prove scrolling, deliberate pickup, dropping, second-contact cancellation and clean termination in the automated environment. Keyboard Move controls are available without dragging. The Arcade grid responds to its measured containing width; the test narrows its container without changing the browser viewport.

The modal controls have readable names and visible focus. Native dialog stacks have a scoped top-dialog Tab/Shift+Tab loop, Escape and focus restoration. Manual scenes always retain Escape even when their first-play Close button is visually hidden. Reduced motion, no autoplay, wrapping tabs, scrollable sheets, ordinary note bounds, all seven decoded portraits, and alpha/pixel/contain rendering are covered. Final browser matrices report no application page errors. The unchanged baseline's mocked DOM unit fixtures can emit expected console diagnostics; they do not represent a failing browser run.

## Performance and security

The production stack remains Express and vanilla JavaScript. Ordinary cards create no thumbnail requests, the existing catalog review engine is reused, search groups bookmarks in one pass, and mirror candidates reuse normalized keys. No framework, publishing service, polling loop or production dependency was added. Gesture listeners/timers/observers are scoped to active input and released on completion/cancellation; second contact cancels pickup.

New UI uses DOM text and validated HTTP(S) URLs. Imported HTML is not interpreted by Collections or Quick Save. HTML Viewer sandbox restrictions and proxy anti-framing headers remain intact. VUS still uses the existing isolated fallback launcher. Catalog, backup, private-note, mirror and Viewer regression suites remain passing. No unsupported external embed or network-health guarantee is inferred from the controlled launch fixtures. No hardware performance benchmark or battery/memory claim is made.

## Deployment and unverified cases

Vercel's Git integration produced READY previews for the feature branch. The normal protected URL and final commit are attached to the PR. No production promotion or merge occurred.

The Vercel connection successfully inspects deployment metadata but both its share-link and protected-fetch tools report that access to the deployment cannot be granted. No authenticated CLI credentials are configured. Thus protected live-preview interaction testing is **unverified**; Deployment Protection was left enabled. Local browser suites and Vercel build status are distinct evidence.

Also unverified: physical iPad Safari, school Chromebook hardware/policies, a real on-screen keyboard, actual desktop browser zoom, and every third-party game's live availability or framing behavior. No verified destinations for Surfd, BrainWorks PEAK or KRESKA.art were found in the available repository/history or handoff; no guessed entries were added. Published Picks intentionally remains empty in production until reviewed recommendations are supplied; curation behavior is tested using a controlled source fixture.
