# Bottom categories, width persistence and management controls

Baseline: merged main `2725f32` after #202. Side separators, saved side widths, sparse category collapse, native container-sized bookmark rows, saved category order and keyboard movement already worked. Individual bottom category width controls were absent. Four-dot management still used the older blurred surface and glow.

## Implementation

- Bottom category containers now have their own 44px separator and a **Fit width** action. Mouse/touch drags commit on release; keyboard Left/Right adjusts 24px, Shift adjusts 64px, Home/End sets bounds, Delete/Backspace restores automatic width. A screen reader receives separator orientation, current/min/max width and an accessible name.
- Intent lives in a sparse `categoryWidths` map inside existing `heavenly_home_layout_v1`. No reset or destructive version migration occurs. Only explicit adjustment changes this intent. Narrow viewports cap rendering and later restore the saved width. Moving a category between side/bottom positions retains its stable width identity; side cards do not expose bottom controls.
- Bottom cards use their actual inline container width. The existing measured auto-row mechanism and CSS auto-fill grid share the same 220px minimum: a 500px category fits two cards; a narrow category fits one. Wider categories retain their useful multi-column layout. Headers wrap when the category itself narrows.
- Native touch cancellation, loss of pointer capture, second contacts, Escape, blur, page hide and orientation/viewport interruption abandon a draft width and release gesture ownership. Only the local resize separator reserves `touch-action: none`; ordinary content keeps scrolling.
- Private backup files include `homeLayout` only with Settings selected. Merge combines sparse width/collapse identities; overwrite restores the selected backup layout. Legacy backups without this field leave local layout untouched. Normalization rejects unsupported versions, bounds widths and treats stable IDs as own data properties. Imports roll back collection/settings/layout together if a write fails.
- Four-dot action bars and subsection movement controls use solid navy surfaces, modest borders/shadows, clear focus/pressed states and 44px targets. Functional move actions remain unchanged. The duplicate Layout Options resizing sentence was removed; the useful rotating resize note remains.

## Verification

Focused results: **9 layout unit tests**, **7 Chromium / 6 Firefox / 6 Linux WebKit layout groups**, **5 private-backup groups in each engine**, and **4 existing Chromium sidebar-touch groups** passed. The browser suites recorded no page errors. Actual phone/desktop captures were opened and visually inspected.

Executed commands and raw observations are in `evidence/layout-*.json` and `evidence/layout-backups-*.json`:

```sh
npx mocha test/homepage_layout.test.js
node test/browser/phase8_layout.cjs
node test/browser/phase8_layout_backups.cjs
node test/browser/homepage_layout_touch.cjs
HEAVENLY_BROWSER=firefox node test/browser/phase8_layout.cjs
HEAVENLY_BROWSER=firefox node test/browser/phase8_layout_backups.cjs
HEAVENLY_BROWSER=webkit node test/browser/phase8_layout.cjs
HEAVENLY_BROWSER=webkit node test/browser/phase8_layout_backups.cjs
```

The layout suite exercises real keyboard/mouse controls, width persistence across refresh, 768×1024/1024×768 iPad-like viewports, 1366×768 Chromebook size, 390×844/320×740 phones, one/two-column transitions, side/bottom movement, unchanged bookmark data, Fit width, management focus target size and no horizontal overflow. Chromium additionally sends genuine browser TouchEvent streams through CDP for resizing and cancellation. Backup checks download a real file, import it, verify merge/overwrite/legacy behavior and induce one storage failure to verify rollback.

No physical iPad, Chromebook, touch hardware or Apple Safari testing is claimed. Linux WebKit remains an automated Linux browser engine. Fresh controls and the emulated gesture tests improve confidence; they do not establish physical Safari behavior.
