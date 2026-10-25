# Widget audit and direction

Baseline: `f870d509569f241a23090c52c7b4c0b5696fc69b`, 25 October 2026. The client creates a shared Shadow DOM stylesheet, a four-edge dock and independently positioned floating Scroll Lock, Magnifier and Navigation controls. Existing keys (`heavenly_settings`, `heavenly_scroll_lock_pos`, `heavenly_magnifier_pos`, `heavenly_nav_pos`, `heavenly_lens_pos`) are the compatibility boundary and will remain intact. The initializer already guards duplicate client execution.

## Before editing

The real injected client was rendered over a deterministic local host-page fixture. Captures: [dock](evidence/before-widgets-dock.png), [collapsed dock](evidence/before-widgets-collapsed.png), [floating controls](evidence/before-widgets-floating.png). These are implemented UI screenshots, not mockups.

- Dock and floating surfaces use repeated bright halos, blurred glass and cyan borders. The 38px floating circles have opacity 0.45; their icons lose contrast on complex host pages. Close and zoom controls are small. All-property transitions animate dimensions and placement during gestures.
- Collapsing the dock translates almost its entire wrapper outside the viewport; only a small part of the 36px pull button remains. Offscreen dock controls remain keyboard-focusable. Search shrinks to 60px on vertical docks and the horizontal toolbar scrolls without a clear layout at phone widths.
- Minimized floating wrappers have no keyboard expansion target. Expanded navigation/magnifier rows can exceed the viewport. Idle minimization can run while a user is working in an input because focus is not considered.
- Mouse/touch drag listeners clean up on release but omit touchcancel and window blur. Dock drag can leave a ghost/snap indicator after cancellation; floating gestures may persist until a later release. Only the dock has visualViewport handling. Magnifier dimensions/position are not clamped after rotation.
- Widget configuration is read once. A settings change in another tab does not reconfigure the existing injected tools. Repeated DOMContentLoaded/load calls are partially guarded by DOM IDs, but install redundant common listeners before the check.
- Ordinary HTML/SVG actions, bookmarks, Direct and about:blank workflows are already functioning and will be retained. Styling remains in Shadow DOM. Host-page scrolling will only be canceled during a drag owned by a tool.

## Coordinated direction

Use the Heavenly navy surface steps, pale cyan icons and controlled blue active states, 44px interaction targets, rectangular toolbar buttons and circular floating restores. A small fully visible dock restore control replaces the offscreen strip. A responsive wrapping toolbar preserves usable search width. Add keyboard expansion/repositioning, cancel-safe gesture cleanup, viewport bounds and live preference synchronization without changing saved configuration semantics. Magnifier keeps its existing lightweight DOM clone technique; no new rendering library is introduced.
