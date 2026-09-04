---
name: Forge Model Status
description: Clearly labelled demo investigation dashboard within Forge’s existing workbench.
colors:
  accent: "#c44318"
  accent-hover: "#a83812"
  accent-soft: "#fff1ea"
  page: "#fafaf8"
  panel: "#fff"
  hover: "#f0f1ed"
  border: "#e3e5df"
  control-border: "#c9ccc4"
  text: "#272a25"
  muted: "#666b61"
typography:
  body:
    fontFamily: '"Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'
    fontSize: "13px"
    lineHeight: 1.5
  metric:
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
  label:
    fontSize: "12px"
rounded:
  control: "6px"
  container: "10px"
components:
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-text:
    textColor: "{colors.accent}"
    padding: "6px 0"
  issue-filter-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  diagnostic:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.container}"
    padding: "22px"
---

# Design System: Forge Model Status

## Overview

**Creative North Star: "Compact Operate"**

A compact, explicitly simulated investigation dashboard within Forge’s established neutral-and-orange workbench. Operators scan exceptions, compare suppliers or models, then inspect the selected route. Availability, latency, quality and account evidence remain separate; there is no composite health score.

This surface-local record preserves the inherited world, not a new global identity. Direction: `.impeccable/surfaces/model-status.md`. Product/data authority: `PRODUCT.md` and `MODEL_STATUS_BRIEF.md`. Implementation: `scripts/templates/model-status.{html,css}`, `model-status-{methods,dashboard,demo}.js`; `scripts/update-model-status.mjs` assembles `public/forge.html`. No global `DESIGN.md` change.

**Key Characteristics:**

- Clearly labelled examples, with real-input states kept separate.
- Exception-first comparisons and persistent selected-route diagnostics.
- Native controls, labelled mobile metrics and explicit unknown evidence.

Validation: 429 tests and the production build pass. Local browser acceptance covers desktop 1280×900 and mobile 390×844, dimension switching, filters, chart hover/focus, route selection, simulated retest and follow-up preparation. Captures: `.impeccable/review/model-dashboard/`. Initial finish review found three integrity issues; the verdict resolved all three: shared time validation, no mixed TTFT/total-P95 comparison, and supplier runway reconciled to all hourly route spend. Disposition: **ship at those listed fix scopes**, not blanket whole-surface approval. The detector returned `[]` with degraded parsing; computed contrast was not verified. Real monitoring and deployment remain unimplemented.

## Colors

The frontmatter records only inherited values used here. `forge-refinement.css` owns `--forge-accent`, `--forge-accent-hover`, `--forge-accent-soft`, `--forge-bg`, `--forge-panel`, `--forge-border`, `--forge-control-border`, `--forge-text`, `--forge-muted`; `interaction-states.css` owns `--forge-hover`. Snippets use these live bindings with exact source-value fallbacks.

Orange marks selection, text actions and focus; white panels and neutral fills separate rows and evidence. Local green/ochre/rust badges and muted green/ochre chart bars retain `model-status.css` treatments, not a new global palette. Every state also has words. No synthetic tonal ramps.

## Typography

Inherit `--forge-font`; numeric metrics use tabular figures. Assembled page heading: 22px/32px, weight 600; 20px/32px at 760px. Inherited important font sizes override local declarations; the later local line-height wins.

Local rules: body 13px (12px at 650px), labels 12px, metadata 11px, issue counts 19px (17px mobile), metrics 22px/28px (20px mobile), diagnostic title 17px/24px, section title 13px/22px. These are source-cascade observations, not computed-style certification.

## Layout

Retain the Forge sidebar and page frame. Effective cap: inherited 1320px `!important`, overriding local 1280px. Page padding: 24px; 20px at 1000px; 18px vertically / 14px horizontally at 760px.

Order: heading → example-source strip → global issue counts → supplier/model dimension → search/provider/status filters → comparison table → selected-route diagnostic. Desktop table: seven columns, right-aligned metrics. Diagnostic: four metric columns, then a `1.65fr / minmax(240px,1fr)` trend/evidence split with 30px gap.

