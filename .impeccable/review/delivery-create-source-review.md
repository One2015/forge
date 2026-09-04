# Creation page · source-only finish review

Scope: the approved full-page creation extension. No browser evidence was collected; ambient browser state did not authorize screenshots, DOM inspection or interactions.

## Initial disposition: fix

1. P1: Review navigation captured the transient `delivery-create` return view. After leaving and closing the editor, Review Back could restore a view with no content.
2. P2: the old editor-wide keyboard early return suppressed Escape dismissal of utilities/mobile navigation even though creation no longer used a modal.

## One correction batch

- Normalize creation return-state to the delivery list for clean and confirmed exits; preserve Item-specific review navigation and give its Back action the matching 返回交付 label.
- Route editor keyboard handling through a scoped helper. Creation allows Escape dismissal of sidebar utilities and temporary/mobile navigation; native editing/leave dialogs and member popovers keep priority.
- Add clean/dirty × sidebar/notification/profile Review Back cases and native-priority Escape cases in `scripts/test-delivery-create-page.mjs`.

## Verdict: ship, source scope only

The independent reviewer scored P1 and P2 resolved and reran the two targeted regressions successfully. No remaining material source finding was identified in that confirmation pass.

Owner verification: 262 tests passed; production build passed with the existing nonfatal Vinext route-classification warning. The local endpoint returned HTTP 200. Neither result validates browser rendering.

Not verified: actual sticky footer placement, responsive composition, focus movement, native dialog/popover behavior, browser `beforeunload`, computed contrast or browser file selection. No public deployment or persistent-draft capability is implied.
