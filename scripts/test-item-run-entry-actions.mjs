import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildPostman} from './postman-ui/build.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const decode = value => JSON.parse(value.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const built = decode(buildPostman(source));

test('run artifacts expose large preview and round-scoped information actions', () => {
  assert.match(built, /class="pm-life-artifact-link"[^>]*sc-camel-on-click="\{\{ n\.zoom \}\}"[^>]*>\{\{ n\.previewNote \}\}<\/button>/);
  assert.match(built, /class="pm-life-run-info-link"[^>]*sc-camel-on-click="\{\{ n\.openRunInfo \}\}"[^>]*>运行信息/);
  assert.match(built, /previewNote: n\.kind === '交付'[^\n]+: '本次运行产物'/);
  assert.match(built, /this\.setState\(\{ lifeRun: targetRun, lifeBranch: null, pmItemTab: 'pipeline', routeAnchor: '' \}\)/);
});

test('the selected prototype run includes pipeline, files, prompts and trace data', () => {
  const logic = built.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  const context = vm.createContext({
    URL, URLSearchParams, TextDecoder, TextEncoder, Blob,
    setTimeout: () => 0,
    clearTimeout() {},
    window: {location: {search: ''}},
    DCLogic: class { props = {panelWidth: 460, hasRuns: true, hasResources: true}; setState(patch) { this.state = {...this.state, ...patch}; } },
  });
  vm.runInContext(logic + ';globalThis.component=new Component();', context);
  const demo = vm.runInContext("component.pmItemRunEntryDemo('9f2a7c1b5e8d4036a1c4e7b209d6f8a3','20260821-094005-3f8b2e')", context);
  assert.equal(demo.demo, true);
  assert.equal(demo.execution.pipeline.name, 'web3d-gen-build-eval-v3');
  assert.equal(demo.execution.pipeline.version, 'v7');
  assert.equal(demo.files.length, 4);
  assert.equal(demo.execution.prompts.length, 2);
  assert.equal(demo.execution.events.length, 4);
  assert.match(demo.files[0].content, /20260821-094005-3f8b2e/);
});
