# Heavenly Node: final post-#207 implementation

Base: `3ed9bc5` (`main`, merged PR #207), fetched and verified again before delivery. One implementation branch: `feat/heavenly-arcade-final-handoff`. No source PR, Jules PR, or implementation PR was merged by this work.

## What shipped

Games opens **Heavenly Arcade**, a presentation of the existing bookmark catalog. It has All, Featured, Newgrounds, General and Favorites; a compact **Syshi's Picks** showcase; distinct Play and Details targets; persistent item-specific Direct/Proxy and New Tab choices; favorites; editable personal games; mirror/recovery access; and shared Collections. Ordinary game cards have no thumbnail dependency.

Collections support editable names/icons, one level of nesting, independent membership order, multiple membership, keyboard movement, mouse and deliberate touch-hold handles, multi-select Add/Move/Remove, merge review, non-destructive deletion and guarded Undo. Bookmarks and Arcade open the same manager and use the same records. Homepage search finds collection members even when their collections are collapsed; legacy exact-URL aliases produce one effective search result.

Quick Save now opens a searchable destination dialog from game cards/details and the existing supported proxy widget. It can create a collection, choose its placement, edit an existing destination's name/icon, and save the record/membership together. Cancel leaves storage unchanged. The widget retains its existing per-bookmark and Quick Settings visibility controls and no longer navigates home after saving.

Exactly seven supplied WebP files are committed under `public/assets/messages/portraits/`. Their original SHA-256 values, byte sizes and WebP alpha flags are tested. Ao Oni uses the two approved retro sprites with pixel scaling; Khezu uses Hunter Smug, Suspicious You and the new Speed Meme, with `yo wth 😭`. Doggy's existing manual scene also uses Neutral You and canonical Cloudy Main. The regular and pixel styles stay separate; illustrations use contain/bottom positioning.

## Audit against the merged baseline

| Scope | State on main | Result |
| --- | --- | --- |
| Latest main after #207 | Done/working | Verified merge and ancestry; no rebuild of the Express/vanilla stack |
| Final seven portraits | Absent | Supplied bytes committed, checksummed, alpha checked, all seven roles rendered |
| Ao Oni/Khezu final presentation | Partial | Retro Ao Oni, illustrated Khezu, exact final lines and brief reaction beat |
| Manual note triggers, typewriter, replay, completion, automatic-event preference separation | Done/working | Reused shared engine; browser-tested first/second tap, keyboard, Escape, replay and independent state |
| Ao Oni GIF burst, fade and reduced motion | Done/working | Reused five bounded dancers and lifecycle cleanup; tested |
| Note copy, ocean Nae-Nae emphasis, music-note suppression, anger/Hulk placement | Done/working | Preserved and tested |
| Command-only HQ and real homepage Preview/Cancel/Restore/Save | Done/working | Preserved safe rendering and draft boundaries; tested in three engines |
| Arcade hub | Absent | Integrated view over canonical records; no standalone game or duplicate catalog |
| Picks curation | Partial | Renamed the existing public/draft showcase to Syshi's Picks; retained intentional Coming Soon |
| Per-game preferences and favorites | Partial | Stable identity-based shared state; existing bookmark controls remain synchronized |
| Unified Collections | Absent | CRUD, nesting, multiple membership, independent order, bulk organization, merge and Undo |
| Quick Save | Partial | Searchable, transactional dialog shared with the existing proxy widget |
| Legacy game folders | Partial | Repeat-safe relationship migration; source records and conflicting metadata retained |
| Catalog updates and restore | Done/working, with preservation gaps | Kept reviewed three-way reconciliation; added shared envelope preservation, backup/import and safer explicit reset |
| GN Math ordering | Partial | New reviewed official-order release places GN Math above SitesDotCom; user order is retained |
| Budsin and Artic mirrors | Done/working | Existing exact entries retained; no duplicate records added |
| Surfd, BrainWorks PEAK, KRESKA.art | Unverified | No records or verified destinations found in current catalog, repository sources/history or supplied prompt; no URLs invented |
| Touch dragging, panel resizing, container density | Done/working | Preserved homepage gestures/layout; added equivalent collection handles and keyboard alternatives |
| Direct errors, history, New Tab, cloaking, Quick Settings, HTML Viewer isolation | Done/working | Retained and exercised through regression suites |
| Music shortcut, Save Heavenly, local document Panic appearance | Done/working | Retained and verified, including supported proxy injection |
| Morrowfield Academy isolation/title | Done/working | Preserved separate generated documents; automated unit coverage retained |
| Palette/Bolt/Sentinel review | Required | Selective adaptations and per-PR decisions in [contribution review](contribution-review.md) |

## Persistence and recovery

- The existing `heavenly_bookmarks` key remains the single catalog/store. `_collections` contains versioned relationships, aliases, preferences, migration provenance and collection presentation settings. It does not contain a competing copy of every game.
- Existing bookmark IDs remain authoritative. Exact safe URLs can share an effective identity; only known tracking parameters are removed for duplicate comparison. Different paths, queries and hash routes stay distinct. All original legacy records, notes and mirror data remain available. Details exposes retained legacy versions and an explicit **Keep as separate item** action.
- Old game folders become collection memberships. Deeper legacy folders are projected as siblings under the category so there are no grandchildren; their original hierarchy remains in the unmodified legacy tree. Moved official games are recognized from the accepted catalog identity rather than guessed from a hostname.
- Migration keeps a seen-ID set, so reopening does not duplicate records or recreate deleted migrated collections. Malformed/unsupported shared schemas are refused without replacing the saved bytes; the existing recovery export remains available.
- Mutations prepare a clone, validate it, compare the original stored value and commit the whole envelope in one localStorage write. Quota/storage failures preserve the original. This is optimistic browser-local storage, not a cross-device database or a cross-tab transaction service.
- Collection deletion never deletes records; child folders become top-level. Merge defaults retain distinct records and destination metadata, with explicit order/source-deletion choices. Undo refuses to overwrite later changes. Open item/collection drafts are retained if newer saved edits would conflict.
- Existing catalog Apply/Skip/Later decisions and three-way overrides remain in `_catalog`. Catalog updates and Restore Official Order preserve the relationship envelope. The explicit Reset built-ins action now retains personal titles/URLs/icons, notes, descendants, favorites, launch/mirror choices, custom sections and catalog decision history.
- Complete private backups include `_collections`; selective backups retain appropriate relationship metadata. Actual download, merge import, overwrite import, invalid nesting rejection and storage rollback were exercised. Public share codes strip private collection preferences/migration data along with the existing private catalog metadata.

## VUS and catalog curation

VUS is the existing HTML Viewer launcher: it tries the upstream `Cra-Z-Gaming/VUS` source, the proxied source, then `/vendor/vus.html`, and executes the result in the existing opaque-origin sandbox. Arcade details links into that existing launcher rather than creating a second implementation or weakening its sandbox. Browser restrictions and upstream availability still apply.

The checked-in `heavenly-picks.js` currently has **zero published recommendations**. Coming Soon is intentional. The existing command-only HQ still previews/exports reviewed Picks and official-order sources; no recommendation URLs or popularity/availability claims were invented. A published Pick that matches an existing identity or exact URL references that canonical game. A new reviewed recommendation seeds an official record in the same release and is offered to existing visitors through Apply/Skip, with no second game store. Disabled/removed recommendations do not erase retained personal records. Bump the official catalog version when publishing new curation.

## Verification and evidence

See [test matrix](verification.md), [machine-readable browser results](evidence/arcade-results.json), [regression matrix](evidence/regressions-results.json), and [visual checks](evidence/visual-results.json).

| Before / after and interactions | Evidence |
| --- | --- |
| Previous homepage | [Baseline capture](evidence/home-before.png) |
| Updated homepage | [Current capture](evidence/home-after.png) |
| Arcade desktop | [Desktop](evidence/arcade-desktop.png) |
| Tablet portrait / landscape | [820px](evidence/arcade-820.png) · [1180px](evidence/arcade-1180.png) |
| Phone | [390px](evidence/arcade-390.png) |
| Collections | [Organization workflow](evidence/collections.png) |
| Retro Cloudy | [Ao Oni](evidence/msg_ao_oni-1.png) |
| Only approved Hunter | [Hunter Smug](evidence/msg_khezu-0.png) |
| Final Cloudy reaction | [Speed Meme](evidence/msg_khezu-2.png) |
| Canonical Cloudy and Neutral You | [Cloudy Main](evidence/msg_doggy-2.png) · [Neutral You](evidence/msg_doggy-1.png) |
| Responsive illustrated scene | [Phone](evidence/msg_khezu-phone.png) |
| Bounded dance surprise | [Burst](evidence/ao-dance-burst.png) |
| Short interaction recording | [Walkthrough WebM](evidence/walkthrough.webm) |

## Practical limits

Physical iPad Safari, school Chromebook hardware/policies, the physical on-screen keyboard, and actual desktop browser zoom were not verified. Linux WebKit, touch streams and viewport changes are not proof of those environments. External game/network health and universal embedding are not claimed. The original proxy/Direct recovery and anti-framing boundaries remain in place.

Vercel produced a READY preview at the application commit. Deployment Protection remains enabled. The connection can inspect deployment state but its authenticated-share and protected-fetch tools return an access/not-found error; no CLI credentials are configured. Consequently live protected-preview interactions are unverified. The protected preview URL and final deployment commit are recorded in the pull request.
