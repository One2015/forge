---
version: 1
slug: "public-forge-html"
primary_target: "public/forge.html"
related_targets: []
---

# 审核反馈与版本分支 · Operate

Scope: preserve the existing Forge workbench and historical-version branch behavior, and refine global typography, color and density at the user's request. Preserve navigation destinations, source data and mainline decisions. Images remain in this local prototype's in-memory task state; no remote upload endpoint is implied.

## Direction contract

THESIS: Rework is an in-context right-panel task; branching is a separate focused dialog. Neither action should require an intermediate input popup.

OWN-WORLD: Inherit the workbench's white surfaces, neutral borders, Phosphor Regular icons, Chinese sans-serif typography and orange primary action. Native form controls and dialog semantics.

COMPACT SCALE: One Helvetica Neue / PingFang stack; 14px navigation, 20px icons, 184px sidebar, 64px topbar. Page/dialog/panel headings are 22/20/16–18px, dense body 13–14px, supporting metadata 12px. Desktop actions are 38–40px, touch actions 44px. Shared warm orange and neutral palette live in `scripts/templates/forge-refinement.css`; rationale and rebuilding instructions are in `scripts/templates/STYLE-SYSTEM.md`. Never scale the document to achieve density.

STORY: Review the source, describe the change, paste or choose images, inspect attachments, then submit. Branching retains source lineage and offers an optional dependent Pipeline/Dataset/Item configuration.

FIRST VIEWPORT: Rework editor replaces the right-panel detail body with source context, required notes, upload/paste controls and fixed actions. Branch dialog follows the supplied image: heading, source preview, name, required iteration notes, image cards, inherited configuration, independence notice, cancel/create footer.

FORM: Precisely specified local extension; no concept seed required. Empty notes, pending images and incomplete configuration disable submission. Native dialog owns focus, Escape and background inertness.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

For this extension, durable global DESIGN.md is unchanged; implementation details are recorded alongside its templates.
