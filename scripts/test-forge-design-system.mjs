import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { buildPostman } from './postman-ui/build.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const tokens = read('../public/postman-ui/tokens.css');
const system = read('../public/postman-ui/forge-system.css');
const behavior = read('../public/postman-ui/forge-system.mjs');
const source = read('./templates/forge-base.html');
const built = JSON.parse(buildPostman(source).split('<script type="__bundler/template">')[1].split('\n</script>')[0]);

test('Forge exposes semantic light, dark and density tokens', () => {
  for (const token of [
    'surface-canvas', 'surface-subtle', 'surface-raised', 'surface-overlay',
    'text-primary', 'text-secondary', 'text-muted', 'border-default',
    'border-subtle', 'accent-primary', 'status-success', 'status-warning',
    'status-danger', 'focus-ring', 'motion-control', 'z-dialog',
  ]) assert.match(tokens, new RegExp(`--${token}:`), token);
  assert.match(tokens, /:root\[data-forge-theme="dark"\]/);
  assert.match(tokens, /:root\[data-forge-density="compact"\]/);
  assert.match(tokens, /--radius-xs:\.375rem; --radius-control:\.5rem; --radius-surface:\.75rem/);
});

test('theme control is native while density remains URL-configurable without a user toggle', () => {
  assert.doesNotMatch(built, /forge-density-toggle|data-forge-density-label|>紧凑</);
  assert.match(built, /id="forge-theme-toggle"[^>]*aria-pressed="false"/);
  assert.match(built, /src="\/postman-ui\/forge-system\.mjs"/);
  assert.match(behavior, /storage\.get\('forge-theme'\)/);
  assert.match(behavior, /query\.get\('density'\)/);
  assert.doesNotMatch(behavior, /storage\.(?:get|set)\('forge-density'\)|setDensity|forge-density-toggle/);
  assert.match(behavior, /forge:preference-change/);
  assert.doesNotMatch(behavior, /setState|DCLogic|fetch\(/);
});

test('AI-native surfaces use internal Forge adapters', () => {
  for (const className of [
    'forge-ai-composer', 'forge-ai-prompt', 'forge-ai-tool-call',
    'forge-ai-tool-result', 'forge-ai-artifact', 'forge-ai-thinking', 'forge-ai-error',
  ]) {
    assert.match(behavior, new RegExp(className));
    assert.match(system, new RegExp(`\\.${className}`));
  }
  assert.doesNotMatch(built, /@openai\/apps-sdk-ui/);
});

test('motion is explicit, two-dimensional and accessibility-aware', () => {
  assert.doesNotMatch(system, /transition\s*:\s*all\b/);
  assert.doesNotMatch(system, /perspective|rotate[XY]\(|translateZ\(|preserve-3d/);
  assert.match(system, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(system, /@media\(forced-colors:active\)/);
  assert.match(system, /outline:2px solid var\(--focus-ring\)!important/);
});

test('responsive system prevents global horizontal overflow by construction', () => {
  assert.match(system, /@media\(max-width:1180px\)/);
  assert.match(system, /@media\(max-width:760px\)/);
  assert.match(system, /@media\(max-width:480px\)/);
  assert.match(system, /@media\(pointer:coarse\)/);
  assert.match(tokens, /--size-touch:2\.75rem/);
});

test('sticky production tabs are opaque over scrolling page content', () => {
  assert.match(system, /\.forge-postman \.forge-production-tabs\{background:var\(--surface-canvas\)!important\}/);
});
