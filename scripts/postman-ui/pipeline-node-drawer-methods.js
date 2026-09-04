  // pm-pipeline-node-drawer:start
  pmPipelineNodeDrawer(values) {
    const key=this.state.editPipe+'@'+values.version;
    if(values.hasSel)this._pmNodeDrawerCache={key,sel:values.sel,nodeDetail:values.nodeDetail};
    const cached=this._pmNodeDrawerCache?.key===key?this._pmNodeDrawerCache:null;
    const canEditNode=!this.state.pmPipelineView && this.pmCanEditPipelineNode(this.state.editPipe);
    const failures=this.pmPipelineNodeFailures(this.state.editPipe);
    return {...values,drawerMounted:!!cached,drawerOpen:values.hasSel,drawerHidden:!values.hasSel,drawerInert:values.hasSel?null:'inert',
      ...this.pmNodeFailureValues(failures,values.sel?.name),
      nodeEditor:this.pmNodeEditorValues(),showModeLabel:canEditNode,modeLabel:canEditNode && !values.canEdit?'节点编辑':values.modeLabel,
      drawerMotion:this.state.pmNodeDrawerKeyboard?'instant':'slide',
      sel:cached?.sel || values.sel,nodeDetail:cached?.nodeDetail || values.nodeDetail,
      nodes:values.nodes.map(node=>{const errors=failures.filter(failure=>failure.node===node.name),failed=errors.length>0;return {...node,failed,note:failed?(errors.every(error=>error.demo)?'失败 · 示例':'失败'):node.note,count:failed?errors.length+' 条失败记录':node.count,
        actionLabel:(canEditNode?'编辑节点 ':'查看节点 ')+node.name+(failed?' · 失败':''),selected:this.state.editSel===node.name,select:event=>this.pmOpenNodeDrawer(node.name,event),keySelect:event=>{if(event.target===event.currentTarget && ['Enter',' '].includes(event.key)){event.preventDefault();this.pmOpenNodeDrawer(node.name,{detail:0,currentTarget:event.currentTarget});}}};}),
      closeSel:event=>this.pmCloseNodeDrawer(event)};
  }
  pmOpenNodeDrawer(name,event) {
    const pipe=this.pipeData().find(pipe=>pipe.name===this.state.editPipe);
    if(this.state.view!=='pipeedit' || !pipe?.dag.some(node=>node.split('/')[0]===name))return;
    const keyboard=event?.detail===0;
    this._pmNodeDrawerTrigger=event?.currentTarget || null;
    this.setState({editSel:name,pmNodeDrawerKeyboard:keyboard});
    if(keyboard)setTimeout(()=>{
      if(typeof document!=='undefined' && this.state.view==='pipeedit' && this.state.editSel===name)document.querySelector('.pm-node-drawer-close')?.focus({preventScroll:true});
    },0);
  }
  pmCloseNodeDrawer(event) {
    if(this.state.view!=='pipeedit' || !this.state.editSel)return;
    event?.preventDefault();
    const name=this.state.editSel,keyboard=event?.type==='keydown' || event?.detail===0;
    this.setState({editSel:null,pmNodeDrawerKeyboard:keyboard});
    if(typeof document!=='undefined'){
      const trigger=this._pmNodeDrawerTrigger?.isConnected?this._pmNodeDrawerTrigger:[...document.querySelectorAll('.pm-pipeline-node')].find(node=>node.dataset.nodeName===name);
      trigger?.focus({preventScroll:true});
    }
  }
  // pm-pipeline-node-drawer:end
