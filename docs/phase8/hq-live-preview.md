# Codex HQ: real homepage message previews

The existing `codex` submission in the main URL/search field still opens the local workshop. There is no public HQ shortcut and no server-side publishing authority behind this route.

The older editor already reused the message renderer in a contained card. Phase 8 keeps that quick overview and adds **Preview on homepage**: HQ closes temporarily, the mounted homepage's real note slot displays the unsaved candidate, and clicking its note opens the same dialogue engine, timing, portrait layout and advance arrow used by visitors. This is not a screenshot or a second approximation of the homepage.

- **Cancel preview** restores the previous homepage note and returns to the editor with unapplied form changes and focus preserved. Escape closes an open scene; a further Escape returns to HQ.
- **Restore published note** removes the temporary override while leaving the preview toolbar and editor draft available. It does not reset settings or scene progress.
- **Save draft & return** saves to `heavenly_dev_hq_messages_v1` only. It never edits the public message catalog. If browser storage fails, the existing recovery messaging and memory draft remain available.
- **Cancel form edits** restores the saved local draft. **Restore published version** explicitly replaces that message in the local draft with its shipped configuration; Undo remains available.
- Publishing still requires a reviewed JSON export, the repository generator, checks and a reviewed pull request. Downloading and saving do not publish.

Temporary preview uses the homepage renderer without writing discovered/completed scene state, appearance counts, playlist dismissals or message pause preference. HTTPS and approved local links retain their actual destinations for inspection, but ordinary clicks, auxiliary clicks and playlist launch are disabled during preview. Authored wording is rendered as text, never inserted as HTML; image choices remain restricted to registered local assets and approved portrait slots.

Both note artwork and individual dialogue lines offer **Left portrait**, **Right portrait** and **Inline end of text**. Missing approved portrait files use the shared readable fallback. Old dialogue entries without placement retain their established default, including the Ao Oni side-eye's right placement.

A known Phase 6–7 local draft (`2026.10.25.1`) can move forward to the new registered collection: keep its authored wording, enabled values and order by stable ID, then append newly registered notes. The original stored bytes remain untouched until an explicit save. Unknown versions, unknown identities, malformed content or incompatible actions are refused with their stored data preserved.

Run `node_modules/.bin/mocha test/developer_messages.test.js test/phase8_hq.test.js` and `node test/browser/phase8_hq_live.cjs`. The browser script uses real homepage controls, browser input and native dialogs in isolated profiles, captures actual screenshots, records the Chromium flow and writes `evidence/hq-live-results.json`. Viewports and touch are emulated; this does not establish physical Safari/iPad or Chromebook behavior.
