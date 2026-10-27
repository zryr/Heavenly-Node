# Academy document and navigation audit

Academy is a standalone fictional educational site. A locked visit to Heavenly
checks the established `heavenly_decoy_unlocked` session flag in the head, hides
the original document and navigates to `/academy`. The resulting Academy
document contains its own header, main content and footer; the Heavenly home
page is not mounted underneath it. Browser speculative loading may request
some assets from the initial document before the redirect completes. This is
not a claim that the initial request makes zero application-asset requests.

The identity is Morrowfield Academy, explicitly described as fictional. It has
no campus, accreditation, enrollment service or student records. The library
photograph is the George Peabody Library in Baltimore by Matthew Petroff,
locally resized as WebP under CC BY-SA 3.0. Its actual location, descriptive alt
text, modifications and license are recorded in Credits and
`public/assets/academy/LICENSE.txt`.

## Source and presentation

`academy/` contains shared header/footer templates, titles and editable page
fragments. `node scripts/build-academy.cjs` generates the committed full HTML in
`public/academy/` and `public/academy-errors/`; `--check` detects stale output.
The documents remain readable without JavaScript. There is no production build
dependency or client-only content renderer.

The reviewed screenshots use navy, cream, sage and a restrained gold accent,
serif headings, simple text navigation and a locally served library image.
Decorative arrows and the menu symbol are inline SVGs rather than font glyphs.
The viewport permits zoom and uses `viewport-fit=cover`; page edges account for
safe-area insets. The mobile menu has an expanded state, keyboard activation
and Escape/focus return. Reduced motion disables smooth anchor scrolling.

## Navigation inventory

The 12 normal documents contain **322 anchor occurrences** and **73 distinct
literal href values**. The browser evidence records each occurrence's page,
label, href and index. Shared header/footer links deliberately recur.

| Surface | Destination and behavior |
| --- | --- |
| Brand, breadcrumbs, Academy home | `/academy`, a complete home document |
| Our approach | `/academy/about`, educational approach and fictional-site explanation |
| Learning pathways | `/academy/programs`, with real Foundations, Connections and Perspectives sections |
| Student hub | `/academy/students`, study, project and planner guidance |
| Resources | `/academy/resources`, reading, science and research sections with original-provider links |
| Learning calendar | `/academy/calendar`, learning rhythm and suggested dates |
| Family guide | `/academy/admissions`, explicit no-enrollment explanation and family guidance |
| Student portal, family portal, applications, clubs | `/academy/status?service=…`; honest Coming Soon copy and useful alternatives, HTTP 200 |
| Terms of Service | `/academy/terms`, readable terms, original authorship/license notices and the established session entry action |
| Privacy, accessibility, credits | Their own complete `/academy/…` documents |
| On-this-page links and home pathways/resources | Real existing section IDs in the source or destination document |
| Weekly planner | `/assets/academy/weekly-planner.csv`, a real CSV download; planning guidance is also readable in the student hub |
| External learning resources | Project Gutenberg, Poetry Foundation, Library of Congress, PhET, NASA, Khan Academy and Smithsonian original URLs |
| External attribution/license links | Wikimedia image/author, CC BY-SA 3.0, GNU AGPL and the existing project source URL |
| Unknown Academy address | Branded HTTP 404 recovery, including nested unknown paths, before proxy Referer recovery |
| Known document read failure | Cached branded HTTP 503 recovery after an actual `sendFile` error; Retry reloads, and home/resources/student hub remain real destinations |

Planned features are never reported as outages. No navigation link fabricates a
live incident, a recovery deadline or an operations team. The unavailable page
is an error handler for genuine server failure, independently of Coming Soon.

## Information launch preferences and session continuity

