# Mirror management V2

This follow-up builds on merged PR #179 and the latest `main`. All follow-up work lives on the dedicated `feat/mirror-management-v2` branch. PR #179's historical merge remains unchanged; these changes have not been merged into `main`.

## Destination state and storage

`HeavenlyBookmarks.mirrorState()` is the shared resolver. Optional `mirrorPreferences` metadata lives on each bookmark in `heavenly_bookmarks`:

- `preferred`: the explicitly selected identity; absent means the canonical site.
- `active`: the destination actually used for the next launch.
- `activeBroken`: the last observed marker state, so restoring another destination cannot restart fallback from an unchanged all-broken state.
- `order`: optional priority identities, separate from `subBookmarks` and shipped definitions.
- `explained`: bookmark-scoped acknowledgement of first-time fallback guidance.

The canonical identity is `main`; children use stable IDs, with normalized URL identity only for legacy records without IDs. URLs are deduplicated using the existing navigation helper. Newly reconciled destinations follow saved priorities. Existing collections retain the canonical/user/built-in default ordering until customized. Notes, icons, launch preferences and nested records remain unchanged. Ordinary stale collection writes preserve the latest mirror metadata; legacy private imports retain missing metadata, and private backups carry explicit metadata. Public sharing strips this local state.

A healthy active destination remains selected. Marking it broken tries the available preferred destination, then saved order. Mark Working removes equivalent normalized markers, retains preferred/active choices and previous order, and creates no new promotion. Even after an all-broken state, restoration alone leaves selection to the user. All-broken feedback identifies user markers as local status rather than live health checks. No destination is reported as network-verified.

Known asset extensions, hidden records, folders and `mirrorEligible:false` records are excluded from mirror candidates, while remaining accessible through existing nested links. Opium's SVG entries are preserved but never promoted. This is an offline eligibility filter: unusual extensionless asset endpoints cannot be classified by content without a request. No stored-URL sweep or RiveStream investigation was performed.

The dialog displays ACTIVE SITE, a collapsed AVAILABLE MIRRORS ordering/editor section, and the existing collapsed BROKEN manager. The active entry has one set of launch actions; its ordering row does not duplicate those actions. Any eligible destination, including a broken preferred destination and the original URL, can be explicitly preferred. A working explicit selection immediately becomes active. All header, copy, Direct, Proxy and skipped-prompt launches resolve the current stored state. Explicit child links keep their own destination and note identity. Legacy schemeless addresses are normalized for launch/copy without rewriting saved addresses.

## Feedback and interaction

A genuine automatic active change gets a purple PROMOTED badge for seven seconds. Reopening an unchanged choice does not replay it. First-time fallback caused by Mark Broken opens the purple explanation for approximately eighteen seconds. Focus/pointer interaction makes that panel manual-dismiss for the event; Info keeps it available afterward. Close, refresh and page lifecycle handlers cancel timers, and feedback expiry never writes destination state.

Mirror order supports native mouse grip dragging, touch/pen pointer dragging, explicit Move Up/Down controls and grip arrow keys. Cancellation leaves storage unchanged. Six-dot grips are shared across bookmark/category/section arrangements and Quick Settings. Existing handle menus, body holds, keyboard controls and touch-scroll cancellation remain.

Bookmark/category drops share the same resolver for previews and commits. Lists use item midpoints; grids select the actual row and nearest cell, then the cell's before/after edge. Target identities include the destination category and subsection, including empty sections. Release recomputes geometry after scrolling. The fixed insertion line lives outside document flow; preview updates run once per animation frame. Existing adaptive avatars and touch edge scrolling remain. Native mouse dragging requires a dedicated grip.

Subsection, folder and Show More changes retain lazy DOM and icons. Cancellable 210ms height/opacity animations handle rapid reversal, with immediate `inert` on collapse and final `hidden` state. Reduced motion skips animation. Category Add controls use cyan, Quick Settings header Info uses purple, and popup viewport dimensions no longer interpolate during resize.

## Return Home

Only a homepage launcher registers its exact script-opened child with a per-launch token. Return Home sends a same-origin message through the supported opener relationship. The homepage checks origin, token, exact WindowProxy, and the child's current proxy/wrapper location before focusing itself. It closes the registered child only after `document.hasFocus()` confirms focus. Direct external launches retain their existing severed opener behavior.

If focus, opener access, storage, or closing is unavailable, the failed tab navigates itself home. A short request timeout provides that fallback without creating a new tab. Sandboxed errors route through their registered wrapper; about:blank uses its launch origin. No arbitrary-tab enumeration, helper tabs or background monitoring is used. Browsers and platform focus policies can prevent reuse, and opener isolation or a reloaded homepage can remove the relationship.

## Verification

`npm test`: **425 passing**. Inline homepage/Settings scripts, changed JavaScript syntax and `git diff --check` pass.

Focused browser checks use controlled destinations and a local failing upstream. The V2 suite covers preferred/active/order persistence, restoration and drafts, actual copy/Direct/Proxy destinations, real seven/eighteen-second timing, acknowledgement, manual dismissal, keyboard-focus-safe timeout, retained DOM, rapid accordion reversal, actual mouse placement, grid/empty/cross-category placement, invalid drops, responsive colors/reduced motion and all Home launch modes. It runs on Chromium, WebKit and Firefox. The separate mirror-ordering suite uses real Chromium mouse and emulated touch input, keyboard movement, cancellation, and legacy URL checks.

Existing browser suites also cover bookmark management, adaptive touch/mouse/pen dragging, gesture conflicts, notes and private backups, official sharing restrictions, transient promotion, proxy widgets/diagnostics, launch modes, navigation/history and Quick Settings customization. Together these runs passed **142 browser check groups**: 124 in Chromium, nine in WebKit and nine in Firefox. Results and preview information are recorded in the PR #179 follow-up comment.

WebKit uses scratch host libraries and a scratch launcher; no browser tooling or new runtime dependencies are shipped. Physical iPad Safari, Chromebook hardware and real pen input were unavailable. Browser emulation does not establish their behavior. Browser reuse and fallback are both valid outcomes; each of the Chromium, WebKit and Firefox runs observed two actual existing-home reuses and one current-tab fallback across the three script-opened launch modes.
