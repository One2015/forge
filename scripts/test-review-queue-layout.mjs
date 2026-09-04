import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { updateReviewQueueLayout } from './update-review-queue-layout.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const open = '<script type="__bundler/template">', close = '\n</script>\n</body>\n</html>';
const decode = input => JSON.parse(input.slice(input.indexOf(open) + open.length, input.lastIndexOf(close)).trim());
const template = decode(source);
const copyPattern = /<!-- review-queue-card-copy:start -->[\s\S]*?<!-- review-queue-card-copy:end -->/;
const cssPattern = /\/\* review-queue-layout:start \*\/[\s\S]*?\/\* review-queue-layout:end \*\//;
const code = input => input.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];

test('review card reading order is title, labelled Item ID, then repair/status metadata', () => {
  const copy = template.match(copyPattern)[0];
  const title = copy.indexOf('class="review-queue-card-title"');
  const id = copy.indexOf('class="review-queue-item-id"');
  const metadata = copy.indexOf('class="review-queue-card-meta"');
  assert(title >= 0 && title < id && id < metadata);
  assert.match(copy, /<button type="button"[^>]+sc-camel-on-click="\{\{ it\.openLife \}\}"/);
  assert(copy.includes('<span class="review-queue-item-id-label">Item ID</span><code>{{ it.id }}</code>'));
  for (const value of ['it.domain', 'it.round', 'it.authorLabel', 'it.authorInitial', 'it.mine']) assert(copy.includes(value));
});

test('focused migration preserves business methods, delivery changes, thumbnails and action states', () => {
  assert.equal(updateReviewQueueLayout(source), source);
  const legacy = template.replace(copyPattern, '<div style="min-width:0;max-height:100%;overflow:hidden;display:flex;flex-direction:column;justify-content:center">Legacy metadata</div>').replace(cssPattern, '');
  const fixture = source.slice(0, source.indexOf(open) + open.length) + '\n' + JSON.stringify(legacy).replaceAll('</script>', '<\\u002Fscript>') + close;
  const migratedSource = updateReviewQueueLayout(fixture), migrated = decode(migratedSource);
  assert.equal(code(migrated), code(template));
  assert.equal(migrated.match(copyPattern)[0], template.match(copyPattern)[0]);
  const editor = /<!-- delivery-editor:start -->[\s\S]*?<!-- delivery-editor:end -->/;
  assert.equal(migrated.match(editor)[0], template.match(editor)[0]);
  for (const hook of ['forge-review-thumb', 'forge-review-card-actions', 'it.toggle', 'it.start', 'it.reroll', 'it.waitLabel']) assert(migrated.includes(hook));
  assert.equal(updateReviewQueueLayout(migratedSource), migratedSource);
});

test('long identifiers preserve their label and metadata can wrap in narrow cards', () => {
  const css = fs.readFileSync(new URL('./templates/review-queue-layout.css', import.meta.url), 'utf8').trimEnd();
  assert(template.includes(css));
  assert(css.includes('.review-queue-item-id-label{flex:none;white-space:nowrap}'));
  assert.match(css, /\.review-queue-item-id code\{[^}]*min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap/);
  assert.match(css, /\.review-queue-card-meta\{[^}]*flex-wrap:wrap/);
  assert(css.includes('-webkit-line-clamp:2'));
  assert.doesNotMatch(css, /(?:\{|;)\s*order\s*:/);
  assert(template.includes('.review-queue-card-header>.forge-review-card-actions{grid-column:1/-1;'));
});
