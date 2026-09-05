import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateRouting } from './update-routing.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const core = fs.readFileSync(new URL('./templates/routing-core.js', import.meta.url), 'utf8');
const codec = vm.runInNewContext(core + ';ForgeRoutes;', { URL, URLSearchParams });
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
const sameURL = (a, b) => {
  const ua = new URL(a, 'http://localhost:3007'), ub = new URL(b, ua);
  ua.searchParams.sort(); ub.searchParams.sort(); assert.equal(ua.href, ub.href);
};

function component(initial = '/overview', framed = false) {
  const events = new Map(), timers = [];
  const dialog = (name) => ({ open: false, classList: { contains: value => name === value }, showModal() { this.open = true; }, close() { this.open = false; } });
  const editor = dialog('forge-delivery-editor'), leave = dialog('forge-delivery-leave-dialog');
  const doc = {
    title: '', documentElement: { dataset: {} }, activeElement: null,
    addEventListener() {}, removeEventListener() {}, getElementById() { return null; },
    querySelector: selector => selector === '.forge-delivery-editor' || selector === 'dialog.forge-delivery-editor' ? editor : selector === '.forge-delivery-leave-dialog' ? leave : null,
    querySelectorAll: selector => selector === 'dialog[open]' ? [editor, leave].filter(value => value.open) : [],
  };
  const host = { location: new URL(initial, 'http://localhost:3007'), document: doc,
    addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key),
    scrollTo() {}, matchMedia: () => ({ matches: false }) };
  const entries = [{ url: initial, state: null }]; let index = 0;
  host.history = {
    get state() { return entries[index].state; }, get length() { return entries.length; },
    pushState(state, _, url) { entries.splice(++index); entries.push({ url, state }); host.location = new URL(url, host.location); },
    replaceState(state, _, url) { entries[index] = { url, state }; host.location = new URL(url, host.location); },
    go(delta) { const next = index + delta; if (next < 0 || next >= entries.length) return; index = next; host.location = new URL(entries[index].url, host.location); events.get('popstate')?.({ state: entries[index].state }); },
    back() { this.go(-1); }, forward() { this.go(1); },
  };
  const win = framed ? { ...host, location: new URL('/forge.html', host.location), parent: host, frameElement: { classList: { contains: name => name === 'forge-frame' } } } : host;
  const context = vm.createContext({ URL, URLSearchParams, TextEncoder, TextDecoder, Blob, DecompressionStream, document: doc, window: win,
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    DCLogic: class { props = { currentUser: '一万', panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { Object.assign(this.state, patch); } },
  });
  vm.runInContext(code + ';globalThis.instance = new Component();', context);
  const c = context.instance;
  c.mountForgeRoutes();
  return { c, host, win, entries, editor, leave, flush() { while (timers.length) timers.shift()(); }, url: () => host.location.pathname + host.location.search + host.location.hash };
}

test('route installation is idempotent and catch-all reuses the existing shell', () => {
  assert.equal(updateRouting(source), source);
  assert.match(fs.readFileSync(new URL('../app/[...route]/page.tsx', import.meta.url), 'utf8'), /export \{ default \} from '\.\.\/page'/);
  assert.match(template, /this\.mountForgeRoutes\(\)/); assert.match(template, /this\.unmountForgeRoutes\(\)/);
  assert.match(template, /data-forge-route-section="delivery-progress"/);
});

test('all main pages, details, filters and utility panels have stable round trips', () => {
  for (const url of [
    '/overview#delivery-progress', '/production/runs?owner=mine&status=failed&q=天坛', '/production/runs/run-1',
    '/production/submitted', '/production/submitted?run=run-1', '/production/pipelines?status=archived&q=test', '/production/pipelines/demo?status=all',
    '/production/pipelines/demo/edit?node=build', '/production/datasets', '/production/datasets/demo?version=v2&pipeline=build&q=item',
    '/production/resources', '/review/pending?run=run-1&owner=mine&sort=oldest&q=item', '/review/results',
    '/review/run-1/items/item-1?phase=results&tab=files', '/delivery?category=Web3D&status=unmet&sort=oldest', '/delivery/new#skills',
    '/delivery/new?draft=local-1#list', '/delivery/ant200?status=review&q=item&tag=重点', '/delivery/ant200/items/item-1',
    '/delivery/ant200/edit#skills', '/delivery/ant200/edit#tags', '/items/item-1?run=run-1&sheet=ant200&from=review',
    '/billing/models?preset=custom&start=2026-08-01&end=2026-08-31&grain=hour&provider=Anthropic&model=claude&project=web3d&sort=tokens',
    '/billing/suppliers', '/billing/overview?metric=calls&sort=calls&direction=asc&page=2&pageSize=5&search=web&bin=2026-09-02T15', '/models?provider=test&status=attention&q=model', '/models?dimension=models&status=slow&selection=claude&route=yq-claude', '/models?period=24h', '/models?period=custom&from=2026-09-01T09%3A00&to=2026-09-02T18%3A30', '/models?source=live', '/outsourcing-suppliers', '/outsourcing-suppliers/stepfun?sheet=step300&risk=high&cycle=7d', '/outsourcing-suppliers?tab=management', '/overview?panel=downloads',
    '/overview?panel=notifications', '/overview?panel=profile&profile=skills',
  ]) {
    const route = codec.read(url); assert.equal(route.error, '', url);
    if (route.editor) route.patch.deliveryEditor = { ...route.editor, savedDraftId: route.draft };
    sameURL(codec.write(route.patch), url);
  }
  assert.equal(codec.read('/delivery').patch.delCat, 'all');
  assert.equal(codec.read('/delivery').patch.delStatus, 'all');
  assert.equal(codec.read('/delivery?status=unmet').patch.delStatus, 'unmet');
  assert.equal(codec.read('/delivery').patch.delSort, 'newest');
});

