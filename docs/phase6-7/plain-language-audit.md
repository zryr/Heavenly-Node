# Plain-language audit — Phase 6 + 7

Audience: readers in grades 6–8 and people using Heavenly for the first time. This is a copy and comprehension review, not a study with students. No students or other research participants were recruited. The walkthrough below was performed by the agent against the real local application and recorded separately from browser regression tests.

Baseline: `a329d6c` on `main`, 25 October 2026. Read alongside the [Phase 4–5 Settings results](../phase4-5/settings-results.md), [Viewer results](../phase4-5/viewer-results.md), and [security review](../phase4-5/security-review.md). The earlier isolation and storage boundaries remain the source of truth.

## What changed and why

Primary copy now answers “What happens if I use this?” before introducing implementation terms. Labels that people may already know remain where useful; short descriptions explain them. Native `details`/`summary` disclosures hold longer proxy and Viewer explanations, so they work with keyboard and touch without a new dialog or hidden custom help behavior.

| Surface | Before | After / reason |
| --- | --- | --- |
| Homepage introduction | “Your favorite places, thoughtfully within reach…” | “Save your favorite websites, organize bookmarks, and browse through Heavenly’s proxy.” Names the three things readers can do. |
| About / opening links | “Choose Direct or Proxy where offered. Site compatibility and availability can vary.” | Explains that Direct opens the website itself and Proxy opens it through Heavenly, then says websites may not work or may be unavailable. |
| Main search | “Enter a URL or search query…” | “Search or enter a website address…” Both placeholder and accessible name use the same familiar action. |
| Bookmark types | “Folder-Bookmark (Site Link + Expandable Folder)” / “Normal Folder (Expandable Container Only)” | “Bookmark with folder (website and saved links)” / “Folder (holds saved links).” The live description distinguishes the title’s action from the arrow’s action. It describes the actual new-tab preference instead of promising every bookmark opens a new tab. |
| Layout help | “Restore panel widths and panel/category collapse states.” | “Reset panel widths and which panels and categories are open.” Scope stays explicit without “states.” |
| Settings categories | “Master overrides…” / “Tools that accompany you…” | “Turn groups of tools and tab disguises off” / “Choose the tools shown on proxy pages.” Categories describe a practical result. |
| Master switches | “Disable All Privacy & Widget Overlays” and “Completely disables…” | “Turn off cloaking, panic & widgets.” Explains which features stop and that saved choices are kept. The switch polarity stays the same. |
| Cloaking | “favicon,” “regardless of tab visibility,” and “app identity to mimic” | “tab title and icon,” “even while you use the tab,” and a saved title/icon. Clarifies that changing appearance does not make browsing private. |
| Proxy address setting | Long paragraph mixing `/proxy/`, a wrapper, frames, and `about:blank` | Two-sentence primary description plus “About proxy addresses and about:blank.” The disclosure keeps the `/proxy/` term, browser-bar behavior, Open normally fallback, and privacy limits. |
| Timer | “Timed Decoy Auto-Unlock” | “Open Heavenly after a short wait.” Explains the school page trigger and retains the Terms of Service entry route. The prior name remains searchable. |
| Randomizer | “specific identities…random rotation pool” | “saved tab disguises…picked at random.” Quick Settings still explains that an empty matching selection uses all presets, that random choice wins over the manual preset while on, and that editing the pool does not enable it. |
| Panic controls | “Instantly redirects…to a safe educational website” | Opens the reader’s chosen website on supported proxy pages. Avoids promising that an arbitrary destination is safe; explains that history is not erased. Saving the key and toggling the shortcut remain separate from triggering it. |
| Widgets and dock | “viewport edge,” “pagination overlays,” “Navigation Quick Search Bar” descriptions | Uses “screen edge,” “page controls,” and a search/website address field. Widget buttons explain stopping/allowing scrolling, switching the lens, minimizing tools, and finding icons. Existing widget names, zoom, positioning, and controls stay available. |
| Backup | “Data Migration & Granular Backup” | “Save or restore a backup.” Download/import descriptions explain choosing items. JSON stays visible as the file format; Merge and Overwrite retain their different effects and explicit overwrite confirmation. |
| Saved work | Separate notes about local preferences and notes | Homepage, Settings backup, and Viewer now state the relevant facts: data stays in this browser, does not sync automatically, and can be erased by clearing browser data. Private backups include notes; share links include them only when selected. |
| Mirrors | “None of these destinations is known to be working…” | “You marked all these links as broken. Heavenly has not checked them live.” Clearly distinguishes saved user markers from a live health check. “Mirror” is explained as another saved link. |
| Viewer first use | “A little space to build” / “Execute current code live in preview frame” | “Build and preview a web page” / “Run your code in the preview.” The intro says to write or paste HTML/CSS/JavaScript, then choose Run Code. |
| Viewer diagnostics | “resource,” “asynchronous operation,” “Document navigated” explanation | Explains a file that did not load, a background task failure (with the promise-rejection term), or a preview that opened another page. Browser limits and incomplete error reporting remain explicit. |
| Error page | “An error occurred while attempting…” and a technical error as the main headline | “This website could not load,” practical retry guidance, “Website address,” “Open website directly,” and “Return to Heavenly.” Technical classifications, request IDs, sanitized reports, and diagnostic contracts remain in advanced details. Direct-open help explains it bypasses Heavenly and may still be blocked by the network. |

