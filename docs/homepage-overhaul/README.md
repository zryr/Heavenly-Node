# Heavenly homepage and interaction overhaul

One coordinated implementation on `feat/homepage-interaction-overhaul`, based on main `013cd07a36854c74b8feb8f29a8437f2c4daa72b`. No merge is performed.

Open [the portable visual comparison](comparison.html) after downloading it, or serve this directory over HTTP. It embeds **43 full-resolution screenshots and four playable recordings**, with a full-size image viewer and downloads; it needs no external assets. Original media and capture metadata are in [evidence](evidence/). The before implementation was served from an immutable archive of the base commit. New sidebar states have no invented before counterpart.

## Touch dragging: what was found and fixed

The old Chromium fixtures could already reorder ordinary bookmarks; a passing fixture did not establish physical iPad reliability. Most strokes held perfectly still and then teleported to a destination, and some preview checks used synthetic HTML DragEvents.

Two exact-base failures were reproduced with actual browser touch input: removing the source and changing viewport during a held drag left a floating preview. The source tracker had no disconnection observer or viewport/orientation cleanup. Source review also found competing touch, pointer, pen, mouse and native drag paths; the subsection handle was native-draggable on touch, and native touch dragging canceled the custom gesture. That OS long-press race was identified in code, not physically reproduced on an iPad.

Modern dedicated handles now use Pointer Events, pointer capture, a **420ms touch hold**, modest drift tolerance, visible pending/ready feedback and geometric placement shared with the insertion indicator and saved drop. Pen/mouse retain movement activation; Touch Events/native HTML dragging remain legacy fallbacks. A shared `HeavenlyGestures` owner reserves pending holds and separator resizing so neither can steal the other stream. Cleanup covers early release/movement, extra contacts, cancel/capture loss, removed sources, rerender, Escape, blur, hidden documents, resizing and rotation. It releases timers, listeners, capture, previews, displacement, auto-scroll and ownership before a drop rerenders its source. Canceled gestures do not save ordering. Ordinary bookmark-body touch scrolling and pinch zoom remain native.

The new tests use drift and fourteen incremental finger moves, verify the indicated destination against saved ordering, reload persistence, built-in/personal entries, cross-subsection/category/column movement, category movement, subsection Save, keyboard alternatives and input conflicts. See the [gesture audit](gesture-audit.md) for reproduced failures and exact coverage.

## Animation lifecycle

First folder opening mounted visible children before measuring, producing equal height keyframes: the regression reproduced **64px → 64px**, fixed to **0px → 64px**. Preview pickup also started while its parent was invisible; it now starts with the first visible paint.

Shared motion utilities now sample the rendered state before reversal, retire ownership before cancellation callbacks, settle removed/hidden targets, clear stale accordion references and finish logical state on live reduced-motion changes. Height measurements avoid parent dialog scale. Dialogs reverse from their rendered opacity/transform; old completion callbacks cannot close a reopened dialog. Available, Broken and Add Custom Mirror disclosures use the same reversible height lifecycle and retain unsaved drafts. Existing Mark Broken, Mark Working, Preferred Site and genuine promotion feedback remain verified. See [animation audit and frame evidence](animation-audit.md).

## Layout, collapse and independent resizing

The existing lightweight HTML/CSS/JavaScript architecture remains. `heavenly-home.css` defines opaque navy surfaces, restrained cyan/purple feedback, single-line bookmark titles, consistent icon lanes and smaller visual grips inside comfortable touch targets. The center becomes the primary visual destination. Side panel headers use two rows when necessary to retain readable category names and accessible actions. Existing Outfit/Space Grotesk and the cloud mark remain.

`heavenly-layout.js` calculates from **actual available content width**, a **440px center minimum**, **240–400px** expanded panels (default **256px**), **44px** collapsed tabs and **16px** gutters. It reduces surplus widths before automatically collapsing a panel. A manually opened panel gets priority when only one can fit. Below the space required for one functional panel beside the center, compact controls reveal the same panel DOM in full-width rows below the center; no duplicate bookmark implementation is introduced. Focus transfers to a visible equivalent when its control/panel disappears.

Manual collapse, preferred side, widths and explicit compact reveals persist in `heavenly_home_layout_v1` with `version:1`; automatic collapse changes only derived state. A temporary viewport change never overwrites intended expansion or saved widths. This record is deliberately per-device layout data and is separate from existing bookmark/settings backups. Reset Layout restores only layout defaults.

The inner separators capture mouse/pen/touch pointers, update at animation-frame cadence, clamp against both panel and center constraints, and commit on release. A combined interruption test also reproduced a missing subsequent native button tap when only pointer defaults were reserved. Canceling native touch defaults on the divider resolves that sequence; Pointer Events remain the sole movement controller. Interrupted resizing restores the last committed width. Arrow keys adjust by 16px, Shift adjusts by 32px, Home/End set limits. Separators expose orientation, controls, minimum/maximum/current width and value text. The narrow visible grip appears briefly on entry and returns on hover, focus and engagement; its larger hit area occupies the gutter.

## Unified search and Show More

