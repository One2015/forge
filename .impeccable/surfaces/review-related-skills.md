---
version: 1
slug: review-related-skills
primary_target: scripts/templates/review-skills.html
related_targets: [scripts/templates/delivery-methods.js, scripts/templates/delivery-workflows.css, scripts/update-delivery-skill-workspace.mjs]
---

# Related review Skills · Operate

THESIS: Reviewers can retrieve the instructions assigned to the current delivery without leaving the review panel.

OWN-WORLD: Preserve Forge typography, muted source labels, compact native text buttons and the existing right-hand scroll panel. No new modal, dependency, animation or raster.

STORY: Saved sheet bindings produce a related-Skill list with name, invocation and source sheet. Each row downloads Markdown. Unassigned catalog entries and unsaved selections never appear; no bindings means no section.

FIRST VIEWPORT: Add a flat, wrapping list before the existing Skill evaluation controls in both review entry points. Keep existing invocation and history intact. Show recoverable download errors locally.

FORM: Precise code-led extension; no concept exploration or global identity changes. Download uses the latest saved binding, with actor and Item/Run checks; it never executes instructions or changes review decisions.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance. Documentation stays at this local surface; verification is source/VM/build only, not browser certification.

Implementation record: both review panels now expose assigned Skills and Markdown downloads, independent of command filtering. The explicit sheet context uses its Item binding; global review additionally checks Run identity. Existing evaluation remains intact. 484 tests and build pass. Detector degraded to regex, so no computed-style certification. Independent review/documentation were unavailable due the thread limit; local documentation was completed inline in `.impeccable/review-related-skills-design.md` and `.json`. Visual review disposition: `recapture`, recorded in `.impeccable/review/related-skills.md`; no browser or public deployment work was performed.
