# Homepage messages

The homepage starts with ordinary copy and rotates after 12–15 seconds of visible, unattended time. Next remains available while paused. Hover, keyboard focus, a hidden document, an offscreen owner, an open character/playlist panel and explicit Pause compose independently. Pause is stored locally; closing or visiting a special message retires that message for the current tab session. Ordinary rotation is quiet and is not announced continuously to screen readers.

The 21 reviewed messages include humor, layout/search tips, the linked HTML Viewer hint, four playlists and four character scenes. IDs stay stable across edits. A seeded, injectable controller uses a 12% special chance on eligible slots, prevents consecutive specials, and chooses weighted least-seen entries to avoid long omissions. Neither a timer nor Next activates an experience.

Playlist activation first suggests: “For the full sound, try listening with headphones or both earbuds.” Open Playlist, Continue Without Opening and Close are available. That advice is dismissed for the entire tab session after any of those choices. Continuing reveals optional exploration controls: Aura Phonk → Hardstyle or Hardtekk → Favorite Songs. Each transition requires a click or keyboard activation. The four approved Spotify destinations are fixed in the renderer; Spotify opens only through an explicit Open Playlist anchor with a readable destination label, a new-tab notice and `noopener noreferrer`. No audio element, autoplay or playback API is used. Later deliberate activations show the playlist panel without repeating headphone advice.

Character dialogue uses You/Cloudy labels and native buttons. The purple side-eye asset accompanies “Ao Oni = Big Purple Hulk.” Khezu’s interrupted setup is followed by Cloudy’s “No, you can’t use it for that.” Doggy uses a warm, unhurried exchange. Ao Oni’s optional final dance uses seven short-lived dancers from the supplied animation. That burst is nonmodal and pointer-transparent; its small bottom-right Skip control remains available and the main URL input stays usable. Escape does not steal focus from an unrelated control during the burst. Normal dialogue is modal, with Close, Skip, keyboard traversal and focus restoration.

Reduced motion replaces animated GIFs with the supplied animation’s still frame and removes CSS movement. Changing the preference while a message or scene is present updates the current content; turning reduced motion on during a burst removes its dancers. Hiding the document, moving the message owner offscreen, leaving the page or detaching the owner cleans up the active scene. Destroy disconnects observers, owned global/media listeners and timers.

Copy renders with `createElement` and `textContent`; data is never interpreted as HTML, script or arbitrary CSS. Themes, gradients, icons, scenes, assets, speakers and action types are allowlisted. Text, IDs, counts, weights and HTTPS destinations are bounded/validated. Interactive buttons cannot contain nested links. The editor’s safe preview retains readable link destinations while blocking both ordinary clicks and middle-click navigation. The canonical JSON and deterministic generated browser artifact are documented in [the Developer HQ report](developer-messages.md).

The fixed copy well is 3.5rem on larger screens and 5rem on phones, followed by 32px Next/Pause controls. Published short, long and sticker messages keep the same height. Ordinary text uses a restrained gradient that shifts once over 1.4 seconds and a single short arrival fade; playlist monochrome/gold and character purple/warm treatments provide limited variation. Gradient animation pauses with the message and never loops. Forced-color and reduced-motion fallbacks preserve readable text.

## Supplied artwork

The five original user-supplied files remain unchanged at the repository root: `AO Oni Dance.gif`, `Ao Oni Side Eye.png`, `Khezu.png`, `Syshi Doggy.png` and `anger.png`. Their combined size is 9,353,250 bytes. No new third-party artwork was downloaded for these messages. The repository does not establish a separate upstream license for those supplied character images, and this implementation does not claim one.

Only optimized local derivatives are requested by the page:

| Derivative | Dimensions | Bytes |
| --- | --- | ---: |
| `ao-dance.gif` | 192 × 192, eight original frames | 57,663 |
| `ao-still.webp` | 192 × 192, static animation frame | 5,298 |
| `ao-side.webp` | 360 × 360 | 14,606 |
| `khezu.webp` | 360 × 360 | 16,208 |
| `doggy.webp` | 360 × 323 | 25,268 |
| `anger.webp` | 360 × 360 | 9,020 |

The derivatives total 128,063 bytes. Explicit image dimensions reserve space. The homepage sticker is static; animated artwork is requested only inside a deliberately opened scene.

## Verification

`npx mocha test/messages.test.js` passes 12 checks covering schema rejection, exact Spotify destinations, deterministic timing, composed pause reasons, equal/weighted fair selection, the special probability, eligibility, Next during Pause and idempotent destruction. `test/browser/messages.cjs` verifies actual browser timers, session dismissal, optional playlist progression, trusted anchor navigation against a local Spotify response, keyboard dialogue, original optimized assets, nonmodal dance/input behavior, reduced-motion changes, responsive stable heights, finite/pausable gradients, hidden/shown tooltip bounds, literal text rendering, disabled-preview middle clicks and detached-owner listener/timer cleanup. Browser results are recorded in [messages-browser-results.json](evidence/messages-browser-results.json).

WebKit's native mouse activation exposed a real bug: replacing the unchanged Pause label during focus transitions canceled its pending click. State updates now retain that DOM node unless its value changes, and the real Next-Enter → Pause-mouse sequence is covered. A second native WebKit focus behavior is handled explicitly so closing a nonmodal dance preserves a currently focused homepage input. Modal return focus also resolves the current trigger after a live reduced-motion rerender. Valid uppercase HTTPS links receive the same external-link attributes as lowercase HTTPS.

These are Chromium, Firefox and Linux WebKit desktop runs with emulated viewports, browser clocks and synthetic document visibility. Timing/pause checks run in a clock-controlled context; full-page mouse, keyboard, dialogue, native link and CSS-animation interactions run in a separate context using the normal browser clock. They do not establish physical-device behavior, Apple Safari behavior, Spotify availability, playback or headphone use.
