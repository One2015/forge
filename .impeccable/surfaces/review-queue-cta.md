---
name: Review queue entry actions
mode: Operate
target: scripts/templates/review-queue-header.html
---

## Direction

Preserve the compact review queue and all workflow handlers. The former `repair` entry opens the review workbench, so its user-confirmed label is `开始审核`. Use Forge's neutral outlined secondary button to distinguish this entry from status labels. The draft-resume entry follows that treatment. Keep Reroll's existing warm-orange treatment, verdict/submit controls and unrelated navigation icons unchanged.

## Treatment

- Shared `forge-review-cta` class; `cta-repair` and `cta-reroll` identify the actions.
- Review entry: `--forge-text` on `--forge-panel` with `--forge-control-border`; hover/pressed use neutral `--forge-hover` / `--forge-pressed` surfaces and a stronger border. Reroll retains the shared warm-orange base.
- Product font stack, 500 weight and 20px line-height. Review entry: 13px and at least 92×36px; Reroll queue: 13px and 34px high; workbench: 14px and 40px high. Narrow/coarse targets are at least 44px high.
- Native button semantics, `aria-haspopup="dialog"` for review entries, orange 2px keyboard outline, semantic disabled colors; no CTA arrows or new motion.
- Narrow card footers align the entry and timestamp to opposite sides, vertically centered.
- Focused synchronization: `node scripts/update-review-cta.mjs`. Existing queue identity migration must support arrow-free labels with no trailing space.

## Verification boundary · 2026-09-03

After the label and secondary-button refinement, the queue was inspected at 1280×900 and 390×844. The desktop label, neutral outline and readable hover appearance were checked; mobile entries are 44px high and align with the timestamps without visible overflow. All 419 tests and the production build pass, including a simulated entry-handler test proving that opening the workbench does not create a repair run or review verdict. Actual browser activation was blocked by safety review and was not retried under the new label. Focus, pressed and disabled contracts are covered by source tests in this pass, not a claim of live inspection of every state. This is a focused CTA refinement, not closure of earlier global interaction findings.
