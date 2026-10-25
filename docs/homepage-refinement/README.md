# Homepage refinement evidence

[Open the portable three-way comparison](comparison.html). All 40 screenshots and the motion recording are embedded; the full-resolution viewer and downloads work without network access.

This is the focused follow-up to [the original overhaul report](../homepage-overhaul/README.md). The original `before-*` files and report remain intact. The comparison serves genuine application pages from these sources:

- Original: immutable archive of `013cd07a36854c74b8feb8f29a8437f2c4daa72b`.
- First overhaul: immutable archive of `9d7d3295f43b05ee594f131938d4e1363d484c31`.
- Refinement: the current PR #193 working tree, after expressive styling and adaptive category/count changes.

The archives live outside the repository. No extra comparison branches were created. Baseline captures use the same browser asset policy as the refinement: external fonts, images and stylesheets are allowed; proxy destination navigation is blocked.

## What was checked

The actual Chromium, Firefox and Linux WebKit matrix covers 1440 × 1000, 1920 × 1080, 820 × 1180, 1180 × 820, 320 × 740 and 390 × 844. It verifies all four panel states, keyboard resize, the same category DOM across viewport changes, usable central controls, search without changing the layout, independent category collapse, real horizontal mouse reordering of compact category headers, stable collapse IDs through moves/reloads, and a genuinely empty sidebar with no reserved track or expansion control. Each changed-size transition also samples 12 actual paint frames: all 180 samples across the three engines stayed within the viewport.

The matrix waits for render frames and owned animation completion before inspecting final states. This replaces a fixed 280ms delay that could read Linux WebKit before its resize or animation callbacks ran on a busy machine. The separate paint-frame assertions still check for overflow during the transition itself.

Reset is inside Layout options and disabled at defaults. The browser test confirms that it restores panel widths and panel/category collapse while preserving bookmark placement, notes, subsection state and Settings data. Existing numeric counts remain Custom. The Settings controls switch between Auto, Custom and section overrides; bottom Auto counts match the actual measured row width across five sizes. Show More remains expanded across a resize, and rapid keyboard reversals retain focus and the final requested state.

The motion recording contains actual mouse resizing, category collapse/reversal, and a continuous Chromium CDP touch stroke: a 520ms hold, fourteen incremental moves 45ms apart, release and reload. The test asserts a changed saved order and identical order after reload. Loader captures pause the real shared CSS animations at 0, 900 and 2200ms on both routes; the recording also shows normal-clock settling. The right-wing transform remains mirrored at every sampled time.

These are emulated viewports and touch input. No physical iPad, phone, Chromebook or Safari on Apple hardware was tested. The tests do not establish remote destination availability or native operating-system browser zoom behavior.

The protected Vercel preview at `heavenly-node-23p4606hv-syshi.vercel.app` was inspected with authorized temporary access. It returned HTTP 200 and passed collapse, central search/clear, keyboard resize, reload persistence and 390px touch-tap expansion checks, with no page errors. Its metadata still pointed to first-overhaul commit `9d7d329`; it did not yet contain the refinement at inspection time. No access parameters are stored in this report.

## Final validation — 2026-10-25

All commands below completed with exit status 0 against the refinement working tree:

| Command | Result |
| --- | --- |
| `npm test` | 473 passing (6s). |
| `node test/browser/refinement_cross_browser.cjs` | Chromium 154.0.8037.57, Firefox 153.0 and Linux WebKit 26.5: 5 interaction groups, 6 viewports and 60 resize paint samples each; no page errors. |
| `node test/browser/homepage_cross_browser.cjs` | All three engines passed; includes real mouse drag, keyboard ordering, reduced motion and the WebKit iPad touch-tap profile. |
| `node test/browser/homepage_search_limits.cjs` | 8 groups passed separately in each of Chromium, Firefox and WebKit. |
| `node test/browser/homepage_touch_drag.cjs` | 12 real-input gesture groups passed in Chromium CDP emulation. |
| `node test/browser/homepage_drag_interruption.cjs` | Removed source and viewport change both cleaned the active preview immediately. |
| `node test/browser/homepage_layout_touch.cjs` | 4 sidebar touch integration groups passed. |
| `node test/browser/refinement_evidence.cjs --phase refinement` | 16 current application screenshots captured without horizontal overflow or page errors. |
| `node test/browser/refinement_motion.cjs` | Continuous touch changed saved order and survived reload; category reversal and both loaders at 0/900/2200ms passed; recording refreshed. |
| `node test/browser/ui_comparison_report.cjs docs/homepage-refinement/comparison.html` | All 40 embedded images decoded and opened at original width; the recording played; narrow-layout viewing and dismissal passed. |

The three-engine commands used the WebKit library environment below; search/count coverage additionally set `HEAVENLY_BROWSER` to each engine. The original-overhaul matrix used `HEAVENLY_BROWSER_MATRIX` to write its new results outside the original evidence directory. Preservation checks confirmed that all 68 original/baseline evidence files remained byte-for-byte unchanged. An initial motion capture under concurrent browser load failed its active-preview assertion; the isolated final run passed and supplies the published recording.

## Reproduce

```sh
node test/browser/refinement_cross_browser.cjs
node test/browser/refinement_evidence.cjs --phase refinement
node test/browser/refinement_motion.cjs
node docs/homepage-refinement/build-report.cjs
node test/browser/ui_comparison_report.cjs docs/homepage-refinement/comparison.html
```

This cloud environment supplies WebKit runtime libraries outside the application. Its matrix invocation is:

```sh
LD_LIBRARY_PATH=/workspace/shared/webkit-libs/root/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
node test/browser/refinement_cross_browser.cjs
```

The independent continuous-touch and gesture-cancellation regression suites remain in `test/browser/homepage_touch_drag.cjs`, `homepage_drag_interruption.cjs` and `homepage_layout_touch.cjs`. Their broader results belong to the main PR validation report.

Machine-readable capture provenance, viewport metrics, saved touch ordering and browser outcomes are in [evidence/](evidence/). The report verification decodes every embedded image, opens each at its original pixel width, plays the recording, and checks the viewer at phone width.
