# Independent review and resolved findings

The review used the actual source and rendered pages, including a separate agent's read-only checks of the message renderer and Academy information shell. It did not recruit students or use physical devices. The primary agent also inspected the real baseline and final desktop/phone captures, character scenes, playlist panels, recovery page and complete comparison report.

The review found and corrected concrete interaction problems:

| Finding | Correction and evidence |
| --- | --- |
| WebKit could suppress a Pause click after focus changed because the renderer replaced an unchanged button text node. | State updates now change text and attributes only when their values differ. Real mouse clicks after keyboard Next are covered in the combined and focused browser suites. |
| Hidden or focused message tooltips could extend a narrow page. | Hidden tooltips do not occupy overflow space; visible help stays inside the message owner. Both linked messages are checked at 320 and 390 pixels. |
| A live reduced-motion change replaced the original dialogue trigger, leaving a stale return-focus node. | Closing a scene resolves its current rendered trigger. Focused links and dialogue controls also survive the preference change. |
| Changing reduced motion during the nonmodal dance could close and reopen the dialog, stealing focus from the URL input. | Only the first transition leaves modal dialogue. Later static redraws update the existing nonmodal panel and preserve unrelated input focus. |
| An uppercase HTTPS destination passed validation but missed the external-link attributes. | External-link rendering treats the protocol case-insensitively and retains the new-tab announcement and `noopener noreferrer`. |
| HQ Undo/import could replace unapplied form edits, and keyboard actions could lose their location. | Draft buffers are preserved, imports refuse unapplied edits, and save/reorder keep keyboard focus. Corrupt stored drafts remain untouched. |

The [independent scenarios](../../test/browser/phase6_7_independent_review.cjs) were rerun after those corrections. All six checks passed in each of Chromium, Firefox and Linux WebKit, with no page errors: [results](evidence/independent-review.json) and [log](evidence/independent-review.txt). The broader [message suite](evidence/messages-browser-results.json), [HQ suite](evidence/developer-messages-browser-results.json), and [Academy audit](academy-audit.md) provide the corresponding implementation evidence.

The message schema allows bounded plain text and approved action, theme, asset and speaker values. It rejects executable fields, arbitrary CSS, unsafe URL schemes and nested links inside action buttons. The renderer uses DOM construction and text nodes. HQ previews contain their scenes and block ordinary/middle-click external navigation. Export downloads reviewed JSON for a repository PR; the browser has no GitHub credential or publishing endpoint. The `codex` shortcut remains a local entry point, not authentication.

Academy information frames contain only allowlisted trusted local documents. They are distinct from authored HTML Viewer content. The Viewer retains its existing opaque-origin sandbox, denied parent storage/DOM access, bounded diagnostics and popup restrictions. The independent Viewer attack suite and practice compatibility suite execute those boundaries in all three engines; no permission was relaxed to make an example work.

The final visual comparison embeds 40 actual screenshots. Every image was decoded and opened at its natural pixel width, with keyboard dismissal and a narrow-screen check. Both embedded recordings loaded metadata and stayed paused. Managed Chromium blocks `file://`, so validation served the standalone artifact over local HTTP with external requests blocked: [report validation](evidence/report-validation.json). The separate third recording demonstrates the plain-language Settings and Viewer flow.

Native browser/OS zoom, Apple Safari, physical-device input and performance, third-party service availability, and actual student comprehension remain outside these emulated Linux checks. The supplied character artwork's upstream rights are not established by the repository; its existing originals are preserved and this change claims no new license for them. The Academy photograph has its own verified source and reuse license.
