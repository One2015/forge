  // pm-pipeline-owner:start
  pipeData() {
    return this.pmBasePipelines().filter(p=>!this.state.pmDeletedPipelines?.[p.name]).map(p=>({...p,...this.state.pmPipelineOverrides?.[p.name]}));
  }
  pmOwnsPipeline(key) {
    const pipe=this.pipeData().find(p=>p.name===key);
    return !!pipe && pipe.owner===this.profileIdentity().accountName;
  }
  pmOpenPipelineEditor(key) {
    const pipe=this.pipeData().find(p=>p.name===key);
    if(!pipe || !this.pmOwnsPipeline(key))return;
    const configs=this.props.pipelineConfigs?.[key]?.[pipe.version] || pipe.nodeConfigs || {};
    this.setState({pmPipelineEditor:{key,actor:this.profileIdentity().accountName,baseline:JSON.stringify(pipe),name:pipe.displayName || pipe.name,description:pipe.description || '',error:'',confirmDelete:false,
      nodes:pipe.dag.map((d,index)=>{const [name,kind]=d.split('/');return {id:index,name,kind,config:JSON.stringify(configs[name] || {},null,2),on:pipe.enabledNodes?.[name]!==false};}),nextId:pipe.dag.length}});
    setTimeout(()=>{if(this.state.pmPipelineEditor?.key!==key || typeof document==='undefined')return;const dialog=document.getElementById('pm-pipeline-owner-editor');if(dialog && !dialog.open)dialog.showModal();},0);
  }
  pmPipelineDraftAllowed(key,actor) {
    return this.state.pmPipelineEditor?.key===key && this.state.pmPipelineEditor.actor===actor && this.profileIdentity().accountName===actor && this.pmOwnsPipeline(key);
  }
  pmPatchPipelineEditor(patch,key,actor) {
    if(this.pmPipelineDraftAllowed(key,actor))this.setState({pmPipelineEditor:{...this.state.pmPipelineEditor,...patch,error:''}});
  }
  pmClosePipelineEditor() {
    if(typeof document!=='undefined')document.getElementById('pm-pipeline-owner-editor')?.close();
    this.setState({pmPipelineEditor:null});
  }
  pmCommitPipeline(key,patch,baseline) {
    const pipe=this.pipeData().find(p=>p.name===key);
    if(!pipe || !this.pmOwnsPipeline(key) || (baseline && JSON.stringify(pipe)!==baseline))return false;
    const version='v'+(Number(pipe.version.replace(/\D/g,''))+1);
    const previous={...this.state.pmPipelineVersions,[key]:{...this.state.pmPipelineVersions?.[key],[pipe.version]:JSON.parse(JSON.stringify(pipe))}};
    const updated={...pipe,...patch,version,versions:pipe.versions+1,history:[[version,'更新 Pipeline 配置','刚刚'],...pipe.history]};
    this.setState({pmPipelineVersions:previous,pmPipelineOverrides:{...this.state.pmPipelineOverrides,[key]:updated},editNodes:null,editSaved:true,peToast:'已保存 '+version});
    return true;
  }
  pmSavePipelineEditor(key,actor) {
    if(!this.pmPipelineDraftAllowed(key,actor))return;
    const draft=this.state.pmPipelineEditor;
    const fail=error=>this.setState({pmPipelineEditor:{...draft,error}});
    const name=draft.name.trim();
    if(!name || name.length>100)return fail('请填写 1–100 字的 Pipeline 名称。');
    if(this.pipeData().some(p=>p.name!==key && (p.displayName || p.name).toLowerCase()===name.toLowerCase()))return fail('名称已存在，请使用其他名称。');
    if(!draft.nodes.length || !draft.nodes.some(n=>n.on))return fail('至少保留并启用一个节点。');
    const names=new Set(),configs={},enabled={};
    for(const node of draft.nodes){
      if(!/^[a-zA-Z_][\w.-]*$/.test(node.name) || names.has(node.name))return fail('节点名称需唯一，使用字母、数字、下划线、点或短横线，并以字母或下划线开头。');
      if(!['FUNCTION','AGENT','LLM','REVIEW'].includes(node.kind))return fail('请选择有效节点类型。');
      names.add(node.name);enabled[node.name]=node.on;
      try{const config=JSON.parse(node.config);if(!config || Array.isArray(config) || typeof config!=='object')throw Error();configs[node.name]=config;}catch{return fail('节点 '+node.name+' 的配置需为有效 JSON 对象。');}
    }
    if(!this.pmCommitPipeline(key,{displayName:name,description:draft.description.trim(),dag:draft.nodes.map(n=>n.name+'/'+n.kind),nodes:draft.nodes.length,nodeConfigs:configs,enabledNodes:enabled},draft.baseline))return fail('Pipeline 已更新，请关闭后重新编辑。');
    this.setState({editSel:null});this.pmClosePipelineEditor();
  }
  pmDeleteOwnedPipeline(key,actor,confirmed) {
    if(!confirmed || actor!==this.profileIdentity().accountName || !this.pmOwnsPipeline(key))return;
    const pipe=this.pipeData().find(p=>p.name===key);
    this.setState({pmPipelineVersions:{...this.state.pmPipelineVersions,[key]:{...this.state.pmPipelineVersions?.[key],[pipe.version]:JSON.parse(JSON.stringify(pipe))}},pmDeletedPipelines:{...this.state.pmDeletedPipelines,[key]:true},view:'pipelines',openPipe:null,editPipe:null,editNodes:null,editSel:null,peDelete:false,peToast:'',runPipeline:'',runPipelineVersion:'',picked:{},pmDatasetRunContext:null});
    this.pmClosePipelineEditor();
  }
  pmPipelineEditorActions(values) {
    const key=this.state.editPipe,actor=this.profileIdentity().accountName;
    const allowed=()=>this.state.editPipe===key && !this.state.pmPipelineView && this.profileIdentity().accountName===actor && this.pmOwnsPipeline(key);
    const pipe=this.pipeData().find(p=>p.name===key);
    return {...values,name:pipe?.displayName || values.name,
      editConfig:()=>{if(allowed())this.pmOpenPipelineEditor(key);},
      save:()=>{if(!allowed())return;const enabled=this.state.editNodes || pipe.enabledNodes || {};if(!pipe.dag.some(d=>enabled[d.split('/')[0]]!==false)){this.setState({peToast:'至少启用一个节点。'});return;}this.pmCommitPipeline(key,{enabledNodes:{...enabled}},JSON.stringify(pipe));},
      doDelete:()=>{if(allowed())this.pmDeleteOwnedPipeline(key,actor,!!this.state.peDelete);}
    };
  }
  pmPipelineEditorValues() {
    const draft=this.state.pmPipelineEditor;if(!draft)return {open:false};
    const {key,actor}=draft,patch=p=>this.pmPatchPipelineEditor(p,key,actor);
    const update=(id,changes)=>{const current=this.state.pmPipelineEditor;if(this.pmPipelineDraftAllowed(key,actor))patch({nodes:current.nodes.map(n=>n.id===id?{...n,...changes}:n)});};
    return {open:true,name:draft.name,key,description:draft.description,error:draft.error,editing:!draft.confirmDelete,confirmDelete:draft.confirmDelete,
      onName:e=>patch({name:e.target.value}),onDescription:e=>patch({description:e.target.value}),
      close:()=>this.pmClosePipelineEditor(),cancel:e=>{e.preventDefault();this.pmClosePipelineEditor();},save:()=>this.pmSavePipelineEditor(key,actor),
      askDelete:()=>patch({confirmDelete:true}),cancelDelete:()=>patch({confirmDelete:false}),delete:()=>{if(this.pmPipelineDraftAllowed(key,actor))this.pmDeleteOwnedPipeline(key,actor,this.state.pmPipelineEditor.confirmDelete);},
      add:()=>{const current=this.state.pmPipelineEditor;if(!this.pmPipelineDraftAllowed(key,actor))return;patch({nodes:[...current.nodes,{id:current.nextId,name:'node_'+current.nextId,kind:'FUNCTION',config:'{}',on:true}],nextId:current.nextId+1});},
      nodes:draft.nodes.map((n,i)=>({...n,position:i+1,first:i===0,last:i===draft.nodes.length-1,
        nameLabel:'节点 '+(i+1)+' 名称',kindLabel:'节点 '+(i+1)+' 类型',configLabel:'节点 '+(i+1)+' 配置',
        onName:e=>update(n.id,{name:e.target.value}),onKind:e=>update(n.id,{kind:e.target.value}),onConfig:e=>update(n.id,{config:e.target.value}),onEnabled:e=>update(n.id,{on:e.target.checked}),
        remove:()=>{if(this.pmPipelineDraftAllowed(key,actor))patch({nodes:this.state.pmPipelineEditor.nodes.filter(v=>v.id!==n.id)});},
        up:()=>{if(!this.pmPipelineDraftAllowed(key,actor))return;const nodes=[...this.state.pmPipelineEditor.nodes],index=nodes.findIndex(v=>v.id===n.id);if(index>0){[nodes[index-1],nodes[index]]=[nodes[index],nodes[index-1]];patch({nodes});}},
        down:()=>{if(!this.pmPipelineDraftAllowed(key,actor))return;const nodes=[...this.state.pmPipelineEditor.nodes],index=nodes.findIndex(v=>v.id===n.id);if(index>=0 && index<nodes.length-1){[nodes[index+1],nodes[index]]=[nodes[index],nodes[index+1]];patch({nodes});}}
      }))};
  }
  // pm-pipeline-owner:end