## Meaning and behavior preserved

- No settings/storage keys, values, catalog identities, IDs, selectors, link targets, deep links, or persisted schemas were renamed. Existing switch polarity, imported data handling, focus behavior, and native settings/search interactions stay intact.
- Existing Settings aliases were retained. Added the previous master-switch labels, “Timed Decoy Auto-Unlock,” “Enable Collapsible Widget Dock Bar,” “Data Migration & Granular Backup,” and related technical terms. Queries such as `favicon`, `zoom dimensions`, `keyboard shortcut`, and `fixed count` still reach their controls.
- Preview code still runs in the existing opaque-origin sandbox. The primary note says it cannot read Heavenly’s page or saved settings. External images, scripts, and forms can make requests, and the note makes no privacy or anonymity guarantee. Advanced help keeps the restrictions on popups, dialogs, storage, workers, and device APIs, incomplete diagnostics, and reload/close recovery for an unresponsive tab.
- Viewer source, its one-version recovery behavior, and clipboard/storage failures retain the existing implementation. Saving only in this browser is distinguished from keeping a copy elsewhere. No automatic cross-device sync is implied.
- Reset and overwrite confirmations retain their exact data scope. Error classification values and sanitized technical-report fields remain unchanged. No legal terms or legal meaning were rewritten.

## Repeatable comprehension rubric

Use this rubric during review with a fresh browser profile at 390×844 and 1440×1000. For each task, ask the reader to explain the expected result **before** activating the control. Record the explanation verbatim; do not supply the technical term first. Score each dimension 0 (wrong/missing), 1 (partly correct), or 2 (correct without prompting). A copy change passes only when each critical dimension is 2; a total score cannot hide a security or data-loss misunderstanding.

| Dimension | A score of 2 means |
| --- | --- |
| Find the action | The reader reaches the correct control from its label, category, or a familiar search term. |
| Predict the result | The reader can explain what changes, what is saved, and when refresh/new-tab behavior matters. |
| Recover from trouble | The reader can name the offered retry, restore, backup, or copy step without assuming an action succeeded. |
| Understand privacy | The reader knows tab appearance/about:blank do not promise private browsing, and preview external resources can send requests. |
| Protect saved work | The reader knows bookmarks/settings/code are browser-local; clearing browser data can erase them; exporting/copying is an explicit step. |
| Use help independently | The reader can open and close the native help disclosure with Enter/Space or a tap and return to the control. |

## Agent-led novice walkthrough and evidence

This walkthrough used the first-time-reader questions below as a desk review, then checked the relevant rendered UI and keyboard actions in Chromium. It is not evidence that a particular school grade or real student population understood the copy.

| Question / task | Expected understanding and observed review result |
| --- | --- |
| “How do I make a bookmark use the website itself?” | About explains Direct versus Proxy; the bookmark form’s “How to open” offers the existing choices. No new launch behavior was introduced. |
| “I knew the old timer or master-switch name. Can I still find it?” | Real browser searches for `timed decoy auto unlock`, `Disable All Privacy Widget Overlays`, `collapsible widget dock`, and `data migration granular backup` reached the original controls. |
| “Does turning tools off delete my choices?” | The primary master-switch and dock descriptions explicitly say choices and positions are kept. Controls and storage identities remain the established ones. |
| “Is an about:blank tab private?” | Keyboard-opened Settings help states that these options do not make browsing private or anonymous. |
| “Can my preview read my saved Heavenly settings?” | The visible Viewer note says it cannot. The same note says external images/scripts/forms can send requests and does not promise privacy or anonymity. |
| “Will my code follow me to a different device?” | Viewer help says it saves only in this browser, explains clearing browser data, and points to Tools → Copy Code. Homepage and backup copy explain the corresponding bookmark/settings backup action. |
| “How do I recover or get help?” | Viewer help opens with Enter and explains one previous version, preview restrictions, errors, and reload/close recovery. Expanded help had no page overflow at phone and desktop widths. |

Recorded checks: [walkthrough JSON](evidence/plain-language-walkthrough.json). Visually inspected real phone rendering: [expanded Viewer help](evidence/plain-language-viewer-help-phone.png). The initial walkthrough script needed two harness corrections: the desktop-only category rail is hidden on phones, and search intentionally opens matching disclosures; the final check uses the normal deep-link route to test opening the disclosure. Neither required a product change.

Validation completed during this copy pass: 70 targeted Mocha checks passed across accessibility, FMHY, launch preferences, Settings, Viewer, and Quick Settings; modified runtime JavaScript passed syntax checks. Intended-copy assertions were updated to the new accessible names and messages; behavior and isolation assertions were retained. The full final combined regressions and responsive evidence are reported by the Phase 6–7 verification report. Physical-device and actual student-comprehension testing remain unperformed.
