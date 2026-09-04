# Progress indicators

The standalone preview shares `public/postman-ui/progress-indicators.css` across delivery creation, run setup, and branch stages. `scripts/postman-ui/progress-indicators.mjs` adapts their markup without changing workflow gates, status calculations, or callbacks.

- Nodes: 28px (24px on small screens); branch stages use a compact 22px node.
- Current: Forge orange node and stronger label. Branch failure/deliverable stages retain their existing semantic status color.
- Complete: neutral filled node with the existing check icon.
- Future: neutral outlined node; unavailable wizard steps remain disabled.
- Connectors: thin neutral lines between nodes, absent after the last step.
- Delivery wizard no longer shows a duplicate percentage bar.
- Run setup keeps selected values and the accessible change-Pipeline action.
- Quantitative delivery/run bars retain their segment values and semantic colors, sharing a 4px track and 2px radius.

Delivery edit tabs remain tabs: they are independent configuration sections, not sequential completion steps.
