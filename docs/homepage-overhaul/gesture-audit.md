# Gesture architecture and verified failure modes

Base: `013cd07a36854c74b8feb8f29a8437f2c4daa72b` (main when work began).

## What the previous tests did and did not establish

The previous `adaptive_drag.cjs` and `bookmark_gesture_conflicts.cjs` use native Chromium CDP touch injection for several flows. They are useful evidence for emulated Chromium. Ordinary touch reordering did work under those fixtures. They do not establish that physical iPad Safari works.

Most old drag flows hold perfectly still, then send one large `touchMove` directly to the destination. Some preview checks dispatch synthetic HTML `dragstart` events. Several tests mainly verify preview existence or cancellation, rather than the full saved destination. The old conflict suite's description also claimed a handle hold opened management although it never asserted that bar opened. The description and assertion now reflect the intended activation feedback.

The new `homepage_touch_drag.cjs` uses actual browser input with hold drift, fourteen incremental finger moves, checks the displayed insertion destination against saved order, and verifies built-in and personal entries, subsection/category/column movement, category movement, subsection Save and reload, keyboard ordering, hybrid mouse, native body scrolling, shared resize ownership, cancellation, removed sources, and reload persistence.

## Reproduced baseline defects

`node test/browser/homepage_drag_interruption.cjs --baseline` serves the exact base HTML and drives a real CDP touch sequence. It reproduced both of these cases:

| Interruption during an active touch drag | Base | Updated |
| --- | --- | --- |
| Source element removed from the DOM | Floating preview remains | Gesture and preview canceled immediately |
| Viewport changed while the finger remains down | Floating preview remains | Gesture and preview canceled immediately |

The original touch tracker had no source-disconnection observer. It only detached when another touch event, an explicit render, blur, or visibility change arrived. Likewise, it had no resize/orientation cancellation path. A preview could remain in the wrong coordinate system, and callbacks still referenced the old source. These are verified lifecycle gaps, not a claim that all old touch dragging failed.

## Competing input paths found in source

The old implementation combined a passive `touchstart`, document-level Touch Events, a separate pen pointer controller, document-level mouse pointers, and native HTML drag listeners. The management interface's subsection handle was always `draggable=true`, including touch devices. Native touch `dragstart` handling canceled the whole custom gesture instead of excluding the competing native drag. This creates an unnecessary platform-dependent long-press race. It was identified in source; native OS long-press competition was not physically reproduced on an iPad here.

Modern dedicated handles now have one Pointer Events owner. They reserve their existing `touch-action:none` target from pointerdown, prevent native long-press defaults, capture the pointer, activate after 420 ms for touch, and follow the same geometric placement resolver used by the indicator and saved drop. Pen and mouse retain movement activation. A Touch Events path remains only for browsers without Pointer Events. Subsection handles use native HTML dragging only on that legacy path.

## Ownership and cleanup

`HeavenlyGestures` in `heavenly-drag.js` supplies `acquire(owner, cancel)`, `release(owner)`, `cancel()` and an `owner` getter. `acquire` returns false when another owner is busy. A pending bookmark hold reserves `bookmark-drag`, and layout resizing reserves `sidebar-resize`; neither may steal the other interaction.

The pointer controller removes listeners and its DOM observer, clears the hold timer and feedback, releases capture and ownership, and stops edge scrolling. It detaches **before** committing a drop because commit renders the source again. Early release, movement before activation, another contact, pointer cancellation, capture loss, source removal, render, blur, hidden documents, resize, rotation and Escape are cancellation paths. Canceled gestures do not write bookmark data. The geometric resolver is shared by pointer tracking, the insertion indicator, and release.

Touch taps still invoke the existing accessible management action. Ordinary bookmark-body touch movement retains native scrolling; it is not a drag target. Bookmark navigation and stored launch preferences remain unchanged by a drag.

## Pickup motion

The previous preview started its content animation while its outer element was `visibility:hidden`, then queued its first visible frame. On a busy renderer, the animation clock could run ahead of visibility. Pickup animation now begins inside the first visible paint. This also uses ordinary `transform` keyframes on inner preview content, independent of the outer preview's tracking transform.

## Executed validation

- `node test/browser/homepage_drag_interruption.cjs --baseline`: both stale-preview defects reproduced at the exact base.
- `node test/browser/homepage_drag_interruption.cjs`: both cleanup cases pass on the implementation.
- `node test/browser/homepage_touch_drag.cjs`: 12 real-input interaction groups pass.
- `node test/browser/adaptive_drag.cjs`: 8 groups pass, including emulated pen and edge-scroll interruption.
- `node test/browser/bookmark_gesture_conflicts.cjs`: 9 groups pass.
- `node test/browser/bookmark_management.cjs` (test server at port 8080): all 13 logged checks pass, including real toolbar expansion on the narrow layout.
- `npx mocha test/touch_scrolling.test.js`: 19 legacy fallback unit checks pass.

These gesture results are from Chromium browser input emulation. Physical iPad Safari and physical Chromebook touch hardware were not accessed. Cross-engine/viewport evidence is documented separately in the overall comparison report.
