# Phase 6–7 design review

Reviewed on 2026-10-25 against `main` `a329d6cf0a01728526057b8a854a5ec7fb19c705`, after PR #199 merged. This document separates source research from executable skill use and from browser evidence.

## Official workflow research

Impeccable and Taste are not present as callable skills in this session's catalog. Their official documentation was read as reference material. No installer, launcher, binary, hook, direction-dealing script, asset-finder script, or proprietary design tool was installed or executed. The changes must not be described as having passed either tool's automated inspection.

### Impeccable

Official sources checked:

- [Repository and installation instructions](https://github.com/pbakaus/impeccable), `main` at `3671d50f0ac9a662ce0615e85a256110c9cd720b`.
- [Skill, version 4.7.1](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/SKILL.md).
- [Operate/Read guidance](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/reference/operate.md), [craft floor](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/reference/craft-floor.md), and [new-work guidance](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/reference/new-work.md).

The official recommended installation is `npx impeccable install`, followed by `/impeccable init` in the coding harness. The installer can target providers and project/global scope. Current Codex instructions put project skills under `.agents/skills/`, install the project hook under `.codex/hooks.json`, and say to open `/hooks` to approve the hook after install/update. The launcher can download an engine binary on first run. These are installation facts, not steps taken in this repository.

Useful principles for this work:

- Select mode per surface. Academy is a public page; Settings, HTML Viewer, and bookmark controls are task-oriented Operate surfaces. Their hierarchy and density should serve different jobs.
- A refinement preserves the incumbent identity and behaviors. A replacement visual world can change the look while retaining product truth, functions, and constraints.
- State the problem and recovery in error copy; name actions directly in controls. Cover real empty, loading, error, focus, and narrow-screen states.
- Inspect the actual rendered result at shipping sizes, batch findings, fix them, and look again. A plan or mockup does not establish visual quality.

### Taste

Official sources checked:

- [Installation and workflow documentation](https://www.tasteskill.dev/docs).
- [Current repository skill](https://github.com/Leonxlnx/taste-skill/blob/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill/SKILL.md), `main` at `12af471f627f866411b4bd785b19646d3672784c`.
- [App-screen guidance](https://github.com/Leonxlnx/taste-skill/blob/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill/references/app-screens.md).

The official website documents `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`; the Codex full-bundle command is `npx skills add Leonxlnx/taste-skill -a codex`. The website currently calls the default v2 experimental, while the checked repository's latest commit is titled v2.1.5. The current repository skill describes direction-dealing and real-browser inspection scripts; reading it is distinct from running that workflow. None of those commands or scripts ran here.

Useful principles for this work:

- Read the brief and inspect what is already real before selecting a direction. A page and an app screen require different composition rules.
- Build each section around useful content and a supported claim. Do not invent statistics, testimonials, addresses, or institutional proof to fill a template.
- Real photographs from open archives can support the subject when their rights and attribution are verified. Available imagery should determine composition.
- Use a consistent palette, shape vocabulary, and page theme. Reduce repeated ornaments and generic equal-card rows without stripping useful substance or recognizable product identity.
- Preserve working URLs and controls during redesign; keep the primary job clear on desktop and phone and verify screenshots at multiple widths.

The user's requested identity and behavior take precedence over a source's generic style bans. These references do not justify removing Heavenly's established celestial palette, familiar controls, or user data. Their installation instructions do not authorize an unrequested local install.

## Baseline evidence and direction

The prior [preview](https://heavenly-node-m8ocxn5nj-syshi.vercel.app) is described in Phase 4–5 documentation as READY from application commit `c647d3093f0aef4f49d793ce9621f948656c2cd2`. A plain HTTP request in this research pass redirected to Vercel's login page. No protection workaround was attempted by this research agent. The QA agent separately supplied actual deployed screenshots and browser results through the supported access workflow: [deployed evidence](evidence/deployed-baseline.json), [Academy screenshot](evidence/before/deployed-academy-desktop.png), and [Heavenly screenshot](evidence/before/deployed-home-desktop.png). Fresh local baseline capture provenance is in [the manifest](evidence/before/manifest.json).

| Surface | Observed baseline | Design decision |
| --- | --- | --- |
| Academy | Real Atlanta Classical Academy name, institution-style logo, asserted graduation/ranking/ratio figures, dense multi-row navigation, generic gradient hero and repeated program cards. | Replace with an original fictional educational resource. Navy and cream, strong editorial typography, one attributed library photograph, and working study resources provide substance without claiming real-school affiliation or fabricated outcomes. |
| Heavenly | Established deep navy panels, sky-blue/lavender accents, cloud identity, bookmark collections, search, and utility controls. | Preserve the visual family and existing workflows. Improve message hierarchy, state feedback, and plain-language descriptions within it. |
| Settings and HTML Viewer | Real task surfaces with search, persistence, editor/preview states, and mobile layouts. | Keep their familiar controls and information density. Use direct labels and contextual explanations for browser limits, data handling, and recovery. |

The Academy photograph is real and self-hosted, with [verified source and license](asset-sources.md). It is explicitly illustrative: a photograph of George Peabody Library is not a Morrowfield campus claim. Final visual and behavioral acceptance belongs to the actual browser evidence produced after integration, not to these reference notes.
