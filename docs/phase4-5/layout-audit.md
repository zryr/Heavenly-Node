# Sidebar category compact rail audit

Baseline: `f870d509569f241a23090c52c7b4c0b5696fc69b` (latest main, PRs #193/#196 merged). Historical homepage-overhaul/refinement reports and current layout calculation reviewed before edits.

The existing layout already separates persistent sidebar widths, manual sidebar collapse, responsive automatic collapse, and stable category collapse IDs. Empty columns have no track. Individual category collapse animates the category body and compacts its own header, but never recomputes the parent track; the pure calculation does not receive category state. Therefore a column of small collapsed headers still reserves its full 240–400px saved width. The category click also never schedules a track update. The compact headers keep drag and expand controls, while hidden category actions correctly leave the tab order.

The fix will add a derived, nonpersistent category-compact state. It will use independent label/control measurements rather than track-width feedback, retain each real category DOM node, and restore the existing saved expanded width as soon as any category expands. Close animations finish before the track shrinks. The shared grid transition owns width motion; viewport-pressure changes remain immediate. Resize controls will be hidden and disabled while there is no expanded category to resize. Narrow layouts will retain the existing full-width panel disclosure rather than squeezing category labels into tiny rails.

Category compact state must never write manual collapse, compactOpen, saved width, bookmarks, or hidden preferences. Moving/hiding/restoring categories is observed through the existing column mutation mechanism. State is recomputed from eligible real cards and stable category IDs. Empty/manual/automatic/category compact states will have distinct data values. The all-collapsed rail will stack content-sized horizontal category headers; a horizontal strip is not needed to preserve category identity or draggable ordering.

Baseline implemented UI screenshot: [collapsed categories before](evidence/before-compact-rails.png). This is a Chromium capture at 1440×1000, not a mockup or physical-device test.

## Implemented behavior and verification

Collapsed category labels are measured with the existing font and control widths, independently of the current grid track. The derived rail is clamped to 152–208px; no current `clientWidth` feeds back into the next width. The last category's height animation finishes before the track shrinks, and its completion updates the track in the same turn so there is no intervening stale layout state. Expansion restores the saved expanded width immediately. Real category nodes, accessible names and drag handles remain intact. The rail uses stacked horizontal labels; narrow layouts retain the existing full-width panel disclosure.

The actual default Movies/Shows + Anime/Manga case, both moved into one sidebar, reclaimed approximately 78px from the saved 256px track into the central card (1136px → approximately 1214px). The controlled QA fixture uses longer touch-friendly labels: 256px → 208px, center 864px → 912px. Its 45 actual paint samples cover 733ms and confirm monotonic width gain without oscillation. [Before](evidence/before-compact-rails.png) and [after](evidence/after-compact-rails.png) use the same real categories and viewport. The three representative implemented transition frames are [before last collapse](evidence/rail-transition-0.png), [during track transition](evidence/rail-transition-middle.png), and [settled](evidence/rail-transition-settled.png). These are real browser captures, not design mockups.

Executed verification:

- `npx mocha test/homepage_layout.test.js`: 6 passing, including pure width/pressure/persistence invariants for category rails.
- `node test/browser/compact_rails.cjs`: 9 interaction groups passed separately in Chromium, Firefox and Linux WebKit. Includes actual mouse category reordering, keyboard expansion and separator resize, search of collapsed contents, persistence, moved/hidden/restored categories, independent manual collapse, portrait/landscape viewport changes, rapid reversals and reduced motion.
- `node test/browser/refinement_cross_browser.cjs`: all 5 existing groups passed separately in Chromium, Firefox and Linux WebKit. The prior horizontal-header drag assertion was updated to the new stacked rail, retaining the real mouse reorder test. Includes existing Auto/Custom counts, Show More, section overrides, six viewport sizes and reset scoping.
- `node test/browser/homepage_layout_touch.cjs`: all 4 existing Chromium CDP touch groups passed, covering continuous sidebar resizing, cancellation, second fingers, lost focus, rotation and saved panel disclosure.

Machine-readable results are the compact-rails and layout-regression engine JSON files in evidence. Browser libraries use the environment-provided Playwright; WebKit uses the environment library path documented in earlier reports. Viewports and touch events are emulated. Physical Safari/iPad, Android, Chromebook hardware, native browser zoom and real virtual keyboards still require manual checks; no hardware testing is claimed.
