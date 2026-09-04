# Responsive layout and interaction motion

The Postman adapter keeps its existing visual system. `global-responsive.css`
loads after page styles; `global-responsive.mjs` only adds stable markup hooks.
No routing, permissions, assignment, run or review model behavior is changed.

## Layout

| Surface | Adaptation |
| --- | --- |
| Run records | Toolbar wraps; seven aligned columns remain above 980px of content width, using flexible identity/progress columns. At 980px and below rows reflow; at 720px and below they stack with visible progress, cost and actions. Run IDs, review IDs/context and previous feedback use 12px/1.5, including narrow layouts. |
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

## Loading skeletons

The [Transitions.dev skeleton and reveal](https://transitions.dev/detail.html?t=skeleton-loader-and-reveal)
informs the shared `loading.css`: a 1000ms soft opacity pulse, followed by a
240ms crossfade in place when the real load completes. Only the small skeleton
shapes blur by 2px; images, models and embedded pages fade without a blur.
Pulsing stops after three cycles if a request remains pending. Completion never
waits for the animation, and retry restores the loading state immediately.

The outer workbench iframe, billing/model data regions, and image/web/3D previews
share this treatment. Preview errors, timeouts, actual model progress and retry
remain driven by their existing lifecycle. Hidden previews cannot receive focus.
Reduced motion uses static shapes and a 90ms opacity fade.

Validation: production build, focused TypeScript check and all 554 existing
tests passed. Browser checks covered cold-start completion, ready billing/model
pages, and an isolated fixture using the production CSS and preview bundle.
The fixture exercised delayed image loading, failure/retry and 390px layout;
it measured an intermediate fade opacity and confirmed that ready skeletons
become hidden. Native media emulation was unavailable, so the fixture activated
the production reduce CSS branch to verify no pulse/blur and a 90ms reveal.
The fixture and its local server were removed afterward.

## Checkbox and checklist feedback

The [Transitions.dev checkbox check](https://transitions.dev/detail.html?t=checkbox-check)
informs the shared checkbox visual: the background fills in 150ms and the SVG
check draws in 350ms, with a 150ms reverse on deselection. All use
`cubic-bezier(.22,1,.36,1)` and can reverse from their current position.
Native inputs retain their labels, state, callbacks and keyboard behavior.
Pipeline node controls now expose the existing enabled state as valid
`aria-checked="true|false"` values. File-preview filtering shares the same SVG.

Half selection shows a horizontal dash; disabled controls keep their muted
appearance. Keyboard and reduced-motion interactions update immediately.
Forced colors retain native controls and use system colors for Pipeline controls.

Validation: browser checks covered the live run-list filter, focus and Space
interaction, and Pipeline enable/disable without opening node details. A
disposable fixture using the production CSS verified mixed/disabled states,
rapid reversal and the reduced-motion branch (native media emulation was not
available). Temporary pages were removed. Production build and the focused
TypeScript check passed; the existing business-logic preservation check now
excludes only the new presentation field, with a separate enabled-state test.

## Page scrolling audit — 2026-09-04

Ordinary pages use document scrolling at every breakpoint. Review queue and run
records have no viewport-based table height cap; datasets and their item details
grow with their contents. The dataset columns retain their resizer and stack on
narrow screens. Horizontal table overflow remains available where needed.

Canvas workspaces, preview details, dialogs, selection menus, and the large
assignment subtable remain independently scrollable. They do not constrain the
height of an ordinary list page.

Browser wheel checks against the served `/forge-postman.html?route=…` entry:

- At 1512×900, overview, runs and run detail, pipelines, datasets, resources,
  submission summary, pending/completed review, delivery and its item list,
  item lifecycle, all four billing tabs, and model status reached the document
  bottom or already fitted in the viewport. No nested vertical scroller remained
  in these page contents.
- At 919×801 and 390×844, the main page families and delivery editor steps
  reached the document bottom without horizontal page overflow. The confirmation
  form's assignment table retained its own scroll, with the page footer reachable.
- At 1512×700, the Pipeline node drawer and review preview details reached their
  internal bottom. Closing personal profile restored normal queue wheel scrolling:
  document `scrollTop=558.5`, table `scrollTop=0`, pagination bottom at `676.2px`.

The main app shell delegates scrolling to this iframe. Existing tabs must reload
the embedded document to pick up rebuilt inline styles. The outer application URL
could not be opened by the browser tool (`ERR_BLOCKED_BY_CLIENT`); the served
inner entry was used for the measurements above. The 90 review, run-records and
Postman UI checks passed after rebuilding the page.
