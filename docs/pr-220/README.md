# PR #220 visual comparison

Open `comparison.html` with `screenshots/` and `walkthrough.webm` alongside it. Alternatively, from the repository root:

```sh
python3 -m http.server 8000 --directory docs/pr-220
```

Visit http://localhost:8000/comparison.html. GitHub's file viewer shows HTML source; download the folder or serve it locally to inspect the rendered report.

50 fresh screenshots were captured; 43 meaningful views are selected and losslessly optimized to WebP. `inventory.json` records selection. `report-checks.json` records successful image decoding, 43 enlargement/escape cycles, eight contents links, video metadata and desktop/mobile report layout checks. Chromium file URLs are blocked by the execution environment's administrator policy; rendering was verified over loopback HTTP. No external CDN or application server is needed by the report.

Application commit: `76b8f19f0f7e905b1400efeec99ea32002ee1e63` (PR #220). Baseline: `3ed9bc551c0ae188d9844ae9f491d4d61174322c` (merged #207). Both applications were run locally in separate contexts. The capture run passed 15 Arcade workflow groups; selected bulk-membership action and count were also checked. Historical implementation test results are labeled separately in the report.

The scripts in `capture/` preserve the exact capture workflow and its environment-specific `/workspace` paths. The baseline was extracted using `git archive 3ed9bc5` into `work/report-baseline`; it shares installed dependencies without changing its application source. Synthetic personal records are clearly labeled. No live user storage, credentials, or protected preview session was captured. No application implementation changes were made in this documentation follow-up.
