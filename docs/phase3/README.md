# Phase 3 review evidence

Open [comparison.html](comparison.html) for the portable visual report. Its original-resolution screenshots and short WebM recording are embedded, so the visual evidence opens offline. The image viewer supports keyboard dismissal and PNG downloads.

The report verification opens every screenshot at its natural pixel width, downloads every PNG and compares its bytes to the original, plays the 4.08-second recording, and checks keyboard dismissal and horizontal fit at 390 pixels. This executor serves the report over local HTTP because its managed Chromium policy blocks `file:` URLs.

- [Official catalog and migration policy](official-catalog.md)
- [Developer HQ and reviewed source export workflow](developer-hq.md)
- [Cross-branch contribution review](jules-review.md)
- [External destination launch observations](launch-verification.md)
- [Capture and independent integration results](evidence/phase3-visual-results.json)
- [Developer HQ browser results](evidence/developer-hq-browser-results.json) and [public collection browser results](evidence/public-collection-browser-results.json)
- [Report media verification](evidence/phase3-report-verification.json)
- [Combined unit-test results](evidence/phase3-unit-results.json) and [full output](evidence/phase3-unit.txt)
- [Combined homepage regression results](evidence/homepage-integration-results.json)
- [Authenticated deployed-preview results](evidence/live-preview-results.json)

The report covers all 16 requested visual states, including genuine pre-Phase3 Games and Newgrounds captures, both ordering confirmations, the pending official update, and phone/tablet layouts. Local recommendation fixtures are explicitly labeled and disabled; the published Picks list remains empty.

The combined repository suite passed 519 tests. Chromium, Firefox and Linux WebKit each passed 15 Developer HQ groups, 11 public collection groups and six independent integration groups. Both authenticated deployment previews passed their live checks with no page errors. The refined-preview readiness timeout and its successful fresh-link rerun remain recorded; the Phase3 live check passed on its first attempt.

## Reproduce the report

Run from the repository with Playwright and its browser dependencies available. Supply the final Phase1+2 commit as the baseline; the script extracts its actual public files into an immutable temporary snapshot.

```sh
HEAVENLY_PHASE3_BASELINE="$PWD" HEAVENLY_PHASE3_BASELINE_REF=<phase1-and-2-commit> node test/browser/phase3_evidence.cjs
node docs/phase3/build-report.cjs
node test/browser/phase3_evidence.cjs --verify-report
```

The default engines are Chromium, Firefox and Linux WebKit. Chromium uses `/usr/bin/chromium`; Firefox and WebKit use the installed Playwright builds. The captured Linux WebKit run used the supplied shared libraries through `LD_LIBRARY_PATH` and `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; the actual browser executed all six independent check groups successfully.

For an independent integration rerun without recapturing all media:

```sh
node test/browser/phase3_evidence.cjs --smoke-only
node docs/phase3/build-report.cjs
node test/browser/phase3_evidence.cjs --verify-report
```

The independent suite checks command submission, modal focus trapping and restoration, keyboard tab navigation, cancellation of a destructive QA action, keyboard ranking edits, preview, source download, three viewport sizes, and nested Picks behavior. The dedicated public collection and Developer HQ suites cover the broader workflows.

All captures block external and proxy destination requests. They establish local UI behavior, not remote destination availability. Tablet and phone captures use Chromium viewport/mobile/touch emulation. No physical iPad, iPhone, Chromebook or Safari on Apple hardware was tested.
