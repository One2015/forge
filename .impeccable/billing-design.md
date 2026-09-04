---
name: Forge usage and cost analysis
description: Scoped billing extension of Forge's incumbent Compact Operate interface.
colors:
  forge-accent: "#c44318"
  forge-accent-soft: "#fff1ea"
  forge-bg: "#fafaf8"
  forge-panel: "#fff"
  forge-subtle: "#f6f6f3"
  forge-border: "#e3e5df"
  forge-control-border: "#c9ccc4"
  forge-text: "#272a25"
  forge-muted: "#666b61"
  forge-disabled-text: "#81877b"
  forge-hover: "#f0f1ed"
  forge-pressed: "#e6e8e1"
  forge-danger: "#a5321f"
  billing-cost: "#6b7564"
  billing-input: "#646f5e"
  billing-output: "#aeb7a7"
typography:
  headline:
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "0"
  title:
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: '"Helvetica Neue",Helvetica,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'
    fontSize: "13px"
    lineHeight: "20px"
  label:
    fontSize: "12px"
    lineHeight: "20px"
  metric:
    fontSize: "26px"
    fontWeight: 600
    lineHeight: "34px"
    letterSpacing: "-.025em"
rounded:
  segment: "4px"
  control: "6px"
  table: "8px"
  panel: "10px"
spacing:
  control-gap: "6px"
  filter-gap: "12px"
  section-gap: "20px"
  detail-gap: "24px"
components:
  text-action:
    textColor: "{colors.forge-accent}"
    rounded: "{rounded.control}"
    padding: "7px 8px"
  date-field:
    backgroundColor: "{colors.forge-panel}"
    textColor: "{colors.forge-text}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  dimension-active:
    textColor: "{colors.forge-accent}"
    padding: "10px 2px"
  grain-active:
    backgroundColor: "{colors.forge-panel}"
    textColor: "{colors.forge-accent}"
    rounded: "{rounded.segment}"
    padding: "3px 10px"
  trend-panel:
    backgroundColor: "{colors.forge-panel}"
    rounded: "{rounded.panel}"
    padding: "16px 16px 8px"
---

# Design System: Forge usage and cost analysis

## Overview

**Creative North Star: "Compact Operate"**

This scoped extension inherits the name and visual language recorded in the adjacent Forge design documents. It preserves compact system typography, light working surfaces, restrained orange selection and flat section boundaries; it does not replace the global identity or introduce a new brand direction.

Billing presents one date-and-filter context across summaries, trends and dimension details. The visible synthetic-data notice is part of this local prototype's hierarchy, not evidence of a connected billing service. Existing application workflows and draft semantics remain outside this extension.

**Key Characteristics:**

- Shared date and filter context.
- Right-aligned, tabular numerical detail.
- Native controls and locally scrollable data regions.

Authority: `billing.html`, `billing.css` and `billing-methods.js` in `scripts/templates/`; inherited tokens and page rules in `forge-refinement.css` and `interaction-states.css`. `public/forge.html` is generated output. Direction remains in `.impeccable/billing-direction.md` and the matching surface brief; technical integration belongs in `scripts/BILLING_ANALYTICS.md`.

## Colors

Primary orange identifies the current analysis dimension, selected grain, selected cost bar and text actions. Soft orange is the inherited text-selection fill. Neutral application, panel and subtle surfaces distinguish page, charts and table header without a new theme. Neutral hover and pressed fills provide immediate control feedback; danger marks date errors.

The three billing-local olive colors distinguish cost, input and output series. Input/output also retain text legends and exact textual readouts; these colors are not new global brand or status tokens. No tonal ramps are defined by this extension.

## Typography

The inherited Helvetica Neue / Chinese fallback stack supports dense operational reading. Metrics use tabular numerals; supporting labels and currency remain quieter than totals. The page title's actual cascade is the headline role above, not the billing template's overridden nominal size. At ≤760px its size becomes 20px while the later billing rule retains 32px line height. Metrics become 24px at ≤1150px. Table text is 12px, row names 13px and secondary row metadata 11px.

