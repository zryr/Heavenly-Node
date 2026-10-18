# Proxy compatibility investigation

See the [final launch-mode comparison](coolmath-final-launch-comparison.md) for the current game classifications and stopping decision. Search was subsequently confirmed working by the user and is outside that final investigation.

This records the initial PR #176 investigation. See the [game/resource and public-diagnostics follow-up](game-resource-diagnostics.md) for subsequent fixes, live game evidence and current verification results.

This change starts from main at `903ae60` (PRs #167–169 included). Evidence is the supplied **redacted summary**, source inspection, deterministic local fixtures, and limited live response checks. No raw HAR, request headers, cookies, tokens or full third-party HTML belong in this repository.

## Findings and changes

| Issue | Finding | Change / limitation |
| --- | --- | --- |
| Next.js `invalid relative URL` | Heavenly replaced the global `URL` constructor. A `/proxy/https:/…` argument became a remote-origin URL, violating Next's same-origin relative-URL check. The same check appears in Coolmath's live main bundle. Prototype Location spoofing also did not model browsers' non-configurable Location own properties. | Retain native URL and Location semantics; rewrite at request/history boundaries instead. Repair collapsed document paths with native `replaceState` before upstream scripts execute. Canonical URLs keep their existing presentation. This removes a reproducible client defect, without claiming complete compatibility with all Next.js features. |
| 115 slash-collapsing HTTP 308s | Local Express/Unblocker requests for both canonical and collapsed proxy paths return the upstream document/assets without a 308. A genuine local upstream 308 remains 308 and its relative Location is rewritten once. The app has no configured 308 rule. | **The captured redirect owner remains unestablished.** The authenticated live fetch follows redirects and does not expose individual hops. No speculative Vercel route configuration change was made. |
| `/tag/712202.js` returns HTML 404 | Missing script/MIME blocking is independently reproducible alongside working framework URL validation and navigation. | Preserve 404, Content-Type, `nosniff`, JavaScript bytes and SRI. The redacted summary cannot establish why that live resource was missing or whether it has other effects on the site. |
| Bookmark exception | `getPresetSvg` referenced an undefined `PRESET_SVG_PATHS`; the homepage held a different catalog inside its own script. | Share the existing preset catalog between homepage and bundled proxy client, with a small SVG fallback. Preserve preset/custom icon values and categories; save validated remote URLs rather than collapsed proxy paths. |
| about:blank leaves its wrapper | The wrapper treated any iframe load failure, including the initial blank-load race, as a reason to navigate the top-level tab. An unsandboxed frame could also navigate the top. Chromium initially empty popups additionally replaced child history entries. | Ignore the initial blank load, retain the wrapper on refusal, offer **Open normally**, and sandbox automatic top navigation. A single blank-document initialization commits Chromium popup history before mounting; no document.write or repeated fallback loop. Ordinary links and native history remain supported. Live FMHY-specific frame refusal was not established. |
| Home returns to the site | Unblocker's Referer-based recovery treated a request for Heavenly `/` as an upstream root request. A bookmark category is not used to compute Home. | Reserve Heavenly pages/assets before recovery. Home consistently targets Heavenly root; sandboxed widgets communicate only a fixed Home action to their registered same-origin wrapper. |
| Scroll Lock emoji | The toggle replaced its SVG markup with emoji text. | Use matching lock/unlock SVGs, distinct state and `aria-pressed` in dock and floating modes; retain scroll handlers. |
| Streamo 502 | Existing deployment returned 502 / “Server Not Found”. The old code used that category for DNS, temporary DNS, unknown TLS and other errors. Direct HTTP checks in this executor were denied, so independent upstream availability was not verified. | Distinguish permanent/temporary DNS, TLS, connection, timeout and unknown errors. Do not expose raw exception messages. Retry is an ordinary same-page link requiring user action, and Direct/Home remain explicit actions. No claim that Streamo itself is repaired. |

## Developer details

Run a **local development server** with both opt-ins:

```sh
NODE_ENV=development HEAVENLY_DEV_DIAGNOSTICS=1 node app.js
```

502/504 and other generated error pages include expandable Developer Details and Copy Diagnostics. The server also injects a small local event helper into proxied HTML in this mode. Enable its checkbox on an error page and reload, or set `sessionStorage.heavenly_dev_diagnostics = 'true'` in your own development tab before reloading a proxied page. Disable it with the same checkbox.

Only 30 event types/timestamps are retained in that tab's sessionStorage. The later [loading-diagnostics follow-up](coolmath-search-performance.md) also caps persistence at 30 writes per document and adds bounded in-memory counters. There is no server collection endpoint or background logging process. Error messages, stacks, resource URLs, query strings, fragments, usernames/passwords, headers and even target path segments are excluded from copied diagnostics. Server details include status, category, coarse failure phase, a known code, hostname, redacted request description and a generated diagnostic ID. Timeout phase cannot establish whether DNS, connection or response waiting consumed the time.

The asset route returns 404 unless `NODE_ENV=development` **and** `HEAVENLY_DEV_DIAGNOSTICS=1`; setting `VERCEL` disables it as well. Query parameters, cookies and CSS cannot grant access. Responses use `Cache-Control: no-store`. Existing homepage QA UI is unrelated and is not treated as authentication.

## Verification and remaining limits

Run:

```sh
npm test
node test/browser/navigation_history.cjs
node test/browser/proxy_widgets_diagnostics.cjs
node test/browser/proxy_platform_regression.cjs
HEAVENLY_BROWSER=firefox node test/browser/navigation_history.cjs
HEAVENLY_BROWSER=firefox node test/browser/proxy_widgets_diagnostics.cjs
HEAVENLY_BROWSER=webkit node test/browser/navigation_history.cjs
HEAVENLY_BROWSER=webkit node test/browser/proxy_widgets_diagnostics.cjs
```

The browser scripts require an independently installed Playwright and browser binaries; no production dependency was added. The Next fixture exercises the actual origin-validation contract, **not a complete Next.js application**. The synthetic FMHY origin exercises Heavenly's real hostname-specific link handler with locally fulfilled documents. Other fixtures cover redirects, internal game-shaped links, static resources, reload/back/forward, bookmarks, Home, iframe refusal, opt-in diagnostics and MIME blocking.

Upstream CSP, framing and MIME restrictions remain intact. A site can legitimately refuse framing or block injected initialization under CSP. Use the visible wrapper controls to return Home or open normally; this change does not override those restrictions. Site scripts that require an entirely virtual remote origin or directly assign unrewritable native Location properties can remain incompatible with a path proxy. A direct connection may also fail independently.

Browser-engine checks and touch viewports do not establish physical iPad Safari, Chromebook/ChromeOS or desktop-device verification. The captured 308 emitter remains unestablished. The follow-up records live Coolmath resource checks and its remaining game-initiated redirect. Restricted developer diagnostics remain unavailable in production; the separate sanitized Advanced Details panel is now available there.

### Initial recorded results (before the follow-up)

- `npm test`: **333 passing** (baseline: 321 passing).
- Existing navigation/history browser script: **15 checks each** in Chromium, Firefox and WebKit with emulated touch viewports.
- New proxy/widget/diagnostic browser script: **9 checks each** in Chromium, Firefox and WebKit with an 820 × 1180 touch viewport, including script-disabled error actions.
- Existing proxy-platform browser script: **4 checks** in Chromium, including relative modules, SRI enforcement and deployment-toolbar recursion.
- Total: **76 browser checks**, plus syntax checks and `git diff --check`.
- WebKit ran on Linux using temporary downloaded browser/runtime libraries. No physical Apple device or ChromeOS session was available.

The initial preview smoke test exposed a Vercel file-tracing omission: the raw proxy-client source was absent from the function bundle. The legacy Node builder now explicitly includes the client source, local diagnostics helper and public assets; no routing normalization settings were changed.
