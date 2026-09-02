---
name: Forge Delivery Extension
description: Compact delivery configuration and bound review Skill demonstration.
colors:
  accent: "#c44318"
  accent-hover: "#a83812"
  accent-soft: "#fff1ea"
  panel: "#fff"
  subtle: "#f6f6f3"
  border: "#e3e5df"
  control-border: "#c9ccc4"
  text: "#272a25"
  muted: "#666b61"
  disabled-bg: "#eeefeb"
  disabled-text: "#81877b"
  tag-default: "#64748b"
typography:
  title:
    fontFamily: '"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "26px"
  body:
    fontFamily: '"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    lineHeight: "20px"
  label:
    fontFamily: '"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "20px"
  helper:
    fontFamily: '"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    lineHeight: "18px"
rounded:
  tag: "4px"
  icon: "5px"
  control: "6px"
  panel: "10px"
spacing:
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 12px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
    height: "36px"
  tag:
    backgroundColor: "{colors.tag-default}"
    textColor: "{colors.panel}"
    rounded: "{rounded.tag}"
    padding: "2px 7px"
  skill-choice:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.text}"
    rounded: "{rounded.tag}"
    padding: "6px 8px"
---

# Design System: Forge Delivery Extension

## Overview

**Creative North Star: "Compact Operate"**

Extend the incumbent Forge interface with compact delivery configuration and bound review Skill controls. White panels, restrained orange actions, Chinese-capable sans typography and familiar native controls keep configuration subordinate to the working content.

This is a local surface contract, not a replacement global identity. Navigation, delivery metrics, review decisions and Phosphor icons remain unchanged.

**Key Characteristics:**

- Compact, task-first controls.
- Visible validation and persistent dialog actions.
- Explicit session-local and demonstration boundaries.

Authority: shared tokens in `scripts/templates/forge-refinement.css`; extension styling in `delivery-workflows.css`; behavior in the delivery/review HTML templates and `delivery-methods.js`. Direction lives in `.impeccable/delivery-direction.md`; implementation and verification details live in `scripts/DELIVERY_WORKFLOWS.md`.

The member and rework-image extensions also use `delivery-members.js`, `feedback-methods.js`, and `feedback-workflows.css`; their scoped directions are recorded in the delivery-editor and feedback-image-box surface briefs. `scripts/update-delivery-members-feedback.mjs` refreshes the bundled renderer.

## Colors

The inherited palette pairs warm orange actions with quiet, slightly warm neutrals. Accent identifies primary actions, selected tabs/Skills, focus and validation. Panel/Subtle distinguish main surfaces from inset previews. Text/Muted separate primary content from supporting context. Disabled controls use their dedicated colors, without a second opacity reduction on the review Call button.

**The Tag Contrast Rule.** For each preset or custom Tag background, compute both pure-black and pure-white contrast and use the greater ratio. Do not substitute the interface text color or a brightness threshold. Tags classify entries; they do not encode review status.

## Typography

Use the inherited sans stack. Preserve the compact title/control/helper roles above; section headings use the intermediate 14px size. Descriptions, errors and Skill content wrap. Entry names and source-sheet labels truncate where implemented. Coarse-pointer editable text fields increase to 16px.

## Layout

The native dialog is capped at 640px wide with 20px viewport gutters. Desktop height is `min(680px, calc(100dvh - 48px))`. Header, three tabs and footer do not shrink; only the central field region scrolls. The fixed footer is pinned inside the dialog, not over the viewport.

Desktop horizontal padding is 20px. Customer/target columns are flexible plus 160px; List Tag columns are 140px. List and content previews have 180px maximum scrolling regions.

At 600px, dialog gutters become 12px, height becomes `min(720px, calc(100dvh - 24px))`, and horizontal padding becomes 16px. Footer copy stacks above actions; the primary action fills available space. Target/Tag columns reduce to 110px/100px. Review command composition may wrap.

Primary, secondary and file actions have a 36px minimum height, increasing to 44px at the compact breakpoint or on coarse pointers. Editable single-line fields and selects match those action heights; file inputs and color wells retain their specialized sizing. Coarse-pointer Skill choices also reach 44px; icon buttons become 44px square. Existing smaller exceptions are 32px palette swatches and 28px Tag-removal controls.

Logo upload uses a top-aligned preview column and a flexible controls column separated by 12px. Upload and Remove share one action row; the helper sits 6px below it without paragraph margins. The preview is 60px square on desktop and 68px at the compact/coarse breakpoint, matching the action-plus-helper block when the helper fits one line. Longer helper text may wrap; neither column is vertically recentered. Tag input and Add use a flexible-plus-auto grid with matching top and bottom edges. Wrapped color wells start on the same content rail as the palette.

The Skill tab places search and a flat result list before upload and editable selections. Results scroll within a desktop maximum height (228px), increasing at widths up to 600px (252px). Full-width rows have a minimum height (76px), padding (10px 8px), and a nonshrinking action rail (60px minimum). Row gaps reduce from 16px to 8px on narrow screens; commands move below names. Descriptions and source labels wrap. Search follows the existing field heights.

Member management is a flat roster beneath Logo. Rows pair a circular initial (30px) with name/responsibility, a native role selector (128px desktop), and removal. Rows have a minimum height (62px) and vertical padding (10px). At widths up to 600px, role/removal controls move below the person details; the role control aligns to their text rail (38px inset). Inline search results scroll within a maximum height (210px); result buttons have a minimum height (48px).

The rework image box spans its content column with a minimum height (108px), padding (16px), and gap (14px). Its image-icon frame is 48px square. At widths up to 380px, padding reduces to 12px, gap to 10px, and the icon frame to 40px; the minimum box height remains unchanged. Uploaded/maximum count sits above the box, capacity and paste guidance inside, and file restrictions and removable previews below.

