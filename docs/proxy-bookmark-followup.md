# Proxy and bookmark follow-up for PR #179

## RiveStream 526 investigation

On October 18, 2026, production and the existing PR preview returned HTTP 526 for `https://www.rivestream.app/`. Both responses carried Cloudflare `cf-ray` headers from IAD and Heavenly's sanitized report classified the response as upstream HTTP, response phase, status 526. The production URL first received Vercel's normal 308 path normalization (`https://` to `https:/`); the app repairs that scheme before its outbound request. Preview and production agreed after normalization.

Direct `www` homepage access initially returned 200 with `cf-cache-status: STALE` and `age: 80598`. Fresh direct requests with distinct benign query strings and `Cache-Control: no-cache` returned 526 for both browser-like and Node-like user agents, with Cloudflare headers from MSP and body `error code: 526`. A stale cached document is not proof of a healthy origin. This independently reproduces the upstream HTTP failure outside Heavenly. The apex hostname did not resolve in this environment; its session-proxy CONNECT was denied. No redirect to that hostname was introduced.

DNS for `www` resolved to Cloudflare addresses `104.21.41.215` and `172.67.152.7` plus IPv6 records. Direct HTTP checks used the configured environment proxy and normal CA verification; no insecure TLS option was used. The application request builder uses the target hostname for both the outbound connection and Host header, via Node's standard HTTPS request implementation. It does not override certificate/hostname validation. A raw Node connection from this managed environment timed out, and its local app request reported a separate connection refusal (502); those development-network failures are not classified as upstream 526.

The evidence supports an upstream Cloudflare/origin problem, rather than a Heavenly request-construction regression. 526 commonly describes Cloudflare rejecting the origin's certificate; the origin certificate itself cannot be inspected from these responses, so its exact defect is not asserted. No TLS validation, hostname check, upstream error status or fallback policy was changed. RiveStream is **not reported as working through Heavenly**. Correcting its origin configuration requires its operator.

## Error details

Advanced Details is a native, compact expandable row with a diagnostic icon and chevron. Expanded fields use aligned label/value rows and thin separators. The sanitized report has its own disclosure and bounded, selectable monospace textarea; Copy Diagnostics and status feedback sit together. Clipboard fallback opens/selects only the report. Native disclosures and selection remain usable without JavaScript. Public allowlists, correlation IDs, classification and the separate development-only diagnostics boundary remain intact.

## Local bookmark expansion

Previously, accordion, Show More and folder controls called `renderBookmarksUI()`, which cleared all three columns and recreated cards and images. Each subsection now owns lazy contents: collapse hides those nodes, expansion reuses them, and Show More appends only previously unseen cards. Folders likewise create children once and reuse them. Existing unrelated nodes, icons, focus and ordering stay in place; search and structural/data changes still use the full renderer. No observer or framework was added.

## Active mirrors and restoration

`HeavenlyBookmarks.mirrorState()` chooses the canonical site when working, then a working user mirror, then a working built-in mirror. It deduplicates by the existing URL key. The launch dialog uses that result for the active URL, primary card, copying, Direct and Proxy; promotion never changes the stored canonical address. Broken entries are available in a compact **Broken (n)** disclosure next to the mirror interface, including the original address. Explicit restoration updates the existing broken-link map and recalculates the primary. Dialog refresh retains note drafts, expanded mirror sections, focus and scroll. User mirrors are preserved, and adding the same URL is rejected.

## Optional public note sharing

The existing Share Bookmarks dialog has **Include personal notes**, OFF on every new session, with an explicit visibility explanation. Only selected bookmark records and their children enter the payload. Explicit opt-in retains the `HBM1_` format and adds `notesIncluded: true`; default and legacy/unmarked payloads omit notes recursively. Shared-note imports keep conflicting local notes by default; a separate unchecked recipient choice permits replacement for matching stable IDs. Unrelated notes stay untouched. Notes remain bounded plain text, and private backups keep their existing behavior. Encoded URL size over 8,000 characters produces a warning to copy the code or select fewer bookmarks; valid saved note content is not silently truncated.

Built-in bookmarks are selectable for sharing, but stay unselected by default. Category controls select their visible child checkboxes; payloads derive from those checked records, so unlisted hidden notes are not pulled in by category membership.

## Adaptive dragging

The existing handle/drop architecture remains. Touch holds use the existing deliberate activation threshold, cancel on pre-hold scrolling/multitouch, and retain the separate body-reset gesture. Precise mouse/trackpad input uses native immediate dragging. Pen handles use a 6px movement threshold and pointer capture with the same move/drop callbacks, shared cancellation and click suppression. Confirmed bookmark/category drags scroll at viewport edges; section and shortcut editors retain their nested auto-scroll logic.

`heavenly-drag.js` renders one lightweight preview for bookmark, category/section and Quick Settings ordering. Actual pointer input determines touch behavior even on a wide hybrid device. Touch or narrow viewports use a compact icon circle; wider precise input uses an icon/title strip. Bookmark previews are purple; section/shortcut previews are blue. Position updates use one pending animation frame and transforms; previews contain no interactive card clone, ignore pointer events and disappear on completion/cancellation. There is no separate browser-tab reorder UI in this repository; existing tab-like sections and shortcut ordering use the shared presentation. Keyboard alternatives remain available. No drag library or production dependency was added.

## Verification

Focused tests cover DOM identity across expansion, active/copied/launched mirror URLs, restoration and draft preservation, opt-in sharing and conflict handling, full share-link decoding, nested/legacy notes, size warnings, genuine upstream 526/redirect classification, no-JavaScript diagnostics, input-specific ghosts, emulated pen drop persistence and edge-scroll cancellation. Existing Coolmath, FMHY-shaped proxy navigation, storage/privacy, bookmark management, widgets, game modes and Quick Settings suites are retained.

Browser checks use automation and emulated input; no physical iPad, Chromebook or pen was available. Firefox remains unavailable: a bounded launch check fails with read-only user-namespace mapping and compositor errors. WebKit host libraries are supplied only in scratch tooling. Final check counts and the latest authenticated preview are recorded on PR #179.

Verified locally: **403 unit tests**, **103 Chromium browser checks** and **30 WebKit browser checks**. Inline JavaScript syntax and `git diff --check` passed. Screenshot review covered active-mirror, Broken manager, sharing and collapsed/expanded error layouts.
