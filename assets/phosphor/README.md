# Forge interface icons

Official **Phosphor Icons Regular**, vendored from `@phosphor-icons/core@2.1.1`.

- Source: https://github.com/phosphor-icons/core
- Package: https://registry.npmjs.org/@phosphor-icons/core/-/core-2.1.1.tgz
- Verified SHA-512: `v4ARvrip4qBCImOE5rmPUylOEK4iiED9ZyKjcvzuezqMaiRASCHKcRIuvvxL/twvLpkfnEODCOJp5dM4eZilxQ==`
- License: MIT; see `LICENSE`.

Only the icons used by Forge are included. Their paths are unchanged from the official package. The generator embeds them into the bundled page, so icons require no font, CDN, or network request at runtime.

Run `node scripts/use-phosphor-icons.mjs` to migrate the original handoff or refresh the embedded SVGs from these assets. It preserves existing actions, colors, and labels. Interface sizes are 12, 16, 20, and 24 px; use 16 px for ordinary inline actions, 12 px for compact indicators, and 20–24 px for prominent/empty-state icons. Branding and structural status dots/connectors are not interface icons and are preserved.