## Elevation & Depth

Inline List and Skill regions stay flat. The dialog alone lifts above the page with `0 16px 48px rgba(24,27,24,.2)` and a native `rgba(24,27,24,.32)` backdrop. No new motion or decorative elevation is introduced.

## Shapes

Controls use gently rounded corners, panels are slightly softer and Tags tighter. Borders are thin and functional. Skill upload uses a dashed border; color swatches are circular. Preserve this language rather than introducing new cards or pills.

## Components

### Buttons

Primary actions pair Accent with white text. Secondary actions use Panel, Text and Control Border. Hover applies only where available. Interactive controls inherit a 2px Accent focus outline with a 2px offset.

The review Call action never shrinks: 56px minimum width, 12px horizontal padding. Disabled state retains full opacity and shared disabled colors.

### Inputs / Fields

Save is gated by required name/customer, integer target 1–100000, active file reading, List errors and invalid/duplicate same-sheet commands. Rejected optional Logo/Skill files show alerts but their error strings are not themselves Save gates.

**The Visible Validation Rule.** Keep the blocking reason visible beside Save. Invalid Skill commands also receive field-specific text connected through `aria-describedby` and `aria-invalid`.

### Tabs / Dialog

Use native modal behavior, a labelled heading and initial autofocus. Preserve 基础信息, List 与 Tag and 审核 Skill as labelled buttons with `aria-pressed`. Cancel, close and backdrop dismissal discard the editor draft.

### List / Tags

Accept pasted lines or ZIP directory preview. Distinguish linked Items from unlinked entries; only real links count toward completion. Tags permit one assignment per entry. Saved lists provide filtering and editing.

The header's 编辑数据单 button is the sole editing entry point. The duplicate 编辑配置 link beside the Tag filter was removed at the user's request; empty-list guidance points to the header button. Tag filtering and archive download remain in the List toolbar.

### Searchable Skill Library

Compact multi-select rows preserve the Panel, Border and Accent palette. Names use medium-weight 13px text; commands, descriptions, source/version and actions use 12px supporting text. Sources remain explicit: 平台示例, 平台 Skill, 我的 Skill, or 数据单 · title, followed by version when available.

Search matches name, command, description and source; matching normalizes case, whitespace and a leading slash. Result counts are announced, empty states retain upload guidance, and clearing search returns focus to the field.

Rows are native toggle buttons with `aria-pressed`. Accessible names include name, command and source/version; descriptions connect through `aria-describedby`. Unselected rows show plus/选择. Selected rows use Accent Soft with Accent check/已选择. Hover uses Subtle only for enabled, unselected rows; keyboard focus uses an inset 2px Accent outline. Loading disables all rows; reaching 12 selections disables only unselected rows, preserving removal. Selection stays a draft until Save. This extension has source-level verification only; rendered layout and browser focus behavior await validation.

### Sheet Members / Roles

Keep member configuration inside 基础信息, using the inherited Panel, Subtle, Border and compact type roles. Search matches names, account names and available directory details; results remain inline, announce their count, and disable already-added people. New additions default to Member.

Owner, Reviewer, Member and Outsourcing are sheet-local roles, not changes to the account's global role. The creator starts as this sheet's Owner. The local demo permits management by a sheet Owner, the owning project's Owner, or Lead; other viewers receive a read-only roster. These checks are prototype behavior, not server authorization or persisted invitations.

At least one Owner must remain: disable removal and role changes for the final Owner until another Owner is assigned. Changes remain draft until Save, which rechecks the actor, current permissions and roster baseline. Native role options require explicit `label` attributes because the template compiler wraps interpolated text. Keep status messages and the minimum-Owner explanation visible.

### Rework Reference Images

Use a full-width clickable file-input label, with a thin dashed Control Border, Subtle background, gently rounded corners (6px), and the official Phosphor image icon. Primary copy uses 13px medium text; counts and instructions use 12px supporting text. Hover changes the border to Accent and background to Panel; keyboard focus outlines the whole box.

Show uploaded/maximum count and remaining capacity together. Accept choosing files or Ctrl/⌘ + V within the active feedback context. Preserve PNG/JPEG/WebP/GIF validation, the six-image cap, the 10 MB per-image limit, decoding/loading states, visible errors and individual thumbnail removal.

At capacity, disable the native file input, use a solid border and Disabled Background, and explain that removing an image restores capacity. Do not rely on reduced opacity to communicate fullness. Apply the same pattern to review-workbench and delivery-sheet rework; preserve their existing cancel, submission and session-local behavior.

### Bound Skill Review

Expose only related-sheet/Item bindings. Choice rows pair commands with source sheets; ambiguous commands require explicit source selection. Invocation records instructions and Item/Run context, never a real score or review decision. Keep demo and refresh-loss limitations visible. Uploaded scripts are never executed.

When there are no bindings, omit the entire 技能评估 region in both the workbench and delivery detail: no heading, demo label, empty-state copy or reserved gap. Personal Skill upload remains available in the avatar panel regardless of whether bindings exist. Binding there adds an independent Skill snapshot to the chosen visible data sheet.

## Do's and Don'ts

### Do:

- Do preserve the incumbent compact Forge identity.
- Do keep validation readable beside Save and linked to invalid Skill fields.
- Do preserve the 56px nonshrinking review Call action.
- Do choose Tag foregrounds by computed black/white contrast.
- Do keep session-local and demonstration limitations visible.

### Don't:

- Don't replace global navigation, metrics or review decisions.
- Don't imply that a loaded Skill produced a real evaluation.
- Don't execute uploaded instructions or archive scripts.
- Don't add a second opacity reduction to the disabled review Call button.
- Don't hide the only validation explanation in a tooltip.
