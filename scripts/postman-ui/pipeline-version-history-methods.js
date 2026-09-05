  // pm-pipeline-version-history:start
  pmPipelineVersionValues() {
    const selected=this.state.pmPipelineVersion;
    if(!selected)return {open:false};
    const pipe=this.pipeData().find(value=>value.name===selected.key);
    const history=pipe && this.pmPipelineHistory(pipe).find(value=>value[0]===selected.version);
    if(!pipe || !history)return {open:false};
    const current=pipe.version===selected.version;
    const snapshot=current?pipe:this.state.pmPipelineVersions?.[selected.key]?.[selected.version] || null;
    const configs=this.props.pipelineConfigs?.[selected.key]?.[selected.version] || snapshot?.nodeConfigs || {};
    const nodes=(snapshot?.dag || []).map((definition,index)=>{
      const [name,kind]=definition.split('/');
      const hasConfig=Object.prototype.hasOwnProperty.call(configs,name);
      return {position:index+1,name,kind:kind || 'FUNCTION',enabled:snapshot?.enabledNodes?.[name]!==false,
        status:snapshot?.enabledNodes?.[name]===false?'已停用':'已启用',hasConfig,config:hasConfig?JSON.stringify(configs[name],null,2):''};
    });
    return {open:true,name:snapshot?.displayName || pipe.displayName || pipe.name,key:selected.key,version:selected.version,
      current,status:current?'当前版本':'历史版本 · 只读',when:history[2],change:history[1],hasSnapshot:!!snapshot,missingSnapshot:!snapshot,
      nodeCount:nodes.length,nodeCountLabel:nodes.length+' 个流程阶段',nodes,
      close:event=>this.pmClosePipelineVersion(event),cancel:event=>{event?.preventDefault();this.pmClosePipelineVersion(event);}};
  }
  pmOpenPipelineVersion(key,version,event) {
    event?.stopPropagation();
    const pipe=this.pipeData().find(value=>value.name===key);
    if(!pipe || !this.pmPipelineHistory(pipe).some(value=>value[0]===version))return;
    this._pmPipelineVersionTrigger=event?.currentTarget || null;
    this.setState({pmPipelineVersion:{key,version}});
    setTimeout(()=>{
      if(typeof document==='undefined' || this.state.pmPipelineVersion?.key!==key || this.state.pmPipelineVersion?.version!==version)return;
      const dialog=document.getElementById('pm-pipeline-version-dialog');
      if(dialog && !dialog.open)dialog.showModal();
    },0);
  }
  pmClosePipelineVersion(event) {
    event?.preventDefault();
    if(typeof document!=='undefined')document.getElementById('pm-pipeline-version-dialog')?.close();
    this.setState({pmPipelineVersion:null});
    if(typeof document!=='undefined' && this._pmPipelineVersionTrigger?.isConnected)this._pmPipelineVersionTrigger.focus({preventScroll:true});
  }
  // pm-pipeline-version-history:end
