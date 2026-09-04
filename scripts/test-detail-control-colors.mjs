import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { updateDetailControlColors } from './update-detail-control-colors.mjs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const source = read('../public/forge.html');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const actions = read('./templates/detail-actions.css');
const refinement = read('./templates/forge-refinement.css');

test('detail close is a labelled native button outside the scrolling body', () => {
  const close = template.match(/<button type="button" class="forge-sheet-close"[\s\S]*?<\/button>/)?.[0];
  assert(close); assert(close.includes('aria-label="关闭 Item 详情"'));
  assert(close.includes('sc-camel-on-click="{{ sheet.closePick }}"'));
  assert(close.includes('data-phosphor="x"')); assert(close.includes('title="关闭 · Esc"'));
  assert(!close.includes('style-hover')); assert(!template.includes('<div class="forge-sheet-close"'));
  assert(template.indexOf(close) < template.indexOf('<div class="forge-sheet-grid"'));
  assert.match(refinement, /\.forge-sheet-close\{position:absolute;[^}]*z-index:6;[^}]*width:32px;height:32px;[^}]*background:var\(--forge-panel\);color:var\(--forge-text\);box-shadow:0 2px 8px/);
  assert.match(refinement, /\.forge-sheet-close:hover\{background:var\(--forge-hover\)/);
  assert.match(refinement, /\.forge-sheet-close:active\{background:var\(--forge-pressed\)/);
  assert.match(refinement, /\.forge-sheet-close:focus-visible\{outline:2px solid var\(--forge-accent\)/);
  assert.match(refinement, /@media\(max-width:760px\).*\.forge-sheet-close\{[^}]*width:44px;height:44px/);
});

test('approved actions retain secondary hierarchy and own their hover, press and disabled colors', () => {
  assert.match(actions, /\.forge-detail-secondary\{background:var\(--forge-accent-soft\);color:var\(--forge-accent\);border-color:var\(--forge-accent\)/);
  assert.match(actions, /\.forge-detail-download\{background:var\(--forge-subtle\);color:var\(--forge-muted\)/);
  assert.match(actions, /\.forge-detail-secondary:hover:not\(:disabled\)\{background:var\(--forge-selected-hover\)/);
  assert.match(actions, /\.forge-detail-primary:active:not\(:disabled\)\{background:var\(--forge-accent-hover\);border-color:var\(--forge-accent-hover\);color:#fff/);
  assert.match(actions, /\.forge-detail-action:disabled\{color:var\(--forge-disabled-text\);background:var\(--forge-disabled-bg\)/);
  assert.doesNotMatch(read('./templates/interaction-states.css'), /\.forge-detail-(?:action|primary)/, 'global neutral rules must not override semantic footer states');
  const footer = template.match(/<!-- detail-footer:start -->[\s\S]*?<!-- detail-footer:end -->/)[0];
  assert(footer.includes('disabled="{{ sheet.pick.cannotAppendRework }}"'));
  assert(footer.includes('aria-label="下载已通过版本"'));
});

test('rework submit is excluded from every neutral hover and press background rule', () => {
  const neutralRules = [...actions.matchAll(/([^{}]+)\{([^{}]+)\}/g)]
    .filter(([, selector, declarations]) => selector.includes('.forge-detail-action') && /background:var\(--forge-(?:hover|pressed)\)/.test(declarations));
  assert.equal(neutralRules.length, 2);
  for (const [, selector] of neutralRules) {
    assert(selector.includes(':not(.forge-detail-primary):not(.forge-detail-secondary)'));
    assert(selector.includes(':not(:disabled)'));
  }
  assert.match(actions, /\.forge-detail-primary:hover:not\(:disabled\)\{background:var\(--forge-accent-hover\);border-color:var\(--forge-accent-hover\);color:#fff\}/);
  const submit = template.match(/<button\b[^>]*sc-camel-on-click="{{ sheet\.pick\.submitRework }}"[^>]*>提交返工<\/button>/)?.[0];
  assert(submit);
  assert(submit.includes('class="forge-detail-action forge-detail-primary"'));
  assert(submit.includes('disabled="{{ sheet.pick.cannotSubmitRework }}"'));
  assert.doesNotMatch(submit, /style-hover|style=/);
});

const luminance = hex => {
  const rgb = hex.replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
test('action text and icons keep AA contrast in default, hover and pressed palettes', () => {
  const all = refinement + read('./templates/interaction-states.css');
  const token = name => all.match(new RegExp('--forge-' + name + ':(#[a-f0-9]{3,6})[;}]'))[1].replace(/^#fff$/, '#ffffff');
  for (const [fg, bg] of [['accent','accent-soft'], ['accent-hover','selected-hover'], ['muted','subtle'], ['text','hover'], ['text','panel'], ['text','pressed']]) {
    assert(contrast(token(fg), token(bg)) >= 4.5, fg + ' on ' + bg);
  }
  assert(contrast('#ffffff', token('accent-hover')) >= 4.5);
});

test('focused detail-control migration is idempotent and retains synchronized styles', () => {
  assert.equal(updateDetailControlColors(source), source);
  assert(template.includes(actions.trimEnd())); assert(template.includes(refinement.trimEnd()));
});
