# Coolmath games, search and proxy overhead

Follow-up to PR #176 from `a0922f8`. The [previous resource report](game-resource-diagnostics.md) remains the baseline. Document-base handling is fixed; the earlier Unity game's compiled redirect condition remains unestablished. This investigation treats Papa's Freezeria, Boba Simulator and search separately. No third-party engine code or access checks are changed, and no raw HAR, private headers or third-party resource bodies are committed.

## Papa's Freezeria: an explicit hostname restriction

The original `/0-papas-freezeria?variant=next` completed its normal countdown, loaded the runtime/SWF resources, and responded to Play by changing the canvas to its save-slot menu. That establishes initialization and menu interaction, not a complete play session. The user independently confirmed gameplay on the original site.

Through Heavenly, the embed/runtime loaded, then the runtime navigated away and the loader reported `Could not find a 'startCoolmathGame' method`. Read-only inspection establishes why: before defining that method, the runtime checks the actual browser hostname against its allowed hosts and redirects on rejection. The preview hostname does not satisfy it. The normal Coolmath4Kids graphic was also present beside the working original game; it is an advertisement, not evidence of an incorrect embed.

This is a verified host restriction, separate from the fixed base-resolution defect. It remains enforced. **Papa's Freezeria is not restored as playable on Heavenly.** No hostname spoofing, runtime modification or security-policy relaxation was introduced.

## Boba Simulator: host rejection and engine error flooding

The original site produced a game frame/canvas after its countdown. The user confirmed original-site gameplay; cloud interaction was not independently established. Software graphics also consumed substantial CPU in that original-site session, so CPU use alone is not evidence of proxy overhead.

The proxied game loaded its Godot resources, then the renderer became busy and repeatedly emitted parent/child removal failures followed by dictionary `_unref` failures. The CPU profile concentrated in the engine's `onPrintError` handler. The busy session was stopped; a bounded follow-up captured the first engine errors and stopped execution.

Read-only inspection of the public pack's script tokens establishes the startup path: its HTML5 release-build validator compares `document.location.host` with an explicit list of Coolmath domains. On validation failure, `Game._ready()` calls `get_tree().free()` and returns. The proxy hostname fails that check. Immediate teardown during initialization matches the captured engine errors and error flood.

No pack, engine, allowlist, debug-build flag or browser identity was changed. **The game failure and its error flood remain unresolved under the task's constraints.** The separate proxy optimization below does not restore this game or repair its teardown logic.

## Search: initial results work; live Back restoration remains unresolved

On the original site, the live browser completed suggestions, Enter submission, visible results, opening Papa's Freezeria, Back/Forward, button submission for Boba Simulator and tablet-width touch submission. Through the current proxy, suggestions, Enter submission, visible results and opening Papa's Freezeria also worked with the query preserved.

A focused proxied return with Back reproducibly lost the results, leaving the static search shell and a “No result found” title. The recorded query remained in the address. Search-related JSON requests returned 200 in the successful initial flow. Next also reported invalid repeated slashes in the proxy-shaped rendered address. These observations do **not** establish a single root cause for the Back failure. A trial history-mirror adjustment did not restore the results and was removed; no speculative router patch is shipped.

The final attempted trace encountered a cloud outbound-tunnel 503 before Coolmath loaded. That infrastructure failure is not attributed to Heavenly or Coolmath. Browser access to the protected preview also lacks a configured Vercel CLI/OIDC identity; authenticated deployment response checks are separate evidence. Deployment protection remains enabled. **Full live search/history compatibility remains unresolved**, despite the working initial results/result-opening sequence and passing deterministic search fixtures. Local live button/tablet submission was not completed after the Back failure; fixture coverage is not substituted for that check.

## Measured observer overhead

Heavenly's DOM observer processed inserted parents and descendant insertion records separately, repeatedly walking the same final subtree. In an owned fixture that synchronously inserts 500 nested elements, the old client visits 125,250 subtrees; the fix visits 500: **99.6% fewer visits**.

Each delivery deduplicates inserted roots, skips roots covered by another inserted ancestor, and deduplicates attribute records by element/name. Custom lazy-resource containers remain processed. Sets/maps live only for that delivery, so later moves/mutations still work. Resource rewriting, deferred image attributes and click handling remain intact. No polling or background task was added.

