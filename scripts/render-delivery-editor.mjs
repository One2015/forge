import fs from 'node:fs';
// Creation is a four-step page. Keep the existing edit dialog and shared subflows.
export function renderDeliveryEditor(source) {
  const reviewAssignments = fs.readFileSync(new URL('./templates/delivery-review-assignments.html', import.meta.url), 'utf8');
  source = source.replaceAll('[[dataset-review-assignments]]', reviewAssignments);
  const detail = source.match(/<!-- delivery-skill-detail:start -->[\s\S]*?<!-- delivery-skill-detail:end -->/)?.[0] || '';
  const dialog = source.match(/<dialog\b[\s\S]*?<\/dialog>/)?.[0]
    // Track typing before blur, including refresh/back while an input is focused.
    ?.replace(/sc-camel-on-change="{{ deliveryEditor\.(onName|onCustomer|onTarget|onDesc|onList|onTagName) }}"/g, 'sc-camel-on-input="{{ deliveryEditor.$1 }}"');
  if (!dialog) throw new Error('Missing shared delivery editor');
  const members = dialog.match(/<section class="forge-delivery-members"[\s\S]*?<\/section>/)?.[0];
  const skills = dialog.match(/<section class="forge-delivery-skills-workspace"[\s\S]*?<\/section>\s*<\/sc-if>\s*<sc-if value="{{ deliveryEditor.error }}/)?.[0]?.split('\n      </sc-if>\n      <sc-if value="{{ deliveryEditor.error }')[0];
  const composer = dialog.match(/<sc-if value="{{ deliveryEditor.tagComposerOpen }}"[\s\S]*?<\/div>\s*<\/sc-if>\s*<p class="forge-delivery-help" role="status"/)?.[0]?.split('\n            <p class="forge-delivery-help" role="status"')[0];
  if (!members || !skills || !composer) throw new Error('Missing shared wizard subflow');
  let skillPanel = skills
    // Creation and editing share the native form/upload chooser and its handlers.
    .replace('<h3>平台 Skill</h3>', '<h3>Skill <span class="forge-wizard-optional">选填</span></h3>')
    .replace('勾选本单需要的 Skill，保存数据单后生效。', '选择本单需要的 Skill，创建数据单后生效。已选择的 Skill 固定在顶部。')
    .replace('<label class="forge-delivery-visually-hidden" for="forge-delivery-skill-search">', '<div class="forge-wizard-categories" role="group" aria-label="Skill 类别"><sc-for list="{{ deliveryEditor.wizard.categories }}" as="category" hint-placeholder-count="5"><button type="button" aria-pressed="{{ category.selected }}" sc-camel-on-click="{{ category.pick }}">{{ category.label }}</button></sc-for></div><label class="forge-delivery-visually-hidden" for="forge-delivery-skill-search">')
    .replace('已选 {{ deliveryEditor.skillCount }}', '已选择 {{ deliveryEditor.skillCount }}')
    .replace('<h3 class="forge-delivery-skill-title">创建 Skill</h3>', '<div class="forge-delivery-section-heading"><h3 class="forge-delivery-skill-title">创建 Skill</h3><button type="button" class="forge-delivery-secondary" sc-camel-on-click="{{ deliveryEditor.workspace.upload }}">上传 Skill 文件</button></div>')
    .replaceAll('草稿', '未完成内容');
  let page = fs.readFileSync(new URL('./templates/delivery-wizard.html', import.meta.url), 'utf8')
    .replace('[[wizard-members]]', members.replaceAll('Owner', '所有者'))
    .replace('[[wizard-skills]]', skillPanel)
    .replace('[[wizard-tag-composer]]', composer)
    .replaceAll('[[wizard-summary]]', fs.readFileSync(new URL('./templates/delivery-wizard-summary.html', import.meta.url), 'utf8'))
    .replaceAll('[[dataset-review-assignments]]', reviewAssignments);
  return `<!-- delivery-editor:start -->
<sc-if value="{{ deliveryEditor.page }}" hint-placeholder-val="{{ false }}">${page}</sc-if>
<sc-if value="{{ deliveryEditor.modal }}" hint-placeholder-val="{{ false }}">${dialog}</sc-if>
${detail}
<dialog class="forge-delivery-leave-dialog forge-feedback" aria-labelledby="forge-delivery-leave-title" aria-describedby="forge-delivery-leave-description" sc-camel-on-cancel="{{ deliveryLeave.keep }}" data-motion-native="true" data-motion-key="deliveryLeave" data-motion-open="{{ deliveryLeave.motionOpen }}">
  <sc-if value="{{ deliveryLeave.open }}" hint-placeholder-val="{{ false }}">
    <h2 id="forge-delivery-leave-title">离开创建流程？</h2>
    <p id="forge-delivery-leave-description">{{ deliveryLeave.description }}</p>
    <div class="forge-delivery-footer-actions"><button type="button" class="forge-delivery-secondary" autofocus sc-camel-on-click="{{ deliveryLeave.keep }}">继续填写</button><button type="button" class="forge-delivery-secondary" disabled="{{ deliveryLeave.discardDisabled }}" sc-camel-on-click="{{ deliveryLeave.discard }}">离开</button></div>
  </sc-if>
</dialog>
<!-- delivery-editor:end -->`;
}
