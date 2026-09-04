import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { confirmDelivery } from './test-support/delivery-wizard.mjs';
import { updateDeliverySkillWorkspace } from './update-delivery-skill-workspace.mjs';
import { buildPostman } from './postman-ui/build.mjs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/templates/forge-base.html');
const extract = source => JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const template = extract(source), code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const postman = extract(buildPostman(source)), postmanCode = postman.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const change = value => ({ target: { value } });

function setup(logic = code) {
  const files = [], anchors = [], timers = [], revoked = [];
  let fail = false;
  const context = vm.createContext({ URLSearchParams, TextDecoder, TextEncoder, Blob,
    window: { location: { search: '' } }, setTimeout(fn, ms) { if (ms === 1000) timers.push(fn); return 0; }, clearTimeout() {},
    URL: { createObjectURL(blob) { files.push(blob); return 'blob:test-' + files.length; }, revokeObjectURL(url) { revoked.push(url); } },
    document: { getElementById: () => null, querySelector: () => null, body: { appendChild(link) { link.appended = true; } }, createElement(tag) {
      assert.equal(tag, 'a'); const link = { click() { if (fail) throw Error('download failed'); this.clicked = true; }, remove() { this.removed = true; } }; anchors.push(link); return link;
    } },
    DCLogic: class { props = { currentUser: '一万', panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { Object.assign(this.state, patch); } }
  });
  vm.runInContext(logic + ';globalThis.instance = new Component();', context);
  const c = context.instance;
  const begin = key => { c.openDeliveryEditor(key); c.patchDeliveryEditor({ name: '审核交付单', customer: '测试客户', target: '1', tab: 'skills' }); if (!key) c.setDeliveryList('天坛'); };
  const save = () => { assert.equal(c.deliveryEditorIssue(), ''); confirmDelivery(c); c.saveDeliveryEditor(); return c.deliverySheet(c.state.sheetKey); };
  const review = sheet => { const row = c.sheetRows(sheet)[0]; return { itemId: row[2], itemName: row[0], runId: row[5], sheetKey: sheet.key, scope: 'sheet' }; };
  begin();
  return { c, begin, save, review, files, anchors, timers, revoked, fail: () => { fail = true; } };
}

test('related Skills only reflect saved sheet selection, not the catalog or unsaved changes', () => {
  const { c, save, begin, review } = setup(); const sheet = save(), ctx = review(sheet);
  assert.equal(c.reviewSkillValues(ctx).available, false);
  begin(sheet.key); const first = c.deliveryEditorValues().library.rows[0]; first.toggle();
  assert.equal(c.reviewSkillValues(ctx).relatedSkills.length, 0);
  save(); let values = c.reviewSkillValues(ctx);
  assert.equal(values.relatedSkills.length, 1); assert.equal(values.relatedSkills[0].name, first.name);
  assert.equal(values.relatedSkills[0].source, sheet.name);
  values.onText(change('/not-a-match')); values = c.reviewSkillValues(ctx);
  assert.equal(values.skills.length, 0); assert.equal(values.relatedSkills.length, 1, 'Download list is not command-filtered');
  begin(sheet.key); c.deliveryEditorValues().library.rows.find(row => row.selected).toggle(); save();
  assert.equal(c.reviewSkillValues(ctx).available, false);
});

test('form-created and explicitly assigned Skills download useful Markdown without executing instructions', async () => {
  const env = setup(), { c, save, review, files, anchors, timers, revoked } = env;
  c.deliveryEditorValues().workspace.write(); let v = c.deliveryEditorValues().workspace;
  v.onName(change('交付验收')); v.onCommand(change('delivery-check')); v.onDescription(change('用于交付检查')); v.onContent(change('# 验收\n<script>throw Error("never execute")</script>'));
  c.deliveryEditorValues().workspace.create();
  assert.equal(c.state.deliveryEditor.skills.length, 0);
  c.deliveryEditorValues().library.rows.find(row => row.command === '/delivery-check').toggle();
  const sheet = save(), ctx = review(sheet), before = JSON.stringify([sheet.skills, c.state.reviewDecisions, c.state.personalSkills]);
  c.reviewSkillValues(ctx).relatedSkills[0].download();
  assert.equal(files.length, 1); assert.equal(files[0].type, 'text/markdown;charset=utf-8');
  const markdown = await files[0].text(); assert.match(markdown, /name: "交付验收"/); assert.match(markdown, /command: "delivery-check"/); assert.match(markdown, /<script>throw/);
  assert.equal(anchors[0].download, 'delivery-check.md'); assert(anchors[0].appended && anchors[0].clicked && anchors[0].removed);
  assert.equal(revoked.length, 0); timers.forEach(fn => fn()); assert.deepEqual(revoked, ['blob:test-1']);
  assert.equal(JSON.stringify([sheet.skills, c.state.reviewDecisions, c.state.personalSkills]), before);
  assert.equal(c.reviewSkillValues(ctx).history.length, 0);
});

test('uploaded Markdown retains its full contents and headers when downloaded', async () => {
  const { c, save, review, files } = setup();
  const text = '---\r\nname: uploaded-check\r\ndescription: 检查\r\ncustom: keep-me\r\n---\r\n# 完整指令\r\n不执行。';
  await c.uploadDeliverySkills([{ name: 'SKILL.md', size: Buffer.byteLength(text), text: async () => text }]);
  c.deliveryEditorValues().workspace.publishUploads(); c.patchDeliveryEditor({ tab: 'skills' });
  c.deliveryEditorValues().library.rows.find(row => row.command === '/uploaded-check').toggle();
  c.reviewSkillValues(review(save())).relatedSkills[0].download(); assert.equal(await files[0].text(), text);
});

test('binding lookup isolates Item/Run pairs and identifies multiple source sheets', () => {
  const { c, save, begin, review } = setup(); c.deliveryEditorValues().library.rows[0].toggle(); const one = save(), ctx = review(one);
  begin(); c.deliveryEditorValues().library.rows[0].toggle(); const two = save();
  assert.equal(c.reviewSkillValues(ctx).relatedSkills.length, 1);
  assert.equal(c.reviewSkillValues({ ...ctx, sheetKey: undefined, scope: 'review' }).relatedSkills.length, 2);
  assert.equal(c.reviewSkillValues({ ...ctx, sheetKey: undefined, runId: 'other-run' }).available, false);
  assert.equal(c.reviewSkillValues({ ...ctx, itemId: 'other-item' }).available, false);
  assert.notEqual(one.key, two.key);
});

test('download rechecks current binding and actor, uses current content and sanitizes filenames', async () => {
  const { c, save, review, files, anchors } = setup(); c.deliveryEditorValues().library.rows[0].toggle(); const sheet = save(), ctx = review(sheet);
  const action = c.reviewSkillValues(ctx).relatedSkills[0].download;
  const stored = c.state.deliverySheets.find(value => value.key === sheet.key);
  stored.skills[0].content = 'Updated instructions'; stored.skills[0].command = '../../unsafe/name\u0000'; action();
  assert.match(await files[0].text(), /Updated instructions/); assert.doesNotMatch(anchors[0].download, /[/\\\u0000]/); assert(!anchors[0].download.startsWith('.'));
  stored.skills[0].command = 'CON'; action(); assert.equal(anchors[1].download, 'skill-CON.md');
  const identity = c.profileIdentity; c.profileIdentity = () => ({ accountName: 'changed-account' }); action(); assert.equal(files.length, 2); c.profileIdentity = identity;
  stored.skills = []; action(); assert.equal(files.length, 2); assert.match(c.reviewSkillValues(ctx).downloadError, /取消关联/);
});

test('empty content and browser download failures report a recoverable error and release resources', () => {
  const { c, save, review, files, anchors, fail, timers, revoked } = setup(); c.deliveryEditorValues().library.rows[0].toggle(); const sheet = save(), ctx = review(sheet);
  fail(); c.reviewSkillValues(ctx).relatedSkills[0].download();
  assert.match(c.reviewSkillValues(ctx).downloadError, /重试|下载权限/); assert(anchors[0].removed); timers.forEach(fn => fn()); assert.equal(revoked.length, 1);
  c.state.deliverySheets.find(value => value.key === sheet.key).skills[0].content = '';
  c.reviewSkillValues(ctx).relatedSkills[0].download(); assert.equal(files.length, 1); assert.match(c.reviewSkillValues(ctx).downloadError, /暂无指令/);
});

test('both review panels and both variants contain conditional, labelled download controls; generation is repeatable', () => {
  for (const variant of [template, postman]) {
    for (const [marker, prefix] of [['review', 'it.skills.'], ['sheet', 'sheet.pick.skills.']]) {
      const block = variant.split('<!-- ' + marker + '-skill-session:start -->')[1].split('<!-- ' + marker + '-skill-session:end -->')[0];
      assert(block.trim().startsWith('<sc-if value="{{ ' + prefix + 'available }}"'));
      if (variant === postman && marker === 'review') {
        assert(block.includes('Skill 评估会话')); assert(!block.includes('relatedSkills'));
        const references = variant.split('<section class="review-workbench-references">')[1].split('<!-- review-skill-session:start -->')[0];
        assert.match(references, /<h3(?:\s[^>]*)?>参考 Skill<\/h3>/);
        assert(references.includes('未分配参考 Skill'));
        assert(references.includes('it.referenceSlots')); assert(references.includes('it.skills.relatedSkills'));
        assert.match(references, /aria-label="{{ relatedSkill.downloadLabel }}"[^>]*sc-camel-on-click="{{ relatedSkill.download }}"><svg/);
        assert(references.includes('role="alert"'));
        continue;
      }
      assert(block.includes('aria-label="相关 Skill"')); assert(block.includes(prefix + 'relatedSkills'));
      assert(block.includes('aria-label="{{ relatedSkill.downloadLabel }}"')); assert(block.includes('sc-camel-on-click="{{ relatedSkill.download }}"'));
      assert(block.includes('role="alert"'));
      // The latest Postman delivery preview keeps downloads without the demo evaluator.
      if (variant !== template && marker === 'sheet') assert(!block.includes('Skill 评估会话'));
      else assert(block.includes('Skill 评估会话'));
    }
  }
  const regenerated = updateDeliverySkillWorkspace(source); assert.equal(updateDeliverySkillWorkspace(regenerated), regenerated);
  const css = read('scripts/templates/delivery-workflows.css');
  assert.match(css, /forge-review-skill-download-info\{[^}]*min-width:0[^}]*overflow-wrap:anywhere/);
  assert.match(css, /forge-review-skill-download:focus-visible/);
});

