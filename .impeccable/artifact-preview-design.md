---
name: Forge artifact preview
description: Surface-scoped record; preserves the incumbent Forge identity.
colors:
  canvas: "#20211f"
  foreground: "#f5f7f4"
  muted: "#c5cbc0"
  control-border: "#646960"
  control-hover: "#383c35"
  selected: "#eef0ea"
  selected-text: "#272a25"
typography:
  body:
    fontFamily: 'var(--forge-font)'
    fontSize: "13px"
    lineHeight: 1.5
---

# Artifact Preview

## Overview

An Operate surface shared by delivery and review. Inspect the selected Item + Run visually or as files while preserving Forge’s dark canvas, compact controls, Phosphor icons, surrounding warm-neutral UI, and existing decision/navigation panels. This is not a replacement global design system.

## Colors

The dark canvas recedes behind the artifact. Pale foreground and muted text distinguish controls from supporting information. Selected radio labels invert to a pale surface with dark text.

## Typography

Inherit `--forge-font`: Helvetica Neue, Helvetica, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif. Supporting metadata uses 11–12px; loading/error titles use 15px/500. The file heading/count and visible empty-state titles are omitted.

## Layout

A fixed toolbar precedes a flexible preview or scrollable file list. Camera controls sit top-right; no source-note row or local-file footer occupies the canvas. Delivery reserves 70px for incumbent navigation, increasing to 72px at narrow widths; review fills its preview host.

Delivery history uses a sticky, borderless heading with 8px bottom padding and a timeline with zero top padding. Horizontal gutters remain 20px desktop and 16px at 760px. The heading no longer repeats the current/candidate version summary; version relationships and vertical round connectors remain. Empty histories show “尚未审核”. Only the title's pending-candidate badge is suppressed; other statuses are preserved.

At 1000px, hide the filename and compact padding. At 760px, use a stacked sheet. At heights ≤640px, narrow sheets scroll with sticky actions; widths 600–760px instead retain two panes and independently scrolling decisions.

## Elevation & Depth

Use tonal separation and borders. Camera buttons have a translucent dark background; gesture guidance has a small text shadow. No new decorative elevation system.

## Shapes

Buttons have 6px corners, 6px × 10px padding, and a 32px minimum height. The radio group has an 8px enclosure and 5px selected-label corners. Coarse pointers enlarge primary controls to 44px.

## Components

The preview/file switch is an icon-only native radio fieldset, not simulated tabs. Preserve native keyboard behavior and visible focus, with a title hint and accessible name for each icon. Remove the text labels and file-count badge. Targets are 32×32px on desktop and 44×44px for coarse pointers.

The model runtime loads only when a model is previewed; camera controls remain disabled until ready. Orbit, zoom and reset are explicit interactions. No autoplay, auto-rotation, control transition, or camera interpolation; reset jumps immediately.

HTML artifacts use a native iframe with `sandbox="allow-scripts"` and `referrerPolicy="no-referrer"`; do not add same-origin permission.

The review surface has no demonstration or local-file preview mode. It does not create temporary object URLs or let a non-artifact replace the selected Item + Run. Actual GLB/GLTF artifacts retain the existing model runtime.

## Do's and Don'ts

Do resolve exact manifests from `props.artifacts[itemId][runId].files` or `run.artifactsByItem[itemId].files`. Each file supplies `name`, accessible `url`, and optional real byte `size`; missing sizes display “大小未知”.

Empty preview/file states leave the canvas blank, with screen-reader-only status and no placeholder icon, heading or count. Preserve visible progress, error recovery and actual file actions. No actual Case model files were supplied. The former Astronaut example is not loaded or offered as an artifact. Its stored file and license remain untouched.

Do synchronize the focused changes with `node scripts/simplify-sheet-preview.mjs`, then rebuild generated scripts with `npm run build`. Regression coverage checks the removed controls, exact Item + Run scope, history spacing, empty history, candidate-only badge suppression, review actions and idempotent updates. Browser QA was not requested or performed; public deployment is unchanged.