test('aliases and legacy bookmarks resolve without replaying approval or mutations', () => {
  for (const input of ['/', '/forge.html', '/overview/']) assert.equal(codec.write(codec.read(input).patch), '/overview');
  assert.equal(codec.write(codec.read('/production').patch), '/production/runs');
  assert.equal(codec.write(codec.read('/billing/projects').patch), '/billing/overview');
  assert.equal(codec.write(codec.read('/models?tab=compare').patch), '/models?tab=lines');
  assert.equal(codec.write(codec.read('/forge.html?view=run&activeRun=run-1&rework=true&passAsk=yes').patch), '/production/runs/run-1');
  assert.equal(codec.read('/review/pending?passAsk=yes').patch.passAsk, undefined);
});

test('invalid paths and encoded separators cannot navigate to a foreign origin', () => {
  for (const input of ['/oops', '/forge.html/oops', '/delivery/a/items', '/production/pipelines/a/delete', '/models/oops', '/outsourcing-suppliers/a/b', '/items/%E0%A4%A', '/items/%2froot', '//evil.test', 'https://evil.test', '/\\evil.test', '/items/%00']) {
    const route = codec.read(input); assert(route.error, input);
    assert.equal(route.patch.view, 'route-error');
    assert.equal(new URL(codec.write(route.patch), 'http://localhost:3007').origin, 'http://localhost:3007');
  }
});

test('direct deep links populate real entities and invalid IDs never fall back to a different record', async () => {
  const { c, url } = component('/production/runs');
  const run = c.runsData()[0], ds = c.dsData()[0], pipe = c.pipeData()[0];
  for (const [path, field, value] of [
    ['/production/runs/' + run.id, 'activeRun', run.id], ['/production/datasets/' + ds.name, 'selDs', ds.name],
    ['/production/pipelines/' + pipe.name, 'openPipe', pipe.name], ['/delivery/ant200', 'sheetKey', 'ant200'],
  ]) { await c.applyForgeRoute(path); assert.equal(c.state[field], value); assert.equal(c.state.routeError, ''); }
  for (const path of ['/production/runs/missing', '/production/datasets/missing', '/delivery/missing', '/delivery/ant200/items/missing', '/items/missing', '/review/missing/items/missing', '/production/submitted']) {
    await c.applyForgeRoute(path); assert.equal(c.state.view, 'route-error', path); assert.equal(url(), path);
    assert(!c.renderVals().showSubNav); assert.equal(c.renderVals().sidebar.productionCurrent, 'false');
  }
});

test('framed and standalone navigation update the visible URL; Back and Forward restore filters', async () => {
  for (const framed of [false, true]) {
    const { c, host, win, url } = component('/overview', framed);
    c.setState({ view: 'runs', runsMine: true }); await tick(); assert.equal(url(), '/production/runs?owner=mine');
    c.setState({ view: 'review', reviewOwner: 'mine' }); await tick(); assert.equal(url(), '/review/pending?owner=mine');
    host.history.back(); await tick(); assert.equal(c.state.view, 'runs'); assert(c.state.runsMine); assert.equal(c.state.reviewOwner, 'all');
    host.history.forward(); await tick(); assert.equal(c.state.view, 'review'); assert.equal(c.state.reviewOwner, 'mine');
    if (framed) assert.equal(win.location.pathname, '/forge.html');
    c.unmountForgeRoutes();
  }
});

