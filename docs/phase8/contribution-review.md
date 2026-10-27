# GitHub contribution review

Reviewed GitHub PR metadata and actual changed-file patches on 2026-10-27. No Jules workspace, jobs, schedules or archives were accessed or changed; no independent PR was merged.

| Candidate | Decision |
| --- | --- |
| Palette [#205](https://github.com/zryr/Heavenly-Node/pull/205) | Selectively adapt HTML Viewer tools-menu focus departure and Settings cloak-option keyboard navigation. Preserve existing HQ focus management and native dialogue behavior; the proposed global modal trap would need separate testing for stacked native dialogs and is not copied. Native checkboxes already expose checked semantics, so redundant switch state synchronization is unnecessary. |
| Palette [#206](https://github.com/zryr/Heavenly-Node/pull/206) | Selectively adapt selected-state semantics on preset buttons and contextual sub-bookmark action names. The old decoy-unlock code was replaced by isolated Academy navigation in #202, so its focus patch is obsolete. Existing note `role=status` already implies polite announcements. |
| Bolt [#203](https://github.com/zryr/Heavenly-Node/pull/203) | Reviewed URL-prefix slicing, MIME guards, middleware header checks and mirror iteration. Defer unrelated proxy hot-path changes: they do not repair Phase 8 interactions, and proposed speedup claims need representative local measurement and inherited-property parity tests. Existing reviewed Phase 6–7 optimizations remain. |
| Bolt #197, #200, #201; earlier Palette | Prior decisions are recorded in [Phase 6–7 review](../phase6-7/contribution-review.md). Do not replay old patches over merged implementations. |
| Sentinel | GitHub search `repo:zryr/Heavenly-Node Sentinel` returned no matching PRs. No unavailable review is claimed. |

The selected changes use the current code structure and receive browser interaction coverage in Phase 8. They are adapted with attribution rather than auto-merged.
