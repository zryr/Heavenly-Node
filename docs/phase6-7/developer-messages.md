# Developer HQ message workshop

Type `codex` in the main URL/search input and deliberately submit with Go or Enter. The existing shortcut opens Developer HQ; it is not authentication. There is no visible public shortcut, GitHub credential, publishing endpoint or privileged server write. Official rankings, Heavenly Picks and scoped QA tools retain their existing workflows.

The **Homepage messages** tab lists every registered ordinary and special entry. Search wording or stable ID, or filter by kind. Select an entry to change its wording, emphasis, approved gradient, theme, icon, animation, enabled state, selection weight and reduced-motion fallback. The scene dialogue disclosure edits bounded text, approved speakers and registered local artwork. IDs, kinds and the registered scene or playlist action remain fixed. Reorder changes source order; weights from 0.1 to 10 control relative selection frequency in the public controller. Public rotation still begins with an ordinary message.

**Preview current form** validates the complete candidate before using the same safe renderer as the homepage. Authored strings become text nodes. The renderer uses approved theme and asset enums and validates the actual destination field, accepting HTTPS without credentials or the exact `/settings.html` and `/html-viewer.html` routes. It rejects JavaScript/data URLs, protocol-relative links, arbitrary local paths, HTTP and nested links inside interactive actions. Preview links retain the reviewed destination but do not navigate away. **Try scene / action** runs the selected action inside the preview; playlist navigation is disabled. Reduced motion uses the renderer’s still artwork and avoids the dance burst. Closing HQ or changing its tab destroys the preview and its scene listeners and timers.

**Save message draft** changes only the local message configuration. The complete validated draft is stored in `heavenly_dev_hq_messages_v1`, separately from rankings, Picks, public message preferences, dismissals and personal bookmark data. Unapplied form edits stay in memory while browsing, saving another entry or undoing a saved change. Keyboard save and reorder retain focus; adding or removing dialogue lines keeps their editor open. Invalid input leaves the form and previous saved copy intact. If storage fails, validated edits remain available in memory for export. If a saved draft is corrupt or targets a different bundled source version, it remains untouched; further edits stay in memory until the user explicitly discards that local copy. Discard names its exact scope, asks for confirmation and retains Undo.

## Reviewed publication

1. Save or revert unapplied form edits. Inspect the actual link destinations, ordinary entry preview, special scene dialogue and reduced-motion preview.
2. Open **Review & export message configuration**, choose a version newer than the bundled message source, and check the explicit review box.
3. **Export reviewed message JSON** downloads the entire validated configuration as `heavenly-messages.json`. Downloading does not publish or change `HeavenlyMessagesData`.
4. Replace `public/assets/heavenly-messages.json` on a feature branch and run `node scripts/build-messages.cjs` and `node scripts/build-messages.cjs --check`. Commit the reviewed JSON and generated `public/assets/heavenly-messages-data.js` together.
5. Run the unit and affected browser suites, inspect the source diff, and publish through a reviewed repository PR.

Import accepts a complete validated configuration with the current set of registered identities and actions. Save or revert unapplied forms first; an import cannot silently replace them. Unknown, duplicate or missing entries and unsafe destinations fail before replacing the current draft. Disable an entry instead of deleting it. Import does not publish the source or edit personal data.

`public/assets/heavenly-messages.json` is the canonical authored source. The generator runs the runtime schema validator before writing its deterministic UMD browser asset and escapes markup delimiters and JavaScript line separators in authored strings. `--check` fails when the generated asset is missing or differs from the validated source; the regular unit suite also checks source equality and safe serialization. No timestamps or environment values enter the generated file.

## Verification artifacts

- `test/developer_messages.test.js` exercises actual draft validation, stable identity/action protection, safe destination checks, reorder, source export, saved-draft recovery, generated-asset staleness and safe deterministic serialization.
- `test/browser/developer_messages.cjs` exercises the real HQ through typed `codex` submission, form edits, malicious destination refusal, literal rendering, reorder/Undo/enabled state, contained scene and playlist QA, reduced motion, real JSON download/import, browser storage scope and recovery preservation.
- Browser execution results are written to `evidence/developer-messages-browser-results.json`, with rendered HQ screenshots and downloaded configuration artifacts alongside it. Engine versions and executed checks are recorded there. Responsive viewport checks are emulation on Linux; they do not establish physical phone, iPad, Chromebook or Apple Safari behavior.

Run the focused checks with:

```sh
node scripts/build-messages.cjs --check
npx mocha test/developer_messages.test.js test/messages.test.js test/dev_panel.test.js
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node test/browser/developer_messages.cjs
```

The browser suite exercises Chromium, Firefox and WebKit, records their actual versions, and captures both the message browser and the lower form controls at 1440px, 390px and 320px. It waits for bounded layout after each viewport resize before asserting widths.

The final recorded run passed all 14 browser groups in Chromium 154.0.8037.57, Firefox 153.0 and WebKit 26.5, with zero page errors. It deliberately leaves the public Settings message behind HQ to cover hidden-tooltip overflow while the editor is open. The focused pure suites passed 29 tests, including all 10 draft and generator checks.
