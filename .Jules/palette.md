## 2026-09-26 - Modal Accessibility & Keyboard UX
**Learning:** Modal dialogs without `role="dialog"`, `aria-modal="true"`, and proper focus management (`Escape` key handling + returning focus to trigger element) are inaccessible to keyboard and screen reader users.
**Action:** Always add ARIA modal attributes, auto-focus close/primary controls on open, handle `Escape` key listeners, and restore focus to trigger buttons on close.

## 2026-10-02 - Custom Dropdown Card Accessibility & Keyboard UX
**Learning:** Custom interactive dropdown cards (like dynamically rendered history items) that rely solely on `onclick` handlers on `<div>` elements are completely skipped by keyboard Tab navigation and screen readers.
**Action:** Always assign `role="button"`, `tabindex="0"`, descriptive `aria-label`, an `onkeydown` handler for `Enter` and `Space` keys, and `:focus-visible` CSS focus indicators when turning `<div>` elements into interactive controls.
