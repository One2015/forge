# Forge Design System

Forge uses one visual language across the product: precise, quiet SaaS surfaces inspired by Stripe's hierarchy and spacing discipline, with Forge orange reserved for identity and orientation. The UI remains flat and two-dimensional. AI-native and engineering workbench areas reuse the same tokens rather than introducing a second visual skin.

## Foundations

- Source of truth: `public/postman-ui/tokens.css`.
- Final compatibility layer: `public/postman-ui/forge-system.css`.
- Preference and AI adapter runtime: `public/postman-ui/forge-system.mjs`.
- Generated artifact: `public/forge-postman.html`; edit the source files above and rebuild with `npm run postman-ui`.
- Typography uses the system UI stack plus a dedicated system monospace stack. Titles stay compact; code, IDs, timestamps, costs and counts use tabular or monospace treatment where appropriate.
- Spacing follows a 4px base scale. Comfortable density is the default for dashboards, settings and AI interaction; compact density reduces control and row height for tables, logs, files and workbenches.
- Radius tokens are 6px for small controls, 8px for controls, 12px for surfaces/popovers and 16px for dialogs. Pills use a full radius. Nested surfaces step down one radius size.
- Persistent surfaces use borders and background steps, not shadow. Only raised/overlay surfaces use the two restrained shadow tokens.

## Semantic color contract

Business components must use semantic tokens: `surface-canvas`, `surface-subtle`, `surface-raised`, `surface-overlay`, `text-primary`, `text-secondary`, `text-muted`, `border-default`, `border-subtle`, `accent-primary`, `focus-ring`, and the `status-*` families. Legacy `--pm-*`, `--forge-*`, and `--fg-*` variables are mapped to these tokens for compatibility.

Light and dark themes have equal token coverage. Dark mode uses near-black neutral surfaces rather than pure black and retains status meaning through text, borders and labels. Theme and density are controlled in the top bar, persisted locally, and announced through `aria-pressed` and descriptive labels.

## Components and state

Buttons, icon buttons, inputs, textareas, selects, checkboxes, radios, switches, tabs, segmented controls, badges, tooltips, popovers, menus, dialogs, drawers, toasts, banners, tables, pagination, navigation, empty/loading/error states, file/artifact surfaces and workbench panels share one state model:

- Hover changes color or border only; no card lift.
- Press uses a one-pixel translation only for small pointer controls and is disabled under reduced motion.
- Focus-visible is a 2px semantic ring with 2px offset.
- Selected state uses an accent orientation edge or a semantic checked state.
- Disabled state retains legibility and removes interaction.
- Loading, success, warning and error use text plus icon/label, never color alone.
- Long content may wrap or truncate only when the complete value remains available through accessible text/title.

## AI-native surfaces

Forge owns the adapters `forge-ai-composer`, `forge-ai-prompt`, `forge-ai-tool-call`, `forge-ai-tool-result`, `forge-ai-artifact`, `forge-ai-thinking` and `forge-ai-error`. They are applied to existing prompt, attempt, artifact, loading and error surfaces without changing business markup or handlers. This keeps OpenAI-style conversational continuity and tool-state clarity local to AI interactions. `@openai/apps-sdk-ui` is not installed because the generated DCLogic page is not a compatible component-runtime boundary.

## Engineering workbenches

Review, Pipeline, artifact, file and run views use compact split-pane patterns, stable toolbars and persistent status. Preview canvases remain dark media surfaces, while inspectors use the current theme. Data tables, selection controls, dialogs and focus management follow Primer-like structural behavior, but all visuals are remapped to Forge tokens.

## Motion and accessibility

Motion tokens cover 100ms, 160ms and 220ms transitions with explicit properties. Only opacity and transform are animated for entry/exit and state feedback. `prefers-reduced-motion: reduce` removes animation, transitions and smooth scrolling. Forced-colors preserves borders, focus, selected state and control affordances. Coarse-pointer targets are at least 44px while compact desktop controls remain dense.

Do not add perspective, parallax, decorative 3D, neon, heavy glass, high-saturation gradients, broad box shadows or a second icon family. Do not edit generated HTML directly.
