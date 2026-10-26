# Phase 6–7 contribution review

Initial review: 2026-10-25, against `main` `a329d6cf0a01728526057b8a854a5ec7fb19c705` (PR #199 merged). Read [the Phase 4–5 review](../phase4-5/contribution-review.md) before making new integration decisions. This pass inspected GitHub metadata and actual code diffs; no Google Jules account, workspace, task, session, or schedule was accessed.

## Candidate inventory

The initial GitHub open-PR query returned one candidate: [Bolt PR #197](https://github.com/zryr/Heavenly-Node/pull/197), at head `fae4674d403bddf9c9992830f816fdd615c47e71`. Metadata reports it is open, unmerged, and currently not mergeable. Its full five-file patch was read rather than relying on its parity/performance claims.

Branch search was paginated to an empty final page and cross-checked with GitHub's branches endpoint and `git fetch origin '+refs/heads/*:refs/remotes/origin/*'`:

| Remote branch | Verified head | Coverage/decision |
| --- | --- | --- |
| `main` | `a329d6cf0a01728526057b8a854a5ec7fb19c705` | Baseline contains merged PR #199. |
| `feat/celestial-settings-viewer-widgets` | `61d418a122ff04ad9fef4c6318bed0ef5406b973` | Zero commits ahead and one behind `main`; comparison has no changed files. Already integrated. |
| `bolt-hot-path-optimizations-12027304814397025331` | `fae4674d403bddf9c9992830f816fdd615c47e71` | One commit ahead of its merge base, nine main commits behind; inspect scoped proposals below. |

No current remote Palette or Sentinel branch, or additional new candidate branch, was returned. A GitHub Sentinel PR search returned no results. Historical Palette PRs #192 and #195 are closed without merge; their actual patches were also checked against current-main behavior, below. Absence of a remote branch is not treated as evidence of an unseen contribution's contents.

## Decisions from actual diffs

| Proposal | Finding against current main | Decision and rationale |
| --- | --- | --- |
| Bolt #197 `srcset` character-loop optimization | `custom-client/unblocker-client.js` already contains `isSrcsetWhitespace`, attributed to #197, with vertical-tab and Unicode whitespace support. `test/srcset_whitespace.test.js` covers every JavaScript BMP whitespace separator through rewriting. | **Accepted, existing adaptation.** Keep the parity-preserving implementation; do not replace it with the original ASCII-only helper. No duplicate integration is needed. |
| Bolt #197 header enumeration in `app.js` | Replaces own-key iteration with unguarded `for…in`, which also copies inherited enumerable header-like properties. Main still uses `Object.keys(original)`. | **Rejected as written; defer a guarded adaptation.** Avoid changing security-header restoration semantics for a small unrelated optimization. |
| Bolt #197 VitePress URL guards | Tests raw `'/assets/'` before URL parsing. A valid backslash-containing HTTPS URL can normalize into an assets pathname even when that raw substring is absent. | **Rejected as written; defer a parity-covered adaptation.** Retain normalization before deciding the request is irrelevant. |
| Bolt #197 direct MIME comparisons | The three comparisons match the existing values, but main's `htmlTypes` array is module-scoped, not allocated per request as the PR body claims. | **Deferred.** Compatible in isolation, but a small unmeasured middleware change adds no required Academy/message/plain-language behavior. |
| Bolt #197 journal entry | Describes the original ASCII-only change and source benchmark. | **Rejected for copying.** It would misdescribe the existing adapted behavior. Existing attribution remains in source and Phase 4–5 notes. |
| Palette [#192](https://github.com/zryr/Heavenly-Node/pull/192) Ctrl/Cmd+Enter and shortcut hint | The current external viewer controller already runs code on Ctrl/Cmd+Enter, shows a platform-sensitive shortcut hint, and provides a title hint. | **Accepted, existing coverage.** Do not restore old inline editor code or brittle old-string tests. |
| Palette [#195](https://github.com/zryr/Heavenly-Node/pull/195) Share Bookmarks tab roles/state | Main already has a named tablist, tab roles/controls/selected state, labelled panels, roving tabindex, and shared tab-state synchronization. | **Accepted, existing coverage.** Main exceeds the original role/state-only patch; no cherry-pick is needed. |

At that initial snapshot, no new application edit or merge was recommended from the then-available remote contributions. Useful compatible behavior is already present in main; the remaining Bolt changes have correctness or scope reasons to stay out. The original PR's benchmark numbers are not claims about this branch or production latency.

## Earlier delivery snapshot

That earlier delivery recheck repeated the open-PR query, branch search through the empty final page, full remote-ref fetch, and the complete five-file #197 patch review. Main remains `a329d6cf0a01728526057b8a854a5ec7fb19c705`; #197 remains the only open PR, at unchanged head `fae4674d403bddf9c9992830f816fdd615c47e71`. The prior Phase 4–5 branch remains fully incorporated. No new Palette or Sentinel branch was returned. The decisions above remain unchanged; no second integration branch, main merge, or Google Jules workspace action was performed.


## Final delivery recheck — 26 October 2026

A new GitHub refresh found two newer open contributions. This supersedes the earlier statement that #197 was the only open candidate. The full fetched patches for both new heads were read against `main` `a329d6cf0a01728526057b8a854a5ec7fb19c705` and the current feature implementation; the review did not rely on PR descriptions or reported benchmark percentages.

| Contribution | Verified fetched head | Actual patch reviewed |
| --- | --- | --- |
| [Bolt #197](https://github.com/zryr/Heavenly-Node/pull/197) | `fae4674d403bddf9c9992830f816fdd615c47e71` | Earlier five-file review above remains applicable. |
| [Bolt #200](https://github.com/zryr/Heavenly-Node/pull/200), `bolt-perf-optimizations-14933115691867486993` | `b5635ed4f8540fa091927630f15dad9154b4b9cd` | All six changed files: `app.js`, VitePress adapter, bookmark model, navigation helper, security-header benchmark, and Bolt journal. |
| [Bolt #201](https://github.com/zryr/Heavenly-Node/pull/201), `jules-16456768077992659184-098a2cf1` | `5247068c48a450286b55d961c1348f223bbc6019` | All four changed files: `app.js`, VitePress adapter, navigation helper, and security-header benchmark. |

The final scoped decisions are:

| Proposal | Evidence and compatibility | Decision |
| --- | --- | --- |
| #200 indexed `findBookmarkByUrl` traversal | Dense-array first-match order agrees with the baseline, but the raw proposal throws on sparse parent/child arrays where `Array#some` skips holes. Its live `.length` loops also differ from `some` when getters append entries during traversal. | **Accepted as a targeted adaptation.** The feature branch uses indexed loops with `i in bookmarks` / `j in children` hole checks and captured parent/child lengths. Canonical URL identity, parent-before-child traversal, and first matching object remain unchanged. Attribution explicitly names Bolt #200. This helper directly supports homepage bookmark lookup. |
| #200/#201 unguarded header `for…in` | An inherited enumerable CSP/X-Frame-Options property is copied by the proposal and excluded by the current own-key traversal. #200's broken-map loop similarly marks a main destination broken from an inherited URL property. | **Rejected as written.** Retain own-only semantics. A separately measured own-property-guarded optimization can be considered later. |
| #200/#201 raw `/assets/` string guard | `https://site.test\assets\chunks\framework.hash.js` normalizes to `/assets/chunks/framework.hash.js` under native URL parsing, but the raw substring guard skips its recognized adapter. | **Rejected.** Keep parsing and pathname normalization before the assets decision. |
| #201 Coolmath raw-host guard | Native URL parsing recognizes valid percent-escaped hosts such as `https://%43oolmathgames.com/` and `https://%63%6folmathgames.com/`. The proposal incorrectly returns false before parsing them. | **Rejected.** Retain normalized hostname checks for Quick Save eligibility. |
| #200/#201 lazy target URL construction | Moving target parsing after Referer cleanup mutates the Referer on invalid-target input; current code exits before that mutation. Valid ordinary-target cases agree. | **Deferred.** No proxy request-middleware rewrite is needed for this delivery. |
| #201 legacy `data.uri` Origin fallback | Actual node-unblocker code populates `data.uri` using legacy `url.parse`, whose objects lack `.origin`. The proposed protocol/host fallback addresses that real shape, including ports and IPv6, but is bundled with the changed validation order above. | **Deferred as a concrete follow-up.** A separate scoped fix should retain validation-before-mutation and test legacy URI objects, ports, IPv6 and malformed targets. This delivery does not expand into proxy backend changes. |
| Hoisted header regex, own-property-guarded enumeration, and six direct JavaScript MIME comparisons | These can preserve the current supported string vocabulary and own-key/value behavior when implemented independently. | **Deferred.** Keep middleware changes outside this Academy/message/plain-language delivery. |
| Security-header benchmark and #200 journal | The benchmark proposal usefully replaces an obsolete stripping workload with restoration, but no production speedup was established by this review. The journal's broad performance prescriptions do not capture the parity problems found above. | **Deferred benchmark cleanup; do not copy the journal.** No benchmark percentage is a claim about this feature branch or user-visible latency. |

The review executed the actual fetched functions in isolated Node modules: [#200 parity cases](evidence/contribution-pr200-parity.json) and [#201 parity cases](evidence/contribution-pr201-parity.json). The #200 adaptation has dedicated dense, sparse and getter-mutation parity tests in `test/jules_bookmark_lookup.test.js`; [targeted test output](evidence/jules-adaptation.txt) records 32 passing checks across the selected suites. Browser follow-up evidence is stored separately under the `regressions/post-jules-*` destinations so earlier successful logs remain intact. The [post-adaptation summary](evidence/regressions/post-jules-summary.json) records eight search groups passed in each of Chromium, Firefox and WebKit, plus 21 catalog/motion groups passed in Chromium. The first catalog follow-up missed the finite Preferred-animation window; its failed log remains beside the final run. Only the test observation order changed: the same animation assertion and working-frame capture now run immediately after **Set as Preferred**, before storage and badge queries. All final-state checks remain; no application timing was changed.

No PR was automatically merged or cherry-picked wholesale. The accepted lookup adaptation was incorporated directly into the existing feature branch. No second integration branch was created, and no Google Jules account, workspace, task, session or schedule was accessed.
