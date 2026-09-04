# Delivery creation without saved drafts

The Postman preview removes the delivery draft list, persistence methods, startup
reads, restore links, and save controls via `remove-delivery-drafts.mjs`. Existing
IndexedDB records are left untouched. Legacy `?draft=...` links open the ordinary
new-delivery form and no longer restore stored data.

Creation stays in memory until submitted. The dirty-form signature, navigation
confirmation and before-unload guard remain, with form-oriented method names.
Skill creation's unfinished inputs and review rework forms are separate features.

Validation: `node --test scripts/test-postman-ui.mjs` covers removal, old-link
normalization, keep/discard behavior, and normal creation and edit submissions.
