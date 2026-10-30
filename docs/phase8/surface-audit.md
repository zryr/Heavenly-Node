# Academy and recovery surfaces

Baseline: merged `main` `2725f32369bb609bcd0cf8c8d51e272f9a420009` after #202.
The prior `docs/phase6-7/comparison.html` contains 40 capture figures and two embedded recordings; its recovery screenshot was inspected against the current recovery implementation. Existing Phase 6–7 evidence remains unchanged.

| Requirement | Baseline | Phase 8 decision |
| --- | --- | --- |
| Academy wording | Partly working: resource content was useful, but metadata, footer and several documents repeatedly described Academy as fictional/a demonstration. | Describe the open learning resources directly. Keep factual boundaries about enrollment, academic credit, qualifications, accounts and third-party affiliations. No invented institutional credentials or ownership. |
| Landing software paragraph | Present in the generated Terms document rather than the home hero. | Remove the exact paragraph from Terms. Keep a concise GNU AGPL/software authorship notice in Credits, linked from Terms; retain photograph source, license, location and modification notices. |
| Academy document boundary | Already working: distinct generated documents and Academy-only stylesheet. | Preserve its architecture, routes, templates, session gate and navigation. New tests verify all 12 normal documents at six viewport sizes and CSS zoom 200%/67%. |
| Proxy recovery | Actions and sanitized diagnostics already working; appearance retained infinite red blurred orbs, glass blur and bright glow shadows. | Reuse shared Heavenly tokens, a static navy surface, softer controls and a named main landmark. Static styles live in `heavenly-error.css`; error classification, escaping, headers, diagnostics, retry, direct opening and return behavior stay intact. |
| Settings | Already uses the Phase 4–5 shared palette, grouped controls, focus states and layout rules. | Preserve the existing surface. This source audit adds no unrelated restyling. |
| Quick Settings and bookmark modals | Current context/editor surfaces already have the shared navy treatment, visible states and practical tap targets; decorative gradients are restrained. | Preserve these components. Handle-menu refinements are documented separately by the layout work. |
| HTML Viewer and website toolbar | Existing Viewer/toolbar components already consume Heavenly tokens. The opaque-origin preview boundary is independent of Academy. | Preserve the existing isolated rendering architecture. No changes to Viewer sandbox permissions or proxy routing are made by this surface refinement. |

## Verification

- `node scripts/build-academy.cjs --check`: passed; generated documents match sources.
- `npx mocha test/educational_decoy.test.js test/custom_error_page.test.js test/advanced_diagnostics.test.js test/proxy_compatibility.test.js`: **69 passing**. Covers all Academy routes, genuine missing-file 503 recovery, Terms/session preferences, attribution, proxy errors, escaping, sanitized diagnostics and route ownership.
- `node test/browser/phase8_surfaces.cjs`: **3 groups passing in each of Chromium 154, Firefox 153 and Linux WebKit 26.5**, with 96 Academy layout/zoom observations per engine (288 total). Real document layout and interaction checks. [Machine-readable results](evidence/surface-results.json) and [execution log](evidence/surfaces-browser.txt) record the exact engines and outcomes. The suite checks 96 Academy observations per engine, actual attribution navigation, branded 404, six error-page widths, minimum 44px recovery links, real retry/direct-popup actions, severed popup opener, selectable sanitized report, reduced motion and no JavaScript page errors.
- Actual Chromium [Academy desktop](evidence/academy-desktop.png), [Academy phone](evidence/academy-phone.png) and [recovery phone](evidence/error-phone.png) captures were opened for visual inspection. The recovery stress capture intentionally includes a very long address to expose wrapping issues.

The external destination in the popup test is an intercepted fixture. It verifies the real navigation boundary, not third-party availability. CSS zoom is distinct from native browser/OS zoom. Touch-capable viewport contexts are emulated. Physical iPad Safari, physical Chromebook, assistive technology and native virtual keyboards remain unverified.
