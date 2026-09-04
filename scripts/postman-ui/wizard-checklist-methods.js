  // pm-wizard-checklist:start
  pmWizardCandidates(editor=this.state.deliveryEditor) {
    if(!editor)return [];
    const active=new Map(editor.entries.map(row=>[row.key,row]));
    const remembered=new Map((editor.pmWizardPool || []).map(row=>[row.key,row]));
    let pool=editor.pmWizardPool || editor.entries;
    if(editor.importMode==='production') {
      const seen=new Map();
      this.deliveryProductionTasks().filter(task=>(editor.productionTaskIds || []).includes(task.id)).forEach(task=>task.entries.forEach(row=>{
        if(seen.has(row.key))seen.get(row.key).sourceRefs.push(...row.sourceRefs);
        else seen.set(row.key,{...row,...remembered.get(row.key),sourceRefs:row.sourceRefs.slice()});
      }));
      pool=[...seen.values()];
    }
    return pool.map(row=>({...row,...active.get(row.key)}));
  }
  pmSelectWizardEntry(key,checked,id) {
    const editor=this.state.deliveryEditor;
    if(!editor || editor.id!==id || editor.key || editor.listLoading)return;
    const pool=this.pmWizardCandidates(editor);if(!pool.some(row=>row.key===key))return;
    const selected=new Set(editor.entries.map(row=>row.key));if(checked)selected.add(key);else selected.delete(key);
    const rows=pool.filter(row=>selected.has(row.key));
    const entries=editor.importMode==='production'?rows:this.parseDeliveryWizardLines(rows.map(row=>row.source),rows).map((row,index)=>({...rows[index],...row,key:rows[index].key}));
    this.patchDeliveryEditor({pmWizardPool:pool,entries,productionExcluded:editor.importMode==='production'?pool.filter(row=>!selected.has(row.key)).map(row=>row.itemId):editor.productionExcluded,listText:entries.map(row=>row.source).join('\n'),listChanged:true,error:''},id);
  }
  pmWizardEntryTag(key,tagId,id) {
    const editor=this.state.deliveryEditor;if(!editor || editor.id!==id || editor.listLoading)return;
    const update=row=>row.key===key?{...row,tagId}:row;
    this.patchDeliveryEditor({pmWizardPool:this.pmWizardCandidates(editor).map(update),entries:editor.entries.map(update)},id);
  }
  // pm-wizard-checklist:end
