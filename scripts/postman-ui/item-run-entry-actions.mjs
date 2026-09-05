import fs from 'node:fs';

const css = fs.readFileSync(new URL('../../public/postman-ui/item-run-entry-actions.css', import.meta.url), 'utf8');
const noteBefore = "n.kind === '交付' ? '交付产物 · 可交互页面' : (n.kind.indexOf('审核') === 0 ? '该轮送审的产物' : '这一次运行的产物')";
const noteAfter = "n.kind === '交付' ? '交付产物 · 可交互页面' : (n.kind.indexOf('审核') === 0 ? '该轮送审的产物' : '本次运行产物')";
const failureActionBefore = '<div sc-camel-on-click="{{ n.openRun }}" style="font-size:12px;color:var(--forge-muted);cursor:pointer;white-space:nowrap" style-hover="color:var(--forge-text)">查看运行详情</div>';
const failureActionAfter = '<button type="button" class="pm-life-run-info-link" sc-camel-on-click="{{ n.openRun }}">查看详细原因</button>';

const openRunBefore = `            openRun: e => {
              e.stopPropagation();
              if (r[5]) this.setState({ view: 'run', activeRun: r[5] });
            },`;
const openRunAfter = `            openRun: e => {
              e.stopPropagation();
              const targetRun = r[5] || st.lifeRun;
              if (!targetRun) return;
              const evidence = this.props.itemExecution?.[r[2]]?.[targetRun] || this.pmItemExplorerDemo(r[2], targetRun)?.execution || {};
              const failedNode = Object.entries(evidence.nodes || {}).find(([, record]) => ['failed','error','timeout','失败','运行失败'].includes(String(record?.status || '').toLowerCase()))?.[0]
                || (/GLB|导出|产物/.test(String(n.body || '')) ? 'build' : null);
              const explorerKey = r[2] + ':' + targetRun;
              this.setState({ lifeRun: targetRun, lifeBranch: null, pmItemTab: 'pipeline', routeAnchor: '', pmItemExplorer: Object.assign({}, this.state.pmItemExplorer, { [explorerKey]: Object.assign({}, this.state.pmItemExplorer?.[explorerKey], { node: failedNode }) }) });
              setTimeout(() => {
                if (typeof document !== 'undefined') document.querySelector('.pm-item-pipeline')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
              }, 0);
            },`;
const runInfo = `            runArtifact: /^Run /.test(n.kind),
            openRunInfo: e => {
              e.stopPropagation();
              const targetRun = r[5] || st.lifeRun;
              if (!targetRun) return;
              this.setState({ lifeRun: targetRun, lifeBranch: null, pmItemTab: 'pipeline', routeAnchor: '' });
              setTimeout(() => {
                if (typeof document !== 'undefined') document.querySelector('.pm-item-tabs')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
              }, 0);
            },
${openRunAfter}`;

export const itemRunEntryActionsLogicCopy = [[noteBefore, noteAfter], [openRunBefore, runInfo]];

