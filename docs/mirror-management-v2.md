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

Hidden records, folders, unsafe destinations and `mirrorEligible:false` records are excluded from mirror candidates. Unconventional SVG/image/CDN destinations remain eligible: a filename suffix does not establish whether an intentional destination works. Existing HTTP(S) URLs retain their original spelling for display, Copy, Direct and Proxy; legacy schemeless addresses are normalized only for use. No stored-URL sweep, live health probing or RiveStream investigation was performed.

The dialog displays ACTIVE SITE, a collapsed AVAILABLE MIRRORS ordering/editor section, and the existing collapsed BROKEN manager. The active entry has one set of launch actions; its ordering row does not duplicate those actions. Any eligible destination, including a broken preferred destination and the original URL, can be explicitly preferred. A working explicit selection immediately becomes active. All header, copy, Direct, Proxy and skipped-prompt launches resolve the current stored state. Explicit child links keep their own destination and note identity. Legacy schemeless addresses are normalized for launch/copy without rewriting saved addresses.

## Feedback and interaction

A genuine automatic active change gets a purple PROMOTED badge for seven seconds. Reopening an unchanged choice does not replay it. First-time fallback caused by Mark Broken opens the purple explanation for approximately eighteen seconds. Focus/pointer interaction pauses its remaining countdown and leaving resumes it. The purple icon opens neutral selection help; only a real promotion event supplies the event-specific explanation. Dismiss restores focus to the icon. Close, refresh and page lifecycle handlers cancel timers, and feedback expiry never writes destination state.

Mirror order uses one pointer controller for mouse, touch and pen, plus Move Up/Down actions in row options and grip arrow keys. Available destinations are compact 56px rows in a bounded scroll region; only the active site has a full launch card. Row options contain preference, copy, broken status, launch, movement and custom deletion actions. Cancellation leaves storage unchanged. Six-dot grips are shared across bookmark/category/section arrangements and Quick Settings. Existing handle menus, body holds, keyboard controls and touch-scroll cancellation remain.

Bookmark/category drops share the same resolver for previews and commits. Lists use item midpoints; grids select the actual row and nearest cell, then the cell's before/after edge. Target identities include the destination category and subsection, including empty sections. Release recomputes geometry after scrolling. A compact insertion space lives outside document flow while adjacent rows shift using transforms. Geometry excludes those temporary translations, and contained tall categories take priority over shorter neighboring categories. Native hit targets remain stable as children move. The shared metadata preview uses the actual name/icon, purple for bookmarks/mirrors and cyan for categories. Pickup, FLIP movement and settling respect reduced motion; pointer tracking and preview updates run once per animation frame. Existing touch edge scrolling remains. Native mouse dragging requires a dedicated grip.

Subsection, folder and Show More changes retain lazy DOM and icons. Cancellable 210ms height/opacity animations handle rapid reversal, with immediate `inert` on collapse and final `hidden` state. Reduced motion skips animation. Category Add controls use cyan, Quick Settings header Info uses purple, and popup viewport dimensions no longer interpolate during resize.

## Return Home

Only a homepage launcher registers its exact script-opened child with a per-launch token. Return Home sends a same-origin message through the supported opener relationship. The homepage checks origin, token, exact WindowProxy, and the child's current proxy/wrapper location before focusing itself. It closes the registered child only after `document.hasFocus()` confirms focus. Direct external launches retain their existing severed opener behavior.

If focus, opener access, storage, or closing is unavailable, the failed tab navigates itself home. A short request timeout provides that fallback without creating a new tab. Sandboxed errors route through their registered wrapper; about:blank uses its launch origin. No arbitrary-tab enumeration, helper tabs or background monitoring is used. Browsers and platform focus policies can prevent reuse, and opener isolation or a reloaded homepage can remove the relationship.

## Verification

See [UI recovery evidence and current verification](mirror-ui-recovery.md) for the latest results, measured density, screenshot comparisons and reproduction commands. The recovery extends existing state and navigation behavior without a new framework, drag library or production dependency.
