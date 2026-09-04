  pmCanEditPipelineNode(key) {
    // Lead is the existing workspace administrator; owners retain their access.
    return !!this.pipeData().find(pipe=>pipe.name===key) && (this.pmOwnsPipeline(key) || ['lead','admin'].includes(this.profileIdentity().key));
  }
  pmNodeEditorSource(key,name) {
    const pipe=this.pipeData().find(pipe=>pipe.name===key);
    const declared=pipe?.dag.find(node=>node.split('/')[0]===name);
    if(!declared)return null;
    const kind=declared.split('/')[1],configs=this.props.pipelineConfigs?.[key]?.[pipe.version] || pipe.nodeConfigs || {};
    const config=configs[name] ?? this.pmDemoNodeConfig(name,kind) ?? {};
    return {pipe,configs,baseline:JSON.stringify({pipe,configs}),name,kind,on:pipe.enabledNodes?.[name]!==false,config:JSON.stringify(config,null,2),demo:configs[name]===undefined};
  }
  pmNodeEditorAllowed(key,name,actor) {
    return this.state.view==='pipeedit' && this.state.editPipe===key && this.state.editSel===name && !this.state.pmPipelineView &&
      this.profileIdentity().accountName===actor && this.pmCanEditPipelineNode(key) && !!this.pmNodeEditorSource(key,name);
  }
  pmNodeEditorValues() {
    const key=this.state.editPipe,name=this.state.editSel,actor=this.profileIdentity().accountName;
    if(!this.pmNodeEditorAllowed(key,name,actor))return {editable:false,readOnly:true};
    const source=this.pmNodeEditorSource(key,name),id=JSON.stringify([actor,key,name]);
    const draft=this.state.pmNodeEditDrafts?.[id] || {baseline:source.baseline,name,kind:source.kind,on:source.on,config:source.config,error:''};
    const dirty=draft.name!==source.name || draft.kind!==source.kind || draft.on!==source.on || draft.config!==source.config;
    const patch=changes=>{
      if(!this.pmNodeEditorAllowed(key,name,actor))return;
      const current=this.state.pmNodeEditDrafts?.[id] || draft;
      this.setState({pmNodeEditDrafts:{...this.state.pmNodeEditDrafts,[id]:{...current,...changes,error:''}}});
    };
    const reset=()=>{
      if(!this.pmNodeEditorAllowed(key,name,actor))return;
      const drafts={...this.state.pmNodeEditDrafts};delete drafts[id];this.setState({pmNodeEditDrafts:drafts});
    };
    return {editable:true,readOnly:false,...draft,demo:source.demo,dirty,cannotSave:!dirty,cannotReset:!dirty && !draft.error,
      nextVersion:'v'+(Number(source.pipe.version.replace(/\D/g,''))+1),
      onName:e=>patch({name:e.target.value}),onKind:e=>patch({kind:e.target.value}),onEnabled:e=>patch({on:e.target.checked}),onConfig:e=>patch({config:e.target.value}),
      reset,save:()=>this.pmSavePipelineNode(key,name,actor,id)};
  }
  pmSavePipelineNode(key,name,actor,id) {
    if(id!==JSON.stringify([actor,key,name]) || !this.pmNodeEditorAllowed(key,name,actor))return;
    const draft=this.state.pmNodeEditDrafts?.[id];if(!draft)return;
    const source=this.pmNodeEditorSource(key,name),pipe=source.pipe;
    const fail=error=>this.setState({pmNodeEditDrafts:{...this.state.pmNodeEditDrafts,[id]:{...draft,error}}});
    if(source.baseline!==draft.baseline)return fail('Pipeline 已更新，请重置后重新编辑此节点。');
    const nextName=draft.name.trim();
    if(!/^[a-zA-Z_][\w.-]{0,99}$/.test(nextName))return fail('节点名称需以字母或下划线开头，最多 100 字符，可包含数字、点和短横线。');
    if(pipe.dag.some(node=>node.split('/')[0]!==name && node.split('/')[0]===nextName))return fail('节点名称已存在，请使用其他名称。');
    if(!['FUNCTION','AGENT','LLM','REVIEW'].includes(draft.kind))return fail('请选择有效的节点类型。');
    if(!draft.on && !pipe.dag.some(node=>node.split('/')[0]!==name && pipe.enabledNodes?.[node.split('/')[0]]!==false))return fail('至少需要启用一个节点。');
    let config;
    try{config=JSON.parse(draft.config);if(!config || Array.isArray(config) || typeof config!=='object')throw Error();}
    catch{return fail('配置需为有效的 JSON 对象，请检查括号、引号和逗号。');}
    if(nextName===name && draft.kind===source.kind && draft.on===source.on && JSON.stringify(config)===JSON.stringify(JSON.parse(source.config))){
      const drafts={...this.state.pmNodeEditDrafts};delete drafts[id];this.setState({pmNodeEditDrafts:drafts});return;
    }
    const nodeConfigs={...source.configs},enabledNodes={...pipe.enabledNodes};delete nodeConfigs[name];delete enabledNodes[name];
    Object.defineProperty(nodeConfigs,nextName,{value:config,enumerable:true,writable:true,configurable:true});
    Object.defineProperty(enabledNodes,nextName,{value:!!draft.on,enumerable:true,writable:true,configurable:true});
    const version='v'+(Number(pipe.version.replace(/\D/g,''))+1);
    const updated={...pipe,nodeConfigs,enabledNodes,dag:pipe.dag.map(node=>node.split('/')[0]===name?nextName+'/'+draft.kind:node),version,versions:pipe.versions+1,
      history:[[version,'更新节点 '+nextName,'刚刚'],...pipe.history]};
    const drafts={...this.state.pmNodeEditDrafts};delete drafts[id];
    const editNodes=this.state.editNodes?{...this.state.editNodes}:null;
    if(editNodes){delete editNodes[name];editNodes[nextName]=!!draft.on;}
    this.setState({pmNodeEditDrafts:drafts,pmPipelineVersions:{...this.state.pmPipelineVersions,[key]:{...this.state.pmPipelineVersions?.[key],[pipe.version]:JSON.parse(JSON.stringify({...pipe,nodeConfigs:source.configs}))}},
      pmPipelineOverrides:{...this.state.pmPipelineOverrides,[key]:updated},editNodes,editSel:nextName,peToast:'节点已保存 · '+version});
  }
