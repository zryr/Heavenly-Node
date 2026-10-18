# Game resources, widget icons and public error diagnostics

See the [final launch-mode comparison](coolmath-final-launch-comparison.md) for the current game classifications and stopping decision. Search was subsequently confirmed working by the user and is outside that final investigation.

See the [games/search/performance follow-up](coolmath-search-performance.md) for Papa's Freezeria and Boba Simulator's identified hostname restrictions and the subsequent proxy-overhead investigation.

Follow-up to PR #176. Evidence uses synthetic fixtures and bounded live checks; no raw HAR, cookies, credentials, full headers or third-party HTML are stored here.

## Reported game: boot failure fixed, playability unresolved

The `/0-help-i-cast-the-wrong-spell/play` embed supplies a document base under `/sites/default/files/public_games/38145/`. Its Unity loader, framework, data and WebAssembly URLs are relative to that base. Heavenly's client instead resolved them against the embed's navigation URL. The mutation observer changed the loader to `/0-help-i-cast-the-wrong-spell/Build/…loader.js`, which returned an HTML 404; initialization then failed with `createUnityInstance is not defined`.

Resource rewriting now reads the current document base, including changes made after initialization. Each iframe receives its own resolver configuration. The client also avoids leaking the local proxy port into remote URLs and safely initializes blank API frames and native `createElement(null)` calls observed during the live investigation.

Live Chromium against the fixed local proxy downloaded all four actual Unity resources successfully (HTTP 200, requests completed). The game then navigated its parent to the original Coolmath homepage. Chrome's request initiator identifies the game's `_RedirectTo` function in its framework, called from compiled WebAssembly. The condition triggering that function is **not established**. No game code, origin checks or browser policies were altered to suppress it. **This game remains unverified as playable through Heavenly.** A canvas or completed download is not a gameplay result.

The original site was also opened in Chromium; its game embed and Unity resources loaded. That check did not establish interactive gameplay. Existing production returned the surrounding game page; the prior protected preview could be fetched through the authenticated deployment connector, but no authenticated live-browser session was available for that preview. Those checks do not establish complete production/preview game compatibility.

## Thumbnails: a separate failure

The old HTML prefixer applied URL regexes inside inline JavaScript and JSON. Coolmath's JSON thumbnail inputs consequently became proxy-relative strings. Its image helper only derives the `styles/next_game_teaser_item/public/` variant from absolute HTTP(S) inputs; proxy-relative inputs skipped that branch and requested bare image files. Bounded original-site checks found the styled images loaded, while the corresponding bare URLs returned 404 even with their original query values preserved.

The streaming HTML prefixer now preserves script/JSON bodies and comments while retaining the existing HTML-attribute and CSS URL rewriting. Browser resource hooks still proxy the actual requests. This avoids changing framework configuration strings or introducing Coolmath-specific transformations. Responsive candidate parsing now retains commas inside data/image URLs; picture sources are intercepted, and rewritten `data-srcset` remains deferred instead of being assigned eagerly to `srcset`. Next image query encoding and lazy-loading behavior remain covered by fixtures.

## Widget repairs

Scroll Lock's existing SVG had a fixed cyan stroke on the enabled button's cyan background. Toggle SVGs now inherit the contrasting text color with `currentColor`; narrow layouts keep ON/OFF labels visible. Existing lock/unlock shapes and scroll behavior are retained.

Magnifier toggle and zoom handlers replaced SVG markup with emoji in several states. Dock, floating toggle and lens title now reuse the existing compact SVG glyph in every state. Zoom labels, lens controls and accessible pressed state remain functional. No icon dependency was added.

## Advanced Details on preview and production

Generated error pages include a collapsed native **Advanced Details** section. Its report is built from a fixed server-side allowlist: status, derived classification, safe code, generated request UUID, hostname, origin with path omitted, coarse failure stage, known response source/status, retryability when known and actual timestamp. Redirect count is unavailable; the browser helper adds only a coarse browser family. An error classification does not identify the underlying remote cause, so the report explicitly says **Exact cause unavailable.**

**Copy Diagnostics** copies only this report. Clipboard denial/unavailability selects its text for manual copying. Native expansion and the selectable report work without JavaScript. No request headers, bodies, cookies, credentials, query values, path segments, environment variables, exception messages or stacks enter the public report. The helper reads no storage and sends no requests. Generated errors use `Cache-Control: no-store`; the UUID also appears in `X-Heavenly-Request-ID`.

Malformed/unsupported explicit targets fail before outbound requests with a classified 400. Known DNS, connection, timeout and TLS failures retain supported classifications; timeout phase does not assert which operation consumed the time. Upstream HTML 5xx errors are marked as upstream responses. Genuine upstream 404s remain unchanged, including MIME and `nosniff`. Retry remains a user action; there are no automatic retries.

Local **Developer Details** and its opt-in event helper still require `NODE_ENV=development`, `HEAVENLY_DEV_DIAGNOSTICS=1` and absence of `VERCEL`. Public Advanced Details does not enable those routes or access event storage. Invalid targets do not receive an executable Direct Connection link. Ordinary Retry, Direct and Home actions remain available for valid destinations.

## Verification

- `npm test`: **351 passing**.
- Chromium, Firefox and WebKit: **15 navigation/history + 9 previous widget/diagnostic + 8 game/resource/public-diagnostic checks per engine**.
- Chromium: **4 additional proxy-platform checks**. Total: **100 browser checks**.
- The new fixture downloads synthetic loader/framework/data/Wasm resources using an embed base and requires touch/keyboard input to change canvas pixels. It is evidence for Heavenly's resource handling, not a substitute for live Coolmath gameplay.
- Thumbnail tests reproduce the absolute-JSON-input image-helper branch, picture/data-URL candidates, deferred sources and encoded Next image queries. Other checks cover SVG contrast in both widget modes, zoom, hosted-production redaction/copy/manual fallback, narrow layouts, no-JavaScript details, real 404 preservation and prior bookmark/Home/about:blank behavior.

Run `node test/browser/game_resources_advanced_details.cjs`, optionally with `HEAVENLY_BROWSER=firefox` or `HEAVENLY_BROWSER=webkit`, alongside the existing scripts in the main investigation. Playwright/browser runtimes are test-environment tools, not new application dependencies.

All engine tests ran on Linux with emulated touch viewports, including narrow phone and tablet widths. Physical iPad/iPadOS Safari and Chromebook/ChromeOS were unavailable. The original HAR's 308 redirect owner remains unestablished. Upstream framing/CSP/TLS checks remain intact. The reported game's own redirect and native cross-origin/location assumptions can still limit this path proxy; use the existing explicit Open normally/Direct Connection controls when applicable.
