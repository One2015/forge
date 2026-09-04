# Delivery creation and data-sheet Skills

This extends the existing localhost prototype. It does not add a backend, durable storage, or a real evaluation engine. New sheets, uploaded files and invocation history live only in the current page session. The editor labels this limitation explicitly.

## User flow

1. In **交付**, choose **创建数据单** to enter a full-page form with **返回交付**, the existing sidebar, and three vertical sections: **基础信息 / List 与 Tag / Skill**. There are no creation-page tabs. Enter sheet name, customer, target and optional description/logo. In **成员与角色**, click/type in search to open a native light-dismiss multi-select checklist; roles are Owner, Reviewer-Forge and Reviewer-Outsourcing. New selections default to Reviewer-Forge. The creator starts as Owner; at least one Owner remains. These do not change global account roles.
2. **List 与 Tag** requires at least one pasted line or ZIP-directory entry for new sheets. Unmatched entries are allowed. Inspect linked/unlinked entries, add optional Tags and assign one Tag per entry.
3. Successful creation queues one session-local inbox reminder per non-creator member. Each reminder rechecks membership/recipient before linking to its sheet. No real Feishu service is configured: UI and event channels explicitly say not connected. Failure, cancellation and edit saves do not send creation reminders. Production needs a server-authorized persistent outbox and real Feishu integration.
4. **Skill** opens **平台 Skill**, a single searchable checklist with the selected count. Each row groups the checkbox, inline name and `/ command`, a second context line, and its right-side **查看** action; no source/version line or selected row fill. **创建 Skill** opens a compact native dropdown offering **填写表单** or **上传文件**, not a full-width chooser or source tabs. Selecting a method enters its existing in-page editor and preserves the data-sheet draft. The form takes name, command, optional description and Markdown instructions. Upload reads MD/ZIP files into editable drafts; users confirm creation after fixing names/conflicts or removing files. Creation adds to the platform catalog and current account's personal Skills atomically, then returns to the refreshed list without auto-selecting. Select all required Skills from that one list; there is no separate **本数据单使用** section. **查看** opens an independent native dialog with an 18px title, 13px body and per-sheet alias controls for selected Skills. Tab/Escape and outside-click dismissal of the dropdown stay native.
5. The viewport-sticky footer exposes **取消 / 创建数据单**. Save commits only selected snapshots and opens the new sheet detail. Back, Cancel, sidebar and task/notification navigation ask **继续填写 / 放弃并离开** when the creation draft has changed or files are reading. Confirming discard retains already-created platform/personal Skills, but discards unpublished drafts and selections. Review Back returns to Delivery after leaving creation, never to an empty creation view. A failed sheet save does not undo independent Skill creation. The sheet shows its actual linked fixture Items, clear unlinked entries, color filters and bound command names. The header's **编辑数据单** retains the existing three-tab native dialog.
6. In a related Item's delivery detail or the review queue, type `/3d trajectory` plus optional requirements, or choose a bound Skill and invoke it. The session records the loaded instructions, source sheet, Item and Run. It never assigns a score or changes review status.

## File and binding rules

