import {phosphorIcon} from './phosphor-icons.mjs';

export function sortPipelineRows(rows, key, direction) {
 const value = p => key === 'last' ? (Number.isFinite(p.lastH) ? -p.lastH : null)
   : key === 'runs' ? p.runs
   : key === 'rate' ? (p.runs ? p.rate : null)
   : key === 'cost' ? (p.runs ? Number(String(p.cost).replace(/[$,]/g, '')) / p.runs : null) : null;
 if (!['last','runs','rate','cost'].includes(key)) return rows;
 return rows.slice().sort((a,b) => {
  const av=value(a), bv=value(b);
  if(av == null || !Number.isFinite(av)) return bv == null || !Number.isFinite(bv) ? 0 : 1;
  if(bv == null || !Number.isFinite(bv)) return -1;
  return (av-bv)*(direction === 'asc' ? 1 : -1);
 });
}

export function installPipelineTableControls(t) {
 const replace=(a,b)=>{if(!t.includes(a))throw Error('Pipeline controls anchor changed: '+a.slice(0,65));t=t.replace(a,()=>b);};
 replace('const pipelines = pipes.map(p => {',`const pmSortRows = ${sortPipelineRows.toString()};\n    const pipelines = pmSortRows(pipes, st.pmPipeSortKey, st.pmPipeSortDirection).map(p => {`);
 const fields=[['last','最近运行'],['runs','运行数'],['rate','成功率'],['cost','均价 / 条']];
 const values=fields.map(([key,label])=>`pmPipeSort_${key}: st.pmPipeSortKey === '${key}' ? (st.pmPipeSortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
 pmPipeSortLabel_${key}: '${label}，' + (st.pmPipeSortKey === '${key}' ? (st.pmPipeSortDirection === 'asc' ? '当前升序，点击降序' : '当前降序，点击升序') : '点击升序'),
 pmPipeSortClick_${key}: () => this.setState({pmPipeSortKey:'${key}', pmPipeSortDirection:st.pmPipeSortKey === '${key}' && st.pmPipeSortDirection === 'asc' ? 'desc' : 'asc'}),`).join('\n');
 replace('pipeFilters: filters,',`pipeFilters: filters,
 pmPipeStatus: st.pipeFilter || '活跃',
 pmPipeStatusChange: e => this.setState({pipeFilter:e.target.value}),
 ${values}`);
 const start=t.indexOf('<div class="pm-pipelines-columns"');
 const end=t.indexOf('<sc-for list="{{ pipelines }}"',start);
 let header=t.slice(start,end);
 header=header.replace('<div>状态</div>',`<label class="pm-pipe-status-control"><span>状态</span>${phosphorIcon('caret-down',12)}<select aria-label="筛选 Pipeline 状态" value="{{ pmPipeStatus }}" sc-camel-on-change="{{ pmPipeStatusChange }}"><option value="全部">全部</option><option value="活跃">活跃</option><option value="废弃">废弃</option></select></label>`);
 for(const [key,label] of fields) header=header.replace('<div>'+label+'</div>',`<div role="columnheader" aria-sort="{{ pmPipeSort_${key} }}"><button type="button" class="pm-pipe-sort" data-direction="{{ pmPipeSort_${key} }}" aria-label="{{ pmPipeSortLabel_${key} }}" sc-camel-on-click="{{ pmPipeSortClick_${key} }}"><span>${label}</span><span class="pm-pipe-sort-icons" aria-hidden="true">${phosphorIcon('arrow-up',12,{className:'pm-pipe-sort-up'})}${phosphorIcon('arrow-down',12,{className:'pm-pipe-sort-down'})}</span></button></div>`);
 t=t.slice(0,start)+header+t.slice(end);
 const toolbarStart=t.indexOf('<span class="pm-pipelines-filter-label">状态</span>');
 const toolbarEnd=t.indexOf('</sc-for>\n        </div>',toolbarStart);
 if(toolbarStart<0||toolbarEnd<0)throw Error('Pipeline status toolbar anchor changed');
 return t.slice(0,toolbarStart)+t.slice(toolbarEnd+'</sc-for>\n        </div>'.length);
}