Search updates only the central result panel, preserving source cards, gestures, sidebar preferences and ordering. It searches authoritative data across built-in/custom entries, categories, subsections and recursively nested folders, including collapsed/lazy content. Explicitly hidden entries and ancestors stay excluded. Grouped results include icons, fallback glyphs, contextual names, empty states, keyboard navigation and a bounded scroller. Folder selection explores its children; site selection uses the shared existing mirror/direct/proxy/notice launcher. Native modified/middle-click hrefs also reflect saved launch choices. Clearing search restores the previous layout without expanding panels.

The default initial count is **five** in side and bottom sections. Settings exposes a validated global **1–30** count and sparse category/subsection overrides. A subsection's explicit numeric count takes priority over a category count, then the global default. **Reset/blank restores the global count**, even when a category has an override: only that explicit `global` exception is stored, never a copied global number. Changing the global count subsequently updates it. Expansion state persists separately in `heavenly_settings.bookmarkExpandedSections`. Existing settings export/import includes these fields. Show More keeps its button and focus, lazily appends additional rows, animates reversals and never changes bookmark order.

## Design guidance and verification

Current official **Impeccable 4.7.0** and **Taste app-screen guidance** were read at the pinned revisions in [design audit](design-audit.md). Applied guidance includes task-first hierarchy, quieter secondary surfaces, reduced glass/glow, sentence-case metadata, consistent spacing, visible focus, readable small text, native controls and useful short motion. The user's navy/cyan/purple identity overrides generic neutral palette prescriptions. No application dependency or frontend framework was added.

Final Impeccable scan of the new layout files returned no findings. Taste lint returned no failures (its lexical warnings also flag `box-shadow:none` and `backdrop-filter:none`). The browser inspector found one explained detector error: it selects the first `h1`, which belongs to the hidden educational decoy. The visible Heavenly `h1` exists in the main landmark and is shown in every final capture. Other actionable findings, including small labels, clear icons, extra button font and resting shadow, were corrected. [Detector findings](evidence/design-checks.json) preserve that boundary rather than claiming an unqualified clean scan.

## Executed validation

| Check | Executed result |
| --- | --- |
| `npm test` | 469 passing |
| `homepage_cross_browser.cjs` | 16 groups across Chromium 154, Firefox 153 and WebKit 26.5 |
| `homepage_touch_drag.cjs` | 12 Chromium touch/gesture groups |
| `homepage_layout_touch.cjs` | 4 Chromium separator touch/cancel/compact/pinch-scale groups |
| `homepage_search_limits.cjs` | 8 groups in each of Chromium, Firefox and WebKit |
| `motion_reliability.cjs` | 5 groups in each of Chromium, Firefox and WebKit |
| `adaptive_drag.cjs` | 8 Chromium groups, including emulated pen |
| `bookmark_gesture_conflicts.cjs` | 9 Chromium groups |
| `bookmark_management.cjs` | 13 Chromium groups, using its required local server |
| `bookmark_experience.cjs` | 7 Chromium groups, including narrow-header geometry |
| `game_launch_modes.cjs` | 8 Chromium groups |
| `catalog_updates.cjs` | 21 Chromium groups, including export/import and mirror feedback |
| `homepage_drag_interruption.cjs --baseline` | Both historical stale-preview defects reproduced |
| `homepage_drag_interruption.cjs` | Both cleanup cases pass |
| `ui_comparison_report.cjs comparison.html` | All 43 embedded images decode and open at original resolution; all four videos play frames; narrow viewer works |

Representative sizes: **320×740, 390×844, 430×932, 700×900, 820×1180, 1180×820, 1180×900, 1366×768, 1440×1000 and 1920×1080**. Geometry checks cover center readability, usable controls and page overflow. All four panel combinations, automatic restoration, independent mouse/touch/keyboard resizing, min/max, reset, repeated gestures, search and persistence are exercised. Existing tests were adapted to open collapsed panels through public controls and measure geometry synchronously during smooth scrolling; no failing controls were hidden.

Reproduce the core checks from the repository root:

```sh
npm test
node test/browser/homepage_cross_browser.cjs
node test/browser/homepage_touch_drag.cjs
node test/browser/homepage_layout_touch.cjs
node test/browser/homepage_search_limits.cjs
HEAVENLY_BROWSER=firefox node test/browser/homepage_search_limits.cjs
HEAVENLY_BROWSER=webkit node test/browser/homepage_search_limits.cjs
HEAVENLY_BROWSER=webkit node test/browser/motion_reliability.cjs
node test/browser/ui_comparison_report.cjs docs/homepage-overhaul/comparison.html
```

Playwright and its browser engines must be available. Chromium tests default to `/usr/bin/chromium`; browser engine tests require Firefox/WebKit installations. This environment's Linux WebKit needed its downloaded host libraries, described in the animation audit; that setup did not change application dependencies.

## Verification limits

Continuous touch strokes and pinch scale are **Chromium CDP emulation**. Firefox/WebKit tests use actual browser mouse/keyboard actions; the iPad WebKit profile also uses touch taps and portrait/landscape changes. No physical iPad Safari, Chromebook touchscreen, phone, pen or trackpad was available. Linux WebKit is not Safari on Apple hardware. Native desktop browser UI zoom was not verified; the separate 125% test is explicitly page/pinch scale. External destination availability and physical-device performance were not benchmarked. Search and density are bounded, pointer painting is frame-batched, and repeated bookmark backdrop filters were removed, but those engineering changes are not a physical hardware performance measurement.
