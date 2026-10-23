# Homepage design audit

Audit date: 2026-10-23. Target: `public/index.html` and its homepage interaction modules. This is a task interface: launch a URL or query, find a saved destination, then manage collections. The central Heavenly card should lead; bookmark collections should support it.

## Official guidance actually used

| Skill | Verified official source | Revision read |
| --- | --- | --- |
| Impeccable 4.7.0 | [impeccable.style](https://impeccable.style/) links [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | [`85c07699656064d0835d21630c1350bd6e21a356`](https://github.com/pbakaus/impeccable/tree/85c07699656064d0835d21630c1350bd6e21a356) |
| Taste, latest app-screen guidance | [tasteskill.dev documentation](https://www.tasteskill.dev/docs) links [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | [`6010f91a9935f1c167dfc500fb1a475681892e6b`](https://github.com/Leonxlnx/taste-skill/tree/6010f91a9935f1c167dfc500fb1a475681892e6b) |

Both repositories were cloned outside the application; no application dependency was added. Impeccable's current `SKILL.md`, Operate, audit, adapt, animation and craft-floor references were read. Its official context command ran successfully against `public/index.html`; it identified the existing implementation as visual authority and reported missing PRODUCT.md / DESIGN.md. The detailed user brief and explicit instruction to proceed supplied the product decisions.

Taste's current `SKILL.md` and complete app-screen reference were read. Its official app-direction script offered `data-terminal` and `true-black-flat`; `true-black-flat` was selected for lightness-based hierarchy and quiet secondary surfaces (seed **1534256298**, with `--keep palette,type`). This is adapted guidance: the user's explicit navy, cyan, restrained purple and center-plus-two-panels composition take precedence over Taste's neutral-black palette and generic shell prescriptions. No claim is made that a full standalone Impeccable critique command was executed.

## Baseline: rendered findings

The screenshots below were captured before visual changes. The review examined wide desktop, medium desktop, iPad portrait, iPad landscape, phone, and search states.

| Priority | Evidence | Finding and intended correction |
| --- | --- | --- |
| P1 | [Phone](evidence/before-phone.png), [iPad portrait](evidence/before-ipad-portrait.png) | The left bookmark collection appears before the central task. On the phone the URL field is below the first screen; on portrait iPad the center begins around 610px down. Preserve a usable center first and fold bookmark panels when constraints require it. |
| P1 | [iPad landscape](evidence/before-ipad-landscape.png), [medium desktop](evidence/before-medium.png) | Three columns remain at 1180px, but the URL field is squeezed and utility actions form a tall three-row stack. Collapse a required sidebar before the center becomes cramped. |
| P2 | [Wide desktop](evidence/before-wide.png) | Every main panel has a bright outline/halo; the cloud and gradient wordmark, bright Go, colored New Tab, and three differently colored utility buttons compete. Keep the Heavenly mark and navy palette while reducing repeated glow, gradients and glass. |
| P2 | [Search](evidence/before-search.png) | Search removes nonmatching side collections, leaving the center unchanged and pushing matching Games entries to the bottom. Put contextual results beside the input in the central interface while preserving layout preferences. |
| P2 | [Wide desktop](evidence/before-wide.png), [phone](evidence/before-phone.png) | The repeated miniature grip has little visual or physical room. Keep a discreet glyph inside a comfortable target, with activation feedback and distinct ownership from resizing. |
| P2 | [Wide desktop](evidence/before-wide.png) | Uppercase mini-labels, cyan subsection arrows and repeated borders add noise. Establish quieter sentence-case metadata, aligned icon/title lanes and consistent action sizes. |

## Implementation findings and applied direction

- Fixed `280px / 1fr / 280px` columns switch abruptly to one column at 1024px. The new layout should respond to actual required width, preserve intended panel states, and use the same collection DOM on all screens.
- `transition: all`, repeated backdrop filters, resting card halos and persistent `will-change` on every bookmark add work without explaining state. Use opaque navy surface steps, targeted transitions and transient transforms.
- Nested padding consumes scarce title width. Use a 4px spacing base, consistent contextual gaps and `min-width: 0` flex lanes; preserve one-line titles and full accessible names.
- Keep the center visually primary, side collections quieter, and cyan focused on meaningful actions, focus and gesture feedback. Retain restrained purple where it already distinguishes bookmark dragging.
- Both skills recommend task feedback rather than entrance choreography here. Use short state transitions, deterministic cancellation/reversal and a reduced-motion path that preserves feedback and final visibility.
- A 44px interactive target may contain a 14–20px visible icon. Resize targets must stay outside row actions. Touch functionality cannot depend on hover.

## Verification boundary

Screenshots demonstrate composition, clipping and hierarchy; they do not demonstrate gestures or animation completion. Browser interaction evidence and the implementation report must identify the engine, actual browser input used, and which devices were emulated. No physical iPad verification is implied by an iPad viewport or WebKit run. Final screenshot critique and mechanical scan results are recorded after implementation.

## Final rendered critique and scans

Final wide, portrait iPad, phone and collapsed-search screenshots were inspected after the grid/flex header correction. The center remains the primary task at every size, category names and actions remain readable, the phone URL controls fit, and search stays inside a bounded central scroller. Final screenshots include real fonts/icons where available. A main landmark, SVG clear icons, inherited button fonts, larger Quick Settings metadata and native pinch permission complete the accessibility pass.

Impeccable's official detector returned `[]` on `heavenly-home.css` and `heavenly-layout.js`. Taste's official app lint found zero failures; lexical blur/shadow warnings include declarations setting those properties to `none`, while the resize glow is explicitly required by the user. The app browser inspector ran at 1440, 768 and 390px. It has one explained `no-title` failure because its `querySelector('h1')` chooses the hidden educational decoy heading before the visible Heavenly heading. The main landmark visibly contains Heavenly's h1; changing or deleting the decoy for a detector would be inappropriate. See [preserved findings](evidence/design-checks.json).
