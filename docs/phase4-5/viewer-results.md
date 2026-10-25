# HTML Viewer results

Implemented against baseline `f870d509569f241a23090c52c7b4c0b5696fc69b` in the combined Phase 4 + 5 change. The [before audit](viewer-audit.md) records the original behavior; the [security review](security-review.md) documents the execution boundary and independent probes.

## Delivered behavior

- A compact navy workspace gives Run Code a clear primary position, groups secondary actions under Tools, and retains Split, Editor and Preview modes. The desktop divider supports pointer and keyboard resizing and remembers its width. Narrow layouts show the selected panel without losing source or overflowing horizontally.
- The textarea remains lightweight. Its gutter renders only the visible line range, and source counting scans the value once. A 20,000-line document loads, scrolls, accepts caret edits, saves and reloads with a bounded gutter.
- Tab, multiline Tab and Shift+Tab edits save through the same source path. Escape followed by Tab leaves the editor. Ctrl/Cmd+Enter runs the current source. View tabs support keyboard navigation, and compact tablet/phone controls retain 44px touch targets.
- Clear preserves an intentional empty document across reload. Clear and sample replacement retain one persistent recovery copy. Quota failures leave recovery available and report unsaved work; a failed initial source read prevents subsequent writes from overwriting the unreadable saved document. Clipboard feedback follows completion. Fullscreen rejection has an Escape-dismissable fallback with focus restoration.
- Authored HTML executes in a fresh opaque-origin frame on every run. Runtime, syntax, rejected-promise and observable policy/resource failures produce bounded, readable feedback. Open in New Tab severs its opener and keeps authored code isolated from the trusted shell. The existing three-stage VUS fallback remains an explicit launch action; only its separate sandbox receives popup permission, and app windows retain the opaque sandbox.
- Reduced-motion preferences and persisted cloaking work with the global feature switch; disabling features restores the correct Heavenly identity without deleting the saved choice.

## Executed validation

All acceptance and independent security runs exited successfully on Linux. JSON files record browser versions and individual checks.

| Engine | Version | Viewer acceptance | Independent security | Compatibility |
| --- | --- | --- | --- | --- |
| Chromium | 154.0.8037.57 | 17 groups + 4 responsive states passed | 5 groups passed | 4 groups passed |
| Firefox | 153.0 | 17 groups + 4 responsive states passed | 5 groups passed | 4 groups passed |
| WebKit | 26.5 | 17 groups + 4 responsive states passed | 5 groups passed | 4 groups passed |

The four responsive states were tablet portrait 820×1180, tablet landscape 1180×820, phone portrait 390×844 and phone landscape 844×390. Each retained source while switching Editor/Preview and had no horizontal page overflow. Authored attack probes could not access Heavenly parent/top DOM or storage, access their own application-origin storage, or open popups in the normal preview or authored full-window preview. Wrong-source/token/origin diagnostic channels were rejected, and rerunning removed stale timers and diagnostics. Expected errors deliberately thrown by authored test code were separated from unexpected application errors; the final acceptance files contain no unexpected errors.

Commands used:

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 HEAVENLY_BROWSER=chromium \
node test/browser/viewer_celestial.cjs
# Repeated with HEAVENLY_BROWSER=firefox and HEAVENLY_BROWSER=webkit.

NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
node test/browser/viewer_independent_security.cjs

NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
node test/browser/viewer_compatibility.cjs
```

Evidence: [Chromium acceptance](evidence/viewer-browser-chromium.json), [Firefox acceptance](evidence/viewer-browser-firefox.json), [WebKit acceptance](evidence/viewer-browser-webkit.json), and [independent security results](evidence/viewer-independent-security.json). The separate compatibility suite passed external CSS/JavaScript/images, form/link navigation, blocked-content feedback, and a real user-click VUS external app launch in each engine. The app popup has no opener and cannot use application-origin storage, including after navigation; the hub cannot read shell DOM or storage. Results are recorded in [viewer-compatibility.json](evidence/viewer-compatibility.json).

## Visual evidence and remaining checks

Before: [desktop](evidence/before-viewer-desktop.png), [phone](evidence/before-viewer-phone.png). After: [desktop split](evidence/after-viewer-desktop.png), [Editor](evidence/after-viewer-editor.png), [Preview](evidence/after-viewer-preview.png), [script feedback](evidence/after-viewer-error.png), [tablet](evidence/after-viewer-tablet.png), [phone](evidence/after-viewer-phone.png).

These are real browser runs with emulated viewport sizes, not physical iPad, Android, Chromebook or Apple Safari results. Physical touch/virtual keyboard behavior, browser permission UI and device performance still need manual checks. Native fullscreen availability varies; the rejected-fullscreen fallback was exercised.

The sandbox restricts origin-dependent storage, device APIs, workers and some embedded apps. External assets and form submissions can make network requests and do not provide anonymity. Browser events cannot identify every remote failure; WebKit may redact script details. Remote VUS availability was replaced by deterministic routing for fallback tests. An infinite synchronous script can block the tab; reload or close it to recover.

VUS apps that fetch HTML and write it into another window may fail because the popup retains the opaque sandbox. The pre-existing vendored fallback omits its card renderer; the compatibility fixture adds a button that invokes its actual `openApp` function and does not claim a complete fallback catalog UI. The Tools note explains the relevant app restrictions.
