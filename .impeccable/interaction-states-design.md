---
name: Forge interaction states
description: Operate surface refinement; sidebar hover peek and truthful loading feedback.
colors:
  hover: "#f0f1ed"
  pressed: "#e6e8e1"
  selected-hover: "#ffe6da"
  dark-hover: "#383c35"
  dark-pressed: "#444a40"
rounded:
  control: "6px"
---

## Overview

Preserve Forge's compact white working surface, warm-orange actions and dark artifact canvas. Pointer feedback indicates affordance; selected state indicates current location or an open tool. Hover never fabricates a committed navigation preference or business operation.

## Colors

All primary destinations, downloads, messages and profile share neutral hover, neutral pressed and orange selected states. Open utility panels retain a thin inset outline for selection visibility. The dark preview uses dark-specific tokens and light text.

Item detail footer: an already-approved version keeps “追加返工” secondary, using `--forge-accent-soft` with warm-orange text and border rather than solid primary fill. Download is a neutral icon action (`--forge-muted` on `--forge-subtle`). These actions own their state rules in `detail-actions.css`, excluding them from global neutral overrides; primary review/submit buttons retain white text on orange when pressed. Disabled state and all business actions are unchanged.

Neutral detail hover/pressed selectors explicitly exclude both primary and warm-orange secondary variants. The submit hover rule owns foreground, background and border together, so readable white-on-dark-orange no longer relies on a later override of a simultaneously matching gray-background rule. All interactive state rules exclude disabled buttons.

The Item detail close control is a native button pinned outside the scroll container: white surface, dark icon and `0 2px 8px rgba(24,27,24,.16)` shadow. It uses gray hover/pressed surfaces and an orange keyboard focus outline. Target size is 32px on desktop and 44px on narrow/coarse-pointer screens. This is a scoped close-control fix, not a claim that the older modal's complete focus isolation or unrelated controls have been repaired. Sync with `node scripts/update-detail-control-colors.mjs`.

## Layout

The rail reserves 64px when unpinned; hover expands the sidebar to 184px as an overlay. Only clicking to pin changes the content offset. The toggle is placed before the brand in the header to keep its pointer target stable across expansion. ≤760px and coarse pointers use click-only behavior.

## Elevation & Depth

Only the transient overlay uses `6px 0 24px rgba(24,27,24,.12)`; the pinned rail remains flat with its existing separator.

## Components

The panel toggle has no resting border/background. It retains a 2px focus-visible outline. Hover expansion is immediate and has no animation, easing or resize transition; reduced motion therefore requires no alternate movement.

Moving through the sidebar, keyboard focus or an open utility panel keeps a peek stable. Leaving dismisses it; clicking the toggle pins; clicking again collapses. Escape dismisses transient expansion when no nested dialog/panel owns Escape. Listeners clean up at unmount; resize and window blur clear the temporary state.

3D progress is reported by the viewer, not a timer. Image/web loads have explicit loading, error/30-second timeout and retry states. All views retain file-list access while loading. Local file reads are labelled busy and disallow repeated input. No artificial spinner is added to synchronous demo actions.

## Do's and Don'ts

- Do preserve workflow drafts when changing sidebar presentation.
- Do distinguish hover, selection, keyboard focus and busy state.
- Don't remove keyboard focus when removing the unwanted resting button frame.
- Don't shift content during a hover-only preview.
- Don't interpret iframe navigation completion as evidence its embedded app is healthy.
- Don't claim source-based checks are browser visual verification; the latter awaits user permission for this turn.
