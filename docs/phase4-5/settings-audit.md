# Settings audit and implementation plan

Baseline: `f870d509569f241a23090c52c7b4c0b5696fc69b` (latest main, includes #193 and #196). Captured real Chromium at 1440×1000 and 390×844 before edits: [desktop](evidence/before-settings-desktop.png), [phone](evidence/before-settings-phone.png).

The page is a 2,645-line standalone document with one 780px scrolling column, seven sections, no settings search, and extensive repeated inline card/button styling. All controls are already wired to the shared navigation/settings model; the Quick Settings editor and catalog review are separate established modules. Their controls and DOM identities must survive restructuring.

Findings:

- The first screen is dominated by a master-disable card and cloaking switches. Bookmark density, dock settings, and backup require long scrolling. There is no category navigation, per-setting index, or useful search empty state.
- Repeating glass panels, glowing hover lift, and a large floating Back button compete with the controls. Simple toggles occupy oversized bordered cards. Initial switch inputs have zero dimensions, with only a 26px-high visible target.
- Existing deep links target `tab-cloaking`, `panic-controls`, `widget-settings`, `master-controls`, and `bookmark-updates`; preserve and reveal them through the new groups.
- The entire bookmark catalog is a legitimate advanced disclosure, not a list to duplicate. Its children are dynamic. Index the management control and retain the existing editor.
- Master disabling currently dims and blocks pointer events on widgets but does not disable keyboard access or explain the state in text. Preserve stored individual choices while applying semantic disabled states and a visible reason.
- Settings writes swallow errors. Several destructive/reset actions lack confirmation. Reset built-ins preserves custom bookmarks but resets built-in visibility and arrangement; explain that scope and require confirmation. Import overwrite should require confirmation and successful write feedback.
- Export/import dialogs have focus restoration but lack a complete modal focus trap/background inertness. Improve this without replacing their granular-selection logic.

Direction: calm navy page canvas, a compact sticky navigation rail on desktop, a comfortably readable content column, searchable native accordion groups on smaller screens, compact toggle rows, and purposeful cyan/periwinkle accents. Move the existing controls once; targeted search visibility/highlight updates should not reconstruct inputs, rewrite preferences, or disturb event handlers. Search should snapshot accordion/category/scroll/focus state and restore it when cleared. The page owns no new persistent settings schema.
