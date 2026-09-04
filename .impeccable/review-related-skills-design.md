---
name: Forge Review Related Skills
description: Assigned delivery instructions available from the existing review panel.
---

# Design System: Forge Review Related Skills

## Overview

Feature-scoped extension of Forge's compact Operate interface. The review panel exposes only saved delivery Skill bindings. No global visual-system decisions change.

## Colors

Reuse host `--forge-text`, `--forge-muted`, `--forge-accent` and existing error styles. No new palette or status color is introduced. Both original Forge and Postman inherit their current host variables.

## Typography

Inherit `--forge-font`. Reuse the 14px section heading. Skill names are 13px/20px, weight 500; invocation and source labels are 12px/18px. Names, invocations and source names wrap rather than forcing the panel wider.

## Layout

The new flat list precedes the existing Skill evaluation section inside both review-panel scroll areas. Each row pairs a flexible identity block with a nonshrinking download action; the row wraps when necessary. No fixed width is added. Sheet-detail insets follow the existing 20px / 16px compact pattern. Download targets have 32px minimum height, raised to 44px for coarse pointers, and visible keyboard focus.

## Elevation & Depth

No additional card, overlay, shadow, raster or animation. The existing panel owns depth and scrolling.

## Components

“相关 Skill” shows a count, name, invocation, source sheet and “下载 .md” native button. The complete section is conditional on saved bindings, independent of invocation search. Merely creating a catalog Skill or selecting one in an unsaved sheet does not reveal it.

The global review queue resolves Item/Run and linked-source identity; an explicit sheet-detail context uses that sheet's Item binding. Clicking download rechecks the current actor and latest saved binding. Uploaded frontmatter-bearing Markdown is preserved verbatim; plain instructions receive name, description and command metadata. The format is Markdown only, not a reconstructed original ZIP with resources. Content is inert, filenames are sanitized, temporary anchors/object URLs are released and errors offer recovery. Existing evaluation/history controls and formal review state are unchanged.

## Do's and Don'ts

- Keep library publication, explicit sheet selection and sheet save distinct.
- Keep sources visible when the same Skill is assigned from multiple sheets.
- Do not execute downloaded instructions or imply real evaluation happened.
- Do not equate automated checks with visual/accessibility certification.

Verification: 484 automated tests pass (7 new related-Skill tests), and the build succeeds. The detector ran once with degraded regex fallback; computed contrast and selector analysis were unavailable. Independent reviewer and documenter could not start due the agent thread limit; documentation was completed inline. The visual finish disposition remains `recapture`: desktop/mobile and actual browser-download checks are outstanding. No public deployment was performed.
