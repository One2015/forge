  // pm-item-explorer:start
  pmNodeKindLabel(kind) {
    return ({FUNCTION:'函数 · Function',AGENT:'智能体 · Agent',REVIEW:'人工审核 · Review',LLM:'模型 · LLM'})[kind] || kind || '节点';
  }

  pmCanEditPipeline() {
    return ['lead','project-owner'].includes(this.profileIdentity().key);
  }

  pmPipelineAccess(values) {
    const allowed = () => !this.state.pmPipelineView && this.pmCanEditPipeline();
    const guard = action => (...args) => { if (allowed()) return action(...args); };
    const canEdit = allowed();
    const guarded = {...values, canEdit, readOnly:!canEdit, modeLabel:canEdit ? '编辑模式' : '仅查看',
      back:() => { values.back(); this.setState({pmPipelineView:false}); },
      deleteAsking:canEdit && values.deleteAsking, dsOpen:canEdit && values.dsOpen,
      canRun:canEdit && values.canRun, cannotRun:canEdit && values.cannotRun};
    for (const key of ['save','askDelete','doDelete','toggleDs','run','runAnyway']) guarded[key] = guard(values[key]);
    guarded.dsOptions = values.dsOptions.map(option=>({...option,pick:guard(option.pick)}));
    guarded.nodes = values.nodes.map(node=>({...node,toggle:guard(node.toggle)}));
    return guarded;
  }

  pmNodeDetails(pipeline, name, execution = null, allowDemo = false) {
    const index = (pipeline?.dag || []).findIndex(node => (typeof node === 'string' ? node.split('/')[0] : node.name) === name);
    const declared = pipeline?.dag?.[index];
    const kind = typeof declared === 'string' ? declared.split('/')[1] : declared?.kind;
    const configs = this.props.pipelineConfigs?.[pipeline?.name]?.[pipeline?.version] || pipeline?.nodeConfigs || {};
    const supplied = execution?.config ?? configs[name] ?? (typeof declared === 'object' ? declared.config : null);
    const config = supplied ?? (allowDemo && declared ? this.pmDemoNodeConfig(name,kind) : null);
    const printable = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const attempts = Array.isArray(execution?.attempts) ? execution.attempts : [];
    return {
      demo:!supplied && !!config, name, kind: kind || 'NODE', kindLabel:this.pmNodeKindLabel(kind), pipeline: [pipeline?.name, pipeline?.version].filter(Boolean).join(' '),
      fields: [{key:'节点名称',value:name},{key:'节点类型',value:kind || '未提供'},{key:'执行顺序',value:index >= 0 ? String(index + 1) : '未提供'}],
      hasConfig: !!config, noConfig: !config,
      configFields: config && typeof config === 'object' ? Object.entries(config).map(([key,value])=>({key,value:printable(value)})) : config ? [{key:'配置',value:printable(config)}] : [],
      definition: printable(declared ?? {name}),
      attempts: attempts.map((attempt,i)=>({label:'Attempt ' + (attempt.number ?? i+1),status:attempt.status || '未记录',duration:attempt.duration || '耗时未记录',detail:printable(attempt)})),
      hasAttempts: attempts.length > 0, noAttempts: attempts.length === 0,
      hasResult: execution?.result !== undefined, result: execution?.result !== undefined ? printable(execution.result) : '',
    };
  }

  pmRunItemSnapshot(run, itemId, indexHint = null) {
    if (!run || !itemId) return null;
    const hinted = Number.isInteger(indexHint) && indexHint >= 0 && indexHint < run.n && this.taskRunItem(run,indexHint).itemId===itemId ? indexHint : null;
    const index = hinted ?? Array.from({length:run.n}, (_,i)=>i).find(i=>this.taskRunItem(run,i).itemId===itemId);
    if (index == null) return null;
    const tech = this.state.runItemTech?.[run.id + ':' + index] || {};
    const status = tech.status || (index < run.done ? 'success' : index < run.done + run.running ? 'running' : index < run.done + run.running + run.failed ? 'failed' : 'queued');
    const fallbackProgress = status === 'success' ? 18 : status === 'running' ? Math.max(1, 5 - (index % 4)) : status === 'failed' || status === 'stopped' ? 7 + (index % 5) : 0;
    const progress = tech.stoppedAtStep ?? tech.progress ?? fallbackProgress;
    const nodeNames = ['build_product','ref_search','prep_task','dcc_block','runtime'];
    const node = ['queued','cancelled'].includes(status) ? '未开始' : tech.stoppedAtNode || tech.node || nodeNames[index % nodeNames.length];
    const cost = tech.stoppedAtCost || tech.cost || run.itemCosts?.[index] || (['queued','cancelled'].includes(status) ? '—' : '\u0024' + (status === 'success' ? 54 + index * 3 : 12.4 + index * 2.6).toFixed(2));
    const elapsed = tech.stoppedAtTime || tech.elapsed || (['queued','cancelled'].includes(status) ? '—' : (6 + index) + 'm ' + String(12 + index * 7).padStart(2,'0') + 's');
    return {index,status,label:({success:'待审核',running:'运行中',failed:'失败',queued:'排队中',stopping:'停止中',stopped:'已停止',cancelled:'已取消'})[status] || '状态未知',progress,node,cost,elapsed};
  }

  pmItemExplorerValues(life) {
    const state = this.state, id = life?.id || state.lifeItem;
    const source = this.deliveryData().flatMap(group=>group.sheets).flatMap(sheet=>this.sheetRows(sheet)).find(row=>row[2]===id);
    const runId = state.lifeBranch ? this.runsData().find(run=>run.itemIds?.includes(id))?.id || '' : state.lifeRun || source?.[5] || '';
    const run = this.runsData().find(record=>record.id===runId);
    const actual = this.props.artifacts?.[id]?.[runId] || run?.artifactsByItem?.[id];
    const manifest = actual || (this.props.itemExecution?.[id]?.[runId] ? {} : this.pmItemExplorerDemo(id,runId)) || {};
    const evidence = this.props.itemExecution?.[id]?.[runId] || manifest.execution || {};
    const pipelineName = run?.pipe || run?.name?.split(' · ').at(-1)?.replace(/ v\d+$/,'');
    const current = this.pipeData().find(pipe=>pipe.name===pipelineName);
    const version = run?.ver || run?.pipelineVersion || '';
    // Never present a current definition as the historical snapshot of a run.
    const pipeline = evidence.pipeline || (current && (!version || version===current.version) ? current : null);
    const stored = state.pmItemExplorer?.[id + ':' + runId] || {};
    const tab = ['history','pipeline','files','prompt','trace'].includes(state.pmItemTab) ? state.pmItemTab : 'history';
    const update = patch => this.setState({...(patch.tab ? {pmItemTab:patch.tab,routeAnchor:''} : {}),pmItemExplorer:{...this.state.pmItemExplorer,[id + ':' + runId]:{...this.state.pmItemExplorer?.[id + ':' + runId],...patch}}});
    const safeUrl = value => {
      try { const url=new URL(value,'https://forge.invalid'); return typeof value==='string' && value && !/[\u0000-\u0020\\]/.test(value) && ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? value : ''; } catch { return ''; }
    };
    const allFiles = (Array.isArray(manifest.files) ? manifest.files : []).filter(file=>typeof file?.name==='string').map((file,index)=>({
      ...file,id:String(index),url:safeUrl(file.url),content:typeof file.content==='string' ? file.content : '',hasContent:typeof file.content==='string',
      image:/\.(png|jpe?g|webp|gif|avif)$/i.test(file.name),
    }));
    const file = allFiles.find(file=>file.id===stored.file) || allFiles[0];
    const files = allFiles.filter(file=>file.name.toLowerCase().includes((stored.query || '').toLowerCase())).map(file=>({...file,selected:file.id===(stored.file || allFiles[0]?.id),pick:()=>update({file:file.id})}));
    const prompts = (Array.isArray(evidence.prompts) ? evidence.prompts : []).map((prompt,index)=>({id:String(index),label:prompt.label || prompt.role || 'Prompt '+(index+1),node:prompt.node || '',content:String(prompt.content || '')}));
    const ds = this.dsData().find(ds=>(ds.items || []).some(item=>item[0]===id));
    const input = ds?.items?.find(item=>item[0]===id);
    const events = (Array.isArray(evidence.events) ? evidence.events : []).map((event,index)=>({id:String(index),label:event.label || event.type || '事件',node:event.node || '',time:event.time || '',detail:typeof event.detail==='string' ? event.detail : JSON.stringify(event.detail ?? {},null,2)}));
    const runItem = this.pmRunItemSnapshot(run,id,state.lifeFrom==='run' ? state.lifeRunIndex : null);
    const pipelineLabel = [pipelineName,version].filter(Boolean).join(' ') || '未关联 Pipeline';
    const nodes = (pipeline?.dag || []).map((declared,index)=>{
      const [name,kind] = typeof declared==='string' ? declared.split('/') : [declared.name,declared.kind];
      return {name,kind,kindLabel:this.pmNodeKindLabel(kind),index:index+1,selected:stored.node===name,status:evidence.nodes?.[name]?.status || '未提供执行状态',pick:()=>update({node:name}),hasEdge:index < pipeline.dag.length-1};
    });
    const selected = nodes.find(node=>node.name===stored.node);
    return {
      demo:!!manifest.demo,
      tabs:[['history','完整记录'],['pipeline','Pipeline'],['files','文件'],['prompt','查看 Prompt'],['trace','轨迹']].map(([key,label])=>({key,label,selected:tab===key,pick:()=>update({tab:key})})),
      history:tab==='history',pipelineTab:tab==='pipeline',filesTab:tab==='files',promptTab:tab==='prompt',traceTab:tab==='trace',
      showContext:tab!=='history' && tab!=='pipeline',
      hasRunOverview:!!runItem,
      runState:runItem?.label || '状态未知',runStateKey:runItem?.status || 'unknown',runNode:runItem?.node || '—',runProgress:runItem ? runItem.progress + ' / 18' : '—',
      runCostTime:runItem ? runItem.cost + ' · ' + runItem.elapsed : '—',trajectoryLabel:events.length ? events.length + ' 个事件' : '暂无轨迹记录',
      runId:runId || '未关联运行',pipelineLabel,
      pipelineHref:ForgeRoutes.write({view:'pipeedit',editPipe:pipelineName,pmPipelineView:true}),
      pipelineEditHref:ForgeRoutes.write({view:'pipeedit',editPipe:pipelineName,pmPipelineView:false}),
      canEditPipeline:!!current && this.pmCanEditPipeline(),
      hasPipeline:!!pipeline,noPipeline:!pipeline,definitionNote:manifest.demo ? 'Mock Pipeline 配置与执行样例' : evidence.pipeline ? '本次运行的 Pipeline 快照' : '当前同版本定义 · 未提供运行时配置快照',
      nodes,hasNode:!!selected,node:selected ? this.pmNodeDetails(pipeline,selected.name,evidence.nodes?.[selected.name]) : {},closeNode:()=>update({node:null}),
      fileCount:allFiles.length,files,hasFiles:allFiles.length>0,noFiles:allFiles.length===0,noMatches:allFiles.length>0&&files.length===0,
      file:file ? {...file,hasUrl:!!file.url,showImage:file.image&&!!file.url,unavailable:!file.hasContent&&!(file.image&&file.url)} : {},hasFile:!!file,
      query:stored.query || '',onQuery:event=>update({query:event.target.value}),
      prompts,hasPrompts:prompts.length>0,noPrompts:prompts.length===0,input:input ? String(input[1] || '') : '',hasInput:!!input,
      events,hasEvents:events.length>0,noEvents:events.length===0,
    };
  }
  // pm-item-explorer:end
