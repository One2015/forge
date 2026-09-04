# Personal profile refinements — 2026-09-04

- Related tasks exclude `ant200` and show the current account's role for each case. Explicit membership, project ownership and assigned review/run work establish the relationship. Workspace-wide visibility alone does not imply participation.
- Existing Skill bindings and allowed association targets remain available, including bindings on `ant200`.
- One **创建 Skill** dropdown contains **填写 Skill** and **上传 Skill**, using the delivery wizard's icon-and-description menu layout. File-format guidance appears only under the upload option.
- The empty Skill library uses a faint line illustration. The old general upload help and demo footer are removed.
- The profile's native select stays on one line on narrow screens. Dropdown positioning stays within the viewport; native Escape closes only the dropdown.

Validation: 90 automated tests passed across `test-postman-ui.mjs`, `test-profile-workspace.mjs` and `test-profile-refinements.mjs`. The adapter build passed. Browser checks at 919×801 and 390×844 verified the loaded illustration, single dropdown, form creation, MD upload, saving, editing, no horizontal profile overflow and Escape dismissal. QA used an isolated browser tab; its data and viewport override were discarded afterward.

## Illustration provenance

Created with built-in `image_gen`; saved to `public/postman-ui/illustrations/skill-library-empty.png`.

Final prompt:

> Replace the visual style of this Skill library empty-state asset with a very faint flat 2D line illustration. Draw a simple open folder with two sheets of instructions, tiny pale peach bookmark and small outlined plus. White #ffffff background. Restrained delicate flat vector-like editorial line art, thin pale gray #d9dde1 outlines, almost-white #f7f8fa fills, tiny extremely pale peach #f8e6dc accent only. Very low contrast and airy. No 3D, no photorealism, no texture, no perspective volume, no drop shadows, no saturated orange, no black outlines, no text, no letters, no watermarks. Centered small coherent illustration in the middle 65% of a square with generous white space. Suitable at 150px inside a compact professional software empty state. The attached image is the rejected old asset: preserve only the folder/papers subject; completely replace its heavy realistic style with the very light flat outline style requested.
