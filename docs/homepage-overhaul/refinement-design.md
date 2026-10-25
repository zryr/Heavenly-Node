# Homepage refinement decisions

2026-10-24. This is a refinement of the existing homepage overhaul in PR #193. The question remains: **where do I want to go next?** The URL/query field and Go action answer it first; bookmark collections and the three utility destinations support it. The existing navy palette, cloud mark, Outfit/Space Grotesk typography, central proportions, unified search and adaptive panel behavior are the visual authority.

## Evidence and guidance

The rendered before/after wide desktop, portrait iPad and phone evidence in this folder, the existing [design audit](design-audit.md), the embedded [comparison](comparison.html), the pre-overhaul `013cd07` implementation and the current application were reviewed. The first overhaul improved hierarchy and usability, but made the wordmark solid white and all utility buttons the same gray-blue. That removed useful Heavenly identity along with the original excessive glow.

The official local clones were read at these revisions:

- [Impeccable 4.7.0](https://github.com/pbakaus/impeccable/tree/85c07699656064d0835d21630c1350bd6e21a356): current skill, context command, polish, Operate and craft-floor guidance. The context command explicitly permits this scoped refinement without replacing the incumbent world. Its missing PRODUCT.md/DESIGN.md findings are documentation gaps, not a reason to redesign this surface. As a delegated implementation task, the detailed user brief supplied the design decisions.
- [Taste v2](https://github.com/Leonxlnx/taste-skill/tree/6010f91a9935f1c167dfc500fb1a475681892e6b): current skill and complete app-screen reference. Its warning that restraint can erase product identity is directly relevant. The existing audit's `true-black-flat` direction and seed `1534256298` remain an adapted reference for surface hierarchy; no new direction was drawn for this refinement.

The brief takes precedence over generic bans on navy, restrained purple, gradient brand lettering, soft bookmark corners and small interaction glows. Those are specific identity decisions here. The guidance is applied through a quiet frame, clear primary task, purposeful states and actual rendered checks.

## What changed and why

| Element | Decision |
| --- | --- |
| Heavenly wordmark | A soft white/cyan/blue gradient restores the established identity. It is confined to the product name and shared loader title. Forced-colors mode uses solid system text. |
| Utility destinations | HTML Viewer keeps a cool cyan tint; Settings & Cloaking uses steel blue; Share Bookmarks keeps muted periwinkle. The fills and outlines stay dark enough for Go to remain primary. Labels and icons retain their meaning without relying on hue alone. |
| Add Bookmark / Category | A quiet cyan-tinted pill distinguishes creation from the three utility destinations and small category icon controls. Its target and position are unchanged. |
| Bookmark rows | 12px corners soften the previous 8px shape. A subtle resting edge separates rows from the category frame. A fine-pointer hover adds 1px elevation with a short offset shadow and very faint cyan light. Touch targets and drag ownership stay intact. |
| Categories and subsections | Category frames retain their 14px corners and clear title weight. Subsection strips use a darker, quieter surface and 7px corners; collapsed strips become transparent. They read as collection structure rather than competing destination buttons. |
| Selection and dragging | Selection uses a restrained violet edge and handle tint; category dragging uses cyan. The destination slot and detached preview retain the same meaning without a bright persistent outline. Keyboard focus remains a distinct 2px ring. |
| Motion | No permanent layer hints were added. Hover transforms apply only to fine pointers and stop under reduced motion; reduced motion preserves color, border and focus feedback. Existing functional expansion, search and drag behavior remains owned by its interaction modules. |

Visual rules are collected at the end of `heavenly-home.css`. Adaptive track sizing, category collapse, empty-column handling, layout options and Auto density are kept in the separate adaptive stylesheet/module changes so visual feedback cannot silently override their dimensions.

## Loading-screen investigation and correction

This was a real implementation mismatch, not two moments in one animation. The old homepage DOM contained a blurred aura and a 180×2px shimmer; Settings contained two wing SVGs and a 160×4px bordered progress track. The old homepage ran seven simultaneous repeating animations; Settings ran eight. Settings' right-wing animation replaced its static `scaleX(-1)`, leaving both wings facing the same direction during animation.

The original and revised DOM were rendered in Chromium at 820×1180, with their actual CSS animations paused at 0, 900 and 2200ms. In the original Settings capture the right-wing matrix had a positive horizontal scale at every sampled phase. The corrected matrix stays mirrored at all three phases and matches on both pages.

Both pages now use `heavenly-loading.css`, the existing wing silhouette and cloud mark, a quiet halo and the homepage's thin shimmer. The wings and cloud settle once over 1800ms; only the thin indeterminate line repeats while loading is pending. There are no repeating text, shadow or background pulses. Both pages retain their route-specific subtitle. Decorative shapes are hidden from assistive technology and the overlay is a polite loading status.

Navigation timing was not extended. Existing JavaScript determines when to dismiss, and the existing 500ms fade/hide interval remains. The animation does not need to finish before the overlay disappears. Reduced motion disables the movement and immediately hides a dismissed overlay.

## Validation and exceptions

Actual Chromium screenshots were inspected at 1440×1000, 820×1180 and 390×844, with real fonts and current catalog content. All three had no horizontal page overflow. Computed styles confirmed the gradient wordmark, three distinct utility color pairs and 12px bookmark corners. The homepage and Settings loader matched at 900ms apart from their subtitle; both were also inspected at the beginning and settled phase. These are browser/emulated viewport checks, not physical iPad or phone testing. Final integrated captures and interaction coverage are recorded in the [refinement evidence](../homepage-refinement/).

The official Impeccable detector was run on the two visual stylesheets. It reported two `gradient-text` warnings (the specifically requested brand treatments) and one `overused-font` warning for the existing Space Grotesk loader title. These are intentional, narrow exceptions. It did not report another visual antipattern in those files.

Taste's official app lint was also run on those files. Its 12 failures identify the two brand gradients/clipped text plus retained loader gradients. Its 32 warnings are lexical shadow/backdrop matches, including existing declarations setting those properties to `none`. This is not presented as a clean generic-style scan: the requested brand lettering, existing loader identity and modest interaction elevation are retained deliberately. No blanket rule suppression was added. The browser result and the explicit brief determine whether these particular exceptions are appropriate.

No new dependency, invented content, framework migration, account action, or application data change is part of this visual pass.
