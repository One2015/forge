# Alignment refinement — 2026-09-02

Scope: repair analogous alignment defects across upload groups, paired fields, feedback dialogs and the personal panel. Preserve the established compact Operate design, all application logic, palette and official Phosphor geometry. The user approved an independent local test page; the original tab was not operated.

## Evidence and spatial decision

An independent source assessment identified Logo grouping, whitespace-only attachment gaps, unbroken metadata and asymmetric profile padding. A separate scoped layout detector returned `[]`; computed browser measurements supplied the defects the regex scan cannot detect.

The task path remains title → fields → supporting input/attachments → fixed actions. The Logo preview supports its upload controls, so both start at one top edge. Upload/Remove belong together, with the helper immediately beneath. Preserve 16px form-group separation and tighter branch-specific spacing; do not make preview/content columns or unrelated dialogs equal-sized. Narrow screens increase paired field/action heights together and retain scrollable bodies with fixed footers.

## Verified outcomes

- At 1272×800, the original 56px Logo preview started 5px below the button. The new 60px preview and button both start at y=379; preview and helper block end at y=439. The dialog and body have no horizontal overflow.
- At 390×844, the Tag input and Add originally measured 36px/44px. Both now measure 44px, with identical top/bottom coordinates. The wrapped custom color control now starts at x=28, matching the palette instead of adding a 4px indent.
- The mobile Logo preview and controls both measure 68px high and start at y=391. An isolated loaded-image fixture confirms Upload and Remove occupy the same action row. Removing the image works without moving the group to a different layout.
- Whitespace-only branch and rework attachment containers now have `display:none` and zero margin, eliminating the previous 10px phantom gap. Branch submission remains disabled without its required note.
- Narrow delivery, branch and task-link dialogs all use 12px horizontal viewport gutters. Their measured `scrollWidth` equals `clientWidth` at the dialog boundary. Their independently chosen desktop widths are unchanged.
- Profile scope, list note and task text all start at x=86 on the narrow rail. Avatar top/bottom spacing differs only by the intentional 1px top border. Metadata wraps while the action arrow remains fixed.
- At 816×800, the editor remains 640px wide, uses its desktop density, and its body has no horizontal overflow. Loaded Logo, List rows and Skill cards were checked with isolated data. Missing previews remain explicit fallbacks, not fabricated imagery.
- Titles, labels, helpers and primary actions retain their hierarchy in reviewed desktop, intermediate and narrow captures. DOM reading order, existing labels, native dialog semantics and autofocus are retained. Component typography now wins over low-specificity inherited form defaults.

Long unbroken metadata is additionally covered by source rules/regression tests; no claim of exhaustive localization, screen-reader, zoom, physical-touch or cross-browser testing is made. File-read errors/loading and attachment/Skill behavior remain covered by the existing automated suites.

## Verification and cleanup

- `node --test scripts/test-*.mjs`: 99 passed.
- `npm run build`: passed (existing Node deprecation / route-classification notices only).
- Generator byte-for-byte idempotence: passed; script checks that application logic is unchanged.
- Final scoped layout detector: `[]`, not proof of all visual/accessibility properties.
- `git diff --check`: passed.
- Screenshots: `layout-before-*` and `layout-after-*` in this directory, inspected once as a batched confirmation round.
- The independent browser tab was closed and viewport override reset. Generated public/dist fixture pages were removed; the reproducible fixture generator and local review images remain.
