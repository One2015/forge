---
version: 1
slug: artifact-preview
primary_target: scripts/ui/artifact-preview.tsx
related_targets: [scripts/templates/artifact-preview.css, scripts/templates/artifact-preview-methods.js]
---

# Artifact preview · Operate

## Direction contract

THESIS: Inspect the same version visually or as files without leaving the review decision panel.

OWN-WORLD: Inherit Forge's dark preview, warm neutral UI, Phosphor icons, compact type and frosted navigation. No new visual identity.

STORY: Switch views, choose a real artifact, orbit a 3D model, reset framing, then review. Missing artifacts leave a quiet canvas with screen-reader status; actual loading/errors remain visible. Demonstration and local-only file previews are not offered in the review surface.

FIRST VIEWPORT: Icon-only preview/file control at top left, model or blank remaining canvas, camera controls top right, existing case navigation below. Right-hand decisions stay fixed.

FORM: Precisely scoped extension; no seed required. Native radio group; lazy-loaded model-viewer; mouse, keyboard and touch; no autoplay. Scope both delivery and review previews.

## Preview simplification · 2026-09-02

Removed the demonstration banner, return-to-artifact action, demonstration entry and local-model picker. Removing only their labels could have made unrelated sample files look like the selected Item + Run; the production viewer now reads only that manifest. Kept all actual preview, file, camera, download and navigation controls. Stored sample assets and their license are untouched.

The preview/file switch shows only Phosphor icons, with native hover titles and accessible radio names. It no longer displays labels or a file-count badge. Removed the file-list heading/count and visual empty-state icons/copy in both modes; empty states retain screen-reader-only status. Actual file names, sizes, downloads, loading progress, errors and retry controls remain. Targets are 32px on desktop and 44px for coarse pointers.

The delivery detail history heading is borderless and sits 8px above round one on desktop and mobile. It no longer repeats the current/candidate version summary; version relationships and the vertical timeline stay. Empty histories retain “尚未审核”. Only the redundant “待审核候选” title badge is hidden; other statuses and business-state fields remain.

FINISH: Source-scoped refinement and regression checks; no new visual world, raster or motion. See artifact-preview-design.md. Browser visual and interaction verification was not requested and has not been performed.
