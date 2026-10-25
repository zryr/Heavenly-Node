# Combined Phase 4 + 5 audit and direction

Starting commit: `f870d509569f241a23090c52c7b4c0b5696fc69b` (latest main, PR #196 merged). One working branch: `feat/celestial-settings-viewer-widgets`. Baseline `npm test`: **519 passing**, actually executed before edits.

The original homepage, initial overhaul, refined homepage and Phase 3 evidence were reviewed. Original: expressive wordmark and clear blue launch action, but excessive persistent halos and cramped middle columns. Initial overhaul: stronger task hierarchy and adaptable layout, but generic identical utility actions. Refinement: useful identity restored. Keep that refinement and improve precision; do not restart the homepage.

## Findings before changes

- Homepage category collapse compacts the card without recalculating its parent track. Several collapsed categories still reserve saved expanded width. Derived temporary compactness must never become a saved manual preference.
- Settings uses a long single column of controls, inline presentation and inconsistent section treatment; finding an individual setting requires knowing its location. Existing settings/event/storage code is valuable and must remain authoritative.
- Viewer combines user scripts, same-origin sandbox privilege and document.write. Preview content can potentially reach Heavenly DOM/storage. Its full-page code launch also needs an independent sandbox. Fix isolation before treating visual polish as complete.
- Loader repeats a complex emblem and waits an unnecessary 300ms after initialization. Styles are shared, but show/hide logic is duplicated. Make initialization readiness the signal; fallback must leave the underlying interface accessible.
- About claims uninterrupted streaming and preserved speed that the implementation cannot guarantee. Replace with maintainable descriptions of actual navigation, bookmarks and local preferences.
- Widgets already provide real drag, minimize and dock behavior with saved keys. Refine Shadow DOM styles and gesture cleanup rather than replace them. Disabled states must reflect settings gating.
- Existing homepage, Settings and Viewer styles repeat navy colors, radii and control states. Introduce lightweight shared tokens, keeping compatibility selectors and dedicated interaction modules.

Per-surface baseline audits and real screenshots are alongside this document. The browser baseline is Chromium on Linux with emulated viewport sizes; no physical-device testing is implied.

## Coordinated design strategy

Heavenly is an interface for going somewhere, organizing saved places and trying small HTML projects. Navy gives it a calm foundation. A soft cloud mark and confined blue/cyan gradients give it a face. Restrained violet identifies secondary sharing/selection. Typography stays Outfit with Space Grotesk for the mark and headings; code keeps a monospace face. Stronger surface steps, consistent corners, readable supporting text and visible keyboard focus carry most of the polish.

Use dense rows for simple settings, disclosure for advanced configuration, a compact labeled navigation rail on desktop and normal scrolling accordions on mobile. Search indexes real controls and restores the previous arrangement. The Viewer is a workspace: Run and mode switching lead, tools recede. Widgets share the palette but remain isolated from host sites. The loading reveal uses soft illumination and a stationary emblem, with only a slim indeterminate line moving. No animation controls readiness.

## Official guidance actually reviewed

Neither Impeccable nor Taste is installed in the session skill catalog or local skill directories. Official current documentation was fetched and read, without adding dependencies:

- [Impeccable 4.7.1](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/SKILL.md), its craft floor, Operate guidance and audit/critique/polish workflows. Context launcher unavailable; existing implementation, historical design reports and the user brief supply project context. No launcher/detector execution is claimed.
- [Taste v2](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) and app-screen guidance. Applied: task hierarchy, genuine data, coordinated states, real-browser look/fix loop. No draw/lint/inspector script execution is claimed. Its generic restrictions on navy, purple and gradients conflict with this explicit brief; the Heavenly identity wins.

## Future message compatibility

Keep this approved copy available without building a rotating-message engine: “You can resize the left and right bookmark panels by dragging their inner edges.” The compact About disclosure leaves room for a later message/character scene; no special sequence or message scheduler is included.
