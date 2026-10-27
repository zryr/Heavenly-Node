# Navigation regression harness repair

The initial Phase 8 `navigation_history.cjs` runs failed while waiting for a bookmark popup. Investigation found that the test created its bookmark in a left sidebar that the existing 430px responsive layout had collapsed. The card existed in storage and DOM, but its title was not visible. The pending popup promise timed out before the locator could report the hidden element, obscuring the cause.

A focused Chromium probe reproduced the same state against both immutable merged-main `2725f32` on port 8181 and the current application: bookmark saved; left toolbar `aria-expanded="false"`; bookmark title hidden. Clicking the actual toolbar Expand action made the title visible and the subsequent normal click opened `about:blank` in both implementations. No launch modal or drag click suppression was involved. [Probe transcript](evidence/navigation-history/baseline-probe.txt).

The harness now opens the sidebar through that existing control before awaiting the popup. It also opens the existing Settings disclosure before clicking its contained label, using the established `revealSettingsControl` helper. No force clicks or artificial storage/layout preferences were added for that harness correction.

The final complete runs pass **15 checks in each engine (45 total)** with no uncaught application errors. They are recorded in [Chromium](evidence/navigation-history/chromium.txt), [Firefox](evidence/navigation-history/firefox.txt) and [Linux WebKit](evidence/navigation-history/webkit.txt). These tests use browser automation and an emulated touch-sized viewport, not physical iPad/Chromebook or Apple Safari. Original failed regression logs remain available so the harness correction is reviewable.

## Denied-storage startup repair

After the hidden-panel correction, all three engines reached the final storage-denied scenario. It uncovered an inherited application failure: evaluating the `localStorage` getter before calling the otherwise defensive settings reader aborted the homepage script. The same eager getter was used by bookmark rendering and Restore Official Order configuration.

The two preferences reads now use the existing safe `loadSettings()` wrapper. Restore configuration receives a lazy storage adapter; a denied write still throws into its established error handling. This permits ordinary navigation to initialize while preserving storage failure reporting and avoiding a silent replacement or save. The complete navigation test retains its real denied-getter scenario and checks for uncaught application errors.
