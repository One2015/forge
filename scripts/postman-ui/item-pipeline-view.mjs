import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8').trimEnd();

export function installItemPipelineView(t) {
  if (t.includes('<!-- pm-item-pipeline-view:start -->')) return t;

  const start = t.indexOf('<sc-if value="{{ explorer.pipelineTab }}">');
  const end = t.indexOf('<sc-if value="{{ explorer.filesTab }}">', start);
  if (start < 0 || end < start) throw new Error('Item Pipeline boundary changed');
  t = t.slice(0, start) + read('item-pipeline-view.html') + '\n' + t.slice(end);

  const nodesBefore = `    const nodes = (pipeline?.dag || []).map((declared,index)=>{
      const [name,kind] = typeof declared==='string' ? declared.split('/') : [declared.name,declared.kind];
      return {name,kind,kindLabel:this.pmNodeKindLabel(kind),index:index+1,selected:stored.node===name,status:evidence.nodes?.[name]?.status || '未提供执行状态',pick:()=>update({node:name}),hasEdge:index < pipeline.dag.length-1};
    });
    const selected = nodes.find(node=>node.name===stored.node);`;
  const nodesAfter = `    const nodeNames = (pipeline?.dag || []).map(declared=>typeof declared==='string' ? declared.split('/')[0] : declared.name);
    const runContext = this.pmItemPipelineRunContext(run,id,state);
    const alertState = stored.pipelineAlerts || {};
    const nodes = (pipeline?.dag || []).map((declared,index)=>{
      const [name,kind] = typeof declared==='string' ? declared.split('/') : [declared.name,declared.kind];
      const execution = evidence.nodes?.[name] || {};
      const status = this.pmItemPipelineNodeStatus(execution,index,nodeNames,runContext);
      const tone = this.pmItemPipelineTone(kind);
      const failureMessage = execution.error?.message || execution.errorMessage || execution.result?.message || (status.key==='failed' ? runContext.errorMessage : '') || '节点执行失败，请查看执行尝试与运行日志。';
      const failureCode = execution.error?.code || execution.errorCode || execution.result?.error_code || runContext.errorCode || '';
      const lastAttempt = Array.isArray(execution.attempts) ? execution.attempts.at(-1) : null;
      const duration = execution.duration || lastAttempt?.duration || (status.key==='running' || status.key==='failed' ? runContext.elapsed : '') || '—';
      const synced = alertState[name] === 'sent';
      return {name,kind,kindLabel:this.pmNodeKindLabel(kind),index:index+1,selected:stored.node===name,...tone,...status,
        failed:status.key==='failed',failureMessage,failureCode,hasFailureCode:!!failureCode,duration,hasEdge:index < pipeline.dag.length-1,edgeState:status.key,
        pick:()=>update({node:name}),syncDisabled:synced,syncLabel:synced?'已同步':'同步到 Forge 报警群',sync:()=>update({pipelineAlerts:{...alertState,[name]:'sent'}})};
    });
    const selected = nodes.find(node=>node.name===stored.node);
    const failedNode = nodes.find(node=>node.statusKey==='failed');
    const pipelineCounts = nodes.reduce((counts,node)=>({...counts,[node.statusKey]:(counts[node.statusKey] || 0)+1}),{});
    const pipelineSummary = [nodes.length+' 个节点',pipelineCounts.passed ? pipelineCounts.passed+' 已通过' : '',pipelineCounts.running ? pipelineCounts.running+' 运行中' : '',pipelineCounts.failed ? pipelineCounts.failed+' 失败' : '',pipelineCounts.pending ? pipelineCounts.pending+' 待执行' : ''].filter(Boolean).join(' · ');`;
  if (!t.includes(nodesBefore)) throw new Error('Item Pipeline nodes anchor changed');
  t = t.replace(nodesBefore, nodesAfter);

  const valuesBefore = `      nodes,hasNode:!!selected,node:selected ? this.pmNodeDetails(pipeline,selected.name,evidence.nodes?.[selected.name]) : {},closeNode:()=>update({node:null}),`;
  const valuesAfter = `      nodes,hasNode:!!selected,node:selected ? {...this.pmNodeDetails(pipeline,selected.name,evidence.nodes?.[selected.name]),...selected} : {},closeNode:()=>update({node:null}),
      hasPipelineFailure:!!failedNode,pipelineFailure:failedNode || {},pipelineSummary,fullPipelineOpen:!!stored.fullPipeline,
      openFullPipeline:()=>update({fullPipeline:true,node:stored.node || failedNode?.name || nodes[0]?.name || null}),closeFullPipeline:()=>update({fullPipeline:false}),`;
  if (!t.includes(valuesBefore)) throw new Error('Item Pipeline values anchor changed');
  t = t.replace(valuesBefore, valuesAfter);

  const methodAnchor = '  // pm-item-explorer:start';
  if (!t.includes(methodAnchor)) throw new Error('Item explorer method anchor changed');
  t = t.replace(methodAnchor, read('item-pipeline-view-methods.js') + '\n' + methodAnchor);
  return t;
}