- Creation uses the existing in-memory `delivery-create` view, not a new URL/history route. Typing marks the draft dirty before blur; refresh/document exit installs `beforeunload` only while creation is open and checks dirtiness. There is no autosave or durable recovery. Native browsers control whether/how the document-exit prompt appears. Skill search and switching subflows alone do not dirty a pristine sheet.
- Creation-page Escape dismisses open sidebar utilities or temporary/mobile navigation; the native edit dialog, leave confirmation and member popover retain priority. The leave confirmation blocks shortcut submission and defaults to continuing the draft.
- Logo: PNG/JPEG/WebP, 2 MB, decoded image validation; no SVG execution.
- List ZIP: 20 MB compressed, at most 1,000 directory records and 100 MB declared expanded bytes. Up to 500 usable list entries. Directory names are previewed; archive files are not executed. Hidden metadata is ignored. ZIP64, split, encrypted, traversal and symlink entries are rejected. CRC verification is not implemented.
- Text List: one name/Item ID per line, duplicate lines removed, up to 500 entries and 300 characters per entry. Exact matching uses the current fixture Item catalog; unknown entries remain unlinked, not fabricated production Items. ZIP filenames can match a known Item basename.
- Skills: at most 12, 512 KB per Markdown document, 20 MB per ZIP. ZIP Skill content supports Stored and Deflate compression with streaming size bounds. Read only `SKILL.md`; do not run bundled scripts. Single-line YAML `name`/`description` is supported; other content remains original text.
- Search catalog: `platformSkillCatalog()` combines the three labelled platform examples (or `props.platformSkills`) with session-created `createdPlatformSkills`. New platform records are visible to other demo accounts; existing personal Skills remain account-scoped and other sheet Skills come only from `profileDeliveryTasks()`. Exact personal/platform copies are listed once. This is not connected to the original Forge backend and does not establish server-side authorization.
- Selecting an existing Skill creates an independent content/version snapshot with `libraryKey` provenance. Duplicate selected commands receive an editable suffix. Creation never auto-selects, including identical uploads that reuse an existing record. If a selected source disappears, its snapshot stays removable in the same checklist. File loading locks selection/removal/command edits.
- `skillDraft` and `skillUploads` are unpublished, opening-account-scoped drafts. `deliverySkillPublishPlan` is read-only, validates current catalog/capacity, then publication atomically writes `createdPlatformSkills` and `personalSkills`. Identical command/content reuses records; different content requires a renamed command. Personal capacity and per-sheet selection capacity are separately 12. Account changes and stale async operations cannot publish. Sheet Save never publishes library records.
- Profile deduplicates each personal Skill and its accessible sheet bindings into one row with a linked-sheet count. Other accounts can select published platform Skills without acquiring a private personal copy; they cannot read someone else's personal collection. Unbinding never deletes personal/platform Skills. Editing the personal copy does not silently update platform or sheet snapshots.
- Create instructions are limited to 20,000 characters, name to 80 and description to 300. Returning to the list preserves both unpublished draft types; publishing or clearing one method does not discard the other. Sheet Save requires finishing or explicitly clearing pending drafts.
- Commands support Chinese/Latin letters, digits, spaces, hyphens and underscores. Same-sheet duplicates are rejected. Cross-sheet duplicates require explicit source selection in global review.
- Saving is gated by required basics, file loading, List errors and invalid/duplicate commands. Invalid optional Logo/Skill files are rejected with visible alerts, but do not prevent saving other valid configuration.
- Review sessions are isolated by sheet/global scope, Run and Item. Invocation snapshots preserve original instructions, even after the sheet changes.
- Tags are manual classification, not review decisions. Changing Tags alone preserves existing seed-sheet aggregate metrics.

## Source and rebuild

Edit `scripts/templates/delivery-{editor,sheet-extras}.html`, `review-skills.html`, `delivery-workflows.css`, and `delivery-methods.js` with `apply_patch`. `scripts/templates/forge-base.html` is a bundled JSON template.

The shared `delivery-editor.html` source is rendered by `scripts/render-delivery-editor.mjs` into mutually exclusive creation-page and editing-dialog branches; only one set of form IDs is mounted. `delivery-create-page.js` owns navigation/dirty-state/keyboard guards. Preserve this renderer in focused member/Skill/layout generators; do not return to directly inserting the raw dialog template for creation.

For current creation-page or Skill changes, maintain `delivery-create-page.js`, `delivery-skill-workspace.js`, `delivery-skill-library.js`, the named editor methods, and `profileSkills`/`saveProfileSkills` in `profile-methods.js`. Run **`node scripts/update-delivery-skill-workspace.mjs`**. This focused, idempotent generator synchronizes the source blocks, navigation/keyboard guards, named methods, editor/extras markup and styles without replaying unrelated profile or delivery migrations. Test with `test-delivery-create-page.mjs`, `test-delivery-skill-workspace.mjs`, `test-delivery-skill-library.mjs`, `test-profile-workspace.mjs` and `test-delivery-workflows.mjs`.

