# Review feedback and independent branches

This is a local extension of Forge's existing workbench, not a global redesign.

- `review-workbench.html`: right-panel rework editor. The original information view is hidden while composing feedback. Fixed footer has cancel and submit, with no secondary confirmation overlay.
- `branch-dialog.html`: screenshot-aligned source-version dialog, using native `dialog.showModal()` for focus containment, Escape and background inertness. Source metadata remains immutable; optional Pipeline, Dataset and Item controls depend on each other.
- `feedback-methods.js`: shared file/paste handling, validation, source-aware rework submission, branch submission and duplicate-submit protection.
- `feedback-workflows.css`: scoped form and dialog styling, desktop and narrow-screen variants, explicit disabled/error/focus states. Inherit Forge's existing sans-serif and Phosphor Regular icon language. No additional motion or UI dependency.

Branch/delivery-submit buttons now share the global accent and disabled tokens introduced by the user's compact-style refinement. See `STYLE-SYSTEM.md`; white button text and secondary text meet 4.5:1 contrast. Source data and submission behavior are unchanged.
- `implement-feedback-workflows.mjs`: idempotent migration/rebuilder for the bundled `scripts/templates/forge-base.html`. Also reuses the rework form in delivery details and removes that entry's previous overlay. Run it after editing these templates.

Images: PNG/JPEG/WebP/GIF only, at most six per draft, at most 10 MB each; asynchronously read and decoded before submission. Loading placeholders reserve slots; removal/cancellation cannot resurrect an in-flight image. Plain text paste retains native behavior. Clipboard file paste is scoped to the active branch/rework editor. Attachments include name, MIME type, size and image data in the resulting local task record.

This app is an in-memory local prototype. Files are not uploaded to a server; tasks and attachment data do not survive a full page refresh. No backend persistence or real production worker is implied. Real preview assets are absent from the current fixtures, so the source preview uses a labeled empty state rather than an invented model image.

Verification: `node --test scripts/test-feedback-workflows.mjs scripts/test-review-workbench.mjs scripts/test-reroll-flow.mjs scripts/test-sidebar-navigation.mjs scripts/test-phosphor-icons.mjs`. Image handling has asynchronous unit coverage; DOM and visual checks cover the actual right-panel forms, native branch dialog, required/disabled states, configuration dependencies and Escape.
