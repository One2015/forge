import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const template = JSON.parse(read('../public/forge.html').split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const delivery = read('./templates/delivery-workflows.css');
const feedback = read('./templates/feedback-workflows.css');

test('logo upload and sheet name share a compact identity row with accessible help', () => {
  const editor = read('./templates/delivery-editor.html');
  assert.match(editor, /class="forge-delivery-identity">[^]*?class="forge-delivery-logo-tile"[^]*?deliveryEditor\.uploadLogo[^]*?forge-delivery-identity-name[^]*?id="forge-delivery-name"[^]*?forge-delivery-identity-meta/);
  assert.match(delivery, /\.forge-delivery-identity\{[^}]*grid-template-columns:var\(--forge-logo-size\) minmax\(0,1fr\);align-items:start/);
  assert(delivery.includes('.forge-delivery-identity-meta .forge-delivery-help{margin:0}'));
  assert(!template.includes('forge-delivery-logo-help'));
  assert(template.includes('aria-label="上传客户品牌 Logo，PNG、JPG、WebP，最大 2 MB"'));
  assert(template.includes('disabled="{{ deliveryEditor.logoLoading }}"'));
  assert(template.includes('deliveryEditor.removeLogo'));
  assert(!template.includes('class="forge-delivery-logo-upload"'));
});

test('wizard basic information keeps supplier identity beside the two required input rows', () => {
  const wizard = read('./templates/delivery-wizard.html');
  const styles = read('./templates/delivery-wizard.css');
  assert.match(wizard, /class="forge-wizard-basic-identity">[^]*?class="forge-wizard-basic-logo">[^]*?class="forge-delivery-logo-tile"[^]*?供应商 Logo[^]*?class="forge-wizard-basic-fields">[^]*?id="forge-delivery-name"[^]*?id="forge-delivery-customer"[^]*?id="forge-delivery-target"/);
  assert(!wizard.includes('>Logo <span class="forge-wizard-optional">选填</span>'));
  assert(!wizard.includes('<p class="forge-delivery-help">PNG、JPG、WebP，最大 2 MB</p>'));
  assert(wizard.includes('aria-label="上传供应商 Logo，PNG、JPG、WebP，最大 2 MB"'));
  assert.match(styles, /\.forge-wizard-basic-identity\{[^}]*grid-template-columns:128px minmax\(0,1fr\)/);
  assert.match(styles, /\.forge-wizard-basic-identity\{[^}]*align-items:stretch/);
  assert.match(styles, /\.forge-wizard-basic-logo \.forge-delivery-logo-tile\{[^}]*height:100%/);
});

test('progressive Tag composer and compact ZIP CTA keep accessible mobile target heights', () => {
  assert(delivery.includes('.forge-delivery-tag-actions{display:flex;align-items:center;gap:16px;margin-top:12px}'));
  assert.match(delivery, /@media\(max-width:600px\),\(pointer:coarse\)\{[^]*?input:not\(\[type="file"\]\):not\(\[type="color"\]\),\.forge-delivery-editor select\{height:44px\}/);
  assert.match(delivery, /\.forge-delivery-custom-color\{[^}]*width:auto;height:32px;margin:0/);
  assert.match(delivery, /\.forge-delivery-list-upload\{[^}]*width:auto;height:32px;min-height:32px/);
  assert.match(delivery, /\.forge-delivery-color-palette>button:not\(\.forge-delivery-tag-reset\),\.forge-delivery-skill-detail \.forge-delivery-icon-button\{width:44px;height:44px/);
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
