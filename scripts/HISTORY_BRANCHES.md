# History append modifications

The complete Item history now separates expansion from **追加修改**. The append action opens the existing native branch dialog rather than an inline comment editor. The shared dialog still handles naming, required notes, image upload/paste, inherited configuration, validation, cancellation and queued independent runs.

## Sources

- `templates/history-node-header.html`: separate native expand/append controls.
- `templates/history-branch-tree.html` and `.css`: connected preorder branch rows, source labels, details and responsive indentation.
- `templates/history-branch-methods.js`: lineage, readiness guards and exact-run navigation.
- `templates/feedback-methods.js`: shared modal and branch creation.
- `implement-history-branch-tree.mjs`: targeted, idempotent bundle update.
- `test-history-branch-tree.mjs`: regression coverage.

Run the generator only after editing these templates; it updates the serialized `public/forge.html` without replaying older whole-app migrations.

## State model

`forks[ItemID + ':' + sourceKind]` holds history records. `parent` names the exact preceding branch; legacy `derivedFrom` links remain supported. Each newly appended record also has a unique queued entry in `submittedRuns` and a matching record in `branches[ItemID]`. These remain session-local demo state; this does not add persistence or a real execution service.

Root changes are grouped under their source Run/review node. Subsequent changes retain the parent run ID and its Pipeline/Dataset/Item configuration. A branch can target a different dataset Item without changing the owner Item of its history. A branch-scoped history displays only descendants of that branch and preserves its original trunk source.

Queued, running, failed and missing parents cannot be appended. The same guard is checked before opening and again before submitting. Successful runs become review-ready; no automatic approval is fabricated. Mainline state and quota remain unchanged.

The tree caps visual indentation at five levels while retaining full depth in data and explicit parent names. Details expose actual run/configuration IDs and reference images. Removing a branch record requires confirmation and removes its descendants from the tree; it does not delete the underlying submitted runs or mainline.

## Reference styling refinement

The derived-branch surface follows the supplied 2026-09-02 reference: white cards, neutral borders/connectors, restrained orange headings and active stages. It does not recolor unrelated Pipeline/LLM or reviewer identity accents. At widths of 1040px and above, an expanded source with branches uses equal source/branch columns; other states retain the single-column flow. The source preview and metadata stack inside the left column. At narrow widths the source and tree stack, with 44px touch actions.

Expanded branch cards include an actual branch image when available, otherwise an explicit waiting/missing-preview label, progress stages, source and creator metadata, and compact outlined actions. Queued remains queued; the reference's running label is never substituted for the real state. The source-level branch shortcut is now a keyboard-accessible orange button.

## Verification

`node --test scripts/test-*.mjs` — 126 tests passed.

`npm run build` — passed.

Browser visual verification is pending explicit authorization for this task. See `.impeccable/review/history-branch-verdict.md`; do not present that evidence gate as a visual pass.
