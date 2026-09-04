---
name: Forge personal workspace
description: Scoped avatar-panel extension of the incumbent Forge interface.
colors:
  forge-accent: "#c44318"
  forge-accent-soft: "#fff1ea"
  forge-panel: "#fff"
  forge-subtle: "#f6f6f3"
  forge-border: "#e3e5df"
  forge-text: "#272a25"
  forge-muted: "#666b61"
typography:
  body:
    fontFamily: '"Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'
    fontSize: "13px"
    lineHeight: 1.5
  title:
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
  label:
    fontSize: "12px"
    lineHeight: "18px"
rounded:
  panel: "10px"
  control: "6px"
  skill-action: "4px"
spacing:
  section-inline: "18px"
  mobile-section-inline: "14px"
  row-block: "12px"
  row-inline: "10px"
components:
  task-row:
    textColor: "{colors.forge-text}"
    rounded: "{rounded.control}"
    padding: "12px 10px"
  task-row-hover:
    backgroundColor: "{colors.forge-subtle}"
---

# Forge personal workspace

## Overview

This document describes only the avatar workspace, not Forge's global design system. Preserve the incumbent light workday surfaces, restrained orange, compact typography and official Phosphor icons. Identity precedes a delivery-sheet index and a personal/bound Skill library.

## Colors

Orange identifies the selected tab, editable actions and primary Save buttons. Neutral dividers separate rows. Task rows do not carry individual-case statuses. Inline upload errors and success notices use the established semantic colors.

## Typography

The inherited Helvetica Neue / Chinese fallback stack supports dense operational reading. Identity is the strongest text; delivery-sheet titles and Skill names use medium weight. Metadata, slash commands and the prototype notice remain quieter. No role/scope explanation is displayed.

## Layout

The nonmodal panel sits beside the sidebar, with fixed identity and list controls above a scrollable list. Its desktop width is capped at 400px. At 760px and below, it becomes viewport-bounded beside the icon rail; opening or resizing the open panel collapses an expanded rail. Mobile controls gain larger touch targets.

List notes, forms and row text share an 18px desktop content rail and a 14px narrow-screen rail. The list supplies 8px/4px outer padding respectively, with 10px inside each row. Metadata text can shrink and wrap while its trailing arrow stays fixed. The sidebar profile button keeps symmetric 8px vertical padding and its 56px minimum height, including collapsed mode. Ordinary desktop lists cap at 350px; an active inline editor can use up to min(520px, 100dvh - 200px), so its Save action is reachable without enlarging all panels.

## Elevation & Depth

One panel shadow separates the workspace from the application. Rows remain flat, with subtle hover fills and visible orange keyboard outlines. No new animation is introduced.

## Shapes

A softly rounded panel contains compact rounded controls and a circular initial avatar. Dividers, not nested cards, structure the lists.

## Components

Current identity is 一万, Member. Only Lead / Project Owner can edit the current demo account's display name and role; Owner cannot promote itself to Lead. Member / Outsourcing have no identity-editing affordance, and action-time guards enforce the same rule. Display-name changes do not change the stable assignment/library account key. This is local UI behavior, not server authorization.

Tasks list delivery sheets only. Lead sees every sheet; Owner sees sheets matching owned projects; Member / Outsourcing see sheets containing assigned Items or explicitly assigned/created sheets. Row actions recheck scope and open the sheet with cleared filters, without immediately starting review.

The 关联 Skill tab always offers upload, including when the account has no tasks or Skills. MD and ZIP packages containing SKILL.md are read as inert text. A flat inline draft provides display name, slash-command name and optional visible-sheet binding. Names, duplicate commands, 12-Skill capacity and stale target scope are validated before Save. Personal edits do not mutate an already-bound snapshot. File errors preserve successfully parsed drafts. Cancelled/replaced or cross-account async reads cannot overwrite the active draft.

Native popover behavior owns Escape and light-dismiss. Closing cancels identity edits but preserves unfinished Skill drafts. The review workbench and delivery detail omit the entire Skill evaluation region when no Skills are bound; binding a Skill makes it available again.

## Do's and Don'ts

Do preserve local-memory behavior, native dismissal and the prototype notice. Don't present filtering as server authorization, allow Member / Outsourcing to edit identity, execute uploaded scripts, or reintroduce individual cases in the profile task list.

Current verification: 113 tests passed; build passed. Independent browser checks covered Member task navigation, empty/bound Skill regions, naming validation, saving and binding, Lead editing/downgrade, and a 390px viewport. One bounded layout correction increased only the editor's available scroll height. See `.impeccable/review/profile-delivery-verdict.md`. No new shipping raster assets or motion.
