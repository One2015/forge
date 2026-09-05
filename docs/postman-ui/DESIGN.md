# Forge workbench design contract

The former Postman-specific visual specification has been superseded by the product-wide Forge Design System in [`DESIGN.md`](../../DESIGN.md).

This generated workbench keeps all existing route, state, review, delivery, billing, permission and artifact-binding behavior. Its visual sources are:

- `public/postman-ui/tokens.css` for semantic light/dark and comfortable/compact tokens.
- `public/postman-ui/forge-system.css` for the final shared component and page layer.
- `public/postman-ui/forge-system.mjs` for theme/density preferences and AI-surface adapters.
- `scripts/postman-ui/build.mjs` for deterministic shell assembly.

Run `npm run postman-ui` after changing these sources. Do not hand-edit `public/forge-postman.html`.
