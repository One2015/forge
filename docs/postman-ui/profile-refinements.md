# Personal profile refinements — 2026-09-04

- Related tasks exclude `ant200` and show the current account's role for each case. Explicit membership, project ownership and assigned review/run work establish the relationship. Workspace-wide visibility alone does not imply participation.
- The Skill editor lists existing linked data sheets, including `ant200`, using actual Skill bindings and current task access. The association picker is removed from this editor.
- One **创建 Skill** dropdown contains **填写 Skill** and **上传 Skill**, using the delivery wizard's icon-and-description menu layout. File-format guidance appears only under the upload option.
- The empty Skill library uses a faint line illustration. The old general upload help and demo footer are removed.
- The call-name prefix sits inside one non-wrapping input group, with muted usage guidance next to the label. Dropdown positioning stays within the viewport; native Escape closes only the dropdown.

Skill editing now uses consistent field spacing and field-level validation. Empty
drafts show no validation errors until Save is pressed; errors appear beneath
the corresponding field, focus moves to the first invalid field, and correcting
the value removes its error. Loading and empty imports still disable Save.
Existing bindings remain independent snapshots when a personal Skill is edited.

Latest validation: the full build and all 564 tests passed. Browser checks at
800×801 and 390×844 verified prefix alignment, no horizontal overflow, initially
quiet validation, submit/focus behavior and error recovery. The layout scan
reported no findings but used its limited regex fallback; rendered checks supplied
the layout evidence. The isolated QA tab and viewport override were discarded.

Validation: 90 automated tests passed across `test-postman-ui.mjs`, `test-profile-workspace.mjs` and `test-profile-refinements.mjs`. The adapter build passed. Browser checks at 919×801 and 390×844 verified the loaded illustration, single dropdown, form creation, MD upload, saving, editing, no horizontal profile overflow and Escape dismissal. QA used an isolated browser tab; its data and viewport override were discarded afterward.

## Illustration provenance

Created with built-in `image_gen`; saved to `public/postman-ui/illustrations/skill-library-empty.png`.

Final prompt:

> Replace the visual style of this Skill library empty-state asset with a very faint flat 2D line illustration. Draw a simple open folder with two sheets of instructions, tiny pale peach bookmark and small outlined plus. White #ffffff background. Restrained delicate flat vector-like editorial line art, thin pale gray #d9dde1 outlines, almost-white #f7f8fa fills, tiny extremely pale peach #f8e6dc accent only. Very low contrast and airy. No 3D, no photorealism, no texture, no perspective volume, no drop shadows, no saturated orange, no black outlines, no text, no letters, no watermarks. Centered small coherent illustration in the middle 65% of a square with generous white space. Suitable at 150px inside a compact professional software empty state. The attached image is the rejected old asset: preserve only the folder/papers subject; completely replace its heavy realistic style with the very light flat outline style requested.
