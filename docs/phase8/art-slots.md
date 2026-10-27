# Phase 8 character artwork import map

Phase 8 uses actual dialogue components. It does not ship a fabricated Cloudy, hunter or player portrait. Pending portraits show small, legible character-name placeholders. Existing `ao-dance.gif`, `ao-still.webp`, `ao-side.webp`, `anger.webp`, `doggy.webp` and `khezu.webp` remain in `public/assets/messages/`; their repository originals are untouched. No new licensing claims are made for supplied art.

Put approved, transparent PNG portraits in `public/assets/messages/portraits/` and add their exact mapping to `manifest.json`. That manifest starts as `{}`. Only listed, recognized files are requested, so absent art never causes speculative 404 requests or broken images. A failed approved-image request falls back to its character name. A later artwork import changes assets and the manifest, without rewriting dialogue or its engine.

| Scene asset key | Needed filename | Intended content |
| --- | --- | --- |
| `player` | `player-neutral.png` | Approved original brown-bob-haired, neutral-presenting pixel player bust: nearly closed horizontal eyes, neutral mouth, navy sweater with cyan/purple stripes |
| `cloudy` | `cloudy-neutral.png` | Approved new humanoid Cloudy master/neutral expression; silver-white/light-blue fluffy hair, purple eyes and celestial school-inspired clothing |
| `cloudy-angry` | `cloudy-angry.png` | Future approved Cloudy angry expression; optional independent slot, not substituted with invented art |
| `hunter` | `hunter-smug.png` | Future approved shaggy-haired, short-bearded hunter with subtle raised brow/smirk; final artwork is still pending |

Example manifest after **those exact files have actually been approved and supplied**:

```json
{
  "player": "player-neutral.png",
  "cloudy": "cloudy-neutral.png",
  "cloudy-angry": "cloudy-angry.png",
  "hunter": "hunter-smug.png"
}
```

Transparent 512px square canvases (or similar portrait proportions with consistent empty margins) are suitable. The desktop frame reserves 156 × 172 CSS pixels; narrow screens reserve 112 × 122. Images use `object-fit: contain`; the frame does not change when an image loads. No requirement to pixelate the illustrated hunter is imposed. Existing anger artwork stays a compact inline reaction at the end of “What are you doing here? Go use the site”; it is not Cloudy's dialogue portrait. Ao Oni side-eye remains a separate right-side reaction. The five-dancer ending reuses one existing GIF URL and stays inside a bounded scene area.

## Data and compatibility

`heavenly-messages.json` is the source and `node scripts/build-messages.cjs` regenerates the browser copy. Existing scene steps without `imagePlacement` still validate and default to a left portrait (`ao-side` defaults right). New steps accept `imagePlacement: "left" | "right" | "inline"`; ordinary notes accept `noteImage: {"asset":"anger","imagePlacement":"inline"}`. The editor exposes both. All content stays text, not authored HTML, and images are selected from the fixed asset allowlist.

`HeavenlyMessages.config.musicNotes` defaults to `false`. It filters music-themed/headphone/playlist notes from selection while retaining every playlist record and asset. Setting it to `true` reverses the visibility gate. It is independent of the Monochrome shortcut and does not start audio.

`heavenly_dialogue_state_v1` contains per-scene `discovered`, `completed`, `appearances`, `autoOpen` and `autoChoiceMade` values, validated defensively. Old session-dismissal data no longer hides manual character notes. Completion is recorded only after the final dialogue line is advanced; Escape, navigation and interrupted playback leave an incomplete scene incomplete. Storage failure preserves the in-memory interaction. Unknown schemas, future scene IDs/fields and corrupt stored records keep their original bytes unchanged; scenes run transiently until an explicit supported import or reset replaces that record. Other-tab changes and same-session imports are refreshed before updates, so completing a different scene does not overwrite another tab’s state. Preview uses the same renderer on the actual homepage but does not write discovery, completion, appearance or playlist state.

The merged baseline contains **no genuine automatically opening character events**. Ao Oni, Khezu, Doggy and Purple Hulk were and remain manual note actions. No automatic trigger, repeat-event opt-out question or settings entry has been invented. Separate opt-out/count fields are reserved for a future genuinely automatic event integration; they do not change any manual-note behavior. Rotation itself only displays a note. A first discovery gives one local cue; it never opens dialogue, moves scrolling, changes browser zoom or plays audio.
