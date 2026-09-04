---
version: 1
slug: scripts-templates-history-branch-tree-html
primary_target: scripts/templates/history-branch-tree.html
related_targets: [scripts/templates/history-branch-methods.js, scripts/templates/history-branch-tree.css, scripts/templates/branch-dialog.html]
---

# 追加修改与分支树 · Operate

Local extension of the complete Item history. Preserve mainline records, quota, configured runs, and the existing compact branch dialog. No new evaluation engine or persistence.

## Direction contract

THESIS: An appended change belongs to its exact source version; a connected tree makes that lineage readable.

OWN-WORLD: Existing Forge neutrals, restrained orange, 12–14px Chinese-capable sans and official Phosphor icons. Flat rows and fine connector lines.

STORY: Choose 追加修改, inspect the source, name and describe a branch, optionally attach images/change configuration, then see the queued child beneath its parent.

FIRST VIEWPORT: Separate expand and append controls in each history row. Reuse the supplied compact modal. The inline tree shows source, name, state and description; details progressively reveal configuration and attachments.

FORM: Precisely specified extension, no seed. Connectors follow real parent links; deep mobile trees cap visual indentation but retain explicit source labels. Native dialog, no new animation.

REFERENCE REFINEMENT (2026-09-02): User supplied a white/neutral derived-branch card reference to replace purple styling. Expanded sources and branches are paired in desktop columns, stacking on smaller viewports. Branch headings/current stages/links use the incumbent orange; card borders and tree connectors remain neutral. Details show preview availability, three-stage progress, source and creation metadata, and compact outlined actions. Keep the new 追加修改 flow and real statuses rather than reverting to screenshot-era inline comments.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
