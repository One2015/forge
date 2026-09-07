import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
export function installRunRecords(t){
 const start=t.indexOf('<!-- forge-runs:start -->'),end=t.indexOf('<!-- forge-runs:end -->',start);
 if(start<0||end<start)throw Error('Run records template boundary changed');
 let html=read('run-records.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g,(_,name,size)=>read('../../assets/phosphor/regular/'+name+'.svg').replace(/<svg[^>]*>/,'<svg class="forge-icon" width="'+size+'" height="'+size+'" viewBox="0 0 256 256" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">'));
 t=t.slice(0,start)+'<!-- forge-runs:start -->\n'+html+t.slice(end);
 t=t.replace('class Component extends DCLogic {',()=>read('run-records-data.js')+'\nclass Component extends DCLogic {\n'+read('run-records-methods.js'));
 // Run pages report execution; association changes belong to item detail pages.
 const runStart=t.indexOf('<sc-if value="{{ isRun }}"'),runEnd=t.indexOf('<sc-if value="{{ stopAsk.motionPresent }}"',runStart);
 if(runStart<0 || runEnd<runStart)throw Error('Run detail boundary changed');
 const runPage=t.slice(runStart,runEnd),linkButton=/<button\b[^>]*class="forge-task-link-edit"[^>]*>[\s\S]*?<\/button>/g;
 if([...runPage.matchAll(linkButton)].length!==2)throw Error('Run association entry points changed');
 t=t.slice(0,runStart)+runPage.replace(linkButton,'').replace('<span>Item ID</span>','<span>条目编号</span>').replace('逐条 Item 状态','逐条状态')+t.slice(runEnd);
 const a=t.indexOf('    const runPal ='),b=t.indexOf('    const delMap =',a);
 if(a<0||b<a)throw Error('Run records values boundary changed');
 t=t.slice(0,a)+'    // pm-run-records-values:start\n    const me = this.props.currentUser || \"一万\";\n    const runs = this.runRecordsValues();\n    // pm-run-records-values:end\n\n'+t.slice(b);
 const summaryStart=t.indexOf('<sc-for list="{{ run.stats }}"');
 const summaryEnd=t.indexOf('</sc-for>',summaryStart)+'</sc-for>'.length;
 if(summaryStart<0 || summaryEnd<12)throw Error('Run summary boundary changed');
 t=t.slice(0,summaryEnd)+`<div class="pm-run-model-summary" role="group" aria-label="使用模型"><div class="pm-run-model-heading"><span>使用模型</span><sc-if value="{{ run.models.mock }}"><small>示例</small></sc-if></div><div class="pm-run-model-tags"><sc-for list="{{ run.models.names }}" as="model"><span class="pm-run-model-tag">{{ model.name }}</span></sc-for><sc-if value="{{ run.models.empty }}"><span class="pm-run-model-empty">暂无模型调用记录</span></sc-if></div></div>`+t.slice(summaryEnd);
 t=t.replace("          id: rec.id + ' · ' + rec.n + ' items',", "          id: rec.id + ' · ' + rec.n + ' 条',\n          models: this.runModelSummary(rec), // pm-run-model-summary-values");
 t=t.replace('<div sc-camel-on-click="{{ it.open }}" title="{{ it.rowTitle }}"', '<div class="pm-run-item" role="link" tabindex="0" aria-label="查看条目 {{ it.id }} 详情" sc-camel-on-click="{{ it.open }}" sc-camel-on-keydown="{{ it.keyOpen }}" title="{{ it.rowTitle }}"');
 t=t.replace("            const meta = picked[k] || (cycle.length ? cycle[k % cycle.length] : []);", "            const meta = picked[k] || (cycle.length ? cycle[k % cycle.length] : []);\n            const itemId = meta[0] || (rec.id.replace(/[^a-f0-9]/g, '') + String(k).padStart(2, '0')).slice(0, 32);");
 t=t.replace("              id: meta[0] || (rec.id.replace(/[^a-f0-9]/g, '') + String(k).padStart(2, '0')).slice(0, 32),", "              id: itemId,");
 const oldOpen=`              rowCursor: state === 'success' ? 'pointer' : 'default',
              rowHover: state === 'success' ? '#f7fbf7' : '#fff',
              rowTitle: state === 'success' ? '打开这一条待审核 Item' : '',
              open: e => {
                if (e) e.stopPropagation();
                if (state !== 'success') return;
                this.openReview(rec.id, {
                  reviewOwner: 'all',
                  reviewPhase: 'pending',
                  deepReview: { runId: rec.id, itemId: meta[0] || '' }
                });
              },`;
 const newOpen=`              rowCursor: 'pointer',
              rowHover: 'var(--forge-subtle)',
              rowTitle: '查看条目详情',
              open: e => {
                if (e?.target?.closest?.('button,a,input,select,textarea')) return;
                e?.preventDefault?.();
                e?.stopPropagation?.();
                this.setState({ view: 'itemlife', lifeItem: itemId, lifeRun: rec.id, lifeRunIndex: k, lifeDs: rec.dsName || null, lifeFrom: 'run', lifeBranch: null, sheetKey: null, pmItemTab: 'history', runItem: null });
              },
              keyOpen: e => {
                if (e.target !== e.currentTarget || !['Enter', ' '].includes(e.key)) return;
                e.preventDefault();
                this.setState({ view: 'itemlife', lifeItem: itemId, lifeRun: rec.id, lifeRunIndex: k, lifeDs: rec.dsName || null, lifeFrom: 'run', lifeBranch: null, sheetKey: null, pmItemTab: 'history', runItem: null });
              },`;
 if(!t.includes(oldOpen))throw Error('Run item detail entry changed');
 t=t.replace(oldOpen,newOpen);
 const localizedCopy = new Map([
   ["title: '已提交 ' + n + ' 条 Item'", "title: '已提交 ' + n + ' 个条目'"],
   ["{ k: 'Pipeline',", "{ k: '流程',"],
   ["{ k: 'Item', v: n + ' 条（共 '", "{ k: '条目', v: n + ' 条（共 '"],
   ["'本轮有未完成 Item'", "'本轮有未完成条目'"],
   ["'第 ' + (k + 1) + ' 条 Item'", "'第 ' + (k + 1) + ' 条'"],
   ["retryLabel: state === 'failed' ? 'Reroll' : '重新运行'", "retryLabel: state === 'failed' ? '重新生成' : '重新运行'"],
   ["retryTitle: state === 'failed' ? '前往生产，选择 Pipeline、数据集和 Item 后发起 Reroll'", "retryTitle: state === 'failed' ? '前往生产，选择流程、数据集和条目后重新生成'"],
   ["{ label: 'Pipeline', key: 'pipelines' }", "{ label: 'pipeline', key: 'pipelines' }"],
   ['Run {{ cancelAsk.runId }}', '运行编号：{{ cancelAsk.runId }}'],
   ["{ k: 'Item 名称', v: a.itemName }", "{ k: '条目名称', v: a.itemName }"],
   ["{ k: 'Item ID', v: a.itemId }", "{ k: '条目编号', v: a.itemId }"],
   ["{ k: 'Run ID', v: a.runId }", "{ k: '运行编号', v: a.runId }"],
   ["{ k: 'Item 名称', v: row.shortName || '—' }", "{ k: '条目名称', v: row.shortName || '—' }"],
   ["{ k: 'Item ID', v: row.id || '—' }", "{ k: '条目编号', v: row.id || '—' }"],
   ["{ k: 'Run ID', v: row.runId || '—' }", "{ k: '运行编号', v: row.runId || '—' }"],
   ["elapsed: '0m 00s'", "elapsed: '0 分 00 秒'"]
 ]);
 for (const [from, to] of localizedCopy) t=t.split(from).join(to);
 t=t.replace('<span class="forge-profile-role">{{ profile.roleLabel }} · {{ profile.roleName }}</span>', '<span class="forge-profile-role">{{ profile.roleName }}</span>');
 t=t.replaceAll('{{ profile.roleLabel }}', '{{ profile.roleName }}');
 const profileCopy = new Map([
   ['Skill <span>{{ profile.skillCount }}</span>', '技能 <span>{{ profile.skillCount }}</span>'],
   ['仅修改当前演示账号，刷新后恢复；改为 Member 或 Outsourcing 后将无法继续编辑资料。', '仅修改当前演示账号，刷新后恢复；改为成员或外包协作后将无法继续编辑资料。']
 ]);
 const profileStart=t.indexOf('<!-- forge-profile:start -->'),profileEnd=t.indexOf('<!-- forge-profile:end -->',profileStart);
 if(profileStart>=0&&profileEnd>profileStart){let profile=t.slice(profileStart,profileEnd);for(const [from,to] of profileCopy)profile=profile.split(from).join(to);t=t.slice(0,profileStart)+profile+t.slice(profileEnd);}
 t=t.replace("title: rec.subject || rec.name.split(' · ')[0],", "title: this.runRecordCopy(rec.subject || rec.name.split(' · ')[0]),");
 t=t.replace("strategy: rec.strategy || '首次生成',", "strategy: this.runRecordCopy(rec.strategy || '首次生成'),");
 t=t.replace("subject: meta[1] || '', archetype: meta[2] || '',", "subject: this.runRecordCopy(meta[1] || ''), archetype: meta[2] || '',");
 t=t.replace("domain: meta[4] || (ds ? '—' : '第 ' + (k + 1) + ' 条'),", "domain: this.runRecordCopy(meta[4] || (ds ? '—' : '第 ' + (k + 1) + ' 条')),");
 t=t.replace("const elapsed = tech && (tech.stoppedAtTime || tech.elapsed) ? (tech.stoppedAtTime || tech.elapsed) : (6 + k) + 'm ' + String(12 + k * 7).padStart(2, '0') + 's';", "const elapsedRaw = tech && (tech.stoppedAtTime || tech.elapsed) ? (tech.stoppedAtTime || tech.elapsed) : (6 + k) + 'm ' + String(12 + k * 7).padStart(2, '0') + 's';\n            const elapsed = String(elapsedRaw).replace(/(\\d+)h\\b/g, '$1 时').replace(/(\\d+)m\\b/g, '$1 分').replace(/(\\d+)s\\b/g, '$1 秒');");
 return t;
}
