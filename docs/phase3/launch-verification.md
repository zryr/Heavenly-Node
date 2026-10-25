# Destination and deployed-preview verification

The dedicated public browser suite verifies the exact saved and proxied destinations for both new games, their popup controls, search eligibility and SVG preservation. Its external requests are blocked deliberately; those tests establish the application's behavior, not a third-party uptime claim.

## Actual destination observations

| Destination | Actual observation | Limit |
| --- | --- | --- |
| `https://historyminds.com/activities` | An HTTPS request from this environment returned HTTP 403. | Remote content availability and gameplay were not verified. The exact official destination and both normal launch choices remain available. |
| `https://cdn.jsdelivr.net/gh/ltorl/dancing-bunny/index.svg` | HTTPS returned 200, `image/svg+xml`, 857 bytes. Actual Chromium 154 and Linux WebKit 26.5 renders exposed a working `click here` launcher button; selecting it opened a child window. The root uses the XHTML namespace despite its SVG MIME type. | These are automated Linux browsers. Their popup policies do not establish physical Safari behavior or successful gameplay. Firefox's direct-network probe encountered the environment's TLS proxy issuer trust error; TLS validation was not disabled. |
| Bunny's relative `v2.html` | HTTPS returned 200, `text/plain`, 170,570 bytes. | The launcher fetches this text and writes a child document. A response code does not prove that all subsequent remote resources work. |

The launcher tries its button automatically on DOMContentLoaded. A browser may require a deliberate tap before allowing the new window. Only the Bunny popup therefore explains: “This destination opens a launcher. If your browser blocks its automatic window, select ‘click here’ on the destination page.” There is no extension-based rejection, changed destination, special publishing service or imported recommendation list.

A protected-deployment HTTP probe did not complete promptly and was stopped. A later actual Chromium browser probe authenticated successfully and reached the Bunny proxy destination: it received a 308 redirect followed by **HTTP 200, `image/svg+xml`**, but did not reach DOMContentLoaded within 20 seconds. [The exact result](evidence/live-bunny-proxy-results.json) is retained. Successful proxied launcher execution and gameplay are therefore **not verified**, and no proxy-specific fix is claimed. The exact direct destination remains available through the normal Direct choice; its manual launcher button was observed in Chromium and WebKit. The passing deployed UI checks below are separate from that external-delivery limitation.

## Preview scope

The refined Phase 1+2 preview is [68a6d40](https://heavenly-node-87455s15j-syshi.vercel.app). The Phase 3 application preview is [0b46931](https://heavenly-node-ei054z9mb-syshi.vercel.app). Both are Vercel READY preview deployments and keep their existing authentication protection. The Phase 3 application source is unchanged by subsequent evidence/documentation commits.

Both authenticated live Chromium checks passed: keyboard sidebar resizing and reload persistence, individual category collapse with central search, and phone touch expansion without overflow. Phase 3 additionally passed the deployed release version, Bunny search, empty Picks and Codex ranking editor checks. Neither page produced a JavaScript error. [Machine-readable results](evidence/live-preview-results.json) retain the initial refined-preview readiness timeout as well as its successful single rerun with a fresh authenticated access link; no application change was needed. Phase 3 passed on its first attempt.

Temporary access links are kept outside the repository and removed after the check; no protection setting, credential or user account setting is changed. These are automated Chromium checks, not physical-device verification.
