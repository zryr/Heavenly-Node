# Widget and dock verification

Verified on 25 October 2026 against the combined Phase 4 + 5 working tree. The baseline and first-render findings are in [widgets-audit.md](widgets-audit.md). The implementation keeps the existing storage keys and functional navigation, bookmark, magnifier and Scroll Lock tools.

## Implemented behavior

- One isolated navy/cyan visual language across rectangular dock controls, circular floating restores, magnifier and focus/active states. Restore buttons and primary tool controls have 44px targets. The mobile dock wraps around a usable search field rather than squeezing it to an unusable strip.
- A collapsed dock exposes a fully visible restore control and removes its hidden bar from keyboard navigation. Escape returns focus to that control. Alt+arrow keys move the dock between the four edges.
- Floating controls support keyboard expand, arrow-key movement and Escape minimization. Auto-minimization respects focused controls and active gestures. Restored positions use the minimized geometry, avoiding an initial right-edge jump.
- Owned mouse/touch listeners, ghosts and visualViewport listeners clean up on cancellation, reinitialization and disposal. Magnifier dragging/resizing retires its gesture before closing its DOM; Escape, touch cancellation, blur and viewport changes do not commit an interrupted magnifier gesture. Its mirror aligns to the actual rendered view, including the larger header and viewport clamping.
- Cross-tab settings updates reconfigure owned widget roots, including master switches and individual navigation choices. Saved positions, dimensions, zoom and unrelated preferences survive. A dock-position write leaves malformed settings untouched and exposes a useful save-failure hint.
- Host-page styles remain outside the widget Shadow DOM. Mirrored host styles/content live inside a separate read-only shadow tree so they cannot restyle the magnifier controls.

## Executed checks

All listed commands completed with exit status **0**. Playwright was supplied by the execution environment; no browser-testing dependency was added to the application.

| Command | Executed result |
| --- | --- |
| `HEAVENLY_BROWSER=chromium node test/browser/widgets_celestial.cjs` | Chromium **154.0.8037.57**, **7 interaction groups**. Includes real mouse/keyboard, continuous CDP touch scrolling, dock touch dragging/cancellation, and long-press floating touch dragging/cancellation/commit. |
| `HEAVENLY_BROWSER=firefox node test/browser/widgets_celestial.cjs` | Firefox **153.0**, **5 interaction groups**. Mouse, keyboard, persistence, orientation/viewport bounds, live settings and focus-aware auto-minimization. |
| `HEAVENLY_BROWSER=webkit node test/browser/widgets_celestial.cjs` | Linux WebKit **26.5**, **5 interaction groups**, with the same mouse/keyboard and preference checks. |
| `node test/browser/proxy_widgets_diagnostics.cjs` | Chromium, **9 regression groups**: proxy links/history, bookmark creation, widget launch paths, frame refusal recovery, diagnostics and ordinary host interaction. |
| `./node_modules/.bin/mocha test/client.test.js test/unblocker-client.test.js --reporter dot` | **41 passing**. Existing incomplete mock-environment diagnostics are logged; no test failed. |

The focused suite also executes magnifier mouse movement and resizing, Escape during active gestures, exact zoom persistence and mirror alignment, Scroll Lock with editable input, ordinary page scrolling outside widgets, duplicate initialization, navigation visibility toggles, dynamically appended host content, reduced motion, preserved unknown preferences, and a malformed-settings write attempt. Its page-error list remains empty.

Machine-readable results: [Chromium](evidence/chromium-widgets-results.json), [Firefox](evidence/firefox-widgets-results.json), [WebKit](evidence/webkit-widgets-results.json). Curated real screenshots cover [expanded dock](evidence/after-widgets-dock.png), [collapsed dock](evidence/after-widgets-collapsed.png), [active magnifier](evidence/after-widgets-active.png), [floating controls](evidence/after-widgets-floating-expanded.png) and [mobile positioning](evidence/after-widgets-mobile.png). Gesture captures show an actual [pending dock move](evidence/after-widgets-gesture-during.png), [cancellation](evidence/after-widgets-gesture-cancelled.png), and [floating move](evidence/after-widgets-floating-drag.png) / [settled state](evidence/after-widgets-floating-drag-settled.png).

## Visual review and limits

The implemented screenshots were inspected at desktop and phone widths. Dock buttons align, search remains usable, collapsed controls stay fully visible, and the floating/expanded tools share Heavenly's palette without borrowing host-page styles. The additional magnifier review found and corrected stale 28px-header geometry and closing-during-drag cleanup.

These are Linux browser runs and emulated viewports/touch streams, not physical iPad, Android, Chromebook or Apple Safari testing. Native virtual keyboards, OS safe-area/browser chrome behavior, physical touch precision and external destination availability still require device checks. Magnification preserves the existing DOM-snapshot approach; it does not promise live video/canvas/game rendering or automatic mirroring of every later page update.
