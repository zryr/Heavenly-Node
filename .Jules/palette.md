## 2026-09-26 - Modal Accessibility & Keyboard UX
**Learning:** Modal dialogs without `role="dialog"`, `aria-modal="true"`, and proper focus management (`Escape` key handling + returning focus to trigger element) are inaccessible to keyboard and screen reader users.
**Action:** Always add ARIA modal attributes, auto-focus close/primary controls on open, handle `Escape` key listeners, and restore focus to trigger buttons on close.

## 2026-10-02 - Custom Dropdown Card Accessibility & Keyboard UX
**Learning:** Custom interactive dropdown cards (like dynamically rendered history items) that rely solely on `onclick` handlers on `<div>` elements are completely skipped by keyboard Tab navigation and screen readers.
**Action:** Always assign `role="button"`, `tabindex="0"`, descriptive `aria-label`, an `onkeydown` handler for `Enter` and `Space` keys, and `:focus-visible` CSS focus indicators when turning `<div>` elements into interactive controls.

## 2026-10-05 - Search Autocomplete Dropdown Combobox Accessibility
**Learning:** Custom input autocomplete/history dropdowns without `aria-expanded` and `aria-controls` fail to communicate their state to screen readers, and lacking an `Escape` key listener prevents keyboard users from dismissing the overlay without losing focus.
**Action:** Link custom input overlays with `aria-controls` and `aria-expanded="true|false"`, and attach an `Escape` key listener to dismiss the overlay and sync state.

## 2026-10-08 - Search Empty State & Actionable Reset UX
**Learning:** Real-time client-side search controls that hide all content on zero matches leave users confused if no explicit feedback card or direct "Clear Search" reset button is provided.
**Action:** When filtering lists dynamically on search input, always render a styled empty state card informing the user of no matches and providing a direct "Clear Search" action button.
