# Forge interface icons

Official **Phosphor Icons Regular**, vendored from `@phosphor-icons/core@2.1.1`.

- Source: https://github.com/phosphor-icons/core
- Package: https://registry.npmjs.org/@phosphor-icons/core/-/core-2.1.1.tgz
- Verified SHA-512: `v4ARvrip4qBCImOE5rmPUylOEK4iiED9ZyKjcvzuezqMaiRASCHKcRIuvvxL/twvLpkfnEODCOJp5dM4eZilxQ==`
- License: MIT; see `LICENSE`.

Only the icons used by Forge are included. Their paths are unchanged from the official package. `scripts/postman-ui/phosphor-icons.mjs` is the shared generator for every injected product surface, so icons receive the same metadata, color behavior and optical box without a font, CDN, or network request at runtime.

Run `node scripts/use-phosphor-icons.mjs` to migrate the original handoff or refresh the embedded SVGs from these assets. It preserves existing actions, colors, and labels. Interface sizes are 12, 14, 16, 20, and 24 px; use 16 px for ordinary inline actions, 12–14 px for compact indicators, and 20–24 px for prominent or empty-state icons. Branding, chart geometry, native control marks, structural status dots and connectors are not interface icons and are preserved.
