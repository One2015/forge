import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const source = read('../public/forge.html');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const css = read('./templates/forge-refinement.css');

test('dense roles use explicit sizes without scaling the document', () => {
  assert.match(template, /--forge-sidebar-width:184px/);
  assert.match(template, /\.forge-sidebar-link\{[^}]*font-size:14px/);
  assert.match(template, /\.forge-branch-header h2\{font-size:18px;line-height:26px/);
  assert.match(template, /\.forge-feedback-field>label\{[^}]*font-size:13px/);
  assert.match(template, /\.review-workbench-actions button\{height:40px[^}]*font-size:14px/);
  assert.doesNotMatch(css, /(?:zoom\s*:|transform\s*:\s*scale\()/);
});
test('shared accent, secondary text and hover meet small-text contrast', () => {
  const luminance = hex => {
    const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  for (const token of ['accent','accent-hover','muted','text']) {
    const color = css.match(new RegExp('--forge-' + token + ':#([0-9a-f]{6})'))[1];
    assert((1.05 / (luminance(color) + .05)) >= 4.5, token);
  }
  assert(!template.includes('font-family:Arial'));
  assert(template.includes('outline:2px solid var(--forge-accent)'));
});
test('semantic hooks preserve the two-pane layout and stack on narrow screens', () => {
  for (const name of ['forge-sheet-overlay','forge-sheet-dialog','forge-sheet-grid','forge-sheet-preview','forge-sheet-meta','forge-sheet-field-grid','forge-sheet-history','forge-review-card-actions']) {
    assert.equal(template.split('class="' + name + '"').length - 1, 1, name);
  }
  assert(css.includes('grid-template-rows:180px minmax(0,1fr) auto'));
  assert(css.includes('.forge-sheet-actions button{height:44px!important}'));
  assert(template.includes('class="forge-page"'));
  assert(template.includes('dialog.showModal()'));
});
test('disabled and coarse pointer affordances stay explicit', () => {
  const feedback = read('./templates/feedback-workflows.css');
  assert.match(template, /\.forge-feedback-primary:disabled\{background:var\(--forge-disabled-bg\)/);
  assert(feedback.includes('@media(pointer:coarse)'));
  assert(feedback.includes('font-size:16px'));
  assert(feedback.includes('min-height:44px'));
  assert.match(feedback, /@media\(pointer:coarse\)[\s\S]*\.forge-branch-dialog \.forge-feedback-upload,[^}]*min-height:44px/);
  assert.match(feedback, /@media\(pointer:coarse\)[\s\S]*\.forge-branch-dialog \.forge-feedback-field input,[^}]*min-height:44px/);
});
test('dynamic title text inherits heading styles and progress stays readable', () => {
  assert(template.includes('h2 span:not(.sc-interp)'));
  assert(!template.includes('h2 span{font-size:12px'));
  assert(template.includes('class="fg-run-progress-copy"'));
  assert(template.includes('.fg-run-progress-copy{font-size:var(--fg-text-xs);line-height:18px'));
  assert(template.includes('.fg-run-progress-cell{grid-column:1/-1}'));
});

test('branch dialog has a compact, scoped density without shrinking rework editors', () => {
  assert(template.includes('width:min(560px,calc(100vw - 40px))'));
  assert(template.includes('.forge-branch-dialog .forge-feedback-field input{height:34px'));
  assert(template.includes('.forge-branch-dialog .forge-feedback-field textarea{height:72px;min-height:72px'));
  assert(template.includes('.review-workbench-rework-form .forge-feedback-field textarea{margin-top:0;height:128px;min-height:128px}'));
  assert(template.includes('grid-template-columns:88px minmax(0,1fr)'));
  assert(template.includes('.forge-branch-notice{display:flex;align-items:flex-start;gap:8px;padding:0;background:transparent;border:0'));
});