Our approach, Terms, Privacy, Accessibility and Credits use
`HeavenlyNavigation.launchMode(savedSettings, 'search')`. This maps to the
existing Search choices rather than bookmark choices. Same tab is the default.
An explicit Search new-tab choice opens the actual document normally; Search
about:blank opens a separate trusted local-information shell. Each new tab has
its opener set to null. Only the five allowlisted same-origin information
routes enter that shell. It is separate from the HTML Viewer's untrusted
preview and does not alter Viewer permissions or navigation.

The shell shows the intended document title, a titled iframe, Back, Academy
home and Open normally. Back traverses actual information-document history and
returns to Academy home when there is no earlier information page. Recovery
opens the current intended document normally. Academy home, external links and
Continue to Heavenly navigate the shell's top-level tab. A blocked popup or a
denied Storage getter falls back to a normal current-tab document. Malformed
saved settings also use normal defaults. The five pages explain this mapping
in their own content.

The shell finalizes Chromium's initial empty popup with a real `about:blank`
navigation before constructing its DOM. The iframe then owns native browser
history. Explicit navigation records a distinct ID in each child's history
state, including repeated URLs and section hashes; DOM readiness, load, popstate and
hashchange recover the corresponding cursor. Terms → Privacy → Terms therefore
returns to Privacy, then the first Terms entry, then Academy through shell Back.
Native Back/Forward also traverse those entries and same-document hashes while
the top-level address remains `about:blank`.

Opening Terms preserves the established unlock behavior without taking the
reader away from the terms. Continue uses the existing session flag and enters
Heavenly. The existing explicit `decoyAutoTimer: true` preference still provides
timed entry; no new storage key is introduced. If session storage is denied,
`/?academy=continue` permits that navigation and removes its parameter from the
displayed URL. The unlock may not survive a reload in that browser. Saved
bookmarks, notes and unrelated preferences are not reset.

## Verification

Focused Mocha: **18 passing**, including complete-document generation, all
normal routes before proxy Referer recovery, local destinations/section IDs,
allowlisting, Search preference mapping, null opener, popup/storage fallback,
session continuity and a real missing-file 503 in an isolated Express harness.

Browser suite and recovery acceptance results are recorded in the linked
evidence below. The complete browser run clicks every anchor occurrence in
Chromium and each distinct literal href in Firefox and WebKit. External
destinations use explicit deterministic fixture documents after actual clicks;
this proves routing, not third-party availability. CSV download events and
real disclosure/menu keyboard interactions are asserted separately.

- [Chromium Academy evidence](evidence/academy-chromium.json)
- [Firefox Academy evidence](evidence/academy-firefox.json)
- [Linux WebKit Academy evidence](evidence/academy-webkit.json)
- [Final three-engine information history and session flows](evidence/academy-flow.json)
- [Scale and mobile-touch evidence](evidence/academy-scale.json)
- [Combined acceptance and genuine unavailable recovery](evidence/acceptance.json)
- [Desktop Academy screenshot](evidence/academy/home-desktop.png)
- [Phone Academy screenshot](evidence/academy/home-phone.png)
- [Tablet landscape pathways](evidence/academy/programs-tablet-landscape.png)
- [Phone Terms screenshot](evidence/academy/terms-phone.png)

Every normal document is checked at 1440×1000, 1366×768, 820×1180,
1180×820, 390×844 and 320×740, plus CSS zoom 200% and 67%. The supplementary
Chromium CDP probe applies page scale 2 and resets to 1. Its requested .5 scale
is clamped by Chromium to 1, explicitly recorded rather than claimed as a 50%
zoom pass. Linux WebKit separately runs all 12 documents with `isMobile: true`,
touch enabled and DPR 2 at the two iPad-sized portrait/landscape viewports.
Visual viewport dimensions/scale and document overflow metrics are preserved.

CSS zoom, CDP page scale and viewport/DPR emulation are distinct measurements.
Headless runs do not establish native OS/browser chrome zoom, a physical iPad,
Apple Safari, virtual-keyboard behavior or low-powered Chromebook performance.
Those remain manual device checks. The browser tests do not claim real
third-party resource uptime or anonymity.
