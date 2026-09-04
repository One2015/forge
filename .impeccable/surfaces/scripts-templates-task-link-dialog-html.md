---
version: 1
slug: "scripts-templates-task-link-dialog-html"
primary_target: "scripts/templates/task-link-dialog.html"
related_targets: ["scripts/templates/task-link.css","scripts/templates/task-link-methods.js"]
---

# Task association · Operate

Extend detail pages with explicit task-to-delivery-Item version association. Preserve stable delivery IDs, source tasks, review decisions, compact typography and session-local prototype boundaries. Existing images are used when supplied; missing previews are labelled, never invented.

## Direction contract

THESIS: Choose the delivery slot before promoting a task artifact; a branch is not automatically a new delivery Item.

OWN-WORLD: Inherit Forge's white panels, orange primary actions, semantic green/warning colors, 13px body, 12px metadata and Phosphor Regular icons.

STORY: Open from a detail, choose a sheet, search ID/name, inspect current version, confirm association or explicitly create a new branch Item.

FIRST VIEWPORT: Compact 600px native dialog. Source context, sheet selector, searchable thumbnail rows, selection consequence and persistent footer. Mobile uses viewport gutters and one scroll region.

FORM: Precisely specified local extension; no seed required. Native dialog/select and existing feedback patterns; no dependency or identity replacement. Protect final versions, retain history, guard duplicate/stale submissions.

Item selection uses a left-aligned native radio before the thumbnail and text, with a clickable row label and a named radiogroup. Only one Item can be selected. Checked rows stay transparent; a fine-pointer hover alone adds a neutral fill. Keyboard focus stays visible. The separate version-change acknowledgement remains a checkbox. Sync these UI blocks with `scripts/update-task-link-selection.mjs`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
