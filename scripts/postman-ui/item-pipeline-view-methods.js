  // pm-item-pipeline-view:start
  pmItemPipelineTone(kind) {
    const tone = {
      REVIEW: {kindFg:'#8a5a16',kindBg:'#fdf8ef',accent:'#c8912f'},
      AGENT: {kindFg:'#3f6b45',kindBg:'#f2f7f2',accent:'#6a4bb8'},
      LLM: {kindFg:'#6a4bb8',kindBg:'#f7f4fd',accent:'#6a4bb8'},
      FUNCTION: {kindFg:'var(--forge-muted)',kindBg:'#f4f1ec',accent:'#c1b8ab'}
    };
    return tone[kind] || tone.FUNCTION;
  }

  pmItemPipelineRunContext(run,itemId,state) {
    if (!run || !itemId) return {status:'unknown',node:'',progress:0,elapsed:'',errorCode:'',errorMessage:''};
    const count = Math.max(0,Number(run.n) || 0);
    let index = Number.isInteger(state.lifeRunIndex) && state.lifeRunIndex >= 0 && state.lifeRunIndex < count ? state.lifeRunIndex : -1;
    if (index < 0) for (let i=0;i<count;i+=1) if (this.taskRunItem(run,i).itemId===itemId) { index=i; break; }
    if (index < 0) return {status:'unknown',node:'',progress:0,elapsed:'',errorCode:'',errorMessage:''};
    const tech = state.runItemTech?.[run.id + ':' + index] || {};
    const status = tech.status || (index < Number(run.done || 0) ? 'success' : index < Number(run.done || 0) + Number(run.running || 0) ? 'running' : index < Number(run.done || 0) + Number(run.running || 0) + Number(run.failed || 0) ? 'failed' : 'queued');
    const fallback = status==='success' ? 18 : status==='running' ? Math.max(1,5-(index%4)) : ['failed','stopped'].includes(status) ? 7+(index%5) : 0;
    const progress = Number(tech.stoppedAtStep ?? tech.progress ?? fallback) || 0;
    const nodeNames = ['build_product','ref_search','prep_task','dcc_block','runtime'];
    const node = ['queued','cancelled'].includes(status) ? '' : tech.stoppedAtNode || tech.node || nodeNames[index % nodeNames.length];
    return {status,node,progress,elapsed:tech.stoppedAtTime || tech.elapsed || '',errorCode:tech.error?.code || tech.errorCode || '',errorMessage:tech.error?.message || tech.errorMessage || tech.stopError || ''};
  }

  pmItemPipelineNodeStatus(execution,index,names,context) {
    const raw = String(execution?.status || '').trim().toLowerCase();
    const known = [
      [['success','passed','pass','complete','completed','成功','通过','已通过','完成'],'passed','已通过'],
      [['failed','failure','error','timeout','失败','错误','超时'],'failed','失败'],
      [['running','in_progress','进行中','运行中'],'running','运行中'],
      [['skipped','skip','跳过','已跳过'],'skipped','已跳过'],
      [['stopped','cancelled','canceled','已停止','已取消'],'stopped','已停止'],
      [['pending','queued','not_started','未执行','待执行','排队中'],'pending','待执行']
    ];
    for (const [values,key,label] of known) if (values.includes(raw)) return {key,label,statusKey:key,statusLabel:label};
    const overall = String(context.status || '').toLowerCase();
    if (['success','passed','complete','completed','待审核','成功','通过'].includes(overall)) return {key:'passed',label:'已通过',statusKey:'passed',statusLabel:'已通过'};
    const current = names.indexOf(context.node);
    const scaled = Math.max(0,Math.min(names.length-1,Math.ceil((context.progress / 18) * names.length)-1));
    const active = current >= 0 ? current : scaled;
    if (['failed','failure','error','timeout','失败'].includes(overall)) {
      const key = index < active ? 'passed' : index === active ? 'failed' : 'pending';
      const label = key==='passed' ? '已通过' : key==='failed' ? '失败' : '待执行';
      return {key,label,statusKey:key,statusLabel:label};
    }
    if (['running','in_progress','运行中'].includes(overall)) {
      const key = index < active ? 'passed' : index === active ? 'running' : 'pending';
      const label = key==='passed' ? '已通过' : key==='running' ? '运行中' : '待执行';
      return {key,label,statusKey:key,statusLabel:label};
    }
    return {key:'pending',label:'待执行',statusKey:'pending',statusLabel:'待执行'};
  }
  // pm-item-pipeline-view:end
