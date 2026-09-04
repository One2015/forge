  // artifact-preview:start
  artifactPreviewData(itemId, runId, name, is3D, request = null) {
    const run = this.runsData().find(record => record.id === runId);
    // Exact Item + Run manifest only. Never reuse another Item's files from a
    // batch, or infer a model URL from an old placeholder preview endpoint.
    const manifest = this.props.artifacts?.[itemId]?.[runId] || run?.artifactsByItem?.[itemId];
    const files = Array.isArray(manifest?.files) ? manifest.files : [];
    return JSON.stringify({ itemId, runId: runId || '', name, is3D: !!is3D, files, request });
  }
  // artifact-preview:end