test('Postman review lists and downloads the Skills saved at production-task creation', async () => {
  const { c, files, anchors } = setup(postmanCode);
  const task = c.deliveryProductionTasks().find(task => task.id === '20260825-093412-a4f7c1');
  c.syncDeliveryProductionTasks([task.id]);
  c.patchDeliveryEditor({ target: String(c.state.deliveryEditor.entries.length) });
  const first = c.deliveryEditorValues().library.rows[0]; first.toggle();
  const ctx = { itemId: '0a729c7334d94411addab3ec44c53029', runId: task.id, scope: 'review' };
  assert.equal(c.reviewSkillValues(ctx).empty, true, 'Unsaved selections are not references');
  confirmDelivery(c); c.saveDeliveryEditor();
  const sheet = c.deliverySheet(c.state.sheetKey), values = c.reviewSkillValues(ctx);
  assert.equal(values.relatedSkills.length, 1); assert.equal(values.relatedSkills[0].name, first.name);
  assert.equal(values.relatedSkills[0].source, sheet.name);
  values.relatedSkills[0].download();
  assert.equal(files.length, 1); assert((await files[0].text()).includes(sheet.skills[0].content));
  assert(anchors[0].clicked); assert.match(anchors[0].download, /\.md$/);
  assert.equal(c.reviewSkillValues({ ...ctx, runId: 'unrelated-run' }).empty, true);
  c.openDeliveryEditor(sheet.key); c.deliveryEditorValues().library.rows.find(row => row.selected).toggle();
  assert.equal(c.reviewSkillValues(ctx).count, 1, 'Unsaved removals preserve the current reference');
  confirmDelivery(c); c.saveDeliveryEditor();
  assert.equal(c.reviewSkillValues(ctx).empty, true);
});

