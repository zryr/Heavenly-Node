# Heavenly — combined Phases 4 + 5

One branch: `feat/celestial-settings-viewer-widgets`, from latest `main` `f870d509569f241a23090c52c7b4c0b5696fc69b`. PRs #193 and #196 are included in the baseline. No automatic merge.

The [portable before/after comparison](comparison.html) contains real implemented screenshots, full-resolution viewing, and representative interaction frames. The [design audit](design-audit.md) records the historical original/overhaul/refinement review and the decisions made before major edits. Surface-specific audits preserve the baseline findings.

## What changed

| Area | Result |
| --- | --- |
| Shared foundation | `heavenly-tokens.css` supplies navy surface steps, cyan/blue accents, restrained purple, semantic colors, spacing, typography, radii, elevation, motion, selection, caret and focus tokens. Existing selectors and lightweight interaction modules remain compatible. No runtime dependency or framework was added. |
| Settings | Seven native disclosure groups, compact desktop category navigation, normal-scrolling mobile accordions, actual-setting/description/alias search, match highlighting, category labels, keyboard result traversal and useful empty/clear actions. Clearing search restores disclosure, category, scroll and relevant focus state. Existing hash destinations reveal their controls; browser history remains usable. Controls move once rather than being recreated on every keystroke. |
| Settings safety | Actual disabled states and explanations reflect master/prerequisite gating. Reset/delete/overwrite actions explain scope and require confirmation. Failed writes are visible; position resets and imports attempt rollback. Malformed existing settings/bookmarks remain untouched with recovery export. Shared setting updates refuse to overwrite unreadable preferences. Quick Settings continues using its established model and editor. |
| About | A concise product overview with optional layout, launch and widget tips; local preference and backup limitations are explicit. Authorship remains. No UBGDir credit, duplicate Restore control, or rotating-message engine was added. Approved future resize-message copy is preserved. |
| Loading | One CSS/JS implementation, a stationary cloud emblem, atmospheric navy and a slim indeterminate line. Initialization dismisses immediately without the prior 300ms wait or waiting for unrelated images/fonts. A 220ms nonblocking fade, reduced-motion dismissal, generation-safe interruption and four-second JS/CSS fallback prevent a stranded overlay. Viewer renders directly without a full-screen loader. |
| HTML Viewer | Existing textarea, saved source, modes, shortcuts and launch utilities retained. Compact Run/view toolbar, secondary Tools disclosure, accessible separately persisted splitter, single-pane phone/tablet switching, readable virtualized line gutter, reliable multiline Tab/Shift+Tab, indentation, clipboard/save feedback, and persistent recovery for Clear/Sample. Source scanning caches the textarea value so large documents do not repeatedly copy it. |
| Preview security | User HTML executes in fresh opaque-origin `srcdoc` frames with scripts/forms, without same-origin privileges, popups or parent navigation privileges. CSP and device restrictions add defense in depth; credentialless frames are used where supported. Bounded diagnostics use a private MessageChannel, checked source/origin/session handshake and validated display-only payloads. Old frames/ports are removed on rerun. New-tab execution uses a trusted shell with null opener and the same isolated inner frame. |
| Widgets | Cohesive Shadow DOM navy surfaces, distinct active states, 44px restores, readable toolbar controls, responsive search and safe-area positioning. Collapsed docks leave only their restore control keyboard-accessible. Floating tools support keyboard expansion/movement/minimization, focus-aware idle behavior and saved position restoration. Gesture ownership/cancellation, viewport clamping, live cross-tab settings and owned listener cleanup preserve host interaction. |
| Homepage | All eligible categories collapsed in one sidebar derive a compact, label-sized rail and give reclaimed space to the center. Empty/manual/automatic/category-compact states remain distinct; saved expanded widths and independent stable category IDs persist. Expand restores useful width and resizing. Wordmark, Go, utility accents, About, and the phone toolbar receive a focused polish. Codex HQ remains accessible only through intentional `codex` submission in the main input. |

