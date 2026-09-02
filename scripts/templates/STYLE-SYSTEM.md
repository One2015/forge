# Forge compact style refinement

Operate mode, preserving the left navigation, native branch dialog, right-panel rework flow, content and Phosphor Regular icons. No document zoom or font downloads.

- One inherited Helvetica Neue / PingFang SC stack. Dense desktop body is 13–14px, supporting metadata 12px, field labels 13px/500, panel headings 16–18px, dialog heading 20px, page heading 22px. Coarse-pointer form controls remain 16px to avoid mobile auto-zoom.
- Navigation: 184px expanded / 64px collapsed, 14px labels, 20px icons, 42px rows, 64px sidebar header. The always-visible toggle lives beside the wordmark; collapsed mode keeps it at the top of the icon rail. Narrow screens start collapsed, expand over content (not through shrinking it), and close on selection, backdrop click or Escape. Touch rows stay at least 44px. Expansion is session state and does not reset page filters or drafts.
- Global tools: no top toolbar or refresh label. Downloads and messages form a compact 13px group at the sidebar bottom, with the actual user profile underneath. Collapsed mode shows only icons/avatar and small status dots; labels and counts are hidden. Existing utility panels open beside the rail, scroll within the viewport, close on Escape, and retain their task/read-state actions. Opening a tool on narrow screens collapses the rail; production tabs stick at the viewport top without a vacant toolbar offset.
- Actions: 38–40px desktop, 44px on small/touch screens; 6px control corners. Form groups use 16px separation with 6–8px inside each group.
- `forge-refinement.css` owns the shared tokens. One warm-orange action color, neutral dark text, legible secondary text, white panels and subtle warm-neutral backgrounds. Source/status data keep their existing semantics. Missing previews stay truthful and do not gain invented imagery.
- Branch dialog is 560px wide, with 20px horizontal padding, an 18px heading, 88×64px source preview, 34px input and 72px note editor. Configuration uses a divider and the independence note is unboxed; all information remains visible or scrollable. Fixed actions are 36px desktop / 44px narrow. These tighter rules are branch-only; rework editors keep their 128px note height. Delivery detail uses a 400px right panel; on narrow screens preview, scrollable details and fixed actions stack vertically.
- Existing legacy inline colors map to semantic variables in `refine-forge-styles.mjs`; component CSS stays in its existing templates. Run this final pass after any older template rebuilder: `node scripts/refine-forge-styles.mjs`.
- Verify using `node --test scripts/test-*.mjs` and `npm run build`. The one manual detector pass had only system-font warnings, retained intentionally for this dense Chinese product UI; its fallback regex mode does not measure rendered contrast.

The prior critique snapshot was stale after earlier workflow changes; it was not treated as an active backlog. The current decision follows the user's compact/refined direction and actual computed sizes, not screenshot raster dimensions.

## Alignment refinement

Keep intentional density differences between delivery forms, branch editing and detail panels. Align related controls, not all unrelated columns: Logo preview and its action/helper group start at the same top edge; Tag input and Add have equal heights; profile text shares one inset. Empty attachment lists must be hidden based on actual attachment children, not `:empty`, because rendered templates retain whitespace. Long metadata wraps without displacing fixed icons.

`node scripts/refine-layout-alignment.mjs` synchronizes the affected templates into the bundled page without changing application logic or normalized colors. Run it after older feature rebuilders and palette normalization. Regression coverage is in `test-layout-alignment.mjs`; rendered evidence and scope are recorded in `.impeccable/review/layout-alignment.md`.

The sidebar wordmark is 20px/24px, weight 500; the F tile and 14px navigation labels retain their sizes. The user-facing Item status previously labelled 返工中 is now 运行中, including delivery filters, status pills, empty-state guidance and submission hints. Internal `reworking` / `repair` and legacy filter keys are unchanged; the review action remains 要求返工. Reapply these scoped changes after older rebuilders with `node scripts/refine-status-and-brand.mjs`.
