# Item evidence explorer

The Item lifecycle page retains its history view and adds Pipeline, files, Prompt,
and execution trace tabs. `?tab=pipeline|files|prompt|trace` retains the chosen view
when reloading or sharing the current Item + Run URL. Per-item file selection,
search and selected node remain separate from the lifecycle history state.

## Data contract

- Exact `props.artifacts[itemId][runId]` or `run.artifactsByItem[itemId]` owns files.
  Files accept `name`, optional HTTP(S) `url`, and optional plain-text `content`.
  Text is escaped through the existing template runtime; images use their URL.
- `props.itemExecution[itemId][runId]` or `manifest.execution` owns `pipeline`,
  `nodes`, `prompts` and `events`.
- A pipeline snapshot has `name`, `version`, `dag` and optional `nodeConfigs`.
  Nodes accept `config`, `attempts` and `result`; prompts accept `label`, `node`
  and `content`; events accept `time`, `label`, `node` and `detail`.
- `props.pipelineConfigs[pipelineName][version][nodeName]` supplies editor config.
  A run's node configuration takes precedence over current pipeline config.
- Without a run snapshot, the same current version may show its definition with
  the version matched to the run. A version mismatch
  shows an empty state instead of substituting the latest definition.

## Mock coverage

The named 长城 Item and run `20260825-034505-c19f2a` have a local mock
fixture: four text files, two prompts, four events and six nodes matching the
existing pipeline DAG. There are no fabricated downloadable GLB/HTML artifacts.
Any actual manifest or explicit execution record suppresses the mock fixture.
Other Item/Run pairs do not inherit it. The editor uses marked mock config fields
when the prototype lacks detailed configuration; supplied versioned data wins.

## Validation

24 tests cover unchanged business behavior, Item/Run isolation, real-data
precedence, unsafe URL rejection, pipeline version config precedence, view links
and file/node switching. Browser verification covered all tabs, node selection,
the editor's config inspector, and mobile file layout without page overflow.

## Pipeline feedback refinement

- Item pages reserve the vertical scrollbar gutter across every tab. Only the graph scrolls horizontally.
- The Pipeline panel header owns the linked name/version and Run ID. The redundant Mock badge/header are removed; fixture provenance remains in the source and sample file contents.
- Node types use compact outlined tags with distinct symbols and bilingual labels. Node detail headings opt out of automatic section permalinks.
- `/production/pipelines/:name/view` provides node inspection without editing controls. Lead and Project Owner also get an explicit editor link. Member, Outsourcing and unknown roles remain read-only even on `/edit`.
- Editor callbacks re-check the role and view mode before changing nodes, dataset selection, saving, deleting or starting a run. This is the prototype UI guard; any future server endpoints must enforce their own authorization.
- The view route stays read-only for privileged roles too. Role revocation is checked when a retained callback executes.
