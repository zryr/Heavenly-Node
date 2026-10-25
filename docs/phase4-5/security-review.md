# HTML Viewer security review

Reviewed the implemented Viewer in the combined Phase 4 + 5 working tree, 25 October 2026. The baseline was `f870d509569f241a23090c52c7b4c0b5696fc69b`. This is an independent review of the actual runtime boundary, supplemented by the Viewer acceptance suite. No Google Jules workspace or account was accessed.

## Boundary and implementation

The normal preview receives authored HTML through `srcdoc` inside a sandbox granting only scripts and forms. It does **not** grant same-origin, popup, top-navigation, modal, or sandbox-escape permissions. Its opaque origin prevents authored code from reading Heavenly's origin storage or parent document. Each Run creates a new browsing context after removing any cloned `src`/`srcdoc`; preparing the new document before insertion prevents a previous document from executing during refresh. Removing the old context stops its timers and closes its diagnostic channel.

A CSP meta policy permits ordinary HTML/CSS/JavaScript and HTTP(S) assets, while blocking object embedding, workers, and changes to the document base. Device permissions are explicitly denied. Chromium's `credentialless` property is enabled where available as additional defense; isolation does not depend on that browser-specific feature.

The diagnostic bridge runs before authored code and transfers a private `MessagePort`. Parent registration requires the current preview WindowProxy, an opaque `null` origin, the current random session token, exactly one port, and no previously registered channel. Channel messages are allowlisted, bounded, and displayed as text; they cannot invoke application actions. The token identifies a run, not a privilege or a secret from its own authored document. Untrusted diagnostic text never becomes HTML.

Open in New Tab creates a trusted empty shell following an explicit user click, severs its opener before adding authored content, and places that content in the same opaque-origin sandbox. The shell's inherited origin never becomes available to the authored code. The explicit VUS launch waterfall uses this shell with one additional permission, `allow-popups`, so its user-click app launcher can open a window. It receives neither `allow-same-origin` nor `allow-popups-to-escape-sandbox`: its app windows inherit the opaque sandbox. The normal preview and authored Open in New Tab never receive popup permission. Remote VUS availability is a separate concern from this boundary.

## Executed independent browser probes

Command actually executed with exit status **0**:

```sh
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
node test/browser/viewer_independent_security.cjs
```

| Engine | Version | Result |
| --- | --- | --- |
| Chromium on Linux | 154.0.8037.57 | All 5 groups passed |
| Firefox on Linux | 153.0 | All 5 groups passed |
| WebKit on Linux | 26.5 | All 5 groups passed |

Each engine executed authored JavaScript that attempted to read parent/top application storage, change the parent DOM, read the preview's own application storage, and open an automatic popup. All attempts were blocked. The parent storage sentinel and DOM marker remained exactly unchanged. The tests then executed the same attack in a user-opened full-window preview: the shell had a null opener and its authored child could not access shell DOM or shared storage.

Message tests deliberately pause the genuine handshake before registration through trusted test instrumentation. Real messages from the parent window and a separate opaque-origin sibling frame are rejected even when supplied the current token. Synthetic events exercise wrong-origin and wrong-token gates without relying on Firefox's unsupported cross-origin `MessageEventInit.source` conversion. This distinguishes real browser message tests from synthetic predicate tests; neither is presented as an attacker's ability to execute parent JavaScript.

Further groups verify that rerunning tears down stale timers/diagnostics and a real syntax error produces readable feedback while parent state remains intact. Machine-readable results are in [viewer-independent-security.json](evidence/viewer-independent-security.json). The suite inspects executed attack results, rather than merely checking iframe attributes.

The separate [compatibility results](evidence/viewer-compatibility.json) contain four passed groups per engine, including real external resources, forms/links, observable policy feedback, and the VUS-only popup exception. A real user click invokes the vendored `openApp` external-link path. The resulting popup has a null opener and denied origin storage, including after navigating to another application-origin URL. Executed hub code also cannot read shell storage or mutate its DOM. No same-origin or popup-escape permission was added to make this work.

## Review findings resolved

- The original scripted same-origin `document.write` preview was replaced with opaque-origin execution.
- New-tab authored execution no longer inherits an accessible Heavenly document or opener.
- A cloned `srcdoc` could briefly reload prior code; the new document is now prepared before insertion.
- A source-recovery write failure could replace the durable recovery copy too early; the Viewer now preserves it until the source write succeeds, with acceptance coverage.
- The independent message test initially failed in Firefox because its synthetic event constructor rejected a cross-origin WindowProxy. The test was corrected and all three engines rerun successfully; that failure was not an application isolation failure.

## Practical limits

The preview intentionally permits external assets and form submissions. Those requests are not a privacy or anonymity guarantee, and browser cookie behavior for external requests varies; `credentialless` is not available in every engine. Origin-dependent browser storage, device APIs, popup workflows, workers and some embedded applications are restricted by design. Ordinary preview code cannot access Heavenly parent DOM/storage, but this is not an operating-system or separate-process sandbox. An infinite synchronous script may stop the tab from responding; reload or close the tab to recover. The UI does not claim to identify remote network causes that browser events do not expose.

VUS external-link apps retain a user-click launch path in inherited opaque popup windows. Apps that fetch HTML and then write into another window can fail at that browser boundary; the Viewer does not grant same-origin access to restore them. The vendored fallback already omits its card renderer, so the compatibility fixture attaches a launch button to its real `openApp` function rather than claiming a complete fallback catalog UI. Remote hub code and catalog availability remain external dependencies.

These are Linux browser and emulated-viewport results, not physical iPad, Android, Chromebook, or Apple Safari testing. Native permission prompts, browser chrome, virtual keyboard interaction and physical-device performance remain manual checks.