test('search uses replace, state-only edits do not pollute history, and delivery default shows all categories', async () => {
  const { c, host, url } = component('/production/runs');
  const length = host.history.length;
  c.setState({ runsQuery: '天' }); await tick(); c.setState({ runsQuery: '天坛' }); await tick();
  assert.equal(host.history.length, length); assert.equal(new URL(url(), 'http://localhost').searchParams.get('q'), '天坛');
  c.setState({ sidebarCollapsed: true }); await tick(); assert.equal(host.history.length, length);
  await c.applyForgeRoute('/delivery'); assert.equal(c.state.delCat, 'all'); assert.equal(c.renderVals().delivery.count, '5 / 5 份');
});

test('wizard routes retain inputs, gate future steps and preserve the dirty Back guard', async () => {
  const { c, host, url } = component('/delivery');
  c.openDeliveryEditor(); c.patchDeliveryEditor({ name: '未保存内容' }); await tick();
  const editorId = c.state.deliveryEditor.id;
  c.requestForgeRoute('/delivery/new#skills'); await tick();
  assert.equal(c.state.deliveryEditor.id, editorId); assert.equal(c.state.deliveryEditor.name, '未保存内容'); assert.equal(url(), '/delivery/new#basic');
  c.patchDeliveryEditor({ customer: '客户', target: '1' }); c.setDeliveryList('天坛');
  c.goDeliveryWizardStep(2); await tick(); assert.equal(url(), '/delivery/new#list');
  host.history.back(); await tick(); assert.equal(url(), '/delivery/new#basic'); assert(!c.state.deliveryLeave);
  host.history.back(); await tick(); assert.equal(url(), '/delivery/new#basic'); assert(c.state.deliveryLeave);
  c.deliveryLeaveValues().keep(); await tick(); assert.equal(c.state.deliveryEditor.name, '未保存内容');
  host.history.back(); await tick(); c.deliveryLeaveValues().discard(); await tick();
  assert.equal(url(), '/delivery'); assert.equal(c.state.deliveryEditor, null);
  host.history.forward(); await tick(); assert.equal(url(), '/delivery/new#basic'); assert.equal(c.state.deliveryEditor.name, '');
});

test('explicit route navigation honors dirty-form guard, including malformed targets', async () => {
  const { c, url } = component('/delivery/new'); c.patchDeliveryEditor({ name: '保留内容' }); await tick();
  c.requestForgeRoute('/bad-route'); await tick(); assert.equal(url(), '/delivery/new#basic'); assert(c.state.deliveryLeave);
  c.deliveryLeaveValues().keep(); c.requestForgeRoute('/models'); await tick();
  c.deliveryLeaveValues().discard(); await tick(); assert.equal(c.state.view, 'models'); assert.equal(url(), '/models');
});

test('existing sheet edit tabs keep the dialog open, preserve inputs and clear stale section anchors', async () => {
  const { c, editor, flush, url } = component('/delivery/ant200/edit#basic'); flush(); assert(editor.open);
  const editorId = c.state.deliveryEditor.id; c.patchDeliveryEditor({ name: '修改中' }); await tick();
  c.requestForgeRoute('/delivery/ant200/edit#tags'); await tick(); flush();
  assert(editor.open); assert.equal(c.state.deliveryEditor.id, editorId); assert.equal(c.state.deliveryEditor.name, '修改中');
  assert.equal(c.state.deliveryEditor.tab, 'list'); assert.equal(url(), '/delivery/ant200/edit#tags');
  c.patchDeliveryEditor({ tab: 'skills' }); await tick(); assert.equal(url(), '/delivery/ant200/edit#skills');
  await c.applyForgeRoute('/delivery/ant200/edit#reviewers');
  assert.equal(c.state.deliveryEditor.tab, 'reviewers');
  assert.equal(url(), '/delivery/ant200/edit#reviewers');
});

test('missing saved draft deep link reports the problem without creating an empty draft', async () => {
  const { c, url } = component('/delivery');
  c.deliveryDraftStorage = async () => null;
  await c.applyForgeRoute('/delivery/new?draft=missing#skills');
  assert.equal(c.state.view, 'route-error'); assert(!c.state.deliveryEditor); assert.equal(url(), '/delivery/new?draft=missing#skills');
});

test('receipt URLs restore the matching submission, not the latest unrelated one', async () => {
  const { c } = component(); const ds = c.dsData()[0], [pipe, otherPipe] = c.pipeData();
  const receipt = { id: 'local-receipt', dsName: ds.name, itemIds: [ds.items[0][0]], pipe: pipe.name, ver: pipe.version, n: 1, status: 'queued' };
  c.setState({ submittedRuns: [receipt, { ...receipt, id: 'newer-receipt', pipe: otherPipe.name }] });
  await c.applyForgeRoute('/production/submitted?run=local-receipt');
  assert.equal(c.state.view, 'submitted'); assert.equal(c.state.activeRun, receipt.id); assert.equal(c.state.selDs, ds.name);
  assert.equal(c.state.runIds.length, 1); assert.equal(c.renderVals().done.rows[0].v, pipe.name + ' ' + pipe.version);
});