## Isolation and compatibility boundaries

Executed hostile HTML attempts, rather than iframe-attribute inspection, establish the parent DOM/storage boundary. Parent/top storage and DOM access fail with `SecurityError`; `frameElement` and opener are inaccessible/null, popups are blocked, and forged sibling/parent messages cannot attach diagnostics. The separately launched tab has null opener and an opaque child that cannot access its shell’s DOM/storage. See [security results](security-review.md) and [Viewer results](viewer-results.md).

External assets and forms may make network requests; this is not an anonymity or no-network guarantee. CORS, browser storage, workers, modal dialogs, device APIs and other origin-dependent features may be restricted. Linux WebKit/Firefox do not establish Chromium-only credentialless behavior. Runtime/resource diagnostics report only observable errors, with bounded text; they cannot identify every network failure. A truly nonterminating script can still require stopping or reloading the browser tab.

Existing bookmark content, notes, custom mirrors, hidden states, official catalog history, layouts and widget keys are preserved. No application data reset, broad server/proxy rewrite or excluded future feature is part of this change.

## Verification

Baseline `npm test`: **519 passing**, executed before edits. **Final `npm test`: 525 passing (6s), exit status 0.** Final executed results are recorded in the surface reports and evidence JSON/logs:

- [Settings verification](settings-results.md)
- [Viewer verification](viewer-results.md)
- [Widget verification](widgets-results.md)
- [Homepage, gestures and loader verification](homepage-results.md)
- [Verification plan and physical-device boundaries](qa-plan.md)

Browser coverage uses desktop Chromium, Firefox and Linux WebKit, plus desktop/Chromebook-sized, tablet portrait/landscape and narrow phone viewports. Browser-driven mouse/keyboard and Chromium CDP touch streams are emulated; no physical iPad, phone, Chromebook or Apple Safari testing is claimed.

Before delivery the portable report is opened in Chromium; every embedded screenshot must decode, open at its natural pixel width, close by keyboard, and remain usable at phone width. Screenshots are implementation evidence, not mockups. Gesture frame sequences accompany actual interaction assertions; appearance alone does not prove behavior.

## Other contributions and design guidance

[Contribution review](contribution-review.md) explains why Bolt #197 was selectively adapted with attribution and why unrelated middleware edits were deferred. GitHub contributions were reviewed; no Google Jules account, workspace, schedule, prompt or session was accessed.

Impeccable and Taste are not installed locally. Their official current documentation was actually read and used for audit, task hierarchy, coordinated states, accessibility and rendered look/fix review. No unavailable launcher, detector, direction generator or proprietary inspection script is claimed. The requested Heavenly identity takes priority over generic style restrictions.

## Remaining manual checks

Physical iPad Safari and Android virtual keyboards/browser chrome; touch precision and real orientation changes; operating-system fullscreen and clipboard prompts; native zoom; and responsiveness on an actual lower-powered Chromebook with large personal documents. Local fixture tests do not establish third-party destination availability or reliability.

## Final review record

The final source passed JavaScript syntax checks and `git diff --check`. The complete portable report passed browser validation with **41 embedded screenshots**, each decoded and opened at its natural pixel width, keyboard dismissal, and a narrow viewport without horizontal overflow. See [delivery verification](evidence/delivery-verification.json) and [report validation](evidence/report-validation.txt).

The final Chromium runs of Quick Settings customization (**23 groups**), cloaking consolidation (**13 checks**) and catalog/motion/backup regression (**21 groups**) also completed all assertions. Existing search, touch, layout and cross-engine checks are detailed in the linked reports.

Only the explicitly launched VUS utility adds sandboxed popup permission; normal authored previews and their new-tab shells continue to block popups. Real user-click VUS external links were verified with inherited isolation after navigation. VUS apps requiring cross-window raw HTML writes can fail under the origin boundary; the UI explains that restriction. Its pre-existing local fallback lacks a complete card renderer, and the test fixture is explicitly identified rather than presented as a working full catalog.
