---
version: 1
slug: scripts-templates-feedback-image-box
primary_target: scripts/templates/review-workbench.html
related_targets: [scripts/templates/feedback-workflows.css, scripts/templates/feedback-methods.js]
---

# Rework image upload · Operate

THESIS: Make the optional reference-image action immediately visible in the right-side rework panel.

OWN-WORLD: Keep Forge's compact sans typography, muted neutral fields, thin borders and official Phosphor icons. Do not alter review decisions, navigation, preview or branch UI.

STORY: Click the image box or paste with Ctrl/⌘ + V; inspect image previews and remove individual files before submission.

FIRST VIEWPORT: Put a full-width image box directly below the rework note, with a 0/6 counter above and remaining slots plus paste instructions inside. Keep file restrictions below and footer actions fixed.

FORM: Narrow user-specified refinement; no concept seed or new assets. Preserve existing real file validation, 6-image cap, scoped clipboard handling, loading, error and cancel semantics. At capacity the box is disabled and tells users to remove a file first. Session-local demo only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, local design documentation, and every shipping raster carrying its provenance.
