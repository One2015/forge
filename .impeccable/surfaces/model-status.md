# Model status · Operate

## Current filter-layout refinement

Keep the scan path: issue counts → intersecting filters → route results. Preserve Forge's existing typography, palette, compact controls and diagnostic drawer. The issue navigation must never become an inner scroll area: use six columns, then three or two based on its container width. The filter row wraps at any available width, including beside the open drawer. Remove the sorting dropdown labelled 业务影响优先, retaining the established default order and legacy URL sort compatibility. Provider, model, line, status, query and business filters intersect independently; changing one must not clear another. Impossible combinations retain their selections and show the existing empty state/reset. No new multi-select semantics, data changes, assets, motion or global design rules. This turn verifies source, VM behavior and build only; no browser testing is requested.

Verification: 488 tests pass and the build succeeds. Four new checks cover all 24 orders of the four dimension selectors, conflicting combinations and recovery, URL/drawer restoration, and both variants' navigation/filter structure. Source evidence preserves DOM/focus order, 48px (compact 44px) issue buttons, wrapping labels and native fields. The health container switches from six to three columns at 760px and two at 420px; no internal overflow/scroll container or fixed minimum button width remains. Filters always wrap, including with a drawer on wide viewports; the table retains its separate existing overflow behavior. The layout detector returned no findings in degraded regex mode; rendered overflow, computed contrast and browser interaction were not verified. Existing visual-acceptance statements below refer only to prior work.

## Direction contract

THESIS: Let Allen identify blocked, slow, quality-regressed or underfunded routes at a glance, then inspect evidence and prepare the appropriate follow-up. Never blend these into one health score.

OWN-WORLD: Inherit Forge's neutral surfaces, restrained orange actions, compact Chinese sans, native fields and Phosphor icons.

STORY: Scan issue counts; compare suppliers or models; select a row for baseline comparisons, error causes and a follow-up note.

FIRST VIEWPORT: Compact heading and labelled example mode, issue filters, supplier/model tabs, dense comparison rows and the start of selected-route diagnostics. Mobile rows stack labelled metrics.

FORM: Precise extension of Forge, code-led, no seed required. Signature interaction: a selected supplier/model reveals the affected routes and evidence without leaving the dashboard. No new motion.

FINISH: ship at listed-fix scope; freshness, comparable latency and runway provenance resolved. 429 tests/build pass, desktop/mobile captures accepted, local design record/sidecar updated. No new global identity, raster, motion or external action; computed contrast unverified.

## Boundaries

The user explicitly requests fake data. Default to clearly labelled synthetic examples only when no monitoring source is supplied; never substitute examples for a loading/error live source. Keep the live adapter and its freshness/unknown safeguards. Simulated retests stay local, and follow-up notes are not sent. No external probes, messages, route changes, payment or publication. Browser QA is within this requested local UI implementation. Preserve global design.
