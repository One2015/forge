# Forge UI Upgrade · Implementation audit

Baseline: local `main` commit `5e746b05bf68cc58cd76ea25acf2c39e1314864c` plus the active local working-tree changes, captured in isolated branch commit `62ca064`. Before final validation, the branch was synchronized through the newer local-only `main` commit `41ec9b482d0dad675052ddeab29f9cd79fc97237`.

## Stack and truth sources

- Vinext/Vite with a React 19 frame.
- The primary workbench is generated from `scripts/templates/forge-base.html` plus `scripts/postman-ui/` modules.
- Shared runtime CSS is in `public/postman-ui/`; `public/forge-postman.html` is generated output.
- Product behavior is protected by Node tests and template assertions.

## Surface inventory

- Global shell, sidebar, top utility bar and secondary production navigation.
- Overview, runs, run detail/receipt, Pipeline list/editor, datasets, resources.
- Review queue/results/workbench, feedback and confirmation flows.
- Delivery list/detail/create/edit, member/List/Tag/Skill configuration.
- Item lifecycle, exact artifact/file preview, version and branch history.
- Billing analytics, model status, external experts, profile, downloads, notifications and RBAC prototype.

## Component inventory

Buttons, icon buttons, links, text inputs, textareas, selects, custom pickers, checkboxes, radios, switches, tabs, segmented controls, badges, status labels, tooltips, popovers, dropdowns, native dialogs, drawers, toasts, banners, surfaces, tables, pagination, breadcrumbs/back links, sidebar navigation, empty/error/loading states, skeletons, progress, file lists, version trees, artifact viewers and AI-like prompt/processing/result states.

## Main debt and risk

- Existing Postman-era tokens cover only part of the semantic system and are light-only.
- Legacy `--forge-*`, `--fg-*`, `--pm-*`, inline styles and page-specific selectors overlap.
- Radius, focus, spacing and control-height decisions diverge across old templates, generated overrides and RBAC.
- Many containers use card borders where spacing or a section rule would be clearer.
- Reduced-motion support exists, but motion duration/easing and overlay behavior are not tokenized.
- Dark mode, forced-colors, 200% text scaling and long-content behavior are not governed globally.
- Highest regression risk: generator ordering, review state machine, delivery wizard, exact Item/Run artifact binding, route restoration and active RBAC work.

## Implemented response

- Replaced partial, light-only presentation values with semantic light/dark and comfortable/compact tokens.
- Added one final compatibility layer so legacy generated selectors inherit the Forge system without changing handlers or state.
- Unified the shell, overview, forms, table/list surfaces, dense workspaces, overlays, statuses, AI states and RBAC prototype.
- Preserved the existing Phosphor icon set and all current business routes and terminology.
- Added theme/density controls, reduced-motion and forced-colors behavior, coarse-pointer sizing and responsive shell/table rules.

## Final verification

- `npm test`: 648 / 648 passing after synchronizing the latest local feature commits.
- Scoped ESLint for the changed runtime/build/test files: passing.
- `npm run build`: see `VALIDATION.md` for the final result.
- Repository-wide TypeScript currently reports six pre-existing errors in `scripts/ui/artifact-preview.tsx` and `scripts/ui/summary-tooltips.tsx`; this upgrade does not touch those files.
- Browser checks cover overview, run/detail, review queue/workbench, Item history and AI prompt surfaces in light/dark, desktop/mobile, compact/comfortable and keyboard focus states.
