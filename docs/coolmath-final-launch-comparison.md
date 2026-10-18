# Final Coolmath game launch comparison

Final focused investigation for PR #176, 2026-10-18 UTC. Search is out of scope: the user reports it now works. Its current implementation and preferences are preserved. The earlier [resource report](game-resource-diagnostics.md) and [hostname/performance evidence](coolmath-search-performance.md) remain the baseline.

## Decision and results

**Stop and retain the best supported fallback.** No new production compatibility patch is justified by this comparison. Keep the existing optional about:blank launcher for individually verified games; use explicit direct navigation to the official site for the incompatible games below. Do not automatically route Coolmath through a wrapper. **Open normally** in the wrapper opens the current *proxied* URL; it is not a direct-site action.

| Game | Direct website | Normal Heavenly proxy | Heavenly about:blank | Outcome |
| --- | --- | --- | --- | --- |
| Papa's Freezeria | Working, user-confirmed; prior cloud check reached the interactive save-slot menu | Not working: runtime hostname guard rejects the proxy before startup | Not working: same guard; direct game-frame navigation and blocked top navigation; no startup method | Unsupported on the tested proxy hostname under the stated constraints |
| Boba Simulator | Working, user-confirmed; prior cloud check reached the canvas, gameplay not independently verified | Not working: host rejection triggers scene-tree teardown and an engine error flood | Not working: same resources and teardown/error flood; stopped at 200 errors after 22 seconds | Unsupported on the tested proxy hostname under the stated constraints |
| Help, I Cast the Wrong Spell! | Partially working in cloud: animated title screen; gameplay/input response not established | Not working: assets load, compiled code invokes `_RedirectTo`; current upstream iframe sandbox blocks it and initialization throws | Not working: assets load; ancestor navigation blocked, SecurityError, blank game canvas | Unresolved compiled trigger; end further investigation rather than suppress it |

“Working” requires gameplay and input in the intended navigation context. The first two direct results explicitly credit the user's verification. A title screen, canvas, menu response or HTTP 200 alone is not a working-game result. **None of these three games is verified playable through Heavenly in either mode.** This does not contradict the user's report that other games work in about:blank; no names for those successful examples were supplied during this comparison, so their cause cannot be established here.

## Method and evidence limits

Build on the previous direct/normal Papa and Boba sessions and read-only public-runtime findings, instead of repeating heavy downloads for all nine combinations. New sequential Chromium sessions compared all three games in the **actual existing about:blank launcher**, and revisited the Unity game directly and through normal `/proxy/` navigation. Destinations used the same game paths with the site's `variant=next` option. Each session used a fresh context, a 100-second cap and a 200-console-error close limit. Genuine site countdowns ran unchanged. Only one live game ran at a time; all sessions were closed.

Live proxy checks used the current local branch with cloud outbound networking. The prior protected Vercel preview still lacks an authenticated browser identity; authenticated HTTP response checks do not establish preview gameplay. Domain restrictions are verified for the observed proxy host and prior preview-host evidence, not every possible deployment. No browser security settings, host validators, game binaries, timers, advertisements or access flows were changed. No raw HAR, private headers, cookies, credentials or third-party bodies are committed.

## What the launcher changes

| Boundary | Direct website | Normal `/proxy/` | Existing about:blank launcher |
| --- | --- | --- | --- |
| Top-level address | Official game page | Heavenly proxy game path | `about:blank` |
| Relevant hierarchy | Coolmath page → game `/play` iframe | Proxied Coolmath page → proxied game `/play` iframe | Blank wrapper → proxied Coolmath page → proxied game `/play` iframe |
| Actual game identity | Official Coolmath host/origin | Heavenly host/origin | The same Heavenly host/origin as normal proxy mode |
| Game resource paths | Original runtime/engine paths | Proxy paths with the remote document base | Same proxy paths and base as normal mode |
| Parent/top relationship | Game's parent is top | Game's parent is top | Game's parent is the site page; top is the wrapper |
| Automatic ancestor navigation | Browser and upstream restrictions apply | Browser and upstream restrictions apply | Wrapper sandbox added; actual navigation behavior depends on the engine |
| Storage probe | Available in the game document | Available under the proxy origin | Available under the same proxy origin; owned fixture confirms sharing with the wrapper |

