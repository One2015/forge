  pmPipelineNodeFailures(key) {
    const snapshots=[],runs=this.runsData(),provided=Array.isArray(this.props.pipelineNodeExecutions);
    const add=(record,context={})=>{
      if(!record || typeof record!=='object')return;
      const pipeline=record.pipeline?.name || record.pipeline || context.pipeline;
      if(pipeline!==key || typeof record.node!=='string')return;
      snapshots.push({...context,...record,pipeline,version:record.version || context.version || '未提供',runId:record.runId || context.runId || '',itemId:record.itemId || context.itemId || ''});
    };
    const addExecution=(execution,itemId,runId,demo=false)=>{
      const run=runs.find(run=>run.id===runId);
      const context={pipeline:execution?.pipeline?.name || run?.pipe || run?.name?.split(' · ').at(-1)?.replace(/\s+v\d+$/,''),version:execution?.pipeline?.version || run?.ver || run?.pipelineVersion,runId,itemId,demo};
      for(const [node,record] of Object.entries(execution?.nodes || {})){
        const attempt=record.attempts?.at(-1),result=record.result;
        add({...record,node,attempt:record.attempt ?? attempt?.number,error:record.error || attempt?.error || (result?.error_code ? {code:result.error_code,message:result.message} : undefined)},context);
      }
    };
    // Artifact execution manifests are the same evidence shown in Item Pipeline.
    // Explicit item execution data takes precedence, including an empty snapshot.
    for(const [itemId,byRun] of Object.entries(this.props.artifacts || {}))for(const [runId,manifest] of Object.entries(byRun || {})){
      if(!this.props.itemExecution?.[itemId]?.[runId])addExecution(manifest.execution,itemId,runId,!!manifest.demo);
    }
    for(const [itemId,byRun] of Object.entries(this.props.itemExecution || {}))for(const [runId,execution] of Object.entries(byRun || {})){
      addExecution(execution,itemId,runId);
    }
    for(const [itemKey,record] of Object.entries(this.state.runItemTech || {})){
      const split=itemKey.lastIndexOf(':'),runId=itemKey.slice(0,split),run=runs.find(run=>run.id===runId);
      if(run)add(record,{pipeline:run.pipe || run.pipeline || run.name?.split(' · ').at(-1)?.replace(/\s+v\d+$/,''),version:run.ver || run.pipelineVersion,runId,itemId:run.itemIds?.[Number(itemKey.slice(split+1))] || ''});
    }
    if(provided)this.props.pipelineNodeExecutions.forEach(record=>add(record));
    // A single explicitly labelled sample keeps this local prototype reviewable.
    // Suppress it as soon as execution data is supplied; never infer a failed node from run totals.
    if(!provided && !snapshots.length && key==='web3d-ant-delivery-v1')add({pipeline:key,version:'v16',runId:'demo-ant-prep-failure',node:'prep_task',status:'failed',demo:true,error:{code:'INPUT_VALIDATION_FAILED',message:'示例：输入数据缺少 subject 字段，prep_task 无法继续。'},attempt:1});
    if(!provided && !snapshots.length && key==='web3d-gen-build-eval-v3'){
      const itemId='b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',runId='20260825-034505-c19f2a';
      if(!this.props.itemExecution?.[itemId]?.[runId] && !this.props.artifacts?.[itemId]?.[runId]){
        const sample=this.pmItemExplorerDemo(itemId,runId);
        addExecution(sample?.execution,itemId,runId,true);
      }
    }
    const latest=new Map();
    for(const record of snapshots){
      const id=JSON.stringify([record.version,record.runId,record.itemId,record.node]),previous=latest.get(id);
      const time=Date.parse(record.occurredAt || record.updatedAt || '') || 0,oldTime=Date.parse(previous?.occurredAt || previous?.updatedAt || '') || 0;
      if(!previous || time>oldTime || (time===oldTime && Number(record.attempt || 0)>=Number(previous.attempt || 0)))latest.set(id,record);
    }
    const text=(value,max)=>String(value ?? '').slice(0,max);
    return [...latest.values()].filter(record=>['failed','error','timeout','失败','运行失败'].includes(String(record.status).toLowerCase())).map(record=>{
      const error=record.error,issue={pipeline:key,node:text(record.node,100),version:text(record.version,80),runId:text(record.runId,200),itemId:text(record.itemId,200),
        errorCode:text(error?.code || record.errorCode,100),errorMessage:text(typeof error==='string'?error:error?.message || record.errorMessage || record.message || '未提供错误详情',4000),
        occurredAt:text(record.occurredAt || record.updatedAt,100),attempt:Number.isInteger(record.attempt)?record.attempt:0,demo:!!record.demo};
      return {...issue,id:JSON.stringify(issue)};
    }).sort((a,b)=>(Date.parse(b.occurredAt)||0)-(Date.parse(a.occurredAt)||0));
  }
  pmNodeFailureValues(records,name) {
    const actor=this.profileIdentity().accountName,key=this.state.editPipe;
    const failures=records.filter(record=>record.node===name).map(record=>{
      const delivery=this.state.pmNodeIssueSync?.[record.id] || {},locked=['sending','sent','unknown'].includes(delivery.status);
      return {...record,hasItem:!!record.itemId,hasTime:!!record.occurredAt,hasCode:!!record.errorCode,
        syncTarget:typeof this.props.syncPipelineNodeIssue==='function'?'同步至 Forge任务报错群':'Forge任务报错群 · 待接入',syncState:delivery.status || '',
        statusLabel:record.demo?'失败 · 示例':'失败',syncLabel:delivery.status==='sending'?'同步中…':delivery.status==='sent'?'已同步':delivery.status==='unknown'?'结果待确认':'同步问题',
        syncDisabled:locked,message:delivery.message || '',hasMessage:!!delivery.message,isError:delivery.status==='failed' || delivery.status==='unknown',
        sync:()=>this.pmSyncNodeIssue(key,name,actor,record.id)};
    });
    return {hasFailures:failures.length>0,failures};
  }
  async pmSyncNodeIssue(key,name,actor,id) {
    if(this.state.view!=='pipeedit' || this.state.editPipe!==key || this.state.editSel!==name || this.profileIdentity().accountName!==actor)return;
    const record=this.pmPipelineNodeFailures(key).find(record=>record.id===id && record.node===name);
    if(!record || ['sending','sent','unknown'].includes(this.state.pmNodeIssueSync?.[id]?.status))return;
    const update=patch=>this.setState({pmNodeIssueSync:{...this.state.pmNodeIssueSync,[id]:patch}});
    // The group will be connected later. A host-provided adapter owns actual delivery.
    const send=this.props.syncPipelineNodeIssue;
    if(typeof send!=='function'){update({status:'not-connected',message:'Forge任务报错群尚未接入，问题暂未发送。'});return;}
    update({status:'sending',message:''});
    try{
      const {id:ignored,...issue}=record;
      const result=await send({groupName:'Forge任务报错群',issue});
      if(result?.ok===true)update({status:'sent',message:'已同步到 Forge任务报错群。'});
      else if(!result || result.code==='delivery_unknown')update({status:'unknown',message:'同步结果未确认，请先查看飞书群消息，避免重复发送。'});
      else update({status:'failed',message:result.message || '同步失败，请稍后重试。'});
    }catch{update({status:'unknown',message:'连接中断，同步结果未确认，请先查看飞书群消息。'});}
  }
