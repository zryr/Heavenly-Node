## 2026-09-26 - Modal Accessibility & Keyboard UX
**Learning:** Modal dialogs without `role="dialog"`, `aria-modal="true"`, and proper focus management (`Escape` key handling + returning focus to trigger element) are inaccessible to keyboard and screen reader users.
**Action:** Always add ARIA modal attributes, auto-focus close/primary controls on open, handle `Escape` key listeners, and restore focus to trigger buttons on close.

## 2026-10-02 - Custom Dropdown Card Accessibility & Keyboard UX
**Learning:** Custom interactive dropdown cards (like dynamically rendered history items) that rely solely on `onclick` handlers on `<div>` elements are completely skipped by keyboard Tab navigation and screen readers.
**Action:** Always assign `role="button"`, `tabindex="0"`, descriptive `aria-label`, an `onkeydown` handler for `Enter` and `Space` keys, and `:focus-visible` CSS focus indicators when turning `<div>` elements into interactive controls.

## 2026-10-05 - Search Autocomplete Dropdown Combobox Accessibility
**Learning:** Custom input autocomplete/history dropdowns without `aria-expanded` and `aria-controls` fail to communicate their state to screen readers, and lacking an `Escape` key listener prevents keyboard users from dismissing the overlay without losing focus.
**Action:** Link custom input overlays with `aria-controls` and `aria-expanded="true|false"`, and attach an `Escape` key listener to dismiss the overlay and sync state.

## 2026-10-06 - Search Input Clear Button & Escape Key Dismissal UX
**Learning:** Search inputs without an inline clear button and `Escape` key listener force users to manually select and backspace text to clear search filters or dismiss overlays.
**Action:** Always provide an accessible clear button with `aria-label` and `title`, toggle its visibility on input, and attach `Escape` key handlers to reset search filters and refocus inputs.

## 2026-10-07 - Dynamic Drag Handle & Reorder Bar Keyboard Accessibility
**Learning:** Drag handles dynamically rendered as `<div>` elements without `tabindex="0"`, `role="button"`, `aria-label`, and `onkeydown` listeners render bookmark reorder menus completely inaccessible to keyboard and screen reader users.
**Action:** Configure drag handle `<div>` elements with `role="button"`, `tabindex="0"`, descriptive `aria-label`, `:focus-visible` outline styles, and `onkeydown` handlers for `Enter` and `Space` keys to open reorder action menus.

## 2026-10-13 - Code Editor Area & Action Toolbar Accessibility
**Learning:** Textareas and icon/text action buttons in code editor interfaces without explicit `aria-label` attributes leave screen reader users unaware of their purpose, while status indicator bars require `aria-live="polite"` to dynamically announce execution and editor updates.
**Action:** Always add descriptive `aria-label` attributes to code editor textareas and action toolbar buttons, and configure status indicators with `aria-live="polite"`.

## 2026-10-18 - Modal Copy Status Announcements & Action ARIA Labels
**Learning:** Dynamic status feedback elements (like copy confirmation text in modal dialogs) that update without `role="status"` and `aria-live="polite"` remain unannounced to screen reader users, while icon/text action buttons in secondary modals require explicit `aria-label` attributes to clarify action intent.
**Action:** Always assign `role="status"` and `aria-live="polite"` to dynamic feedback containers and provide descriptive `aria-label` attributes on modal action buttons.
