# Delivery dataset review assignments · Operate

## Direction contract

THESIS: Separate dataset responsibility from sheet membership and Item review conclusions.

OWN-WORLD: Reuse Forge neutral surfaces, compact native selects, existing type, spacing and action tokens.

STORY: At confirmation, the owner assigns each production dataset or uploaded ZIP to themselves, a colleague or Lead. Saved sheets expose the assignment and a focused edit entry.

FIRST VIEWPORT: A compact dataset list pairs source/count with Reviewer and processing-state controls. The existing creation footer commits changes; the side summary reports assignment coverage. Narrow layouts stack labels and controls without horizontal overflow.

FORM: Precisely scoped, code-led extension; no concept roll. Reassignment preserves global and sheet-owner roles. Processing state does not fabricate Item approval or launch production work.

FINISH: Feature-scoped source documentation is recorded in `.impeccable/delivery-review-assignments-design.md` and its matching `.json`; no new raster assets or motion were shipped. No global design document is replaced.

Open question: whether Repair is only a processing marker or should trigger production rework. Until confirmed, no production execution is authorized by this control. Existing session-local save model remains unchanged.

## Shipped extension · 2026-09-03

Confirmation now assigns one Reviewer per production dataset or uploaded ZIP, defaulting to the owner; the summary reports coverage. Saved sheets display Reviewer, processing state and update metadata, with 编辑审核分配 opening the fourth editor tab directly. State choices are 待审核, 审核中, 待返工 · Repair and 已暂停. Changes commit with the existing create/save actions; legacy sheets remain unconfigured until explicitly assigned.

Only the sheet owner, owning-project owner or Lead may change assignments. Choosing a new person adds a sheet-scoped Reviewer without changing global or owner roles. Save guards missing/removed Reviewers, invalid states, actor changes and concurrent source/assignment/membership changes. Production provenance survives List whitespace/reordering; explicit ZIP replacement changes source identity. Repair remains sheet-level metadata: no automatic production task or Item approval change. Notifications and persistence remain the existing local demo; no external messaging/backend integration was added.

Implementation handoff reports 475/475 tests, including 13 dedicated assignment tests, plus build and diff checks passing. Independent finish review's concurrent-member-removal and List-provenance findings were fixed and independently marked resolved. Documentation used source inspection only; no browser, screenshots or DOM QA was performed, and no whole-surface visual approval is claimed.
