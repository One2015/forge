import fs from 'node:fs';
const check = fs.readFileSync(new URL('../../assets/phosphor/regular/check.svg', import.meta.url),'utf8').replace(/<svg[^>]*>/,'<svg class="forge-icon" width="14" height="14" viewBox="0 0 256 256" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">');
export function installProgressIndicators(t) {
 const replace=(from,to)=>{if(!t.includes(from))throw Error('Progress anchor changed: '+from.slice(0,90));t=t.replace(from,()=>to);};
 const wizard=t.match(/<nav class="forge-wizard-steps"[\s\S]*?<\/nav>/)?.[0];
 if(!wizard)throw Error('Delivery stepper missing');
 replace(wizard,wizard.replace('class="forge-wizard-steps"','class="forge-wizard-steps pm-steps"').replace('<button type="button"','<button class="pm-step" type="button"').replace('class="forge-wizard-step-number"','class="forge-wizard-step-number pm-step-number"').replace('<span>{{ step.label }}</span>','<span class="pm-step-label">{{ step.label }}</span>'));
 replace('<progress class="forge-wizard-progress" value="{{ deliveryEditor.wizard.progress }}" max="100" aria-label="创建数据单进度"></progress>','');
 const start=t.indexOf('      <sc-if value="{{ showRunSteps }}"'),end=t.indexOf('      <div style="display:flex;align-items:flex-end;',start);
 if(start<0||end<start)throw Error('Run setup stepper missing');
 t=t.slice(0,start)+`      <sc-if value="{{ showRunSteps }}" hint-placeholder-val="{{ false }}">
        <ol class="pm-steps pm-run-steps" aria-label="发起运行步骤">
          <sc-for list="{{ steps }}" as="s" hint-placeholder-count="4">
            <li class="pm-step" data-complete="{{ s.markDone }}" data-current="{{ s.labelWeight }}">
              <span class="pm-step-number"><sc-if value="{{ s.markDone }}">${check}</sc-if><sc-if value="{{ s.markPending }}">{{ s.mark }}</sc-if></span>
              <span class="pm-step-label">{{ s.label }}</span>
              <span class="pm-step-value" title="{{ s.value }}">{{ s.value }}</span>
              <sc-if value="{{ s.hasAction }}"><button type="button" class="pm-step-edit" sc-camel-on-click="{{ s.click }}">{{ s.action }}</button></sc-if>
            </li>
          </sc-for>
        </ol>
      </sc-if>

`+t.slice(end);
 const branch=t.match(/<ol class="forge-branch-tree-stages"[\s\S]*?<\/ol>/)?.[0];
 if(!branch)throw Error('Branch progress missing');
 replace(branch,`<ol class="forge-branch-tree-stages pm-steps pm-steps-compact" aria-label="分支进度"><sc-for list="{{ node.steps }}" as="step" hint-placeholder-count="3"><li class="pm-step" data-current="{{ step.active }}" data-complete="{{ step.complete }}" style="--pm-step-current:{{ step.fg }}"><span class="pm-step-number"><sc-if value="{{ step.complete }}">${check}</sc-if><sc-if value="{{ !step.complete }}"><span class="pm-step-index" aria-hidden="true"></span></sc-if></span><span class="pm-step-label">{{ step.label }}</span></li></sc-for></ol>`);
 return t;
}
