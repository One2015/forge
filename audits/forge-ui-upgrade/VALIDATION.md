# Forge UI upgrade validation

## Local baseline and isolation

- Local source repository: `/Users/apple/Documents/ChatGPT/forge 2/forge-ia-refresh`.
- Initial local source commit: `5e746b05bf68cc58cd76ea25acf2c39e1314864c`.
- Latest local `main` synchronized before final validation: `41ec9b482d0dad675052ddeab29f9cd79fc97237`.
- Active local tracked and valid untracked work was captured without reading or syncing a remote.
- Snapshot commit in the isolated worktree: `62ca064227e83bb6e3d471741db7d4ee42269a59`.
- Upgrade branch/worktree: `design/forge-ui-upgrade` at `/Users/apple/Documents/ChatGPT/forge 2/forge-ui-upgrade`.
- The original working directory and branch were not modified.

## Coverage

The final shared layer covers the global shell/sidebar/top bar; overview; production runs and run details; Pipeline list/editor; datasets/resources; review queue/results/workbench; delivery list/detail/create/edit; Item lifecycle/history/files/prompts; billing/model/external-expert views; profile/download/message/RBAC surfaces; dialogs, drawers, popovers, toasts, empty/error/loading and permission states.

Direct browser interaction was performed on overview, run list/detail, review queue/workbench, Item history and AI prompt/tool-result surfaces. The remaining routes inherit the shared layer and are protected by the generated semantic inventory and route tests, but were not each captured as a screenshot.

## Accessibility and responsive checks

- One visible `h1` on the sampled overview route; document language is `zh-CN`.
- No duplicate IDs, unlabeled buttons, unlabeled form fields, unlabeled dialogs or images without `alt` on the sampled route.
- Keyboard Tab moved to the next actionable link and displayed the 2px `focus-ring` outline.
- Desktop and 390×844 viewport checks showed no document-level horizontal overflow; wide work surfaces retain local scrolling.
- Dark overview visible-text contrast scan found and fixed the only sampled failure (the RBAC Prototype tag).
- `prefers-reduced-motion` and `forced-colors` are covered by the shared CSS and design-system contract test.
- Coarse-pointer controls use a 44px minimum target; compact density remains 28px/36px for desktop controls/rows.

This is a focused implementation validation, not a formal third-party WCAG certification or assistive-technology lab audit.

## Automated checks

- Unit/integration/template tests: 648 passed, 0 failed.
- Scoped ESLint: passed.
- Production build (`npm run build`): passed.
- TypeScript: six existing errors remain in the pre-upgrade artifact preview and summary tooltip React files.
- Full-repository lint is not a useful zero-baseline gate yet: the local baseline contains 5,228 generated/template findings (109 errors, 5,119 warnings). Changed upgrade files pass scoped lint.
- Impeccable's URL scanner could not run because Puppeteer is not an installed project dependency; its static detector also reported degraded parser availability. Browser DOM, contrast, focus and responsive checks were run directly instead.

## Screenshots

- `before-overview.png`: local baseline on port 3008.
- `after-overview-light.png`: upgraded overview, light/comfortable.
- `after-overview-dark.png`: upgraded overview, dark/comfortable.
- `after-review-workbench-dark.png`: upgraded dense review workbench, dark/compact intent.
- `after-overview-mobile.png`: upgraded overview at 390×844.

## Known limits

- Several deep legacy components still carry inline presentation values; the final compatibility layer normalizes them, so new feature work should use semantic tokens directly.
- Query-string theme hints may be removed by the legacy route normalizer; the visible theme control, local persistence and system preference work. A future router cleanup can preserve non-route query parameters.
- The generated prototype logs image-resource warnings for dormant `{{...}}` template placeholders. No runtime JavaScript errors were observed; changing those placeholder bindings is intentionally left to the generator/runtime iteration.
- Live backend/model execution, real download delivery and external notification services remain outside this local prototype's integration boundary.
