import {Button,SearchInput,Checkbox,SegmentedControl,Panel,Badge,EmptyState,icon} from './components.mjs';
export function RunsPage(){
const filter=Button({content:'{{ f.label }}',variant:'tertiary',size:'sm',onClick:'{{ f.pick }}',attributes:{'aria-pressed':'{{ f.selected }}','data-motion-label':'{{ f.label }}'}});
const empty=EmptyState({title:'{{ runs.emptyTitle }}',description:'{{ runs.emptyHint }}',action:Button({content:'{{ runs.emptyCta }}<sc-if value="{{ runs.emptyCtaForward }}">'+icon('arrow-right')+'</sc-if>',variant:'secondary',onClick:'{{ runs.clear }}'})});
return `<!-- geist-runs:start -->
<sc-if value="{{ isRuns }}" hint-placeholder-val="{{ false }}">
<section class="fg-theme fg-runs" aria-labelledby="fg-runs-title" data-design-system="forge-geist-v1">
 <header class="fg-page-header"><div><h1 id="fg-runs-title">运行记录</h1><p>{{ runs.subtitle }}</p></div>${Button({content:icon('plus')+'新建运行',variant:'primary',onClick:'{{ goPipelines }}'})}</header>
 <sc-if value="{{ runs.hasAny }}" hint-placeholder-val="{{ true }}">
 <div class="fg-runs-toolbar">
 ${SegmentedControl({label:'运行状态',content:`<sc-for list="{{ runs.filters }}" as="f" hint-placeholder-count="4">${filter}</sc-for>`})}
 ${Checkbox({label:'只看我的',checked:'{{ runs.mineSelected }}',onChange:'{{ runs.toggleMine }}'})}
 <span class="fg-result-count fg-mono" role="status" aria-label="筛选结果">{{ runs.count }}</span>
 ${SearchInput({label:'搜索运行、Pipeline 或数据集',placeholder:'搜索运行、Pipeline 或数据集…',value:'{{ runs.query }}',onChange:'{{ runs.onQuery }}'})}
 </div>
 </sc-if>
 ${Panel({content:`
 <sc-if value="{{ runs.hasAny }}"><div class="fg-run-columns fg-run-heading" aria-hidden="true"><span>运行</span><span>状态</span><span>Item 进度</span><span>发起人 / 时间</span><span>成本</span></div></sc-if>
 <div class="fg-run-groups">
 <sc-for list="{{ runs.groups }}" as="g" hint-placeholder-count="4">
 <section class="fg-run-group"><header><h2>{{ g.subject }}</h2><span>{{ g.meta }}</span></header>
 <ul class="fg-run-list">
 <sc-for list="{{ g.rows }}" as="r" hint-placeholder-count="2"><li>
 <button type="button" class="fg-run-row fg-run-columns" sc-camel-on-click="{{ r.open }}" aria-label="查看运行 {{ r.meta }} · {{ r.strategy }}">
  <span class="fg-run-identity"><strong>{{ r.strategy }}</strong><span class="fg-pipeline-line"><span class="fg-mono">{{ r.pipe }}</span><span class="fg-version fg-mono">{{ r.ver }}</span></span><span class="fg-run-id fg-mono">{{ r.meta }}</span></span>
  <span class="fg-run-status">${Badge({label:'{{ r.status }}',tone:'{{ r.tone }}'})}</span>
  <span class="fg-run-progress-cell"><span class="fg-run-progress-bar" aria-hidden="true"><span data-state="review" style="width:{{ r.segDone }}"></span><span data-state="running" style="width:{{ r.segRunning }}"></span><span data-state="failed" style="width:{{ r.segFailed }}"></span></span><span class="fg-run-progress-copy">{{ r.progress }}</span></span>
  <span class="fg-run-owner"><span>{{ r.owner }}</span><span class="fg-muted">{{ r.when }}</span></span>
  <span class="fg-run-cost fg-mono"><span class="fg-sr-only">成本 </span>{{ r.cost }}</span>
 </button>
 </li></sc-for></ul></section>
 </sc-for></div>
 <sc-if value="{{ runs.empty }}" hint-placeholder-val="{{ false }}">${empty}</sc-if>`})}
</section></sc-if>
<!-- geist-runs:end -->`;
}
