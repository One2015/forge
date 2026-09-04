# Delivery preview mock

The Item top bar contains the back action, Preview / 文件 switch and descriptive
↑ / ↓ / Esc keyboard guidance. The repeated case title and position count are removed.

The exact 长城 Item `b3d81c4e77af4a5c9e2f1a6b8c0d3e5f` and Run
`20260825-034505-c19f2a` receive a local gas turbine mock manifest when no actual
manifest exists. Actual data, including an intentionally empty file list, wins.
Other Item / Run combinations remain unchanged.

The referenced copulaai.com page required Feishu login during implementation.
The supplied screenshots informed the mock; no production files were retrieved.
The preview uses local, code-drawn SVG illustrations with stage, load and zoom
controls. It is labelled as an interactive example, not a physical simulation.
Eleven files cover HTML, overview/component illustrations, report, manifest,
prompt, attempt log, workspace notes, human feedback and quality inventory.

The full-page file view offers collapsible directories, image/HTML/text viewing,
file sizes and download links. SVGs render through img; HTML retains the existing
opaque-origin sandbox. Plain text content is escaped by React.

Validation: 35 focused tests pass, including exact mock scope, actual-manifest
precedence, URL safety and unchanged business methods.