A sequential cloud microbenchmark compared the committed baseline and fixed client using the same local fixture and fresh browser sessions. After one warm-up, five samples had medians of approximately **22 ms before and 13 ms after**. Exploratory timings varied under concurrent load; these figures are local measurements, not a physical-device guarantee. The deterministic traversal assertion covers the proxy defect independently of the upstream game's host-rejection error loop.

## Opt-in development loading diagnostics

The existing local helper now offers a collapsed **Development loading diagnostics** view on proxied pages even without a Heavenly error page. It reuses the existing server/tab opt-ins:

```sh
NODE_ENV=development HEAVENLY_DEV_DIAGNOSTICS=1 node app.js
```

Enable the existing Developer Details checkbox and reload, or set `sessionStorage.heavenly_dev_diagnostics = 'true'` in your own development tab before loading the page. Hosted deployments still cannot serve the helper. Without tab opt-in it adds no fetch/console/resource instrumentation or loading view.

An on-demand snapshot includes coarse errors, iframe load/subsequent-load/error counts, bounded resource-timing observations and canvas counts in at most eight immediate accessible frames. Copied child counters use an allowlist. It never infers initialization, gameplay or unexpected redirects from a canvas/load event; repeated timing entries are not proof of duplicate downloads. Unknown causes say **Exact cause unavailable.**

Persistence is capped at 30 writes per document and 30 sanitized event entries in the existing tab log. Counters saturate at 10,000. Duplicate-resource keys cover at most 64 unique resources and are never copied or persisted. Error floods cannot cause unbounded storage writes. Original console calls, fetch responses and rejections are preserved. Reports omit resource names/URLs, query values, error text, stacks, credentials, cookies, headers, bodies and unrelated storage contents. There is no collection endpoint, polling timer or production monitoring. Clipboard failure selects the report for manual copying.

A renderer trapped in a synchronous error loop may not service this UI. The view is not a watchdog and does not terminate or alter games.

## Bounded live-check workflow

`test/browser/coolmath_live.cjs` is an optional cloud investigation utility, disabled by default. Each invocation runs one game/page, waits through the site's own countdown without changing ads/timers, and collects coarse status/request/error/frame counts and Chromium metrics. It closes the browser at the time limit or after 200 console errors. Canvas presence is explicitly not verified gameplay. Output contains no HAR, request headers or error messages.

```sh
node test/browser/coolmath_live.cjs --help
HEAVENLY_LIVE_CHECK=1 node test/browser/coolmath_live.cjs --game papas --seconds 45
HEAVENLY_LIVE_CHECK=1 node test/browser/coolmath_live.cjs --game boba --proxy http://127.0.0.1:8080 --seconds 45
```

Run heavy checks consecutively in the cloud, not on the user's laptop. Duration is clamped to 20–90 seconds. Playwright/browser binaries are independently installed test tools, not new production dependencies. Fixtures use their own short countdown and synthetic engine; live third-party access behavior remains unchanged.

Linux engines and touch emulation do not establish physical iPad/iPadOS or Chromebook/ChromeOS verification. Full Coolmath compatibility is not claimed. The original HAR 308 emitter and the previous Unity game's compiled redirect condition remain unestablished.

## Regression verification

- `npm test`: **358 passing**.
- Chromium, Firefox and WebKit each cover 15 navigation/history, 9 previous widget/diagnostic, 8 resource/public-diagnostic and 7 new search/loading/performance checks. Chromium adds 4 platform checks: **121 suite checks total**.
- A separate owned-fixture check verifies the optional live utility stops at 200 console errors, does not copy their text and does not claim gameplay.
- New coverage includes search query encoding, suggestions/API/results/result opening, touch/keyboard input, fixture Back/Forward, a short owned countdown, embed redirects/base resolution, repeated initialization, bounded subtree processing, custom lazy containers, bounded diagnostic storage and intact native-host refusal.
- Existing Next URL validation, images, bookmarks, Home, about:blank, widget icons/zoom, upstream 404/SRI/CSP and public/restricted diagnostics remain covered.

Run `node test/browser/search_loading_performance.cjs`, optionally with `HEAVENLY_BROWSER=firefox` or `HEAVENLY_BROWSER=webkit`, alongside the existing browser scripts. The fixtures exercise Heavenly's contracts; they do not establish full Next application compatibility or live gameplay.