## Layout

Keep the existing shell and centered page. The effective cap is 1320px: shared page CSS overrides billing's nominal 1400px. Outer padding is 24px, becomes 20px at ≤1000px, then 18px vertically / 14px horizontally at ≤760px.

The order is back/title, demo notice, dates and grain, dimension navigation, filters, four metrics, trends, readout, then detail table. Above 1150px, trends share two columns and filters use three fields plus a clear action. At ≤1150px, trends stack and filters use two columns. At ≤700px, dates use a two-column grid with full-width preset and grain rows, filters stack, metrics use two columns and the heading stacks.

Trend plotting has a minimum width of max(320px, 12px per bucket); its horizontal scroll is independent of the page. Detail rows retain their 890px minimum width in a separate scroll region. At ≤700px, named form/navigation/text-action controls gain a 44px minimum height; this is not a claim that every chart bar or sort control is 44px.

## Elevation & Depth

Charts, metric rails and the table use borders and surface contrast, not enclosing shadows. Only the selected grain adds the small shadow recorded in the sidecar. Billing updates immediately; no new animation or shipping raster was introduced. Existing shell motion is not redefined here.

## Shapes

Soft rectangular controls and chart panels follow the inherited corner language. The segmented control nests smaller rounded buttons; table clipping has its own intermediate radius. Cost bars use tiny top corners, and input/output legend keys are small rounded squares. No new decorative imagery or icon system is introduced; the back arrow reuses the project's Phosphor source.

## Components

**Entry and navigation.** “昨日成本” opens 总览 with yesterday's UTC+8 natural day and hourly aggregation. The page title receives focus; 返回概览 restores the entry's focus. 总览 / 供应商 / 模型 are native buttons in a labeled navigation region, with `aria-current` and an orange underline for the current dimension.

**Dates, grain and filters.** Native date inputs and selects retain visible labels. Hour/day/month/year buttons use `aria-pressed`; changing grain does not change totals. “近 12 个月” selects the last 12 complete natural months, excluding the current partial month. Date errors offer 恢复昨日范围. Project, actual provider and brand/model filters update every data region together; 清除筛选 is visibly disabled without filters.

**Metrics and trends.** Four totals share a flat ruled band. Cost and stacked input/output trends use button bars with textual accessible labels and exact shared readout. Click or Enter selects a bucket; focus remains visible. Sparse axis captions reserve space before the right-aligned final caption instead of forcing adjacent endpoint labels together.

**Detail table.** The ARIA table has rowgroups, row/column headers and right-aligned numeric cells. Cost or total Tokens sorts descending; the active sort is orange and underlined. Names drill into filters while preserving dates. Model identity includes its brand; actual providers remain a separate dimension.

**Data states.** Demo disclosure appears both here and on the overview entry. Loading, disconnected, failed, valid empty and real zero values remain distinct. The static loading placeholder has no shimmer. `billingUsage` is an input seam, not a live API; production must explicitly supply real data or `null`, per the technical contract.

## Do's and Don'ts

### Do:

- Do preserve the inherited Forge tokens, native controls and visible keyboard focus.
- Do keep the demo label and shared date/filter context visible.
- Do retain local chart/table scrolling and the readable final axis caption.

### Don't:

- Don't turn this surface's chart palette or composition into global brand rules.
- Don't describe the synthetic ledger or input seam as real account billing.
- Don't treat the two-fix verdict as a full-surface or computed-contrast certification.

Recorded verification: 350/350 tests, build and diff whitespace check passed. `.impeccable/review/billing/review.md` records final **ship at the two-fix verdict scope only**: complete-month dates and endpoint-label collision were resolved. The detector used degraded regex mode, not computed-style auditing.

Evidence: paired top/lower captures `desktop`, `user-919` and `mobile` in `.impeccable/review/billing/` (each with a `-detail.png` partner). Latest captures show the 12-month monthly state; mobile detail deliberately scrolls both charts rightward. Full-page stitching was invalid and is not evidence. This documentation pass read source and those captures; it did not run a new browser audit.
