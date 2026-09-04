# Pipeline editor responsive layout

The shared editor now groups identity, actions and execution configuration.
Above 1000px of editor width, identity and actions share a row; below it, actions
move to their own row. This responds to sidebar width as well as viewport width.

The node graph retains horizontal scrolling inside a focusable canvas. Zoom
controls sit outside that scroll area. Desktop node details have their own bounded
scroll region; at 600px and below, details flow below a 360px graph workspace.
Mobile actions reflow into three secondary controls and a full-width run button.
Dataset menus stay within the editor width, and long names wrap on mobile.

Implementation: `pipeline-responsive.mjs` changes markup only, retaining all
existing data and event handlers; `pipeline-responsive.css` owns the scoped rules.
Validation covered desktop, 768px and 390px widths, dataset menu opening, node
selection, and the existing 20-test generator/business behavior suite.

The provided `.copy` URL was unavailable in a fresh browser session. Validation
used `web3d-ant-delivery-v1/edit`, which renders the same shared editor.
