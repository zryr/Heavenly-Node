# Proxy and bookmark follow-up for PR #179

## RiveStream 526 investigation

On October 18, 2026, production and the existing PR preview returned HTTP 526 for `https://www.rivestream.app/`. Both responses carried Cloudflare `cf-ray` headers from IAD and Heavenly's sanitized report classified the response as upstream HTTP, response phase, status 526. The production URL first received Vercel's normal 308 path normalization (`https://` to `https:/`); the app repairs that scheme before its outbound request. Preview and production agreed after normalization.

Direct `www` homepage access initially returned 200 with `cf-cache-status: STALE` and `age: 80598`. Fresh direct requests with distinct benign query strings and `Cache-Control: no-cache` returned 526 for both browser-like and Node-like user agents, with Cloudflare headers from MSP and body `error code: 526`. A stale cached document is not proof of a healthy origin. This independently reproduces the upstream HTTP failure outside Heavenly. The apex hostname did not resolve in this environment; its session-proxy CONNECT was denied. No redirect to that hostname was introduced.

DNS for `www` resolved to Cloudflare addresses `104.21.41.215` and `172.67.152.7` plus IPv6 records. Direct HTTP checks used the configured environment proxy and normal CA verification; no insecure TLS option was used. The application request builder uses the target hostname for both the outbound connection and Host header, via Node's standard HTTPS request implementation. It does not override certificate/hostname validation. A raw Node connection from this managed environment timed out, and its local app request reported a separate connection refusal (502); those development-network failures are not classified as upstream 526.

The evidence supports an upstream Cloudflare/origin problem, rather than a Heavenly request-construction regression. 526 commonly describes Cloudflare rejecting the origin's certificate; the origin certificate itself cannot be inspected from these responses, so its exact defect is not asserted. No TLS validation, hostname check, upstream error status or fallback policy was changed. RiveStream is **not reported as working through Heavenly**. Correcting its origin configuration requires its operator.

## Error details

Advanced Details is a native, compact expandable row with a diagnostic icon and chevron. Expanded fields use aligned label/value rows and thin separators. The sanitized report has its own disclosure and bounded, selectable monospace textarea; Copy Diagnostics and status feedback sit together. Clipboard fallback opens/selects only the report. Native disclosures and selection remain usable without JavaScript. Public allowlists, correlation IDs, classification and the separate development-only diagnostics boundary remain intact.

