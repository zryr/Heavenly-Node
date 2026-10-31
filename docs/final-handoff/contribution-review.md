# Google Jules contribution decisions

Reviewed recent/open GitHub PR metadata and actual proposed diffs against merged #207. The selected branch commit histories were fetched without merging: #216 `ea76337`, #212 `70e74cd`, #219 `a5fcff1`, #217 `115bd62`. No Jules service account, task, schedule, recurrence or archive was accessed or changed.

| PR | Problem and current relevance | Decision |
| --- | --- | --- |
| Palette [#219](https://github.com/zryr/Heavenly-Node/pull/219) | Nested notice could overwrite the Special Links return-focus owner; editor controls lacked context | Adapted the focus guard and meaningful icon-picker/sub-bookmark/import control names; preserved existing modal ownership |
| Palette [#218](https://github.com/zryr/Heavenly-Node/pull/218) | Icon-source focus visibility, browse status, older modal/settings focus changes | Adapted icon-source focus and browse live status. Other focus changes overlap #207 or need a broader ownership change; not replayed |
| Palette [#217](https://github.com/zryr/Heavenly-Node/pull/217) | Generic close labels, notes/info backdrop dismissal and Viewer status feedback | Adapted contextual labels, notes/info backdrop closure and preview status announcements |
| Palette [#214](https://github.com/zryr/Heavenly-Node/pull/214) | Viewer focus styling and view-switcher focus resolution; export/import labels | Labels covered by #217. Deferred unrelated Viewer focus restyling/handler changes; existing isolated Viewer passes the security and keyboard suites |
| Palette [#213](https://github.com/zryr/Heavenly-Node/pull/213) | Quick Settings trigger expanded state, share labels, Viewer live status | Adapted trigger `aria-expanded` synchronization and Viewer live status. Remaining duplicated labeling is already covered or nonessential |
| Palette [#210](https://github.com/zryr/Heavenly-Node/pull/210) | Viewer menu/shortcut/status and settings focus changes | Overlapping menu departure behavior was already adapted in #207. Kept current focused editor shortcut semantics; did not add another global shortcut |
| Palette [#206](https://github.com/zryr/Heavenly-Node/pull/206) | Sub-bookmark names, preset selected states, old decoy focus | Useful contextual names/pressed states are already in #207. Old decoy patch is obsolete after isolated Academy navigation |
| Palette [#205](https://github.com/zryr/Heavenly-Node/pull/205) | Global overlay focus trap and cloak dropdown keys | Cloak dropdown keys/menu departure already adapted in #207. Skipped its global trap; new native dialogs receive a scoped top-dialog focus loop that is tested with stacked shadow-root dialogs |
| Bolt [#216](https://github.com/zryr/Heavenly-Node/pull/216) | Repeated full bookmark scans per category during search | Adapted single-pass category grouping, retaining existing visibility behavior and adding shared collection context/identity handling |
| Bolt [#215](https://github.com/zryr/Heavenly-Node/pull/215) | Repeated mirror-key normalization, require lookup, security-header/router hot paths | Adapted mirror-key reuse and static diagnostics require hoisting. Deferred unrelated URL/router/header fast paths; no unmeasured percentage-speedup claim |
| Bolt [#212](https://github.com/zryr/Heavenly-Node/pull/212) | Repeated mirror key calculations and bookmark lookup proposals | Adapted normalized-key reuse in mirror state and own-property-only broken-report iteration. Existing lookup behavior remains covered; redundant rewrite skipped |
| Bolt [#211](https://github.com/zryr/Heavenly-Node/pull/211) | Proxy injector/header handling, mirror keys and prefix checks | Static require hoisting covered by selective #215 adaptation; mirror changes covered by #212. Unrelated rewrite/header changes deferred |
| Bolt [#209](https://github.com/zryr/Heavenly-Node/pull/209) | Header, history-wrapper, imports and mirror-state optimizations | Overlapping safe import/mirror changes covered above. Deferred history-wrapper and header rewrites to avoid changing navigation/security semantics without a relevant defect |
| Bolt [#208](https://github.com/zryr/Heavenly-Node/pull/208) | Header filtering and mirror-state allocations | Mirror candidate normalization adapted; header changes overlap later PRs and remain deferred |
| Bolt [#204](https://github.com/zryr/Heavenly-Node/pull/204) | Proxy normalization, router guards, imports and mirror keys | Relevant imports/mirror ideas covered; deferred scheme-validation/rewriter changes, preserving existing diagnostics and tests |
| Bolt [#203](https://github.com/zryr/Heavenly-Node/pull/203) | URL slicing, MIME guards and mirror iteration | Retained #207's earlier decision for unrelated hot paths; safely adapted own-property mirror iteration through the later candidates |
| Sentinel | Both repository-scoped Sentinel PR searches returned no matches; repository review history also records no visible Sentinel candidate | No unavailable patch or account action claimed |

Search grouping, mirror behavior, settings controls, native dialog focus, history, proxy behavior and Viewer isolation have automated regression coverage. Work was re-implemented on the feature branch where compatible; no Jules PR was blindly merged.

## Housekeeping candidates

GitHub confirms older Palette #188/#190 and Bolt #191 were merged. Their linked Jules runs may be worth checking for completed/archive-ready status. Open #205/#206 contain substantial overlap with merged #207, and #208–#219 overlap one another or this implementation; their authors can review them after this PR is accepted. GitHub PR status does not establish Jules task status. No task was archived, disabled or rescheduled.
