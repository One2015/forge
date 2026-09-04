---
name: Forge Delivery Dataset Review Assignments
description: Sheet-scoped dataset responsibility in the existing creation and edit flows.
typography:
  dataset-name:
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "20px"
  supporting-copy:
    fontSize: "12px"
    lineHeight: "18px"
rounded:
  state: "4px"
  control: "6px"
spacing:
  row-gap: "16px"
  compact-gap: "12px"
components:
  dataset-review-select:
    rounded: "{rounded.control}"
    padding: "7px 10px"
    height: "36px"
  dataset-state:
    rounded: "{rounded.state}"
    padding: "2px 7px"
---

# Design System: Forge Delivery Dataset Review Assignments

## Overview

**Creative North Star: "Compact Operate"**

Extend the incumbent delivery workflow with one responsible Reviewer per dataset. Responsibility belongs to this sheet; it is separate from member roles, Item review conclusions and production execution. This feature-scoped source record does not replace the global or Postman-variant design system.

**Key Characteristics:**

- One dataset row, one Reviewer and one processing state.
- Shared assignment controls in confirmation and existing-sheet editing.
- Explicit save, permission, provenance and local-demo boundaries.

Authority: `scripts/templates/delivery-review-assignments.js` and `.html`, the opening assignment rules in `delivery-workflows.css`, and their integrations in `delivery-methods.js`, `delivery-wizard.js`, `delivery-wizard.html`, `delivery-wizard-summary.html`, `delivery-editor.html` and `delivery-sheet-extras.html`. Existing delivery records and `docs/postman-ui/DESIGN.md` provide context; their earlier three-tab descriptions do not describe this extension's new fourth edit tab.

## Colors

Reuse the host's `--forge-panel`, `--forge-subtle`, `--forge-border`, `--forge-control-border`, `--forge-text`, `--forge-muted` and `--forge-accent` roles. No new palette is introduced. Saved pending/Repair states use the warning role; reviewing uses normal text and paused/unassigned use muted text. Every state has a visible label. The Postman variant retains its existing theme overrides; this record does not promote base-theme fallback colors into a new identity.

## Typography

Inherit the host font. Dataset names and saved reviewers use the medium-weight dataset-name role; source, Item count, modification metadata, field labels and explanatory text remain supporting information. Dataset names and metadata wrap. Native selects constrain their width and ellipsize long displayed values.

## Layout

The fourth creation step places assignments between the complete configuration summary and members. The side/collapsed summary reports assigned datasets out of the total. The existing footer performs the final commit and displays blocking conditions.

Rows use a flexible dataset column plus Reviewer and state columns capped at 160px and 140px, respectively, with the row-gap token. The section is an inline-size query container. At container widths up to 520px, dataset information spans the full first row and the two controls share the second row with compact-gap spacing. Rows use 14px vertical padding and thin separators; the first has no top padding and the last no bottom border. At viewport widths up to 480px, the assignment heading may wrap and editor tabs permit horizontal scrolling. Shared host rules adapt field and action heights for compact/coarse-pointer layouts.

## Elevation & Depth

Assignment rows are flat, separated by existing borders. Creation reuses the existing wizard card and editing reuses the existing native dialog; the feature adds no shadow, overlay, raster asset or motion.

## Shapes

Retain the host's rounded native controls and small rectangular state labels. Do not turn individual dataset rows into nested cards or introduce a custom select implementation for this feature.

## Components

### Assignment controls

Each row shows dataset name, source and Item count, then native Reviewer and processing-state selects with dataset-specific accessible labels. New sheets default each dataset to the owner. Choices include self, colleagues and Lead; selecting a person not already on the sheet adds a sheet-scoped Reviewer member, subject to the existing 50-member cap, without changing global roles or demoting owners. Available states are `pending` (待审核), `reviewing` (审核中), `repair` (待返工 · Repair) and `paused` (已暂停).

Changes are editor-local until 创建数据单 or 保存更改; cancellation leaves the saved sheet unchanged. The panel has a live status notice and alert text. Save requires a valid member Reviewer and processing state for every configured dataset. Empty-source guidance remains visible. Controls are disabled during list reading or when the actor cannot manage assignments; the section explains the permission boundary. Native focus is retained with the host's visible focus treatment.

### Saved-sheet summary and edit entry

The summary appears before the List section and shows each dataset's Reviewer, processing state and, when available, update actor/time. 编辑审核分配 is exposed to the sheet owner, owning-project owner or Lead and opens the new 审核分配 edit tab directly. Existing unconfigured sheets show 未分配 / 待分配 and remain legacy-compatible until explicitly configured.

Production groups are keyed by Pipeline and dataset; uploaded ZIPs by archive name, with a List fallback for existing entries. Shared Items retain every production-source reference. Reordering or adding whitespace to a saved List preserves source provenance, assignments and source-run linkage. Explicitly replacing it with a ZIP creates upload provenance instead. Concurrent source, assignment or membership changes reject a stale save and ask the user to reopen.

### Commit and operational limits

Saved records retain Reviewer, processing state, update actor/time and assignment change history. Reassignment to another person creates an existing local inbox notification; self-assignment and status-only changes do not create reassignment notices. Creation retains the existing member-notification path. No backend or external messaging integration was added; Feishu remains unconnected.

Repair is sheet-level workflow metadata only. It neither launches production rework nor changes Item approval. Automatic rework remains an unanswered product question, not an implemented behavior.

Verification supplied by the implementation handoff: 475 tests passed, 0 failed; build and `git diff --check` passed. The 13 dedicated assignment tests cover creation, reassignment, cancellation, permissions, source grouping, legacy behavior, stale saves and generator preservation. Both independent finish-review findings—concurrent member removal and List-edit provenance loss—were fixed and independently marked resolved. This documentation pass inspected source only: no browser, screenshot or DOM QA, and no whole-surface visual approval is claimed.

## Do's and Don'ts

- **Do** keep dataset responsibility separate from sheet/global roles and Item conclusions.
- **Do** preserve source identity, visible assignment coverage and explicit commit behavior.
- **Do** retain the current local-demo and permission boundaries.
- **Don't** imply Repair executes work or approves/rejects Items.
- **Don't** treat source and automated checks as whole-surface visual or accessibility certification.
