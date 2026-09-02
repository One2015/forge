# Delivery creation and bound review Skills

This extends the existing localhost prototype. It does not add a backend, durable storage, or a real evaluation engine. New sheets, uploaded files and invocation history live only in the current page session. The editor labels this limitation explicitly.

## User flow

1. In **交付**, choose **创建数据单**. Enter sheet name, customer, target and optional description/logo.
2. **List 与 Tag** accepts pasted lines or a ZIP directory. Inspect linked/unlinked entries, add Tags with preset/custom colors, and assign one Tag per entry.
3. **审核 Skill** supports searching and selecting existing platform Skills by name, slash command or description, as well as uploading multiple Markdown files or ZIP packages containing `SKILL.md`. Choices and uploads share a 12-Skill limit. Each selected Skill has an editable slash-command name and an inert content preview.
4. Save. The sheet shows its actual linked fixture Items, clear unlinked entries, color filters and bound command names. The header's **编辑数据单** opens the same editor; the duplicate 编辑配置 link was removed.
5. In a related Item's delivery detail or the review queue, type `/3d trajectory` plus optional requirements, or choose a bound Skill and invoke it. The session records the loaded instructions, source sheet, Item and Run. It never assigns a score or changes review status.

## File and binding rules

- Logo: PNG/JPEG/WebP, 2 MB, decoded image validation; no SVG execution.
- List ZIP: 20 MB compressed, at most 1,000 directory records and 100 MB declared expanded bytes. Up to 500 usable list entries. Directory names are previewed; archive files are not executed. Hidden metadata is ignored. ZIP64, split, encrypted, traversal and symlink entries are rejected. CRC verification is not implemented.
- Text List: one name/Item ID per line, duplicate lines removed, up to 500 entries and 300 characters per entry. Exact matching uses the current fixture Item catalog; unknown entries remain unlinked, not fabricated production Items. ZIP filenames can match a known Item basename.
- Skills: at most 12, 512 KB per Markdown document, 20 MB per ZIP. ZIP Skill content supports Stored and Deflate compression with streaming size bounds. Read only `SKILL.md`; do not run bundled scripts. Single-line YAML `name`/`description` is supported; other content remains original text.
- Search catalog: `platformSkillCatalog()` currently supplies three clearly labelled platform examples unless `props.platformSkills` supplies a replacement catalog (an empty array means an empty platform catalog). This is not connected to the original Forge backend. Personal Skills are restricted to the current account; other sheet Skills come only from `profileDeliveryTasks()`. These are prototype visibility rules, not a replacement for server-side authorization.
- Selecting an existing Skill creates an independent content/version snapshot with `libraryKey` provenance. Duplicate commands receive an explicit editable suffix, while exact same-content/same-command uploads appear selected. Cancelling the editor does not save bindings or mutate source Skills. File loading locks selection/removal/command edits to preserve capacity and uniqueness.
- Commands support Chinese/Latin letters, digits, spaces, hyphens and underscores. Same-sheet duplicates are rejected. Cross-sheet duplicates require explicit source selection in global review.
- Saving is gated by required basics, file loading, List errors and invalid/duplicate commands. Invalid optional Logo/Skill files are rejected with visible alerts, but do not prevent saving other valid configuration.
- Review sessions are isolated by sheet/global scope, Run and Item. Invocation snapshots preserve original instructions, even after the sheet changes.
- Tags are manual classification, not review decisions. Changing Tags alone preserves existing seed-sheet aggregate metrics.

## Source and rebuild

Edit `scripts/templates/delivery-{editor,sheet-extras}.html`, `review-skills.html`, `delivery-workflows.css`, and `delivery-methods.js` with `apply_patch`. `public/forge.html` is a bundled JSON template.

For the searchable Skill extension, also maintain `scripts/templates/delivery-skill-library.js` and run `node scripts/add-delivery-skill-library.mjs`. This focused, idempotent generator updates only the editor, its styles and delivery methods; it preserves current review, history, sidebar and profile changes. Run `node --test scripts/test-delivery-skill-library.mjs` for search, visibility, multi-selection, snapshot isolation, command conflicts, shared capacity, upload cancellation and review invocation checks.

For the current searchable-Skill change, use the focused builder below. Do not replay older migration scripts over later sidebar/review/feedback refinements:

```sh
node scripts/add-delivery-skill-library.mjs
node --test scripts/test-*.mjs
npm run build
```

The installer is repeatable. JavaScript block replacements must use function replacers: source regex literals contain `$` sequences that string replacement would interpolate.

## Verification

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
