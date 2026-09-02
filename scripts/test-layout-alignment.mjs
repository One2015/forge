import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const template = JSON.parse(read('../public/forge.html').split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const delivery = read('./templates/delivery-workflows.css');
const feedback = read('./templates/feedback-workflows.css');

test('logo actions share one top-aligned column with margin-free helper text', () => {
  const editor = read('./templates/delivery-editor.html');
  assert.match(editor, /class="forge-delivery-logo-controls">\s*<div class="forge-delivery-logo-actions">[^]*?deliveryEditor\.uploadLogo[^]*?deliveryEditor\.removeLogo[^]*?<\/div>\s*<p class="forge-delivery-help">/);
  assert.match(delivery, /\.forge-delivery-logo-upload\{[^}]*grid-template-columns:var\(--forge-logo-size\) minmax\(0,1fr\);align-items:start/);
  assert.match(delivery, /\.forge-delivery-logo-controls\{display:grid;gap:6px;min-width:0\}/);
  assert(delivery.includes('.forge-delivery-logo-controls .forge-delivery-help{margin:0}'));
  assert(template.includes('class="forge-delivery-logo-actions"'));
});

test('paired tag controls have matching narrow-screen heights without enlarging file or color inputs', () => {
  assert(delivery.includes('.forge-delivery-tag-add{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px}'));
  assert.match(delivery, /@media\(max-width:600px\),\(pointer:coarse\)\{[^]*?input:not\(\[type="file"\]\):not\(\[type="color"\]\),\.forge-delivery-editor select\{height:44px\}/);
  assert.match(delivery, /\.forge-delivery-custom-color\{[^}]*margin-left:0\}/);
});

test('low-specificity form defaults allow component typography and colors to win', () => {
  assert(feedback.includes('.forge-feedback :where(input,textarea,select,button){font:inherit;color:inherit}'));
  assert(!template.includes('.forge-feedback :is(input,textarea,select,button){font:inherit;color:inherit}'));
});

test('empty attachment lists do not retain template-whitespace spacing', () => {
  assert(feedback.includes('.forge-feedback-attachments:not(:has(.forge-feedback-attachment)){display:none;margin:0}'));
  assert(!template.includes('.forge-feedback-attachments:empty'));
  assert(template.includes('.forge-feedback-attachments{display:grid;'));
});

test('long metadata can shrink and wrap while icons remain fixed', () => {
  assert.match(template, /\.forge-branch-source-copy\{[^}]*overflow-wrap:anywhere/);
  assert.match(template, /\.forge-task-link-consequence strong\{[^}]*overflow-wrap:anywhere/);
  assert(template.includes('.forge-profile-task-meta>span{min-width:0;flex:1;overflow-wrap:anywhere}'));
  assert(template.includes('.forge-profile-task-meta .forge-icon{flex:none}'));
});

test('profile spacing and mobile modal gutters align without changing density hierarchy', () => {
  assert.match(template, /\.forge-sidebar-profile\{display:flex;[^}]*min-height:56px;[^}]*padding:8px;/);
  assert(template.includes('.forge-profile-list{padding-inline:4px}'));
  assert.match(template, /\.forge-task-link-dialog\{width:min\(600px,calc\(100vw - 40px\)\);max-width:none;/);
  assert(template.includes('.forge-branch-dialog .forge-feedback-field input{height:34px'));
  assert(!delivery.includes('zoom:'));
});

test('generated CSS stays synchronized with token-based layout sources', () => {
  for (const name of ['delivery-workflows', 'forge-profile', 'task-link']) {
    assert(template.includes(read('./templates/' + name + '.css').trimEnd()), name);
  }
});
