# Heavenly — combined Phases 6 + 7

One branch: `feat/academy-dynamic-messages-plain-language`, based on merged `main` `a329d6cf0a01728526057b8a854a5ec7fb19c705` after PR #199. [Combined PR #202](https://github.com/zryr/Heavenly-Node/pull/202) is open and unmerged. The existing Settings, isolated HTML Viewer, widgets, bookmark layouts, catalog and official ranking behavior remain in place. No automatic merge is part of this delivery.

Open the [portable visual comparison](comparison.html) for **40 actual before/after screenshots and two embedded interaction recordings**. Every image was decoded, opened at its original pixel width, and dismissed by keyboard; both videos loaded with autoplay off. The third [plain-language tools recording](evidence/plain-language-tools-phone.webm) is separate. [Report validation](evidence/report-validation.json) used local HTTP with external requests blocked because managed Chromium forbids `file://` navigation.

## What changed

| Area | Implemented result |
| --- | --- |
| Academy architecture | A head-level session gate navigates to a separate Academy document. Heavenly is absent beneath the Academy page. Twelve complete HTML documents share generated templates and remain readable without client rendering. Normal zoom, scrolling, orientation, landmarks and back navigation remain available. |
| Academic identity and navigation | Original fictional Morrowfield Academy, with navy/cream academic typography, real learning pathways, student study/project guides, resource links, a downloadable weekly planner, family guidance and a learning calendar. Every visible destination has content, a valid section, a real external resource, or an explicit Coming Soon state. |
| Recovery and information | Planned features return honest Coming Soon content. Unknown Academy routes return a branded 404; a genuine expected-document read failure returns cached branded 503 recovery. Terms, Privacy, Accessibility, Credits and Our approach respect saved Search launch preferences, including normal tabs, about:blank, popup fallback, repeated-history entries and top-level return. |
| Reusable imagery | Responsive local derivatives of Matthew Petroff's George Peabody Library photograph, verified CC BY-SA 3.0, with source/author/license/crop attribution. Original academic SVG artwork supplements the photograph. No invented campus, staff, accreditation, testimonials or statistics. |
| Homepage personality | Twenty-one structured messages: humor, practical tips, links, music and character scenes. Ordinary first; 12–15-second visible-time rotation; composable hover/focus/hidden/offscreen/user pauses; Next/Pause; bounded weighted selection with a 12% special chance on eligible rotations and no consecutive specials. |
| Playlist interaction | All four supplied Spotify destinations are preserved. The headphone suggestion appears once per tab session. Aura → Hardstyle/Hardtekk → Favorite Songs exploration is optional and click-driven. Spotify opens only through an explicit Open Playlist action; there is no playback or surprise audio. |
| Character scenes | Correct Ao Oni side-eye mapping for the Purple Hulk joke; original You/Cloudy retro dialogue; brief seven-character dance with nonmodal Skip and complete cleanup; distinct Khezu interruption and warm Doggy appearance. Reduced motion uses still artwork. Supplied originals remain unchanged. |
| Developer HQ | Registered-message browsing, wording/dialogue/theme/gradient/weight/eligibility drafts, reordering, real contained previews, reduced-motion QA, safe link validation and reviewed JSON import/export. A deterministic generator publishes source-controlled data. Access remains deliberate `codex` submission in the main input. No visible public HQ link or privileged publishing backend was added. |
| Plain language | Clearer homepage, bookmark/mirror dialogs, Settings, Quick Settings, Viewer, widgets, backup and error explanations. Old technical Settings search terms remain searchable. Native advanced disclosures retain security, storage and recovery details. Legal meaning, identifiers, selectors, saved keys and data contracts are preserved. |

The [Academy audit](academy-audit.md), [message architecture](messages.md), [HQ publication guide](developer-messages.md), and [plain-language before/after report](plain-language-audit.md) explain the source and behavior. The plain-language report includes a repeatable comprehension rubric and an agent-led novice walkthrough; no actual student participation is claimed.

## Verification and evidence

Baseline `npm test`: **525 passing**, before edits. Final `npm test`: **549 passing**, exit status 0; [actual unit results](evidence/unit-final.txt). The [verification report](qa-results.md) and machine-readable files contain the executed browser results:

