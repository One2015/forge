import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
export function installRunRecords(t){
 const start=t.indexOf('<!-- forge-runs:start -->'),end=t.indexOf('<!-- forge-runs:end -->',start);
 if(start<0||end<start)throw Error('Run records template boundary changed');
 let html=read('run-records.html');
 t=t.slice(0,start)+'<!-- forge-runs:start -->\n'+html+t.slice(end);
 t=t.replace('class Component extends DCLogic {',()=>read('run-records-data.js')+'\nclass Component extends DCLogic {\n'+read('run-records-methods.js'));
 // Run pages report execution; association changes belong to Item detail pages.
 const runStart=t.indexOf('<sc-if value="{{ isRun }}"'),runEnd=t.indexOf('<sc-if value="{{ stopAsk.motionPresent }}"',runStart);
 if(runStart<0 || runEnd<runStart)throw Error('Run detail boundary changed');
 const runPage=t.slice(runStart,runEnd),linkButton=/<button\b[^>]*class="forge-task-link-edit"[^>]*>[\s\S]*?<\/button>/g;
 if([...runPage.matchAll(linkButton)].length!==2)throw Error('Run association entry points changed');
 t=t.slice(0,runStart)+runPage.replace(linkButton,'')+t.slice(runEnd);
 const a=t.indexOf('    const runPal ='),b=t.indexOf('    const delMap =',a);
 if(a<0||b<a)throw Error('Run records values boundary changed');
 t=t.slice(0,a)+'    // pm-run-records-values:start\n    const me = this.props.currentUser || \"一万\";\n    const runs = this.runRecordsValues();\n    // pm-run-records-values:end\n\n'+t.slice(b);
 const summaryStart=t.indexOf('<sc-for list="{{ run.stats }}"');
 const summaryEnd=t.indexOf('</sc-for>',summaryStart)+'</sc-for>'.length;
 if(summaryStart<0 || summaryEnd<12)throw Error('Run summary boundary changed');
 t=t.slice(0,summaryEnd)+`<div class="pm-run-model-summary" role="group" aria-label="使用模型"><div class="pm-run-model-heading"><span>使用模型</span><sc-if value="{{ run.models.mock }}"><small>示例</small></sc-if></div><div class="pm-run-model-tags"><sc-for list="{{ run.models.names }}" as="model"><span class="pm-run-model-tag">{{ model.name }}</span></sc-for><sc-if value="{{ run.models.empty }}"><span class="pm-run-model-empty">暂无模型调用记录</span></sc-if></div></div>`+t.slice(summaryEnd);
 t=t.replace("          id: rec.id + ' · ' + rec.n + ' items',", "          id: rec.id + ' · ' + rec.n + ' items',\n          models: this.runModelSummary(rec), // pm-run-model-summary-values");
 t=t.replace('<div sc-camel-on-click="{{ it.open }}" title="{{ it.rowTitle }}"', '<div class="pm-run-item" role="link" tabindex="0" aria-label="查看 Item {{ it.id }} 详情" sc-camel-on-click="{{ it.open }}" sc-camel-on-keydown="{{ it.keyOpen }}" title="{{ it.rowTitle }}"');
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
              rowTitle: '查看 Item 详情',
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
 if(!t.includes(oldOpen))throw Error('Run Item detail entry changed');
 t=t.replace(oldOpen,newOpen);
 return t;
}
