# Codex Developer HQ

Type `codex` in the main navigation input and submit. This is a frontend shortcut, not authentication. HQ uses local drafts, previews and downloads; it has no GitHub token, privileged backend or publishing endpoint.

## Official rankings

Choose categories, subsections, bookmarks or nested links; filter by category/subsection and search names, stable IDs or destinations. Select an item to inspect its published and draft positions. Use Up/Down/Top/Bottom, Alt+Up/Down on a selected item, or drag inside its current group. Categories may move between supported sidebars; root bookmarks may move to another official category/subsection. Moving a container moves its official descendants with it. Nested links stay in their existing official folder; subsections stay in their category.

Preview shows the exact draft hierarchy and highlights changes in purple. Undo restores the previous workshop state; Discard Ranking Draft returns to published defaults, and can itself be undone. These actions never read or rewrite `heavenly_bookmarks`.

Validation rejects unknown/duplicate/missing IDs, invalid category/subsection destinations, unsupported reparenting, cycles, invalid positions and incompatible schemas/catalog versions. Import accepts a complete ranking manifest for the **current** bundled catalog version; exports for a newer release belong in repository review rather than being imported into an older runtime.

## Reviewed export workflow

1. Edit and preview defaults. Open Review & Export, validate, choose a newer dated catalog version such as `2026.10.24.2`, and check the review box.
2. Export Official Order. Replace `public/assets/heavenly-official-order.json` on a feature branch with the downloaded file.
3. Run `node scripts/build-official-order.cjs`, then `node scripts/build-official-order.cjs --check`. Commit the JSON and generated `public/assets/heavenly-official-order.js` together. The manifest version becomes `HeavenlyCatalog.release.version`.
4. Update the release date and concise user-facing release summary in `public/assets/heavenly-catalog.js` when official defaults/content change. Do not bump the catalog for an unrelated UI/CSS edit. The summary should explain meaningful additions/corrections rather than internal IDs.
5. Run `npm test` and the affected browser checks. Inspect the source diff and open a GitHub PR for review. Publish only after approval.

Fresh installations receive the generated defaults. Existing accepted/personalized collections keep their placement and relative sorting when an official update is accepted. Restore Official Order remains a separate, confirmed public management action.

The model test performs this entire export roundtrip in a temporary repository copy: newer exported JSON → actual generator → generated bridge → catalog fresh defaults. It also verifies an existing personal position and note survive accepting those defaults.

## Heavenly Picks

The checked-in public source is `public/assets/heavenly-picks.js`, with `{schema:1,version,items:[]}`. It intentionally contains no recommendations. The editor supports stable IDs, title, URL, description, optional HTTP(S) icon/thumbnail URLs, tags, enabled status and display order. New entries begin disabled. Save a recommendation before previewing it. Move Up/Down, remove and Undo operate on local drafts.

Preview passes a validated isolated draft to the public Picks renderer. It does not modify `HeavenlyPicks` or visitor bookmarks. Review & Export requires a newer Picks version and downloads a compatible UMD `heavenly-picks.js`. Replace that exact repository file in a reviewed PR; keep public content empty until actual recommendations are reviewed. The test evaluates the exported asset and confirms it preserves the canonical public schema.

Workshop data lives only in `heavenly_dev_hq_draft_v1`, separately from personal bookmarks. Invalid saved drafts are refused and left untouched. Storage failures are reported; an unsaved edit remains in memory. The workshop keeps the last 30 edits for Undo during the page session.

## QA action audit and recovery

| Original action | Codex HQ equivalent |
| --- | --- |
| Loading-screen preview | Existing loading screen with a visible Return to Developer HQ control; cleanup also hides it |
| Error-page preview | Existing HTTP 500 proxy test in another tab; external service availability is explicitly described |
| Cloaking inspection | Auto/persistent cloak state and selected preset |
| Cloaking toggle | Persistent cloak toggle using the existing settings and cloak synchronizer; storage errors are shown |
| Clear local/session storage | Scoped temporary cleanup plus Fresh-install Storage Test below |
| Reset default bookmarks | Confirmed Reset Test Collection, with a complete QA bookmark recovery copy written before replacement |
| Exit/cleanup/restoration | Return control, cleanup action, Restore QA Recovery Copy and Restore QA Storage |

**Fresh-install Storage Test** replaces the unsafe whole-origin clear with a scoped equivalent. Confirmation names its effects: Heavenly-prefixed local and session keys, including bookmarks, notes, settings, broken markers, drafts and catalog decisions. Before any removal it saves and reads back a complete snapshot in `heavenly_dev_hq_storage_recovery`. A backup write/read failure prevents the clear. An existing recovery copy prevents another fresh-install clear. Unrelated origin keys remain. Reload when ready to inspect first-run behavior, then open `codex` → QA Tools → Restore QA Storage to recover the complete snapshot. Restore confirms replacement of changes made since the snapshot, and retains the recovery copy if a restore write fails.

Bookmark reset is intended for a disposable test collection. It saves the complete original collection to `heavenly_dev_hq_bookmark_recovery`, refuses another reset while that recovery exists, replaces only the active collection with fresh defaults, and retains settings and broken-link markers. Restore QA Recovery Copy validates and reinstates the original collection before removing its recovery copy. No destructive action runs automatically.

All previously requested screenshot-specific Jules bugs remain deferred; no claim is made about those unavailable examples.

## Verification

- `npx mocha test/developer_hq.test.js test/dev_panel.test.js`
- `node test/browser/developer_hq.cjs` (Chromium, Firefox, WebKit)
- `HEAVENLY_ENGINES=chromium node test/browser/developer_hq.cjs` for a targeted rerun

Browser checks exercise real command submission, confirmation/cancellation, backup failure, reset/recovery, category/subsection/sidebar edits, nested drag and keyboard reorder, preview highlighting, compatible destinations, Undo, downloads, invalid imports/saved drafts, public isolation, focus return/trapping and reduced motion. Captures and engine results are written to `docs/phase3/evidence`; these are emulated viewports, not physical-device tests.
