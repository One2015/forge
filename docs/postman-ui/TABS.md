# Shared tab tiers

`installTabs` annotates existing tab/filter groups without changing routes, event handlers, selection values, or permissions. `tabs.css` is the final presentation layer, replacing inconsistent per-page selected borders and backgrounds.

- Primary: 46px height, 13px label, orange 2px underline, neutral text and transparent selected background. Used by production navigation, review status, billing dimensions, delivery editor, profile, and task-link section tabs.
- Secondary: 32px height, 6px radius, neutral gray selected fill, no outline or shadow. Used by run status, delivery category and item status filters, Pipeline/dataset filters, Skill categories, source modes, and billing chart controls.
- Groups stay on one line, scroll horizontally if needed, and retain visible keyboard focus. Touch controls have a 44px target.
- Embedded artifact viewer switches and workflow progress indicators retain their own components.

Selection supports the existing aria-pressed, aria-selected, aria-current, data-active, and data-motion-selected attributes. Decorative legacy moving selection backgrounds are suppressed so they cannot cover labels or override the shared state styling.
