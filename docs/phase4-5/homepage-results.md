# Homepage, compact rails and loading verification

Final integrated verification: 25 October 2026, on the shared `feat/celestial-settings-viewer-widgets` working tree. Baseline is latest-main `f870d509569f241a23090c52c7b4c0b5696fc69b`. This pass changed browser-test coverage only; no application code was changed by the final homepage QA pass.

## Executed regression suites

Every command in the table completed with exit status 0. Machine-readable job outcomes and bounded text logs are in [homepage-final-results.json](evidence/homepage-final-results.json). The matrix JSON files identify the browser versions and individual checks.

| Suite | Executed result | Evidence |
| --- | --- | --- |
| `node test/browser/refinement_cross_browser.cjs` | 5 interaction groups in each of Chromium, Firefox and Linux WebKit. Six responsive sizes per engine, with 60 actual resize paint samples per engine and no horizontal overflow. | [Matrix](evidence/final-refinement-matrix.json), [log](evidence/final-refinement-matrix.txt) |
| `node test/browser/homepage_cross_browser.cjs` | 5 groups in Chromium and Firefox, 6 in WebKit including its emulated iPad touch-tap profile. Seven representative viewport sizes per engine. | [Matrix](evidence/final-homepage-matrix.json), [log](evidence/final-homepage-matrix.txt) |
| `node test/browser/homepage_search_limits.cjs` | 8 groups passed separately in all three engines. | [Chromium](evidence/final-search-limits-chromium.txt), [Firefox](evidence/final-search-limits-firefox.txt), [WebKit](evidence/final-search-limits-webkit.txt) |
| `node test/browser/homepage_touch_drag.cjs` | 12 real-input gesture groups using continuous Chromium CDP touch streams plus hybrid mouse input. | [Log](evidence/final-touch-drag.txt) |
| `node test/browser/homepage_drag_interruption.cjs` | Removed-source and viewport-change cases both removed stale drag previews immediately. | [Log](evidence/final-drag-interruption.txt) |
| `node test/browser/homepage_layout_touch.cjs` | 4 continuous-touch sidebar integration groups. | [Log](evidence/final-layout-touch.txt) |
| `node test/browser/celestial_integration.cjs` | 6 cross-surface groups in each of Chromium, Firefox and Linux WebKit. Both intentional Go and Enter submissions open Codex HQ. | [Results](evidence/integration-results.json), [log](evidence/final-celestial-integration.txt) |

Engines: **Chromium 154.0.8037.57**, **Firefox 153.0**, **Linux WebKit 26.5**. Browser processes used the environment-provided Playwright package and temporary system runtime libraries; no application dependency was introduced. Historical reports and screenshots under `docs/homepage-overhaul`, `docs/homepage-refinement` and `docs/phase3` were not overwritten. The old matrix scripts' output paths were explicitly redirected into this phase's evidence folder.

## What the checks establish

- Independent sidebar collapse, automatic responsive collapse and saved width intent remain intact. Keyboard minimum/maximum resizing and actual mouse resizing persist after reload.
- Category identity and collapse state survive moving categories and reloads. The new content-sized rail keeps separate horizontal labels stacked vertically, with actual mouse category reordering still functional. The [compact-rail audit](layout-audit.md) records its dedicated nine-group three-engine suite and measured center-width gain; the final refinement matrix also exercises its rail and mixed states.
- Central search returns the same results for all four sidebar combinations, finds contents inside collapsed sections, respects hidden bookmarks, supports keyboard result navigation, and leaves source DOM/order and saved layout untouched on clearing.
- Existing fixed counts remain Custom. Auto bottom density follows an actual measured visual row; global, category and subsection limits retain precedence. Show More/Show Less survives reload and responsive changes. Rapid reversals preserve focus and end in the last requested state.
- Actual bookmark dragging, cross-column touch drops, category touch moves, and keyboard subsection ordering persist after reload. Canceled touches, extra contacts, blur, viewport changes, removed nodes, rerender and invalid drops clean up without saving. Ordinary bookmark-body touch scrolling remains native.
- Reset layout restores widths and panel/category collapse only, preserving bookmark placement, notes, Show More and unrelated Settings data.
- Homepage readiness dismisses the loader without an extra 300ms hold and while a deliberately delayed decorative logo is still pending. An interrupted dismiss/show sequence cannot let an old timeout hide a newly shown overlay. Reduced motion stops the shimmer and dismisses immediately. The bounded fallback removes pointer blocking even after a deliberately throwing initializer with normal `pageshow` recovery suppressed.
- Settings shares immediate loader readiness. There is no visible homepage/Settings HQ shortcut or ordinary Codex bookmark-search result. Typing alone does not open HQ; intentional main-navigation submission through both Go and Enter opens the local dialog and preserves bookmarks.

The search/count suite now waits for fonts and actual one-row density convergence rather than assuming a fixed 250ms delay. Earlier dismissal exposed that WebKit test timing assumption; the application density implementation was not changed to satisfy a timeout. The integration suite waits for its deliberately induced initialization error event, avoiding a Firefox event-delivery race.

## Rendered review

The implemented [phone homepage](evidence/after-home-phone.png), [all-collapsed rail](evidence/after-compact-rails.png), mixed-state and representative transition captures were inspected. The phone's layout controls fit in one row; the central task remains readable, the existing cloud/gradient branding retains Heavenly's identity, and the stacked rail leaves separately recognizable category controls while giving width to the center. No meaningful clipping or misalignment was found in these reviewed states. The automated matrices also inspect center/control bounds at narrow-phone, phone, tablet portrait/landscape, Chromebook-sized and wide desktop sizes.

## Reproduce

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
LD_LIBRARY_PATH=/workspace/shared/webkit-libs/root/usr/lib/x86_64-linux-gnu \
HEAVENLY_REFINEMENT_MATRIX=docs/phase4-5/evidence/final-refinement-matrix.json \
node test/browser/refinement_cross_browser.cjs
```

Use `HEAVENLY_BROWSER_MATRIX` to redirect the older homepage matrix, and `HEAVENLY_BROWSER=chromium`, `firefox` or `webkit` for the search/count suite. The shared integration uses all three engines by default. The CDP gesture suites use Chromium.

These are browser-driven mouse/keyboard and **emulated** viewport/touch checks. No physical iPad, Android phone, Chromebook, or Apple Safari test is claimed. Native on-screen keyboard/browser chrome, physical touch precision, operating-system clipboard/fullscreen prompts and lower-powered hardware responsiveness remain manual checks. The pinch-scale case is Chromium page/pinch scaling, not native browser UI zoom. Local fixtures do not establish external destination availability.
