# Combined Phases 4 + 5 verification plan

Baseline: `f870d509569f241a23090c52c7b4c0b5696fc69b` (latest `main`, PR #196 merged). The initial full Mocha run completed with **519 passing** before implementation. This document records verification boundaries; results are added only after execution.

The user story is: open Heavenly → navigate, search, and customize saved collections → find and change a setting → use the same saved preferences in Quick Settings and injected widgets → edit and run a saved HTML document inside an isolated preview. All local preference changes must preserve unrelated data and catalog history.

## Acceptance ownership

| Surface | Focused implementation verification | Independent regression coverage |
| --- | --- | --- |
| Settings | Actual-control and alias search; accordion/category/scroll/focus restoration; hash navigation; mobile accordions; write-error and destructive-action feedback | Quick Settings customization/conflicts, cloaking consolidation, actual backup download/file import, catalog review, cross-tab persistence |
| HTML Viewer | Existing work/modes/tools/shortcuts; indentation/scroll/large source; opaque-origin execution; hostile DOM/storage/message tests; desktop/tablet/phone layout | Independent hostile source check and parent-state preservation; reduced motion; actual Run/Copy/Clear recovery; navigation boundary |
| Widgets | Shadow DOM; saved position/preferences/gating; pointer/touch gestures and cancellation; resize/orientation clamping; active states and host scrolling | Existing proxied fixture navigation/widget suite; no duplicate roots or interference with ordinary controls |
| Homepage | Distinct sidebar states; all-collapsed compact track and center-width gain; saved-width restoration; mixed/moved/empty cases | Existing search/count/drag/touch/layout suites; rapid transitions; Codex intentional-submit-only access and no redundant Restore action |
| Shared UI | Tokens; loader initialization completion/fallback; semantic live status; reduced motion | Real rendered screenshots and absence of blocking overlay after readiness; keyboard focus; horizontal overflow at narrow widths |

## Browser and input matrix

- Desktop Chromium, Firefox, and Linux WebKit when runnable in this environment.
- Viewports: desktop 1440×1000, Chromebook-sized 1366×768, tablet portrait 820×1180, tablet landscape 1180×820, phone 390×844 and narrow 320×740.
- Mouse and keyboard are browser-driven. Chromium CDP touch streams and touch-tap contexts are **emulated**. No physical iPad, Android device, Chromebook, or Apple Safari validation is implied.
- Prefer deterministic local host-page fixtures. Remote asset/network availability is not inferred from local rendering.

## Required final evidence

1. `npm test` after integration, with the executed count and exit status.
2. Focused new Settings, Viewer, widget, and compact-rail browser suites.
3. Existing high-value Quick Settings, cloaking, catalog/backup, homepage search/limits and gesture suites.
4. Cross-engine checks with exact engines and any unsupported runtime limitations stated.
5. Independent visual audit of actual rendered pages; fix observed defects before declaring completion.
6. Curated before/after screenshots and a browser-opened report whose images decode successfully.

## Physical-device checks still required

Native on-screen keyboard behavior and browser chrome in iPad Safari/Android; physical touch precision and orientation changes; operating-system fullscreen/clipboard permission prompts; lower-powered Chromebook responsiveness with large user documents. Emulation can verify responsive composition and event handling but cannot establish those hardware outcomes.