The table describes the initial proxied launch; later native navigation can change a frame to the direct site. The blank document's `location.origin` serializes as `null`; its effective origin is inherited from the Heavenly opener. This is not proof that its descendants have an opaque origin. The game documents explicitly reported the Heavenly origin and host in both proxy modes. The launcher requests a `/proxy/` URL and does not silently choose the original game URL.

The first framed document had no document referrer in the observed blank launch, unlike subsequent site-to-game requests. Browser document GETs carried no Origin header. Game-frame requests referred to their proxied site page; the existing server middleware unwraps proxied Referer values and translates Origin headers on outbound proxy requests. The launcher adds no alternative server pipeline or special game headers. No captured difference establishes a Referer/Origin failure or a storage fix.

Upstream game embeds returned `X-Frame-Options: SAMEORIGIN`, retained by Heavenly; their proxied parent and game origins matched. The sampled game responses had no CSP header. That observation does not justify removing CSP elsewhere. The existing wrapper delegates fullscreen; live game documents reported fullscreen capability, but an actual fullscreen gameplay transition was **not** verified. Owned fixtures separately exercise user-initiated fullscreen when the engine supports it, touch and keyboard input in all three modes. Fullscreen is not the observed prerequisite for the startup failures: those failures occurred without it.

The wrapper therefore offers an additional frame and navigation containment, not a different game hostname or general origin compatibility. The existing `browse.html` path already shares `HeavenlyNavigation.mountWrapper()` with about:blank; there is no second implementation to merge into normal navigation. Its existing URL-display preference is left unchanged. Existing behavior is reused without new switches or preference changes. Native JavaScript Location writes can still navigate a child directly to another origin: keeping `about:blank` in the address bar does **not** prove that the game remains proxied.

## Confirmed failure paths

### Papa's Freezeria

The public runtime checks `window.location.hostname` before assigning `startCoolmathGame`. Its accepted suffixes include the official Coolmath domain and specified developer/local hosts; the tested Heavenly hostname fails. The previous normal-mode source investigation established the check. The new wrapped session again downloaded loader/SWF resources, then initiated an **unproxied** navigation from the `/play` frame to the official homepage and attempted top navigation. Chromium blocked the top attempt because of the sandbox. The loader then reported `Could not find a 'startCoolmathGame' method`.

This establishes why containment is not startup recovery. No global URL/Location spoofing or game-code/allowlist changes are appropriate. Later cross-origin storage errors are secondary observations, not the established cause. The user's fullscreen-triggered escape was not independently reproduced; the pre-interaction runtime redirect already explains a concrete escape attempt, not every possible fullscreen path.

### Boba Simulator

The earlier public-pack inspection established `DomainValidator.is_valid()` checking `document.location.host` against its Coolmath host list in the HTML5 release path. `Game._ready()` immediately calls `get_tree().free()` and returns on rejection. The proxy host is unchanged in a wrapper.

In the new about:blank session, the actual `.pck` and `.wasm` resources returned 200 through `/proxy/`. Startup again emitted `Parent node is busy setting up children`, parent-condition failures and dictionary `_unref` failures. The browser closed at the error limit after 22 seconds. That reproduces the previously profiled teardown/error-flood path; about:blank is not a usable fallback for this game. No new long profile or repeated heavy load was needed.

The prior observer batching fix remains valid: 125,250 → 500 subtree visits in the owned 500-node fixture. It does not repair Boba's host restriction or engine teardown. Software graphics also consumed substantial CPU directly in cloud. These results make no physical-device RAM, HDD, FPS or latency guarantee for the user's ASUS laptop.