export function installItemRunEntryActions(t) {
  if (!t.includes(noteBefore)) throw Error('Item run artifact label boundary changed');
  t = t.replace(noteBefore, noteAfter);
  if (!t.includes(failureActionBefore)) throw Error('Item failure detail action boundary changed');
  t = t.replace(failureActionBefore, failureActionAfter);

  const previewNoteAt = t.indexOf('{{ n.previewNote }}');
  const actionStart = t.lastIndexOf('<div style="margin-top:8px;display:flex;align-items:center;gap:9px">', previewNoteAt);
  const actionTail = '</a>\n                    </div>';
  const actionEnd = t.indexOf(actionTail, actionStart);
  if (actionStart < 0 || actionEnd < actionStart) throw Error('Item run artifact actions boundary changed');
  const oldActions = t.slice(actionStart, actionEnd + actionTail.length);
  const icon = oldActions.match(/新标签打开\s*(<svg[\s\S]*?<\/svg>)/)?.[1];
  if (!icon) throw Error('Item run information icon boundary changed');
  const actions = `<div class="pm-life-artifact-actions">
                      <button type="button" class="pm-life-artifact-link" sc-camel-on-click="{{ n.zoom }}" aria-label="查看 {{ n.previewNote }} 大图">{{ n.previewNote }}</button>
                      <sc-if value="{{ n.runArtifact }}" hint-placeholder-val="{{ true }}"><button type="button" class="pm-life-run-info-link" sc-camel-on-click="{{ n.openRunInfo }}">运行信息 ${icon}</button></sc-if>
                      <sc-if value="{{ !n.runArtifact }}" hint-placeholder-val="{{ false }}"><a class="pm-life-run-info-link" href="{{ n.previewUrl }}" target="_blank" rel="noopener">新标签打开 ${icon}</a></sc-if>
                    </div>`;
  t = t.slice(0, actionStart) + actions + t.slice(actionEnd + actionTail.length);

  if (!t.includes(openRunBefore)) throw Error('Item run detail action boundary changed');
  t = t.replace(openRunBefore, runInfo);

  const demoBoundary = '  pmItemExplorerDemo(id, runId) {\n';
  if (!t.includes(demoBoundary)) throw Error('Item run information demo boundary changed');
  const demoMethod = String.raw`  pmItemRunEntryDemo(id, runId) {
    if (id !== '9f2a7c1b5e8d4036a1c4e7b209d6f8a3' || runId !== '20260821-094005-3f8b2e') return null;
    const prompt = '创建布达拉宫主题的可交互 Web3D 场景。\n\n要求：\n- 准确表达主体建筑的体量关系、白宫与红宫的层次。\n- 保留山体基座与入口路径。\n- 支持旋转、缩放和关键结构标注。\n- 输出网页入口、GLB 和运行报告。\n\n此文本为界面演示用 Mock，并非历史模型请求。';
    const dag = ['task/FUNCTION','build/AGENT','human_review_initial/REVIEW','build_repair/AGENT','human_review_rework/REVIEW','review/FUNCTION'];
    const definitions = Object.fromEntries(dag.map(node => { const [name, kind] = node.split('/'); return [name, this.pmDemoNodeConfig(name, kind)]; }));
    const completed = new Set(['task','build']);
    const nodes = Object.fromEntries(dag.map((node, index) => {
      const name = node.split('/')[0], done = completed.has(name), pending = name === 'human_review_initial';
      return [name, { config: definitions[name], status: done ? '成功' : pending ? '待审核' : '未执行', attempts: done ? [{ number: 1, status: '成功', duration: ['0.2s','18m 10s'][index] || '0.1s', activation: 1 }] : [], result: name === 'build' ? { entrypoint: 'dist/index.html', files: ['scene.glb','preview.png','REPORT.md'] } : done ? { ok: true } : undefined }];
    }));
    return { demo: true, files: [
      { name: 'REPORT.md', content: '# 布达拉宫 · 本轮运行报告（Mock）\n\nRun ID：20260821-094005-3f8b2e\n\n- Pipeline：web3d-gen-build-eval-v3 v7\n- 生成状态：成功\n- 审核状态：待审核\n- 产物：scene.glb、preview.png、dist/index.html' },
      { name: 'manifest.json', content: JSON.stringify({ demo: true, run_id: runId, item_id: id, entrypoint: 'dist/index.html', artifacts: ['scene.glb','preview.png','REPORT.md'] }, null, 2) },
      { name: 'prompts/build_product.md', content: prompt },
      { name: 'trajectory.json', content: JSON.stringify({ demo: true, events: ['读取输入','生成场景','导出产物','提交审核'] }, null, 2) },
    ], execution: { pipeline: { name: 'web3d-gen-build-eval-v3', version: 'v7', dag, nodeConfigs: definitions }, nodes,
      prompts: [
        { role: 'system', label: 'System Prompt', node: 'build', content: '你正在执行 Web3D 生成任务。根据输入构建场景，校验结构，并输出可审阅产物。\n\n这是界面演示用 Mock，并非历史模型请求。' },
        { role: 'user', label: 'User Prompt', node: 'build', content: prompt },
      ],
      events: [
        { time: '00:00', label: '读取输入', node: 'task', detail: { item_id: id, source: 'web3d-china-landmarks-v2' } },
        { time: '00:02', label: '开始生成', node: 'build', detail: '加载 Prompt，构建宫殿主体、山体基座与交互。' },
        { time: '17:36', label: '导出产物', node: 'build', detail: { files: ['scene.glb','preview.png','dist/index.html'], status: 'success' } },
        { time: '18:10', label: '提交审核', node: 'human_review_initial', detail: { status: 'pending', round: 1 } },
      ] } };
  }

`;
  t = t.replace(demoBoundary, demoMethod + demoBoundary + '    const runEntryDemo = this.pmItemRunEntryDemo(id, runId);\n    if(runEntryDemo) return runEntryDemo;\n');
  if (!t.includes(css)) t = t.replace('</style>', css + '\n</style>');
  return t;
}
