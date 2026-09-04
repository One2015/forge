# Shared tab tiers

`installTabs` annotates existing tab/filter groups without changing routes, event handlers, selection values, or permissions. `tabs.css` is the final presentation layer, replacing inconsistent per-page selected borders and backgrounds.

- Primary: 46px height, 13px label, orange 2px underline, neutral text and transparent selected background. Used by production navigation, review status, billing dimensions, delivery editor, profile, and task-link section tabs.
- Secondary: 32px height, 6px radius, neutral gray selected fill, no outline or shadow. Used by run status, delivery category and item status filters, Pipeline/dataset filters, Skill categories, source modes, and billing chart controls.
- Groups stay on one line, scroll horizontally if needed, and retain visible keyboard focus. Touch controls have a 44px target.
- Embedded artifact viewer switches and workflow progress indicators retain their own components.

Selection supports the existing aria-pressed, aria-selected, aria-current, data-active, and data-motion-selected attributes. A single clipped background follows the selected tab, inspired by [Transitions.dev Tabs sliding](https://transitions.dev/detail.html?t=tabs-sliding): 250ms with cubic-bezier(.22,1,.36,1). Primary tabs move the orange underline; secondary tabs move the neutral fill. Labels stay above the indicator, and the existing content update remains immediate.

The shared surface runtime also handles the Preview / Files switch. It reads actual control dimensions, including the scrollable strip and changing counts. Initial placement, window/container resizing, keyboard navigation and reduced-motion selection update immediately. CSS transitions retarget from the current visual position during rapid pointer switching; no duplicated interactive tabs, new dependencies or delayed callbacks are added.
