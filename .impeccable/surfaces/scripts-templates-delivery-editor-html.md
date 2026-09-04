---
version: 1
slug: "scripts-templates-delivery-editor-html"
primary_target: "scripts/templates/delivery-editor.html"
related_targets: ["scripts/render-delivery-editor.mjs", "scripts/templates/delivery-create-page.js", "scripts/templates/delivery-methods.js", "scripts/templates/delivery-workflows.css", "scripts/templates/delivery-skill-workspace.js", "scripts/templates/delivery-skill-library.js", "scripts/templates/profile-methods.js", "public/forge.html"]
---

# Delivery creation and data-sheet Skills · Operate

## Current Skill chooser extension

The latest user request restores the shared creation-method dropdown on `/delivery/new#skills`, including the Postman preview. This supersedes only the direct-form button rule below; the four-step wizard, fields and data handling stay unchanged.

### Direction contract

THESIS: Choose the creation method before entering a Skill editor.

OWN-WORLD: Reuse Forge's existing native popover, compact secondary CTA and Phosphor icons; no new dependency, styling system or motion.

STORY: 创建 Skill opens 填写表单 / 上传文件; uploading accepts the existing Markdown/ZIP formats and requires explicit confirmation.

FIRST VIEWPORT: Keep the checklist visible behind the anchored chooser; selecting either action opens its existing subflow without losing sheet inputs or selected Skills.

FORM: Precise code-led extension of the shared editor, no concept roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Shipped record: independent finish review returned ship at source scope for this narrow restoration, with no material fixes. The local creation design record and sidecar are updated; global DESIGN.md is unchanged. 477 tests and the build pass. No browser, placement or actual-focus certification; no assets, new motion or public deployment. Documentation was completed inline after the documenter spawn was unavailable.

## Current direction · Four-step creation · 2026-09-03

The latest user request supersedes the continuous-form and draft-action instructions below for new creation only. Preserve the Forge shell and visual system, but show 基础信息 → 导入 List → 配置规则 → 确认创建 as validated, revisitable steps. Do not expose save-draft or autosave in this flow. Existing stored drafts are not deleted. Each step retains in-memory content; leaving requires explicit confirmation.

Use a 1120px working region with a 272px sticky summary, a collapsed mobile summary, light section cards and a sticky validation/action footer. Name is full width, customer/target share a row, Logo is independent, members move to confirmation. List import is exclusive paste/ZIP, retains anomalies, counts only unique exact matches as valid, requires valid count = target and zero anomalies. Show an exception filter, per-item Tag and 8-row pagination. Rules provide default Tag, searchable/category-filtered Skills pinned when selected, and a direct Create Skill button without a dropdown arrow. Owner displays as 所有者 with the sole-owner guard.

Details and current source authority: `.impeccable/delivery-create-design.md`. Verification: 416 tests and build pass; 1280×900 / 390×844 browser checks cover the interaction paths and responsive layout. Actual final browser submission was blocked by safety review and not retried; only automated creation logic is certified. The following sections are historical context, not the current creation-layout contract.

Local extension. Preserve existing navigation, delivery metrics, review decisions, compact tokens and Phosphor icons. User approved a Skill invocation demonstration, not an evaluation engine. List accepts ZIP or pasted text. Uploaded instructions are inert data, never automatically executed. Formal sheet/notification/library state remains session-local. The later user-requested draft extension below is the explicit persistence exception.

## Direction contract

THESIS: Creation is a complete working page with one continuous form; existing-sheet editing remains a compact dialog. Skills are reusable beyond review; their current invocation demonstration remains in related review sessions.

OWN-WORLD: Inherit white panels, restrained orange actions, 13–14px Chinese sans text, 18px dialog heading and 6px controls.

STORY: In Basic Information, search people and assign sheet-scoped roles. Skill is a vertical section during creation and a tab during existing-sheet editing. Both use one platform checklist. Search and select there; if nothing fits, 创建 Skill opens an anchored native popover with two compact, left-aligned actions: fill a form or upload files. Successful creation returns to the updated checklist without auto-selection. Do not restore the full-width chooser, three source tabs, or a duplicate 本数据单使用 section. Each transparent row is one grid: checkbox and name plus inline `/ command`, context beneath, and a right-aligned 查看 link-style button inside the same row. No source/version line in the list; hover fills the entire row, selection changes only the native checkbox. 查看 remains independent of selection. It opens one native detail dialog with an 18px/26px title, 13px/21px content, invocation below the title, complete inert instructions, and an optional per-sheet alias disclosure for selected Skills.

FIRST VIEWPORT: Keep the sidebar; an 840px-max working column starts with 返回交付 and a 24px 创建数据单 heading. Basic Information, List 与 Tag, and Skill follow as flat vertical sections, not tabs or cards. The viewport-sticky footer exposes Cancel/Create. Existing-sheet editing still uses the three-tab native dialog. Form controls and member/Skill lists keep their established compact treatment. Skill creation replaces only its list in place and returns to it without losing the sheet draft; uploaded files require explicit creation before selection.

