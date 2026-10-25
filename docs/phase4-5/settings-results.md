# Settings verification and refinements

Executed against the combined working branch after the final Settings changes on 25 October 2026. The dedicated real-browser suite passed **15 interaction groups in each of Chromium 154.0.8037.57, Firefox 153.0, and Linux WebKit 26.5**, with no page errors. Machine-readable results: [Chromium](evidence/chromium-settings-results.json), [Firefox](evidence/firefox-settings-results.json), [WebKit](evidence/webkit-settings-results.json).

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
HEAVENLY_BROWSER=chromium node test/browser/settings_celestial.cjs
```

Repeat with `HEAVENLY_BROWSER=firefox` or `webkit`. The browser packages and WebKit host libraries are environment tooling, not application dependencies.

## Verified behavior

- Every one of the 54 established control IDs remains present exactly once, in seven groups. Desktop navigation and mobile accordions retain normal page scrolling. Desktop, tablet portrait/landscape, 390px phone and 320px narrow-phone viewports have no horizontal page overflow.
- Search finds actual setting names, description terms and aliases (`dock`, `bookmark count`, `cloaking`, `keyboard shortcut`, `zoom dimensions`, `fixed count`), highlights useful matches, ranks the most relevant card first, and supplies a clear empty state. Category labels remain attached to results.
- Clearing search restores every disclosure, the previously selected category, exact relevant scroll position and setting focus. The same control DOM node and stored preference string survive search. Keyboard arrows move through results, Enter reaches the setting and Escape clears search.
- Existing Tab Cloaking, Panic Controls, Widget Settings, Master Controls and Bookmark Updates hashes reveal and focus their destination. Back/Forward preserves sensible hash navigation.
- Changes persist through reload and synchronize to a second real tab. Master switches and prerequisite settings disable controls semantically, explain why, and preserve the user's individual choices.
- The real JSON backup download preserves bookmark notes, hidden state and unknown preferences. Export/import dialogs trap keyboard focus and restore it after dismissal. Granular settings import and explicitly confirmed overwrite preserve unrelated local storage and collection data.
- Failed settings writes visibly report failure and restore the displayed actual value. Malformed saved settings remain byte-for-byte unchanged through attempted toggles and can be exported as a recovery copy. Failed widget-position writes roll back the preceding writes. Canceling reset or overwrite leaves stored data unchanged.
- Imported category titles containing HTML/event-handler markup remain inert both in the import tree and saved bookmark manager. Category IDs containing selector punctuation retain their identity and correctly toggle child selections. Reduced-motion styles remove transitions.

## Issues found and corrected during final verification

1. Queued native disclosure `toggle` events could overwrite the selected category after search restoration. Selection now follows intentional summary activation or explicit navigation/deep-link actions, rather than delayed programmatic events.
2. Focusing search could scroll the field into view before the first input event captured the previous position. The arrangement is now captured before focus scrolling, so clearing returns to the setting being edited.
3. Firefox restores some form values across reloads. An old import overwrite choice could therefore carry into a different backup. Opening import now clears the parsed backup and defaults to Merge; overwriting requires a deliberate choice for the current file plus the existing confirmation.
4. Evidence capture could occur while the shared loader was fading. Captures now await its actual hidden state. The search screenshot starts at the page top so the search field and context remain visible.
5. The existing dock appearance preview still used the previous neon circle and dotted ground. It now uses the same navy toolbar controls and rectangular Tools handle as the injected widget system, while preserving its position-preview logic. It is clearly labeled as an example website page.
6. The original deep-link label repeated beneath the new accordion heading. The same existing ID/element now supplies that disclosure heading instead. Import/export child-checkbox matching also compares stable IDs as data rather than interpolating them into CSS selectors, preserving punctuation-bearing IDs safely.

## Visual inspection and scope

The actual desktop, search, expanded, collapsed, tablet and phone screenshots were inspected after implementation. Navigation stays compact; rows have clear labels and supporting copy, switches align to the trailing edge, and optional groups keep narrow screens scannable. Redundant header/nav eyebrow copy was removed. A few legacy inline presentations remain for established complex editors; their controls and event logic remain intact.

These are Linux browsers and emulated viewport/input checks. Physical iPad/Android keyboards, native OS permission dialogs, physical touch precision and lower-powered Chromebook hardware remain manual checks. This suite does not claim external destination availability or complete screen-reader application testing. Existing Quick Settings/catalog/cloaking regression runs and the full Mocha result are documented by the combined verification report.