### Help, I Cast the Wrong Spell!

The fixed document-base handling still delivers the actual loader/framework/data/Wasm resources with 200 responses. Read-only inspection confirms `_RedirectTo()` assigns `https://www.coolmathgames.com` to `parent.document.location` when a parent exists. The function is invoked from compiled WebAssembly during proxied initialization. **The compiled condition triggering that call remains unestablished.** Do not relabel it as a proven domain validator merely because the other games have one.

In this fresh `variant=next` normal launch, Coolmath itself supplied the game iframe sandbox `allow-scripts allow-same-origin allow-popups allow-forms`. Chromium consequently blocked the attempted top navigation, raised SecurityError and left the canvas blank. In about:blank, it blocked the attempted ancestor navigation with the same failed outcome. The earlier investigation observed a parent redirect that completed; the current sandboxed observation supersedes any claim that normal mode always escapes. Different upstream embedding/navigation contexts can change whether the attempt completes; the earlier exact difference was not isolated.

The direct comparison reached the game's animated title screen without this redirect/security error. Ordinary click/key attempts did not establish gameplay before the bounded session ended. Removing an upstream sandbox, swallowing the exception, rewriting compiled code or suppressing the redirect would not establish a reliable supported fix, and none was done.

## Regression evidence

`test/browser/game_launch_modes.cjs` adds owned fixtures for the three real launch paths. They verify initialized touch/keyboard canvas interaction, native game host/origin and parent/top relationships, shared proxy-origin storage in the blank wrapper, delegated fullscreen when supported, intact host refusal in both proxy modes, observed native ancestor navigation, retained upstream iframe sandbox attributes, and detectable direct child navigation that remains inside a blank top-level tab. These are general boundary checks, not simulated claims of live Coolmath gameplay.

The owned fixture also exposed an engine difference: **WebKit permitted `parent.document.location` navigation with the iframe sandbox attributes intact, both without Heavenly and through the normal proxy.** Chromium and Firefox blocked the equivalent sandboxed assignment. In the tested about:blank parent-navigation case, WebKit kept the blank top-level tab while the site frame loaded the direct fixture destination; the existing wrapper signaled its frame-recovery message. This is native engine behavior reproduced without Heavenly, not a proxy-origin repair. It prevents treating a sandbox attribute or a blank address as a universal containment or proxy-success guarantee. Live Coolmath games were checked in Chromium, not WebKit, so this fixture result does not establish their WebKit playability.

Final verification: **`npm test`: 358 passing.** Chromium, Firefox and WebKit each passed **8 launch-mode + 15 navigation/history + 9 widget/diagnostic + 8 resource/public-diagnostic + 7 search/loading/performance checks**. Chromium additionally passed 4 platform checks: **145 browser checks total**. Syntax checking and `git diff --check` passed. Search, Next navigation, bookmarks, Home, settings/history, about:blank, widgets and diagnostics retain their regression coverage.

Run this script alongside `navigation_history.cjs`, `proxy_widgets_diagnostics.cjs`, `game_resources_advanced_details.cjs`, `search_loading_performance.cjs` and `proxy_platform_regression.cjs`. Browser engines and binaries are independently installed tooling, with no new production dependency. Linux engines and touch emulation do not establish physical iPad or Chromebook results.

## Recommendation

**Stop and retain the best supported fallback.** Preserve the earlier verified proxy repairs, working search, existing wrappers, settings/history and explicit recovery controls. Use the official site directly for Papa's Freezeria and Boba Simulator. Retain about:blank only as an optional existing path for games the user verifies actually run through `/proxy/`; it is not a verified workaround for these three. End the Unity investigation with its compiled trigger explicitly unknown.

Further game-specific patches are not worthwhile under the stated constraints without new reproducible evidence of a Heavenly defect or upstream support for the proxy host. General proxy maintenance remains useful, but automatic wrapper routing, identity spoofing or a new browser-emulation architecture is not justified by these results.
