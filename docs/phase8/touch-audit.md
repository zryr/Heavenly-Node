# Touch dragging: diagnosis and verification

The merged-main baseline is `2725f32369bb609bcd0cf8c8d51e272f9a420009` (PR #202). Gesture binding lives in the homepage's existing inline script; `heavenly-drag.js` supplies previews and insertion animation rather than event ownership.

## Reproduced defect and repair

The four-dot handle declared `touch-action: none` before a hold had begun. A normal swipe starting there therefore could not scroll, even when the JavaScript hold was canceled. The modern path also excluded TouchEvents whenever PointerEvents existed, called `preventDefault()` and took pointer capture on pointerdown, and depended entirely on that pointer stream. A browser-owned native pan may cancel PointerEvents; changing CSS after pickup cannot renegotiate the gesture's initial touch-action. This explains a gap in the older pointer-focused checks. It is not a claim that every physical iPad symptom has been reproduced.

Native Chromium CDP touch input reproduces the baseline blocked scroll in both 820 × 1180 portrait and 1180 × 820 landscape. The repair uses one TouchEvent stream for touch and keeps PointerEvents for mouse/pen:

- A grip starts a 420ms hold. An early movement over 10px cancels it without canceling that movement's default scroll. The handle now allows vertical panning.
- After the hold, a deliberate movement begins dragging. A nonpassive touchmove listener prevents default only for the active drag. A noncancelable browser-owned pan is abandoned rather than repurposed as a drag.
- A quick tap retains one native click for management. The card body retains its existing native scrolling and does not become a touch drag source.
- The initial touch identifier owns the stream. A second contact, touchcancel, Escape, blur, orientation/resize, pagehide, popstate, pointercancel, source removal, rerender and aborted release clean up timers/listeners/observer, ownership, preview, insertion space and highlights. Saving detaches before rerendering.
- Native callout suppression stays local to the grip. No body scroll lock or global touch-action change is added. Existing mouse, keyboard and Move Up/Down management paths remain.

## Executed checks

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node test/browser/phase8_touch_drag.cjs --baseline
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node test/browser/phase8_touch_drag.cjs
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node test/browser/homepage_touch_drag.cjs
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node test/browser/homepage_drag_interruption.cjs
```

The new suite passes five groups in each iPad-sized orientation: actual early-swipe scrolling on bookmark, category and collapsed-tab grips; eight cancellation paths with unchanged saved data; and deliberate held dragging to the displayed target, with order retained after reload. `--baseline` serves all original assets from the immutable merged commit and expects the old blocked scroll; its two passing assertions mean the defect was reproduced, not that the baseline behavior is acceptable.

The existing 12-group native Chromium suite passes quick taps, slow drift during hold, built-in and personal reorder across columns/subsections, persisted launch preferences, 11 interruption modes, owner exclusion, card-body scrolling, subsection save/reload, keyboard ordering, category movement and hybrid mouse ordering. The existing source-removal/viewport interruption suite leaves no stale previews in either case.

[Baseline observations](evidence/touch/baseline-results.json) and [fixed observations](evidence/touch/results.json) include actual captured images alongside the machine-readable results. These are automated viewport/input profiles. Physical iPad Safari, Chromebook touch hardware and trackpad hardware remain unverified. Linux WebKit is not Apple Safari; Playwright does not expose continuous native WebKit touch-stroke injection.

## Cross-engine regression follow-up

The existing homepage browser suite initially exposed a narrow Firefox layout with a 26px New Tab target during responsive resizing. The Go submit input retained its automatic minimum size while the neighboring button shrank. A scoped phone rule now permits Go to shrink (`min-width: 0`) and gives the visible New Tab button a 44px minimum. Hidden/collapsed New Tab behavior remains intact. The final Firefox suite passes all five groups, including seven viewport sizes, mouse dragging, saved order and keyboard category-section ordering.

An early heavily parallel Linux WebKit run timed out reaching the category Save button, and a second run sampled an old responsive panel state. Both passed on an isolated rerun without an application change. The harness now waits for the layout's two-frame resize marker to retire and checks the rendered keyboard-reordered section sequence before saving; it retains failure DOM/screenshot diagnostics. This is a harness timing repair, not a claimed fix to a physical Safari defect. The final WebKit suite exercises actual mouse/keyboard reorder and iPad-profile taps; continuous native WebKit touch strokes remain unavailable.

The touch unit suite has **21 passing tests**. Its connected DOM fixture now includes handle classes, captured listeners and modern PointerEvent support. It checks single touch ownership, pre-hold scrolling, cancellation, compatibility clicks, and refusal to turn an already noncancelable native pan into a drag. The actual browser tests remain necessary for touch-action and native scrolling, which a VM fixture cannot establish.
