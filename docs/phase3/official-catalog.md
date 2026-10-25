# Official catalog maintenance — Phase 3

The release is `2026.10.24.1` (October 24, 2026). It adds **History Minds** (`bm_history_minds`, exact `https://historyminds.com/activities`) and **Dancing Bunny** (`bm_dancing_bunny`, exact `https://cdn.jsdelivr.net/gh/ltorl/dancing-bunny/index.svg`). Both use shipped vector presets, so unavailable third-party favicon services cannot leave a broken icon. Fresh Games defaults place Dancing Bunny immediately before Gamebois. Existing collections receive additions through Bookmark Updates and append them without resetting saved sorting. SVG/CDN destinations retain ordinary HTTP(S), Direct and Proxy eligibility; the URL is never rewritten because of its extension.

## One source for official ordering

Bookmark content remains in `public/assets/heavenly-catalog.js`. Official default layout is maintained in `public/assets/heavenly-official-order.json`: versioned stable IDs, category sidebar/order, subsection order, and bookmark parent/category/subsection/order. Its generated `heavenly-official-order.js` bridge loads before the catalog on the homepage, Settings and proxy client. It is a generated browser artifact, not a second independently edited source.

Codex Developer HQ drafts use this exact JSON schema. Drafts never read or change a visitor's effective bookmark collection. Validation rejects unknown/missing/duplicate IDs, malformed schema, invalid destinations, incomplete or conflicting positions, unsupported moves and circular nesting. Accessible move controls and the preview operate on the same draft model used for export.

To publish reviewed ranking changes:

1. Open `codex`, edit Official Rankings, inspect the preview and validate.
2. Export with a newer catalog version. Replace `public/assets/heavenly-official-order.json` with that reviewed file.
3. Run `node scripts/build-official-order.cjs`. It validates every identity and destination before regenerating the bridge. The catalog release version comes from this manifest.
4. Update the release date and human-readable summary in `heavenly-catalog.js`. Content additions also need a canonical content definition and matching manifest record. Keep permanent IDs stable.
5. Run `node scripts/build-official-order.cjs --check`, `npm test`, and relevant browser review/restore flows. Commit the JSON, generated bridge and content changes together in a PR.
6. Review and publish through the repository's normal approval process. The browser has no publishing endpoint or GitHub credential.

Applying a catalog update accepts reviewed official ranking snapshots; it preserves existing personal ordering and placement. Skipping advances only the reviewed baseline. An unchanged skipped addition stays absent through reloads, subsequent releases, restore and private-backup round trips.

## Newgrounds identity migration

The canonical identity is **`bm_ng`**, the preexisting built-in identity. It is titled **Newgrounds** and retains the conventional Newgrounds URL/favicon presentation. The shipped `builtIn:false` alias **`bm_user_ng`** is retired through an identity-specific compatibility migration. No title/URL deduplication is performed on unrelated personal bookmarks.

The repair runs on load, import and update planning independently of optional release decisions. It adds no missing games. One existing record is promoted in place when only the alias exists; if neither identity exists, the repair installs nothing. With both present:

- Preserve a customized canonical destination and order. Otherwise, a moved/custom-ordered alias supplies its location. If both have conflicting placements, canonical wins and both originals remain recoverable.
- If one legacy identity is nested inside the other, detach it before combining children. When the canonical bookmark is inside the retired alias, promote it into that alias's slot, retain the remaining personal folder tree, and record the placement adjustment. Both original trees stay in recovery.
- Hidden is the union of both hidden choices, preventing an update from revealing an intentionally hidden bookmark.
- Keep all children by stable identity and concatenate their existing order. Different personal identities with the same URL remain distinct. Malformed duplicate identities are rejected before any storage write.
- Keep both different personal notes with a source separator. Complete originals retain full notes even if a note editor's normal 4,000-character display limit applies.
- Transfer nonconflicting custom icon, destination, launch, Quick Save and other saved fields. Canonical conflicting custom values win; original alternatives remain available for recovery.
- Combine mirror priority lists without duplicating identities; preserve canonical active/preferred choices and fill missing choices from the alias. Conflicts remain in migration diagnostics.
- Preserve URL-keyed broken-link markers and unrelated Settings. No separate storage key is reset.

Private `_catalog.migrations.newgrounds.originals` stores complete original records plus deterministic fingerprints, and `conflicts` records ambiguous fields. **Saved links & recovery** in Newgrounds provides the local recovery download. Public share projection recognizes the retired alias and excludes all `_catalog` metadata, including the archive. Private complete backups retain it.

The alias is removed from accepted/reviewed identities and installed tracking and receives a tombstone. Repeated migration or Apply cannot recreate it. Existing decisions and tombstones remain intact. A quota/access/validation failure leaves the previously stored collection unchanged; there is no reset fallback.

## Restore accepted official order

`HeavenlyCatalog.previewRestore(data, scope)` is read-only and returns `{count, changes, scope, fingerprint}`. `restoreOrder(data, scope)` returns a changed clone. `commitRestore(storage, scope, fingerprint)` checks for concurrent changes and saves the resulting collection in one write. Scope is `{}` for global, `{categoryId}` for a category, or `{categoryId, subSectionId}` for one subsection.

Restoration uses the **latest accepted snapshot**, not an unaccepted shipped release. It changes only eligible order fields, the official subsection array order, and category sidebar placement for an explicitly confirmed global restore. It leaves personal records and their fields intact, preserves custom subsection slots, and never moves a built-in between categories, subsections or folders. Missing, intentionally deleted and skipped entries are not installed. Hidden entries stay hidden; notes, custom mirrors, launch preferences, active/preferred sites, broken markers, Settings and catalog decisions are preserved.

The confirmation UI previews affected entries, provides Cancel, restores focus and announces completion. A stale preview or write failure produces an error without a partial reset.

## Verification

`test/phase3_catalog.test.js` exercises all 16 required migration cases: fresh, both, either alone, both notes, both children, hidden differences, personal positions, mirrors, old import, Skip, repeated Apply, reload, invalid data, write failure and unrelated same-URL personal records. `test/phase3_migration_audit.test.js` adds direct and deeply nested legacy-identity layouts in both directions, checking every personal child survives exactly once. Further cases cover exact destinations, bundled icons, browser bridge parity, public-share privacy, official ranking review, restoration scopes, accepted-versus-skipped defaults, moved built-ins, immutable previews and atomic failures. `test/catalog_updates.test.js` continues to cover the existing review and import engine. Browser results and genuine screenshots are documented separately in the Phase 3 delivery report.
