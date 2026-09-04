  // pm-dataset-editor:start
  dsData() {
    return this.pmBaseDatasets().filter(ds=>!this.state.pmDeletedDatasets?.[ds.name]).map(ds=>({...ds,...this.state.pmDatasetOverrides?.[ds.name]}));
  }
  runsData() {
    return this.pmBaseDatasetRuns().map(run=>({...run,...this.state.pmDatasetRunSnapshots?.[run.id]}));
  }
  pmDatasetSnapshots(name) {
    const snapshots={...this.state.pmDatasetRunSnapshots};
    for (const run of this.runsData().filter(run=>run.dsName===name)) {
      if (snapshots[run.id]) continue;
      const meta=Array.from({length:run.n},(_,index)=>{
        const item=this.taskRunItem(run,index);
        return [item.itemId,'','','',item.name];
      });
      snapshots[run.id]={itemMeta:meta,itemIds:meta.map(item=>item[0])};
    }
    return snapshots;
  }
  pmOpenDatasetEditor(name) {
    const ds=this.dsData().find(ds=>ds.name===name);
    if(!ds)return;
    this.setState({pmDatasetEditor:{key:name,name:ds.displayName || ds.name,description:ds.description || ds.subject || '',items:ds.items.map(item=>item.slice()),query:'',error:'',confirmDelete:false,baseline:JSON.stringify(ds)}});
    setTimeout(()=>{
      if(this.state.pmDatasetEditor?.key!==name || typeof document==='undefined')return;
      const dialog=document.getElementById('pm-dataset-editor');if(dialog && !dialog.open)dialog.showModal();
    },0);
  }
  pmPatchDatasetEditor(patch,key) {
    if(this.state.pmDatasetEditor?.key===key)this.setState({pmDatasetEditor:{...this.state.pmDatasetEditor,...patch,error:''}});
  }
  pmCloseDatasetEditor() {
    if(typeof document!=='undefined')document.getElementById('pm-dataset-editor')?.close();
    this.setState({pmDatasetEditor:null});
  }
  pmSaveDatasetEditor() {
    const editor=this.state.pmDatasetEditor,ds=editor && this.dsData().find(ds=>ds.name===editor.key);
    if(!ds)return;
    const fail=error=>this.setState({pmDatasetEditor:{...editor,error}});
    if(JSON.stringify(ds)!==editor.baseline){fail('数据集已更新，请关闭后重新打开。');return;}
    const name=editor.name.trim();
    if(!name || name.length>100){fail('请填写 1–100 字的数据集名称。');return;}
    if(this.dsData().some(other=>other.name!==ds.name && (other.displayName || other.name).toLowerCase()===name.toLowerCase())){fail('名称已存在，请使用其他名称。');return;}
    if(editor.items.some(item=>!item[4].trim())){fail('请填写每个 Item 的内容，或移除空白条目。');return;}
    const removed=ds.items.length-editor.items.length;
    const patch={displayName:name,description:editor.description.trim(),items:editor.items.map(item=>item.slice()),n:Math.max(editor.items.length,ds.n-removed)};
    const snapshots=this.pmDatasetSnapshots(ds.name);
    this.setState({pmDatasetOverrides:{...this.state.pmDatasetOverrides,[ds.name]:{...this.state.pmDatasetOverrides?.[ds.name],...patch}},pmDatasetRunSnapshots:snapshots,
      picked:Object.fromEntries(Object.entries(this.state.picked || {}).filter(([id])=>editor.items.some(item=>item[0]===id)))});
    this.pmCloseDatasetEditor();
  }
  pmDeleteDataset() {
    const editor=this.state.pmDatasetEditor,ds=editor && this.dsData().find(ds=>ds.name===editor.key);
    if(!ds || !editor.confirmDelete)return;
    this.setState({pmDatasetRunSnapshots:this.pmDatasetSnapshots(ds.name),pmDeletedDatasets:{...this.state.pmDeletedDatasets,[ds.name]:true},pmDatasetUndo:{key:ds.name,name:ds.displayName || ds.name},selDs:null,dsVersion:null,picked:{},pmDatasetRunContext:null});
    this.pmCloseDatasetEditor();
  }
  pmDatasetUndoValues() {
    const undo=this.state.pmDatasetUndo;
    return {visible:!!undo,name:undo?.name || '',restore:()=>{
      if(!undo || this.state.pmDatasetUndo?.key!==undo.key)return;
      this.setState({pmDeletedDatasets:{...this.state.pmDeletedDatasets,[undo.key]:false},pmDatasetUndo:null});
    }};
  }
  pmDatasetEditorValues() {
    const editor=this.state.pmDatasetEditor;if(!editor)return {open:false};
    const patch=value=>this.pmPatchDatasetEditor(value,editor.key);
    const update=(id,index,value)=>{const current=this.state.pmDatasetEditor;if(current?.key!==editor.key)return;patch({items:current.items.map(item=>item[0]===id ? item.map((v,i)=>i===index?value:v) : item)});};
    const items=editor.items.filter(item=>item.join(' ').toLowerCase().includes(editor.query.trim().toLowerCase()));
    return {open:true,name:editor.name,key:editor.key,description:editor.description,error:editor.error,query:editor.query,count:editor.items.length,
      confirmDelete:editor.confirmDelete,editing:!editor.confirmDelete,noItems:!items.length,
      onName:e=>patch({name:e.target.value}),onDescription:e=>patch({description:e.target.value}),onQuery:e=>patch({query:e.target.value}),
      close:()=>this.pmCloseDatasetEditor(),cancel:e=>{e.preventDefault();this.pmCloseDatasetEditor();},save:()=>this.pmSaveDatasetEditor(),
      askDelete:()=>patch({confirmDelete:true}),cancelDelete:()=>patch({confirmDelete:false}),delete:()=>this.pmDeleteDataset(),
      items:items.map(item=>({id:item[0],content:item[4],subject:item[1],archetype:item[2],style:item[3],
        contentLabel:'编辑 '+item[0]+' 的内容',subjectLabel:'编辑 '+item[0]+' 的 SD',archetypeLabel:'编辑 '+item[0]+' 的 PA',styleLabel:'编辑 '+item[0]+' 的风格',removeLabel:'移除 Item '+item[0],
        onContent:e=>update(item[0],4,e.target.value),onSubject:e=>update(item[0],1,e.target.value),onArchetype:e=>update(item[0],2,e.target.value),onStyle:e=>update(item[0],3,e.target.value),
        remove:()=>{const current=this.state.pmDatasetEditor;if(current?.key===editor.key)patch({items:current.items.filter(row=>row[0]!==item[0])});}}))};
  }
  // pm-dataset-editor:end
