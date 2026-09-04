import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { simplifySheetPreview } from './simplify-sheet-preview.mjs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const raw = read('./templates/forge-base.html');
const decode = source => JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const template = decode(raw);
const heading = template.match(/<!-- sheet-history-heading:start -->[\s\S]*?<!-- sheet-history-heading:end -->/)?.[0];

test('review heading leads straight to the timeline without a version summary or horizontal divider', () => {
  assert(heading); assert(heading.includes('审核记录'));
  assert(!heading.includes('border-bottom')); assert(!heading.includes('roundSummary'));
  assert.match(template, /<!-- sheet-history-heading:end -->\s*<div class="forge-sheet-history"[^>]*>\s*<sc-if[^>]*><p class="forge-sheet-history-empty"[^>]*>尚未审核<\/p><\/sc-if>\s*<sc-for list="{{ sheet.pick.rounds }}"/);
  assert(template.includes('{{ !sheet.pick.rounds.length && !sheet.pick.appendedRounds.length }}'));
  assert(!template.includes('{{ sheet.pick.roundSummary }}'));
  // Only the redundant summary is removed; version lineage and round content remain.
  for (const binding of ['sheet.pick.versionNodes', 'q.title', 'q.who', 'q.branch', 'sheet.pick.appendedRounds']) assert(template.includes('{{ ' + binding + ' }}'), binding);
});

test('history spacing stays connected on desktop and mobile without changing its timeline connector', () => {
  const css = read('./templates/forge-refinement.css');
  for (const rule of ['.forge-sheet-history-heading{padding:10px 20px 8px!important}', '.forge-sheet-history{padding:0 20px 12px!important}', '.forge-sheet-history-heading{padding:10px 16px 8px!important}', '.forge-sheet-history{padding:0 16px 12px!important}']) {
    assert(css.includes(rule)); assert(template.includes(rule));
  }
  assert(template.includes('border-left:1px solid {{ q.line }}'));
  assert(template.includes('class="forge-sheet-actions forge-feedback forge-detail-footer"'));
});

test('simplification is repeatable and migrates the former heading without changing timeline or review decisions', () => {
  assert.equal(simplifySheetPreview(raw), raw);
  const old = '<div class="forge-sheet-history-heading" style="border-bottom:1px solid var(--forge-border)"><div>审核记录</div><div>{{ sheet.pick.roundSummary }}</div></div>';
  const legacy = template.replace(heading, old);
  const encoded = raw.replace(JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>'), () => JSON.stringify(legacy).replaceAll('</script>', '<\\u002Fscript>'));
  assert.notEqual(encoded, raw);
  assert.equal(simplifySheetPreview(encoded), raw);
});
