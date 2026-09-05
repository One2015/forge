import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildPostman} from './postman-ui/build.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const decode = value => JSON.parse(value.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const built = decode(buildPostman(source));
const logic = built.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({
  URL, URLSearchParams, TextDecoder, TextEncoder, Blob,
  setTimeout: () => 0, clearTimeout() {},
  window: { location: { search: '' } },
  DCLogic: class {
    props = { panelWidth: 460, hasRuns: true, hasResources: true };
    setState(patch) { this.state = { ...this.state, ...patch }; }
  }
});
vm.runInContext(logic + ';globalThis.component=new Component();', context);

test('Vision2Web sheet exposes child items matching its aggregate progress', () => {
  const component = context.component;
  const sheet = component.deliverySheet('stepv2w');
  const rows = component.sheetRows(sheet);

  assert.equal(rows.length, 84);
  assert.equal(new Set(rows.map(row => row[2])).size, 84);
  assert.equal(rows.filter(row => row[3] === 'passed').length, 31);
  assert.equal(rows.filter(row => row[3] === 'review').length, 14);
  assert.equal(rows.filter(row => row[3] === 'failed').length, 5);
  assert.equal(rows.filter(row => !!row[5]).length, 52);
  assert.deepEqual(
    { linked: sheet.linked, ran: sheet.ran, passed: sheet.passed, review: sheet.review, failed: sheet.failed },
    { linked: 84, ran: 52, passed: 31, review: 14, failed: 5 }
  );

  component.setState({ view: 'sheet', sheetKey: 'stepv2w', sheetFilter: 'all', sheetQuery: '' });
  const values = component.renderVals().sheet;
  assert.equal(values.empty, false);
  assert.equal(values.rows.length, 84);
  assert.equal(values.count, '84 / 80 个子项');
});
