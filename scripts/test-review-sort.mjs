import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateReviewSort } from './update-review-sort.mjs';
const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const decode = text => JSON.parse(text.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const template = decode(source);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function component() {
  const context = vm.createContext({ URLSearchParams, window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { Object.assign(this.state, patch); } }
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  context.instance.state.view = 'review'; return context.instance;
}
test('review sort uses a labelled native dropdown with latest/oldest options', () => {
  const block = template.match(/<!-- review-sort:start -->[^]*?<!-- review-sort:end -->/)[0];
  assert.match(block, /<select[^>]*aria-label="审核队列排序"[^>]*value="{{ review.sortValue }}"/);
  assert(block.includes('label="{{ o.label }}"')); assert(block.includes('data-phosphor="caret-down"'));
  const c = component(); assert.equal(c.renderVals().review.sortValue, 'newest');
  assert.deepEqual(Array.from(c.renderVals().review.sorts, option => [option.key, option.label]), [['newest', '最新'], ['oldest', '最旧']]);
});
test('dropdown changes actual queue order and restores latest ordering', () => {
  const c = component(); const before = Array.from(c.renderVals().review.items, row => row.key);
  c.renderVals().review.setSort({ target: { value: 'oldest' } });
  const after = Array.from(c.renderVals().review.items, row => row.key);
  assert.equal(c.renderVals().review.sortValue, 'oldest'); assert.notDeepEqual(before, after);
  assert.deepEqual([...before].sort(), [...after].sort());
  c.renderVals().review.setSort({ target: { value: 'newest' } });
  assert.deepEqual(Array.from(c.renderVals().review.items, row => row.key), before);
});
test('sorting preserves owner, query, phase and ignores unsupported values', () => {
  const c = component(); Object.assign(c.state, { reviewOwner: 'mine', reviewQuery: '布达拉宫', reviewPhase: 'pending' });
  c.renderVals().review.setSort({ target: { value: 'oldest' } });
  assert.equal(c.state.reviewOwner, 'mine'); assert.equal(c.state.reviewQuery, '布达拉宫'); assert.equal(c.state.reviewPhase, 'pending');
  c.renderVals().review.setSort({ target: { value: 'invalid' } }); assert.equal(c.state.reviewSort, 'oldest');
  c.state.reviewSort = 'waited'; assert.equal(c.renderVals().review.sortValue, 'newest');
});
test('focused sort migration is idempotent and leaves delivery configuration untouched', () => {
  const migrated = updateReviewSort(source); assert(migrated === source);
  assert.equal(decode(migrated).match(/<!-- delivery-editor:start -->[^]*?<!-- delivery-editor:end -->/)[0], template.match(/<!-- delivery-editor:start -->[^]*?<!-- delivery-editor:end -->/)[0]);
});