test('Postman references include every saved Item/Run source without mixing unrelated Items or sheets', () => {
  const { c } = setup(postmanCode);
  const tasks = c.deliveryProductionTasks().filter(task => task.dataset === 'web3d-china-landmarks-v2');
  c.syncDeliveryProductionTasks(tasks.map(task => task.id));
  c.patchDeliveryEditor({ target: String(c.state.deliveryEditor.entries.length) });
  c.deliveryEditorValues().library.rows[0].toggle(); confirmDelivery(c); c.saveDeliveryEditor();
  const sheet = c.deliverySheet(c.state.sheetKey), entry = sheet.entries.find(entry => entry.sourceRefs.length > 1);
  assert(entry);
  for (const ref of entry.sourceRefs) {
    const ctx = { itemId: entry.itemId, runId: ref.runId, scope: 'review' };
    assert.equal(c.reviewSkillValues(ctx).count, 1, ref.runId);
    assert.equal(c.reviewSkillValues({ ...ctx, sheetKey: 'other-sheet' }).empty, true);
    assert.equal(c.reviewSkillValues({ ...ctx, itemId: 'other-item' }).empty, true);
  }
  assert.equal(c.reviewSkillValues({ itemId: entry.itemId, runId: 'unrelated-run', scope: 'review' }).empty, true);
});

test('the review reference deep link accepts dataset-backed runs and rejects unrelated Items', () => {
  const { c } = setup(postmanCode);
  const runId = '20260825-093412-a4f7c1', itemId = '0a729c7334d94411addab3ec44c53029';
  const route = id => ({ patch: { reviewRun: runId, deepReview: { runId, itemId: id } } });
  assert.equal(c.forgeRouteIssue(route(itemId)), '');
  assert.match(c.forgeRouteIssue(route('701f39aa8af242e2a322670c1d4b8e95')), /不属于/);
  const runs = c.runsData(); c.runsData = () => runs;
  runs.find(run => run.id === runId).itemIds = ['another-item'];
  assert.match(c.forgeRouteIssue(route(itemId)), /不属于/);
});
