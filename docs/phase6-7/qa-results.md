# Phase 6–7 verification

The final combined acceptance run passed in Chromium 154.0.8037.57, Firefox 153.0, and Linux WebKit 26.5 on 26 October 2026. Each engine passed all six groups with zero page errors. [Machine-readable results](evidence/acceptance.json) and the [complete execution log](evidence/acceptance-final.txt) retain the actual checks, versions, viewport measurements and control bounds.

| Verification | Result | Evidence |
| --- | --- | --- |
| Combined Academy, messages, Settings, HTML Viewer and injected tools | 6 groups per engine; 18 total | [Acceptance](evidence/acceptance.json) |
| Focused message lifecycle and layout | 9 groups per engine; 27 total, zero page errors | [Results](evidence/messages-browser-results.json), [execution log](evidence/messages-browser.txt) |
| Existing browser regressions | 24 jobs passed | [Regression summary](evidence/regressions/summary.json) |
| Post-contribution lookup checks | Search: 8 groups per engine; catalog/motion: 21 groups in Chromium | [Separate follow-up summary](evidence/regressions/post-jules-summary.json) |
| Catalog and motion regression rerun | 21 groups passed in Chromium | [Actual rerun log](evidence/regressions/catalog_updates-chromium/run.txt) |
| Final home, music, playlist and Viewer captures | Passed | [Capture manifest](evidence/final-captures.json) |
| Phone interaction recordings | Three actual Chromium recordings | [Recording manifest](evidence/recordings.json) |

The acceptance run checks Academy, home, Settings and HTML Viewer at 1440 × 1000, 1366 × 768, 820 × 1180, 1180 × 820, 390 × 844, and 320 × 740. Every narrow-phone page recorded an outer scroll width of exactly 320 pixels in all three engines. It also covers keyboard navigation and focus restoration, message Next/Pause controls, deliberate playlist and character actions, reduced-motion alternatives, nonmodal dance dismissal, actual HTML execution, and actual injected tool controls on a local host fixture. The unavailable Academy route uses the production handler with a genuinely missing document and checks its 503 recovery actions; unknown routes return the branded 404 page.

The earlier WebKit narrow Settings overflow did not recur in a fresh six-size sequence, two instrumented full WebKit reproductions, or the final three-engine acceptance. No CSS was changed for that observation and the strict outer-width assertion was retained. The final result establishes the measured layouts in these runs; it does not identify a cause for the earlier observation.

The focused message suite also passed all nine groups in each engine after the final focus corrections. Its layout loop now waits for two animation frames after changing the viewport before measuring bounds. The bounds themselves are unchanged. The [resize diagnostic](evidence/messages-resize-diagnostic.json) captured interim geometry in WebKit across 144 immediate/settled measurement pairs; it did not reproduce the earlier 390-pixel overlap. This supports measuring painted layout without identifying that earlier failure conclusively.

The initial catalog run inspected a finite 240 ms restoration animation after two independent storage reads. Its assertion missed the animation window. The test now inspects the same animation and captures its working frame immediately after the real **Mark Working** click, before those storage reads. All preference and logical-state assertions remain. The actual rerun passed all 21 groups. The [original failed log](evidence/regressions/catalog_updates-chromium/prior-failure.txt) remains available, and its successful rerun is identified separately in the regression summary. The later lookup-adaptation browser check also missed a finite **Set as Preferred** animation after storage and badge queries. The same assertion and preferred-frame capture now run immediately after the click, with every final-state check retained. Its [final follow-up run](evidence/regressions/post-jules-catalog_updates-chromium/run.txt) passed 21 groups, and the [earlier failure](evidence/regressions/post-jules-catalog_updates-chromium/prior-failure.txt) remains available. No application animation duration was changed.

The refreshed captures include `after/message-music-desktop.png` and `after/message-playlist-progression-phone.png`. The recordings are `academy-to-home-phone.webm`, `character-scenes-phone.webm`, and `plain-language-tools-phone.webm`. They use real rendered controls; direct message selection only makes the chosen examples reproducible. [File metadata](evidence/recordings-metadata.json) confirms VP8 video at 390 × 844 pixels, with durations of 6.16, 8.64 and 6.84 seconds respectively.

These runs use Playwright on Linux with emulated viewports, mouse/keyboard input, and Chromium/WebKit touch emulation. Firefox uses desktop input. Linux WebKit is not Apple Safari. No physical Chromebook, tablet or phone, native operating-system/browser zoom session, or actual student usability study was performed. The Academy zoom probe is explicitly CSS zoom. Local destination fixtures do not establish third-party availability.

Reproduce the final combined run from the repository root:

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
node test/browser/phase6_7_acceptance.cjs
```

The checked-in evidence belongs to `docs/phase6-7`; previous Phase 4–5 evidence was not overwritten.