At 1180px columns tighten. At 1000px table headings hide, rows become three-column labelled grids, and investigation content stacks. At 650px rows/metrics use two columns; identity/status/actions span full rows, search fills its row, source/header/disclosures stack, and fields/action buttons reach 44px height. Chart labels thin to every third point. Retain the inherited 64px mobile sidebar rail.

## Elevation & Depth

Flat borders and neutral state fills, with no new shadows, raster assets or motion. Existing shell behavior remains inherited. Native disclosures have no newly authored transition; hover styling is fine-pointer gated. Inherited global button transitions are not a new dashboard motion system.

## Shapes

Controls use `--forge-radius-sm`; comparison/diagnostic containers use the inherited medium-radius value. Local badges use 4px corners and chart bars 3px top corners. Dividers structure rows; do not wrap every metric in another card.

## Components

### Source mode and controls

No `modelMonitoring` input defaults to labelled synthetic examples: four suppliers, six models, eight routes. “查看接入状态” exposes the disconnected state. Supplied live input wins; loading/error never becomes examples. The overview’s real availability stays separate from demo values.

Keep native buttons (including pressed dimension/filter states), search input, selects, `details/summary`, and read-only follow-up textarea. Focus: 2px inherited-orange outline, 3px offset. Loading uses status/busy semantics; failure uses alert semantics. Disconnected, empty catalog and no-match states have distinct copy; no-match offers reset.

### Comparison and diagnosis

Exception-first rows show availability, same-metric worst-route P95, weighted failure rate and hourly spend. Supplier mode shows one account balance; model mode shows the lowest available fixed-set score. Selection changes diagnosis; “排查” also scrolls to/focuses its heading. Native route selection stays within the group. Dimension, query, supplier, status, group, route and source persist in `/models` query state for refresh/history.

Mixed `ttft_p95` / `total_p95` groups show “指标不同 · 请分线路查看”, preserving route-specific evidence without mixing metrics. Global counts remain unfiltered. Supplier runway uses all account hourly spend, not the filtered subset; the demo 云桥 calculation reconciles both routes. Estimates are not guarantees; zero balance does not become healthy when spend is zero.

### Trend and local follow-up

The demo has twelve five-minute P95 TTFT points and a dashed baseline. Native bar buttons carry time/value/baseline labels; hover, focus or click updates the polite readout. Failed calls are neither 0ms bars nor zero quality scores. Live time series remain explicitly pending.

“模拟复测” only refreshes local examples and reports the existing result; no model call or fee. “整理跟进信息” exposes selectable, unsent text with demo warning and manual-owner confirmation. No probes, supplier messages, routing changes, payment or recharge controls are implemented.

### Preserved evidence safeguards

Real input stays immutable. Preserve deduplication, conflicting-ID quarantine, independent metric freshness and account/call billing disagreement. Availability requires a fresh complete catalog and no unknown models; one passed eligible route suffices despite an unknown backup. Keep missing, invalid/future and expired states distinct.

Snapshot and dashboard share a clock-validation helper. The local 15-second clock makes no requests. Real-input freshness defaults to five minutes, configurable from one second to 24 hours; synthetic snapshots intentionally use a 24-hour demo lifetime. Sample gates and the 2× cue are adjustable first-version display rules, not validated production SLAs. A quality drop means “待复测”, not proof of model replacement.

## Do's and Don'ts

### Do:

- Do preserve Forge’s inherited tokens, native controls and compact hierarchy.
- Do keep availability, latency, quality and account evidence independent.
- Do label examples and keep unknown, conflicting and invalid-time states explicit.
- Do keep simulated retests local and follow-up information unsent.

### Don't:

- Don't mix demo values into real monitoring or substitute examples for live errors.
- Don't compare different latency metrics or infer account health from missing data.
- Don't turn scores, thresholds, runway estimates or suggested actions into verified claims.
- Don't equate scoped review acceptance with full accessibility, production monitoring or deployment approval.
