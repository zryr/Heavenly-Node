# Heavenly Node — Phase 8

Branch `feat/phase8-final-ux` starts from merged main `2725f32369bb609bcd0cf8c8d51e272f9a420009`, after [#202](https://github.com/zryr/Heavenly-Node/pull/202). Express and vanilla HTML/CSS/JavaScript remain; no production dependency or framework was added. This is one review branch and one pull request; nothing is merged automatically.

Download and open [the portable visual report](comparison.html): **34 actual screenshots and three embedded recordings**. All images open at original resolution; recordings are playable without external assets or autoplay. Baseline captures came from a detached worktree of the merged-main commit. Error captures pass a known `ENOTFOUND` through the actual error middleware, rather than claiming a live upstream failure.

## Requirement classification and implementation

| Area | Initial state | Phase 8 result |
| --- | --- | --- |
| Academy | Separate responsive documents worked; visible fictional/attribution wording needed correction | Remove that wording and the specified landing paragraph; retain honest open-learning scope and legal credits. No credentials, accreditation or institutional affiliation claims. |
| Note catalog | Structured IDs, pauses and bounded rotation worked; copy and eligibility were partly correct | Preserve IDs and intentional punctuation, apply requested text/emoji, add ocean-gradient Nae-Nae and punctuated boundary line. Remove redundant search/bookmark-order tips from rotation. Disable all music-related notes through reversible `HeavenlyMessages.config.musicNotes=false`; keep their data and assets. |
| Dialogue | Manual activation already worked; typing, replay persistence and differentiated presentation were absent | One engine supplies type/reveal/advance, retro Ao Oni/Khezu and soft visual-novel scenes, arrows, focused keys, reduced motion and fade cleanup. First discovery is a small local cue; no forced scrolling or autoplay. First run withholds scene Close while Escape/navigation remain available; completed replays expose Close. |
| Artwork/reactions | Existing GIF and reaction assets available; final new portraits unavailable | Reuse the existing local dance, Doggy and reactions. Correct inline/right associations. Reserve graceful character-name portrait fallbacks and explicit approved-image manifest slots. See [exact artwork import map](art-slots.md). |
| Automatic events | No automatic character/event opener exists in the merged baseline | Preserve manual triggers. Store discovered/completed/appearance/auto-choice fields separately; do not invent an automatic trigger or show an irrelevant opt-out prompt. Automatic-event repeat/reenable UI is not applicable to the current manual scenes. |
| HQ | Command-only entry and contained preview worked; homepage preview absent | Temporary actual-homepage render uses the same typography, timing, portrait placement and arrows. Preview/Cancel/Restore/Save have explicit local scope; no public catalog write or visitor scene-state write. Safely migrate supported older local HQ drafts without rewriting their originals until Save. |
| Touch dragging | Hold existed, but initial pointer prevention and `touch-action:none` froze pre-hold handle scrolling | Use a dedicated native touch stream, allow early scroll, cancel moved holds, prevent active drag movement locally, and clean up interruption paths. Handles remain the only touch pickup targets. Mouse and keyboard alternatives remain. Baseline defect reproduced in both tablet orientations. |
| Bottom layout | Side widths worked; individual bottom widths absent | Stable-ID width handles, keyboard/mouse/touch resizing and Fit width; sparse backward-compatible persisted intent; container-based one/two-column bookmark cards. Adjacent resized category ordering and refresh tested. |
| Links/helpers | Arctic identity/mirrors existed; requested URLs, music and Save action absent | Add Budsin Games and two mirrors to existing `bm_arctic`, preserving preferred URLs and catalog reconciliation. Compact Monochrome shortcut with exact tip and visibility setting; discreet Save Heavenly with native browser instructions and desktop drag link. |
| Panic appearance | Existing saved-website redirect worked; no document appearance existed | Add one original local document workspace, retaining website default. Editable title/text, basic formatting, responsive page and explicit return; no external editor embed, account UI or credentials. Validate HTTP(S) panic destinations without erasing unsafe imported raw preferences. |
| Other surfaces | Settings, Quick Settings and Viewer already used newer tokens; proxy errors retained old animated blur styling | Modernize error surface and handle management styling; preserve diagnostics/retry/direct/home actions. Adapt verified Palette keyboard/state improvements without broad redesign. Viewer origin isolation remains. |
| Persistence | Existing bookmarks/catalog/backups worked; new layout/dialogue backup scope absent | Private selected-settings backups carry normalized layout and dialogue state. Merge retains unrelated state and explicit local automatic-open choice; older backups leave new fields alone. Failed writes roll back collection/settings/layout/progress. Cross-tab scene updates merge fresh state; unsupported raw state remains intact. |

## Verification

The [test matrix](test-matrix.md) links exact commands and raw results. Tests exercise browser UI, actual persisted storage, real local routes, native Chromium touch input, keyboard interaction, authored Viewer execution and error middleware. Mocked external fixtures establish application behavior, not third-party uptime.

Final checks cover Chromium 154, Firefox 153 and **Linux WebKit 26.5** at desktop, Chromebook size, iPad-like portrait/landscape, and 390/320px phones, with reduced motion and CSS zoom observations. No physical iPad, Chromebook, phone or Apple Safari was tested. Native browser/OS zoom, virtual keyboards, actual browser bookmark-bar acceptance, lower-powered hardware and hardware touch/trackpad behavior remain manual checks.

Verification caught and repaired the pre-hold scrolling defect, overflowing note track, narrow New Tab control, cross-tab dialogue overwrite, denied-storage homepage initialization and unsafe Panic dispatch. Two inherited harness assumptions were corrected through real visible controls: a collapsed Settings group and collapsed bookmark sidebar. WebKit layout tests now wait for actual responsive/reorder state. Full diagnostics are retained rather than treating initial failures as passed runs.

Run from the repository root:

```sh
npm test
node scripts/build-academy.cjs --check
node scripts/build-messages.cjs --check
node scripts/build-official-order.cjs --check
node test/browser/phase8_messages.cjs
node test/browser/phase8_hq_live.cjs
node test/browser/phase8_features.cjs
node test/browser/phase8_panic_security.cjs
node test/browser/phase8_dialogue_backups.cjs
node test/browser/phase8_touch_drag.cjs
node test/browser/phase8_layout.cjs
node test/browser/phase8_layout_backups.cjs
node test/browser/phase8_surfaces.cjs
node docs/phase8/build-report.cjs
node test/browser/phase8_report.cjs
```

Browser tooling requires Playwright and installed engines, supplied by the test environment rather than production dependencies. Set `HEAVENLY_BROWSER=firefox` or `webkit` for single-engine layout/navigation suites; multi-engine suites document their selectors in source. This cloud host uses `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` with locally supplied browser libraries.

## Preview and limits

[Vercel preview](https://heavenly-node-4imb5of1u-syshi.vercel.app) is **READY** at application commit `9a4101e81842072af13f0ed73cab2200beed8f3a`. Six actual deployed Chromium smoke groups passed with zero page errors: Academy/Terms return, manual dialogue/completion refresh and bounded dance, catalog/music/Save, command-only HQ live preview, editable narrow document workspace, and executed Viewer parent DOM/storage isolation probes. [Deployed results](evidence/preview-results.json). Protection is retained; access cookies and private share parameters are never committed. Later commits add evidence and documentation only.

Approved **player, Cloudy and smug hunter portraits remain pending**. The import map names exact filenames and the optional manifest; adding approved files does not require scene-engine changes. Existing repository character originals are untouched, and no upstream art license is invented.

[Bounded external HEAD checks](evidence/external-links.json) returned HTTP 200 for Budsin and both exact Arctic mirrors; Monochrome returned HTTP 503. External scripts were not executed as privileged code. Game compatibility, mirror availability and music playback are not guaranteed by syntax/HTTP checks. The Monochrome panel offers a link and the exact download tip; it never autoplays.

[GitHub contribution decisions](contribution-review.md), [surface audit](surface-audit.md), [touch diagnosis](touch-audit.md), [layout audit](layout-audit.md), [HQ guide](hq-live-preview.md), [navigation findings](navigation-regression-audit.md) and [feature/security verification](features-and-destinations.md) contain supporting detail. No Jules workspace, jobs, schedules or archives were changed; no independent PR was merged. Impeccable/Taste skills were not invoked in Phase 8.
