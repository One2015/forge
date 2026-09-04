import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { refineProfilePanel } from './refine-profile-panel.mjs';

const source = fs.readFileSync(new URL('./templates/forge-base.html', import.meta.url), 'utf8');
const decode = source => JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const template = decode(source);
const html = template.match(/<!-- forge-profile:start -->[\s\S]*?<!-- forge-profile:end -->/)[0];
const css = template.match(/\/\* forge-profile:start \*\/[\s\S]*?\/\* forge-profile:end \*\//)[0];

test('profile names the tab and content Skill while retaining optional binding controls', () => {
  assert.match(html, /aria-controls="forge-profile-skills"[^>]*>Skill <span>/);
  assert.match(html, /id="forge-profile-skills" aria-label="Skill"/);
  assert(!html.includes('>关联 Skill <span>'));
  assert(html.includes('上传个人 Skill'));
  assert(html.includes('关联到交付数据单'));
});

test('tabs, empty states and editing share a fixed, viewport-bounded profile height', () => {
  assert.match(css, /\.forge-profile-panel\{[^}]*height:min\(500px,calc\(100dvh - 32px\)\)/);
  assert.match(css, /@media\(max-width:760px\)\{\.forge-profile-panel\{[^}]*height:min\(500px,calc\(100dvh - 24px\)\)/);
  assert.match(css, /\.forge-profile-scroll\{flex:1;overflow:auto;[^}]*min-height:0;scrollbar-gutter:stable/);
  assert(!css.includes('[data-editing='));
  assert(!/\.forge-profile-scroll\{[^}]*max-height/.test(css));
  assert.match(css, /\.forge-profile-header\{[^}]*flex:none/);
  assert.match(css, /\.forge-profile-switcher\{[^}]*flex:none/);
  assert.match(css, /\.forge-profile-footer\{[^}]*flex:none/);
});

test('the profile-only generator is idempotent and preserves all workflow logic', () => {
  const result = refineProfilePanel(source);
  assert.equal(result, source);
  assert.equal(refineProfilePanel(result), result);
  const stale = source.replace('>Skill <span>', '>关联 Skill <span>');
  assert.equal(refineProfilePanel(stale), source);
  const logic = html => html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  assert.equal(logic(decode(result)), logic(template));
});
