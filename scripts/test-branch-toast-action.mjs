import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { addBranchToastAction } from './add-branch-toast-action.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const click = { preventDefault() {}, stopPropagation() {} };
function component() {
  let sequence = 0;
  const timers = new Map(), element = {
    hovered: false, focused: false, open: false,
    matches(selector) { return selector === ':hover' ? this.hovered : this.open; },
    contains() { return this.focused; },
    showPopover() { this.open = true; }, hidePopover() { this.open = false; }
  };
  const context = vm.createContext({
    URLSearchParams, window: { location: { search: '' } },
    document: { querySelector: () => null, getElementById: () => element, activeElement: null },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    DCLogic: class {
      props = { panelWidth: 460, hasRuns: true, hasResources: true };
      setState(patch) { Object.assign(this.state, patch); }
    }
  });
  vm.runInContext(code + ';globalThis.c = new Component();', context);
  return { c: context.c, timers, element };
}
function create(c, history = false) {
  const item = '9f2a7c1b5e8d4036a1c4e7b209d6f8a3';
  c.setState({ view: history ? 'itemlife' : 'sheet', lifeItem: item, sheetKey: 'ant200', sheetRow: item });
  if (history) c.renderVals().life.nodes.find(node => node.kind === 'Run 3' && node.canFork).append(click);
  else c.renderVals().sheet.pick.rounds.at(-1).branch(click);
  c.branchFormValues().onNote({ target: { value: '调整材质，保留主体结构' } });
  assert.equal(c.branchFormValues().disabled, false);
  c.createBranchRun();
  return c.state.submittedRuns.at(-1);
}

test('both branch entry points expose a link to the exact submitted run without reloading', () => {
  for (const history of [false, true]) {
    const { c } = component(), run = create(c, history), toast = c.taskLinkToastValues();
    const before = JSON.stringify(c.state.reviewDecisions), records = JSON.stringify(c.state.forks);
    assert.equal(toast.hasAction, true); assert.equal(toast.actionLabel, '查看分支状态');
    assert.equal(toast.actionHref, '?view=run&activeRun=' + encodeURIComponent(run.id));
    let prevented = false, stopped = false;
    toast.openAction({ preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
    assert(prevented && stopped);
    assert.equal(c.state.view, 'run'); assert.equal(c.state.activeRun, run.id);
    assert.equal(c.renderVals().run.title, run.name);
    assert.equal(c.state.runItem, null); assert.equal(c.state.sheetRow, null); assert.equal(c.state.reviewOpen, null);
    assert.equal(c.state.taskLinkToast, null);
    assert.equal(c.state.submittedRuns.length, 1); assert.equal(run.status, 'queued');
    assert.equal(JSON.stringify(c.state.reviewDecisions), before);
    assert.equal(JSON.stringify(c.state.forks), records);
  }
});

test('navigation rechecks the target and never falls back to a different run', () => {
  const { c } = component(); create(c);
  const toast = c.taskLinkToastValues(), before = c.state.view;
  c.setState({ submittedRuns: [] });
  toast.openAction(click);
  assert.equal(c.state.view, before);
  assert.equal(c.state.taskLinkToast.tone, 'warning');
  assert.match(c.state.taskLinkToast.text, /已不可用/);
  assert.equal(c.taskLinkToastValues().hasAction, false);
});

test('replacement notifications clear old links and stale callbacks cannot navigate', () => {
  const { c } = component(); create(c);
  const previous = c.taskLinkToastValues();
  c.notifyTaskLink('已完成普通关联', 'success');
  assert.equal(c.taskLinkToastValues().hasAction, false);
  assert.equal(c.taskLinkToastValues().actionHref, '');
  const before = c.state.view;
  previous.openAction(click); assert.equal(c.state.view, before);
  assert.equal(c.state.taskLinkToast.text, '已完成普通关联');
});

test('sequential branch submissions bind the latest link to the latest run', () => {
  const { c } = component(), first = create(c), previous = c.taskLinkToastValues(), second = create(c);
  assert.notEqual(first.id, second.id);
  previous.openAction(click); assert.notEqual(c.state.view, 'run');
  c.taskLinkToastValues().openAction(click);
  assert.equal(c.state.activeRun, second.id);
  assert.equal(c.renderVals().run.title, second.name);
});

test('hover and keyboard focus keep the actionable Toast available and dismissal cannot reopen it', () => {
  const { c, timers, element } = component(); create(c);
  assert.equal(timers.get(c._taskLinkToastTimer).delay, 12000);
  c.taskLinkToastValues().pause(); assert(!timers.has(c._taskLinkToastTimer));
  element.focused = true; c.taskLinkToastValues().resume(); assert(!timers.has(c._taskLinkToastTimer));
  element.focused = false; element.hovered = true; c.taskLinkToastValues().resume(); assert(!timers.has(c._taskLinkToastTimer));
  element.hovered = false; c.taskLinkToastValues().resume(); assert.equal(timers.get(c._taskLinkToastTimer).delay, 12000);
  const delayedShows = [...timers.values()].filter(timer => timer.delay === 0);
  c.taskLinkToastValues().dismiss(); delayedShows.forEach(timer => timer.fn());
  assert.equal(element.open, false); assert.equal(c.state.taskLinkToast, null);
  c.notifyTaskLink('普通消息'); assert.equal(timers.get(c._taskLinkToastTimer).delay, 7000);
});

test('success action is a native link with focus styling and the focused generator is idempotent', () => {
  assert.equal(addBranchToastAction(source), source);
  assert.match(template, /<a class="forge-task-link-toast-action" href="{{ taskLinkToast\.actionHref }}" sc-camel-on-click="{{ taskLinkToast\.openAction }}">/);
  assert(template.includes('value="{{ taskLinkToast.hasAction }}"'));
  assert(template.includes('.forge-task-link-toast-action:focus-visible'));
  assert(template.includes('sc-camel-on-focus-in="{{ taskLinkToast.pause }}"'));
  assert(template.includes('sc-camel-on-mouse-enter="{{ taskLinkToast.pause }}"'));
});