| Suite | Result |
| --- | --- |
| Combined flow acceptance | 6 groups in each of Chromium, Firefox and Linux WebKit; zero page errors |
| Academy documents and controls | 96 responsive/CSS-zoom observations per engine; 322 Chromium anchor clicks and 73 distinct links in each other engine; real downloads/disclosures; all final history/preference flows pass |
| Focused messages | 9 groups per engine, including scheduler, selection, real inputs, playlist intent, lifecycle cleanup, live reduced motion and responsive bounds |
| Developer HQ messages | 14 groups per engine, including unsafe input refusal, form recovery, source export/import and 320px layout |
| Independent message review | 6 scenarios per engine after the identified fixes |
| Existing browser regressions | 24 jobs passed, covering Settings, Viewer, independent isolation, widgets, compact rails, bookmark search, Quick Settings, cloaking, catalog/backups and touch gestures |
| Viewer practice compatibility | 4 groups per engine; actual external resources, forms/links, policy feedback and the existing VUS-only isolated popup exception |
| Blob prototype | 3 experimental groups per engine; no ordinary-user option shipped |
| Portable report | 40 embedded images and 2 embedded recordings verified in Chromium |

Browser versions: **Chromium 154.0.8037.57, Firefox 153.0, Linux WebKit 26.5**. Viewports cover desktop, Chromebook size, iPad-sized portrait/landscape and 390/320px phones. Academy also has a separate WebKit mobile-touch/DPR profile and Chromium page-scale probes. The requested Chromium .5 scale was clamped to 1; it is not reported as a successful 50% native zoom test. [Scale evidence](evidence/academy-scale.json) distinguishes these observations from 200%/67% CSS zoom.

Important findings were fixed during actual review: redundant Pause text replacement suppressing a WebKit click; hidden tooltip overflow; stale focus after a reduced-motion rerender; nonmodal dance focus theft; repeated information-page history; and HQ unapplied-form/import recovery. [Independent review](independent-review.md) records the safeguards and evidence. A finite-animation regression test now observes the same real animation before storage reads consume its short observation window; its state assertions and application duration remain unchanged.

Reproduce from the repository root:

```sh
npm test
node scripts/build-academy.cjs --check
node scripts/build-messages.cjs --check
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node test/browser/phase6_7_acceptance.cjs
```

Individual suite commands and results are linked in the surface reports. Test-only browser tooling adds no production dependency.

## Reviewed preview

[Vercel preview](https://heavenly-node-ozmk1evqr-syshi.vercel.app) is **READY** in the existing `heavenly-node` project at application commit `e77460eedf584067db3a04e7ea61a66bfe47795e`, with a successful GitHub Vercel status. Deployment protection remains enabled; no access parameters are committed. The follow-up commit adds this verification record and the deployed test harness, with no application-source change.

The actual deployed Chromium run passed **six groups**, with zero page errors: independent Academy/image/Coming Soon/404 rendering; Terms return and ordinary message/Pause; opt-in Spotify with once-session advice; the nonmodal dance and live reduced-motion focus; command-only HQ and old Settings aliases; and executed parent DOM/storage attacks blocked in the Viewer with code retained at phone width. [Results](evidence/preview-results.json) · [execution log](evidence/preview-results.txt) · [repeatable harness](../../test/browser/phase6_7_preview.cjs).

## Design, contributions and compatibility limits

Official Impeccable and Taste documentation was reviewed; their installed skill workflows were unavailable, and no installer or inspection script is claimed. [Design review](design-review.md) records the actual references and their application. [Image sources](asset-sources.md) records reuse rights. The character originals were already supplied in the repository; their upstream license is not established here, and no new license is claimed for them.

[Jules GitHub review](contribution-review.md) records the initial and final PR/branch checks, actual diff decisions and the selectively adapted bookmark lookup. Compatible behavior already merged in Phase 4–5 stays intact. No Google Jules workspace, session, prompt or schedule was accessed or changed.

[Blob findings](blob-navigation.md) show creator-origin storage access, unresolved relative URLs and engine-specific revocation/history behavior. About:blank remains the existing production option; Blob navigation exists only in isolated QA.

No physical Chromebook, phone, iPad or Apple Safari was tested. Native browser/OS zoom, virtual keyboards, permission prompts, lower-powered hardware performance and actual student comprehension remain manual checks. Local fixtures establish interaction and isolation, not external-service uptime, Spotify playback, anonymity or privacy guarantees. Saved bookmarks, preferences and code remain browser-local and can be lost when browser data is cleared; explicit backups are still needed.
