# Animation reliability audit

Baseline: `013cd07a36854c74b8feb8f29a8437f2c4daa72b`. The existing site already had shared `HeavenlyMotion` and `HeavenlyDialogs` utilities. This overhaul repairs those lifecycles rather than adding competing CSS animations.

## Verified defects and changes

- **First folder opening skipped height expansion.** `toggleFolder()` appended newly built children while they were already visible. The height utility therefore measured the same full height before and after. The new browser regression failed against the original implementation with keyframes `[64,64]`. New folder children start hidden before mounting and the same test now observes `[0,64]`. Initial folder buttons also expose `aria-expanded`.
- **Dialog reversal restarted from a fixed endpoint.** Closing an opening dialog began at opacity 1 and its fully open transform; reopening a closing dialog restarted from the hidden endpoint. The controller now samples rendered card/backdrop opacity and transform before canceling the outgoing effects. Both directions continue from that frame, with guarded completion so an old close cannot hide a reopened dialog.
- **Interrupted targets retained animation ownership.** A removed height target previously remained in the running map until completion/watchdog. Removal now retires ownership promptly, cancels effects, and completes the requested logical state. The mutation observer exists only while animations are running. Cancellation clears the owner before promise/event callbacks can arrive, and stale callbacks cannot settle a newer transition.
- **Hidden or transformed measurement could misrepresent motion.** Height measurements now use unscaled border-box dimensions (`offsetHeight`) rather than the parent dialog's temporary scale. Hidden-ancestor targets settle immediately rather than running invisible effects. Synchronous and reduced-motion completion leave no stale accordion marker.
- **Mirror disclosure behavior differed by section.** Available Mirrors, Broken, and Add Custom Mirror now use the same short reversible height lifecycle. Native details semantics remain; collapsed bodies are hidden and inert, focus returns to the summary when appropriate, and closing/reopening preserves unsaved form text.
- **Live reduced-motion changes and hidden documents** finish owned state immediately. Dialog cancellation uses both WAAPI events and the `finished` promise where available, with a watchdog for suspended renderers. A paused animation is deliberately not truncated at its nominal duration.

The drag-controller owner separately fixed pickup animation starting while the preview was still invisible. See [gesture audit](gesture-audit.md).

## Executed browser verification

`test/browser/motion_reliability.cjs` passed all **5 groups in Chromium, Firefox, and WebKit**. It uses rendered control clicks and actual WAAPI frame samples for first opening, rapid reversal, dialog continuation, target removal, Broken/Add Custom Mirror panels, unsaved text, and reduced motion.

`node test/browser/catalog_updates.cjs` passed **21 groups in Chromium**, including catalog preservation/export/import, rapid Show More/subsection changes, confirmed Mark Broken and genuine promotion feedback, Mark Working without changing preferred/active choices, Preferred Site feedback, external animation cancellation, rerender interruption, modal reopen, paused animation clocks, hidden documents, and reduced motion.

WebKit requires the environment-provided runtime libraries:

```sh
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
LD_LIBRARY_PATH=/workspace/shared/webkit-libs/root/usr/lib/x86_64-linux-gnu \
HEAVENLY_BROWSER=webkit node test/browser/motion_reliability.cjs
```

These are automated browser sessions, not physical iPad/Safari verification. The new test specifically checks first-opening displacement; earlier tests could pass by checking that an animation existed and that the final visibility was correct even when the expansion's two height keyframes were equal.

## Real before/after evidence

[Motion metadata](evidence/motion-metadata.json) records the immutable baseline and viewport (`1440 × 1000`). The reading-list capture has two children, hence a different natural height from the one-child regression fixture. Its original first-opening effect is `104px → 104px`; the updated effect is `0px → 132px`. The updated styling changes the natural content height.

- Before frame samples: [0 ms](evidence/motion-before-0ms.png), [70 ms](evidence/motion-before-70ms.png), [140 ms](evidence/motion-before-140ms.png), [210 ms](evidence/motion-before-210ms.png).
- After frame samples: [0 ms](evidence/motion-after-0ms.png), [70 ms](evidence/motion-after-70ms.png), [140 ms](evidence/motion-after-140ms.png), [210 ms](evidence/motion-after-210ms.png).
- Separate live recordings: [before](evidence/motion-before-live.webm), [after](evidence/motion-after-live.webm), each 3.32 seconds. These run real control clicks and rapid reversal on the browser clock without pausing or seeking the animation.

The filmstrip intentionally pauses the real WAAPI effect at the labeled times for inspection. It is not a timing benchmark. Both images and an extracted live-video frame were visually inspected. Reproduce with `node test/browser/capture_motion.cjs /path/to/immutable-baseline`.
