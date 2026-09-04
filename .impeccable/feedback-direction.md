# 审核反馈与版本分支 · Operate

Scope: extend the existing Forge workbench and historical-version branch action. Preserve navigation, global sizes, source data and mainline decisions. Images remain in this local prototype's in-memory task state; no remote upload endpoint is implied.

## Direction contract

THESIS: Rework is an in-context right-panel task; branching is a separate focused dialog. Neither action should require an intermediate input popup.

OWN-WORLD: Inherit the workbench's white surfaces, neutral borders, Phosphor Regular icons, Chinese sans-serif typography and orange primary action. Native form controls and dialog semantics.

STORY: Review the source, describe the change, paste or choose images, inspect attachments, then submit. Branching retains source lineage and offers an optional dependent Pipeline/Dataset/Item configuration.

FIRST VIEWPORT: Rework editor replaces the right-panel detail body with source context, required notes, upload/paste controls and fixed actions. Branch dialog follows the supplied image: heading, source preview, name, required iteration notes, image cards, inherited configuration, independence notice, cancel/create footer.

FORM: Precisely specified local extension; no concept seed required. Empty notes, pending images and incomplete configuration disable submission. Native dialog owns focus, Escape and background inertness.

SOURCE ITEM: Opening a branch preselects the exact source-version Item, including a parent branch's explicitly changed Item. The dataset picker is a partial catalog, so an omitted source Item is retained as a local option only within its source dataset; this never mutates the global catalog. Configuration expansion and reselecting the same Pipeline/Dataset do not clear the choice. A real dependency change still clears Item and requires a valid choice. Native option selection mirrors state, and the collapsed summary shows the Item name. Sync only this flow with `node scripts/update-branch-default-item.mjs`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

For this extension, durable global DESIGN.md is unchanged; implementation details are recorded alongside its templates.
