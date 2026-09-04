  // pm-list-association:start
  pmListAssociation() {
    const editor = this.state.deliveryEditor;
    if (!editor) return {};
    const tasks = this.deliveryProductionTasks(), ids = editor.productionTaskIds || [], id = editor.id;
    return {
      available: tasks.filter(task => !ids.includes(task.id)).map(task => ({ ...task,
        label: task.pipeline + ' × ' + task.dataset + ' · ' + task.id })),
      selected: ids.map(key => {
        const task = tasks.find(value => value.id === key);
        return { id: key, label: task ? task.pipeline + ' × ' + task.dataset : key,
          removeLabel: '取消关联 ' + key,
          remove: () => { if (this.state.deliveryEditor?.id === id) this.syncDeliveryProductionTasks((this.state.deliveryEditor.productionTaskIds || []).filter(value => value !== key), id); } };
      }),
      hasSelected: !!ids.length, empty: !editor.entries.length,
      pick: event => {
        const key = event.target.value;
        if (this.state.deliveryEditor?.id !== id || !tasks.some(task => task.id === key && !task.disabled)) return;
        this.syncDeliveryProductionTasks((this.state.deliveryEditor.productionTaskIds || []).concat(key), id);
      }
    };
  }

  pmListEntries(editor) {
    const sheet = editor.key ? this.deliverySheet(editor.key) : null;
    const rows = new Map(this.sheetRows(sheet).map(row => [row[2], row]));
    const runs = new Map(this.runsData().map(run => [run.id, run]));
    return editor.entries.map(entry => {
      let status = rows.get(entry.itemId)?.[6]?.technicalStatus;
      const runId = entry.sourceRunId || entry.sourceRefs?.[0]?.runId;
      if (runId) {
        const run = runs.get(runId);
        const index = run ? Array.from({length:run.n}, (_,i)=>i).find(i=>this.taskRunItem(run,i).itemId === entry.itemId) : undefined;
        status = index === undefined ? '' : this.state.runItemTech?.[runId + ':' + index]?.status
          || (index < run.done ? 'success' : index < run.done + run.running ? 'running' : index < run.done + run.running + run.failed ? 'failed' : 'queued');
      }
      const runState = !entry.itemId ? 'unlinked' : ({success:'ready',ready:'ready',failed:'fail',running:'running',queued:'queued'})[status] || 'unknown';
      return {...entry, linkedId: entry.itemId || '未关联 Item', runState,
        runLabel: ({ready:'ready',fail:'fail',running:'running',queued:'queued',unlinked:'未关联',unknown:'暂无运行'})[runState]};
    });
  }
  // pm-list-association:end
