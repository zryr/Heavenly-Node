# HTML Viewer audit — before implementation

Baseline: main `f870d509569f241a23090c52c7b4c0b5696fc69b`, 2026-10-25. The existing textarea editor, line numbers, saved-source key, three view modes, run/clear/copy/sample, fullscreen, cloaking and VUS launcher remain the implementation baseline. Baseline screenshots are `evidence/before-viewer-desktop.png` and `evidence/before-viewer-phone.png` (real Chromium rendering).

## Findings

- **P0 isolation:** the preview grants scripts plus same-origin privileges and writes user HTML through `contentDocument`. Same-origin preview code can read Heavenly storage and mutate its parent. Open in New Tab and the VUS waterfall also write executable HTML into a same-origin `about:blank` with an opener.
- The normal preview needs an opaque origin (`srcdoc`, sandbox scripts/forms only), strict parent message validation, credentialless policy defense where supported, and a fresh document on every run. Remote assets can work, but origin-dependent APIs must report their limitations honestly. External requests are not a privacy guarantee.
- A light diagnostic strip can report script/runtime errors, rejected promises and observable resource/CSP errors. It cannot reliably distinguish every remote network failure, and an infinite loop is not recoverable by same-process JavaScript. Browser reload remains a documented recovery.
- Mobile CSS forces both panels visible even in Editor/Preview mode. The desktop split has no resize control. Unnecessary orbs, per-panel blur, many unrelated bright buttons and repeated strong shadows compete with Run Code.
- Source is stored on input but programmatic Tab/sample changes are not persisted. Clear removes saved source and reload silently replaces it with the demo. Copy announces success before clipboard completion. No recovery exists for clear/sample replacement.
- Line numbers create one HTML node per line; long documents should use bounded rendered gutter content with the same textarea line metrics. Keyboard Tab only replaces selections and lacks Shift+Tab or multiline handling. No visible shortcut or Tab-escape hint.
- View buttons declare tabs but lack roving focus/arrow navigation. Editing target and toolbar controls need consistent 44px touch targets; fullscreen fallback needs Escape/focus restoration.

## Direction

Keep the lightweight textarea and existing storage keys. Introduce Heavenly token-based navy surfaces, a compact tool-oriented header, clear Run and Editor/Preview controls, a tools disclosure for secondary actions, persistent keyboard/pointer splitter, single-panel narrow layouts and a concise preview status/diagnostics strip. Preserve source exactly, retain a one-step persistent recovery copy for replacements, and announce storage/clipboard failures accurately. External launcher remains an explicit user action in a separate isolated shell; no evasion capability is expanded.