For member changes, use `update-member-picker.mjs`; for this Skill extension use the command below. Do not replay older migration scripts over later sidebar/review/feedback refinements:

```sh
node scripts/update-delivery-skill-workspace.mjs
node --test scripts/test-*.mjs
npm run build
```

The installer is repeatable. JavaScript block replacements must use function replacers: source regex literals contain `$` sequences that string replacement would interpolate.

## Verification

- Creation-page conversion: 14 tests cover exclusive page/dialog rendering, all vertical sections, dirty/clean exit, before-blur typing, sidebar/profile/notification navigation, Review Back, Escape surface priority, Skill draft retention, asynchronous cancellation, stale callbacks, successful creation, edit-dialog preservation and focused-generator idempotence. Independent source review resolved both reported navigation/keyboard regressions and returned ship at source scope. See `../VALIDATION.md` for the full suite/build result. Browser acceptance, actual focus/sticky-footer layout and native prompt behavior remain unverified.

- Current Skill workspace update: see `../VALIDATION.md` for the current full-suite/build result. Coverage includes the single platform checklist, both creation methods, independent publication/selection, staging/rename/remove, deduplication, conflicts, capacities, account switching, stale callbacks and generator idempotence. Browser QA remains pending explicit approval; earlier captures below do not validate this flow.

- Member/image-box update: full suite 172 passing tests; production build passes. Browser checks covered file choosing, approved image paste, the six-image cap, individual image removal, member search/add/role changes, and new-sheet Save. Layout was inspected on desktop and mobile. Existing seeded-sheet Save was not browser-validated. Six reviewed captures are in `.impeccable/review/members-and-image-box/`. Finish-review disposition: ship, no material fixes. These results do not establish real authorization, durable invitations or persisted uploads.

- Searchable library update: 11 new tests cover search, scoped catalog visibility, multi-selection, snapshot isolation, collisions, shared capacity, stale/cancelled operations and review invocation. Full suite: 161 passing tests; production build passes. The new UI has not yet had browser validation (approval pending). The following browser evidence refers to the earlier upload-only version.

- 12 feature tests cover creation validation, text matching/deduplication, ZIP bounds, cancelled uploads, logo reading, MD/ZIP Skills, scope isolation, command ambiguity, Tag retention and cancellation. Combined suite: 63 tests.
- Browser QA at 1280 × 720 and 390 × 844 covered the three editor tabs, normal text creation, saved counts, Tag editing/filtering, and both review entry points. Enter/click invocations display actual instructions and explicit demonstration limits.
- Native OS file-picking automation was not available. File readers/parsers are covered by automated tests; populated UI states were inspected using an isolated synthetic fixture, not user records.
- `node scripts/create-delivery-qa-fixture.mjs` can regenerate temporary `public/delivery-qa-fixture.html` for visual QA. Open it, choose **交付**, then **建筑验收 · 演示数据单**. Its logo and content are synthetic test data. Remove that exact generated HTML after testing; it is not part of the shipped application.
- Native `<option>` elements carry explicit `label` attributes because the template compiler wraps interpolated text in spans.
- Validation reasons remain visible beside Save; invalid or duplicate Skill commands also have field-specific text linked with `aria-describedby`.
- The inline review Call button is nonshrinking (56px minimum, 12px horizontal padding) and retains disabled color without a second opacity reduction from legacy review styles.
- Custom Tag text chooses whichever of pure black or white has the greater computed contrast. The regression suite checks all 256 grayscale levels, including `#777777`.
- Final screenshots are in `.impeccable/review/delivery-*.png`. The detector ran once in degraded regex mode, so it is not evidence of a full computed-contrast audit.

Global navigation and design identity are unchanged. The surface direction is recorded in `.impeccable/delivery-direction.md`.