FORM: User-approved precise structure, code-led extension; no concept roll. Creation uses the app's existing in-memory view navigation, not a separately reloadable URL or new browser-history entry. Dirty navigation opens a native confirmation with 继续填写 focused by default; refresh/document exit uses beforeunload. Search-only and subflow-navigation changes do not dirty an untouched draft. Successful Skill publication survives sheet cancellation. No persistent drafts or backend were added.

FINISH: Source-scope finish review returned ship after resolving transient Review Back and Escape utility regressions. Documentation for this extension is `.impeccable/delivery-create-design.md` and `.json`; existing delivery-design files and global identity remain unchanged. Browser QA remains permission-gated and was not performed; no screenshot, rendered-layout or real-focus certification is claimed. No raster or motion added.

DATA RULES: Roles are exactly Owner, Reviewer-Forge and Reviewer-Outsourcing, scoped to one sheet. The creator is sheet Owner; at least one Owner remains. Unauthorized users see a read-only roster, and save rechecks local demo permissions. New sheets require name, customer, positive integer target and nonempty List. Creation generates recipient-scoped local reminders; Feishu remains explicitly unconnected. Preserve the 12-Skill cap and inert session-local data. Tag starts collapsed and without a selected color. Explicit creation opens name/color controls; color is optional with a documented gray fallback. Cancel/add reset the draft color. Duplicate names and the 20-Tag cap remain enforced; unfinished Tag drafts block sheet submission. No raster or motion added.

SAVE MODEL: Skill creation is independent of saving the sheet. A successful creation atomically adds to the session-local platform catalog and current account's personal Skills, clears only the submitted draft, resets search, and returns without selecting it. Sheet Save commits only the user-selected snapshots. Cancelling a sheet retains already-created Skills but discards unpublished form/file drafts; late reads cannot recreate cancelled drafts. Identical command/content reuses a record; conflicts require renaming, never overwrite. Selection and personal limits are separately 12. A full sheet can still create a library Skill. Profile merges personal and accessible bound snapshots, and unbinding retains the library copy. No backend, persistence or real authorization added.

VERIFICATION: Automated cases cover the single checklist, both creation methods, editable upload staging, search/selection retention, independent draft clearing, atomic platform/personal creation, explicit selection, conflicts, separate limits, unavailable source removal, cancellation, stale reads/actions, account switching and deduplication. New cases cover progressive Tag state, optional color/reset, duplicate/cap checks, stale callbacks, inert structured Skill content, independent viewing, alias validation and modal shortcut isolation. See VALIDATION.md for current browser evidence and full-suite results; prior source-only reviews are not retroactively browser-certified.

Dedicated creation coverage contains 14 logic/template cases covering exclusive page rendering, dirty and clean leave paths, destination resumption, Review Back, utility Escape priority, Skill retention, stale actions/reads, document-exit guarding, success detail and modal editing compatibility. See VALIDATION.md for the completed full-suite result.

Existing global design and `.impeccable/delivery-design.*` are unchanged. This creation-page extension is recorded separately in `.impeccable/delivery-create-design.md` and `.impeccable/delivery-create-design.json`.

## Local draft storage extension · 2026-09-03

User requested draft storage for data-sheet creation. This supersedes the earlier no-persistent-drafts statements above for creation drafts only. Preserve the 840px working column and existing control family: add a secondary 保存草稿 beside Cancel/Create, a truthful saved/unsaved/error status and browser-local scope note. The delivery list gains a compact expandable draft list with resume and confirmed deletion. The native dirty-leave prompt offers save-and-leave without losing the existing continue/discard paths. Formal records, metrics, notifications and library publication remain unchanged. IndexedDB preserves form, member, List/ZIP, Logo, Tag and selected/unpublished Skill data across refresh, with account-scoped keys and revision conflict protection. Details and verification: `scripts/DELIVERY_DRAFTS.md`.

## Skill layout polish · 2026-09-03

User references specify a compact outlined creation dropdown and simple form/upload flows. Preserve the existing in-page editors and data-sheet draft storage. Native Popover owns light dismissal and Tab/Escape behavior; CSS anchor positioning aligns it with the CTA and flips it when needed. Opening the dropdown does not replace the checklist or dirty the draft. Existing saved `choose` states resolve to the checklist. Use the established Phosphor sizes and inherited font family; creation has a small pill trigger, while form submission retains the primary action treatment. Browser checks at 1280×900 and 390×844 confirm the integrated rows, menu placement, keyboard return, independent viewing, consistent detail type and retained unpublished form data. No test Skill was published. Full unit suite: 370 passing; build successful.
