# Responsive layout and interaction motion

The Postman adapter keeps its existing visual system. `global-responsive.css`
loads after page styles; `global-responsive.mjs` only adds stable markup hooks.
No routing, permissions, assignment, run or review model behavior is changed.

## Layout

| Surface | Adaptation |
| --- | --- |
| Run records | Toolbar wraps; content widths below 1160px use compact rows, below 720px use stacked rows with visible progress, cost and actions. |
| Run detail | Below 760px of content, Item names and node progress each have a full row; status and actions remain paired. |
| Review queue | Below 980px of content, compact rows; below 600px, task/preview, status, submitter and actions stack. Long previous feedback uses two lines. |
| Delivery sheet | Below 860px of list width, each Item keeps its identity, directory, status, read-only owner and Task Tags visible. |
| Delivery wizard | Below 420px of form width, basic fields and review assignments reflow without a wide table. |
| Dataset | Narrow titles, style descriptions and IDs wrap; version menu stays within the viewport. |
| Dialogs / profile | Bounded by dynamic viewport height; footers wrap. The phone profile uses the available viewport for editing. |
| Preview | On short landscape screens, details scroll in the preview workspace and bottom actions stay reachable. |

Container queries account for the workspace rail and the wizard summary column.
Pipeline canvases, code and horizontally comparable analytical tables retain
local scrolling. Navigation and data updates remain immediate.

## Animation scout decisions

| Opportunity | Motion | Timing | Reduced motion |
| --- | --- | --- | --- |
| Profile Create Skill menu | Top-right origin, opacity and -4px / .98 scale | 160ms in, 110ms out | 90ms opacity |
| Dataset / Pipeline configuration editor | Center-origin .98 scale and opacity | 200ms entrance; immediate close | 90ms opacity |
| Ready reference image | Opacity only | 120ms | 90ms opacity |

These infrequent actions benefit from a clear origin or completion signal. All
use CSS, the existing Forge easing, and transform/opacity only. No new dependency,
stagger, animated metric counter, navigation transition or resize animation.
Keyboard menus and editor opening follow Forge's immediate interaction policy.

Native configuration dialogs still dismiss immediately and unmount as before.

The Run overflow menu was removed on 2026-09-04. Each row now always shows one
operation: running records open progress; completed records with pending review
open review; failed runs or Items open their failure details; other completed
records open results, and queued/cancelled records open details. Its unused menu
styles, motion and document event handlers were removed. The updated run-record
and adapter tests passed (78 tests), with browser checks at 1440px and 919px.

## Initial responsive/motion validation

- Checked representative overview, production, Pipeline, datasets, resources,
  review, delivery, wizard, profile and billing surfaces in the local browser.
- Inspected 320px, 390px, 768px and 1280px widths; checked short 667 × 375 preview.
- Verified run menu open/close/Escape and native Skill menu positioning, dataset
  editor sizing, and landscape rework controls without saving production data.
- Checked all four reduced variants in a disposable browser fixture using the
  generated production CSS. Managed browser tools did not expose native media
  emulation, so the fixture activated reduce media branches and disabled
  no-preference branches. Computed transforms were `none`, durations 90ms, and
  menu/dialog close states remained correct. The fixture was removed afterward.
- Existing assembly, run-record, review-queue, assignment and motion tests: 116
  passed. No model callbacks changed for this work.
