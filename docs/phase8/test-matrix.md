# Phase 8 verification matrix

Final application source: `9a4101e81842072af13f0ed73cab2200beed8f3a`. Browser versions: Chromium **154.0.8037.57**, Firefox **153.0**, Linux WebKit **26.5**. All inputs and device sizes below are automated/emulated; **no physical hardware or Apple Safari testing is claimed**.

## Commands and actual outcomes

Commands run from the repository root. Browser tests use the environment's Playwright installation and `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` after required browser libraries were supplied locally. No browser package was added to production dependencies.

| Command / suite | Chromium | Firefox | Linux WebKit | Evidence |
| --- | --- | --- | --- | --- |
| `npm test` | 571 passing, 0 failing | — | — | [Final unit output](evidence/unit-final.txt) |
| `node scripts/build-academy.cjs --check` | Pass | — | — | Generated documents agree with source |
| `node scripts/build-messages.cjs --check` | Pass | — | — | Validated JSON agrees with browser bundle |
| `node scripts/build-official-order.cjs --check` | Pass | — | — | Catalog/order source and bridge agree |
| `node test/browser/phase8_messages.cjs` with `HEAVENLY_BROWSER` | 8 groups | 8 groups | 8 groups | [Message results](evidence/messages/) |
| `node test/browser/phase8_hq_live.cjs` | 7 groups | 7 groups | 7 groups | [HQ results](evidence/hq-live-results.json) |
| `node test/browser/developer_messages.cjs` | 14 groups | Not rerun | Not rerun | [Existing HQ regression](evidence/hq-regression/) |
| `node test/browser/phase8_features.cjs` | 7 groups | 7 groups | 7 groups | [Features](evidence/features-results.json) |
| `node test/browser/phase8_panic_security.cjs` | 4 groups | 4 groups | 4 groups | [Panic security](evidence/panic-security.json) |
| `node test/browser/phase8_surfaces.cjs` | 3 groups / 96 Academy observations | Same | Same | [Surfaces](evidence/surface-results.json) |
| `node test/browser/phase8_layout.cjs` with `HEAVENLY_BROWSER` | 8 groups | 7 groups | 7 groups | [Chromium](evidence/layout-chromium.json), [Firefox](evidence/layout-firefox.json), [WebKit](evidence/layout-webkit.json) |
| `node test/browser/phase8_layout_backups.cjs` with `HEAVENLY_BROWSER` | 5 groups | 5 groups | 5 groups | [Layout backup results](evidence/layout-backups-chromium.json) and engine siblings |
| `node test/browser/phase8_dialogue_backups.cjs` | 5 groups | 5 groups | 5 groups | [Actual download/import/rollback](evidence/dialogue-backups.json) |
| `node test/browser/phase8_touch_drag.cjs` | 5 groups in each tablet orientation | CDP native touch unavailable | CDP native touch unavailable | [Native touch](evidence/touch/results.json), [baseline reproduction](evidence/touch/baseline-results.json) |
| `node test/browser/homepage_touch_drag.cjs` | 12 groups, pass | Not applicable to CDP harness | Not applicable to CDP harness | [Touch audit](touch-audit.md) |
| `node test/browser/homepage_drag_interruption.cjs` | Pass | Not rerun | Not rerun | [Touch audit](touch-audit.md) |
| `node test/browser/navigation_history.cjs` with `HEAVENLY_BROWSER` | 15 groups | 15 groups | 15 groups | [Final navigation logs](evidence/navigation-history/) |
| `node test/browser/homepage_cross_browser.cjs` with `HEAVENLY_BROWSER` | 5 groups | 5 groups | 6 groups | [Chromium run](evidence/regressions/homepage_cross_browser-chromium/run.txt), [Firefox final](evidence/touch/firefox-homepage-regression.json), [WebKit final](evidence/touch/webkit-homepage-regression.json) |
| `node test/browser/compact_rails.cjs` with `HEAVENLY_BROWSER` | 9 groups | 9 groups | 9 groups | [Existing rail regression](evidence/compact-rails-regression/) |
| `node test/browser/quick_settings_customization.cjs` | 23 groups | 20 groups | 20 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/cloaking_consolidation.cjs` | 13 groups | 13 groups | 13 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/viewer_independent_security.cjs` | 5 groups | 5 groups | 5 groups | [Executed isolation evidence](evidence/regressions/viewer_independent_security-all/security.json) |
| `node test/browser/proxy_platform_regression.cjs` | 4 groups | 4 groups | 4 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/catalog_updates.cjs` | 21 groups | 21 groups | 21 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/homepage_search_limits.cjs` | 8 groups | 8 groups | 8 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/settings_celestial.cjs` | 16 groups | 16 groups | 16 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/viewer_celestial.cjs` | 17 groups | 17 groups | 17 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/widgets_celestial.cjs` | 7 groups | 5 groups | 5 groups | [Existing regression logs](evidence/regressions/) |
| `node test/browser/phase8_visuals.cjs` | 13 captures + 8.16s actual scene recording | — | — | [Capture manifest](evidence/after/manifest.json) |
| `node docs/phase8/build-report.cjs` / `node test/browser/phase8_report.cjs` | 34 decoded/opened images, 3 playable recordings, 320px fit, Escape dismissal; pass | Not rerun | Not rerun | [Portable report validation](evidence/report-validation.json) |
| `HEAVENLY_PREVIEW_ACCESS_FILE=… node test/browser/phase8_preview.cjs` | 6 deployed smoke groups, 0 page errors | Not rerun on deployment | Not rerun on deployment | [Real READY Vercel preview](evidence/preview-results.json) |

`phase8_regressions.cjs` orchestrates the existing suites with isolated evidence paths. [Final regression index](evidence/final-regression-summary.json) records 31 existing browser jobs and points to corrected final logs. Early summary files deliberately retain initial failures: missing browser installations were remedied, hidden Settings/sidebar harness assumptions were fixed using visible controls, and the real narrow-phone/denied-storage issues were repaired. **The corrected final navigation and homepage runs linked above supersede those failures.** No failed initial run is counted as a pass.

## Coverage and limits

| Scenario | Result / boundary |
| --- | --- |
| Desktop 1440×1000; Chromebook 1366×768 | Mouse, keyboard, ordering, Settings and launch flows automated |
| Tablet 820×1180 and 1180×820 | Emulated touch, native Chromium TouchEvent scrolling/pickup/drop, interruption/cleanup, persisted order and widths |
| Phone 390×844 and narrow 320×740 | Notes, dialogue portraits/text/arrow, controls, editor preview, workspace and horizontal fit |
| Academy CSS zoom 200% and 67% | 288 layout/zoom observations across engines; CSS zoom is not native browser/OS zoom |
| Keyboard and reduced motion | Focus-sensitive scene advancement, Escape, no input theft, still/bounded dance alternative, keyboard resizing/reorder and menu navigation |
| Data integrity | Personal content and catalog choices, preferred mirrors, widths/order, private note backups, old backup omission, rollback, cross-tab scene writes and corrupt-state raw retention |
| Security | Real authored Viewer DOM/storage escape attempts blocked; HQ authored text and links validated; Panic nonweb schemes refused without executing their script sentinel; document paste plain text and drop HTML refused |
| Genuine automatic character events | None exist in the baseline; repeat opt-out trigger tests are not applicable. Manual notes never become automatic events |
| Physical iPad Safari / Chromebook hardware | **Unverified** |
| Native desktop bookmark-bar drop | Affordance and data transfer tested; browser-chrome acceptance **unverified** |
| Monochrome playback | **Unverified**; bounded HEAD returned HTTP 503. No autoplay |
| Budsin / Arctic mirrors | HTTPS syntax and bounded HEAD returned HTTP 200; external gameplay/session behavior **unverified** |
| Performance | No unbounded dance nodes; five local GIF instances with timed removal; visible-time rotation protections and reduced motion retained. No low-powered hardware benchmark is claimed |

There is no repository lint/build script beyond the listed generators. `git diff --check` passes. This matrix reports implemented browser behavior, not third-party availability, physical Safari behavior or a student usability study.
