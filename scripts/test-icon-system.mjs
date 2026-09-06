import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {buildPostman} from './postman-ui/build.mjs';
import {phosphorIconSizes} from './postman-ui/phosphor-icons.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('./templates/forge-base.html');
const built = JSON.parse(buildPostman(source).split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const markup = built.slice(0, built.indexOf('<script type="text/x-dc"'));
const normalize = value => value.replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>').trim();

const officialGeometry = name => normalize(read(`../assets/phosphor/regular/${name}.svg`)
  .match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1] || '');

test('the final product uses only vendored Phosphor Regular interface icons', () => {
  const svgs = [...markup.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g)];
  assert(svgs.length > 200, 'expected the complete product icon set');
  let interfaceCount = 0;
  let chartCount = 0;
  let controlCount = 0;
  for (const [, attrs, body] of svgs) {
    if (/\bdata-chart=/.test(attrs)) {
      chartCount++;
      assert.match(attrs, /aria-hidden="true"/);
      continue;
    }
    if (/\bdata-control="checkbox"/.test(attrs)) {
      controlCount++;
      assert.match(attrs, /class="pm-checkbox-mark"/);
      continue;
    }
    interfaceCount++;
    const name = attrs.match(/\bdata-phosphor="([\w-]+)"/)?.[1];
    assert(name, `non-Phosphor interface SVG: ${attrs}`);
    assert.match(attrs, /class="[^"]*\bforge-icon\b/);
    assert.match(attrs, /aria-hidden="true"/);
    assert.match(attrs, /focusable="false"/);
    const size = Number(attrs.match(/\bwidth="(\d+)"/)?.[1]);
    assert(phosphorIconSizes.includes(size), `${name} uses unsupported size ${size}`);
    assert.equal(normalize(body), officialGeometry(name), `${name} geometry drifted from the vendored library`);
  }
  assert(interfaceCount > 200);
  assert(chartCount >= 2);
  assert(controlCount > 0);
  assert.doesNotMatch(markup, /\[\[icon:[^\]]+\]\]/);
});

test('browser-owned profile controls reuse Phosphor instead of CSS-drawn carets', () => {
  const script = read('../public/postman-ui/rbac-prototype.js');
  const styles = read('../public/postman-ui/rbac-prototype.css');
  const icons = [...script.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g)];
  assert(icons.length > 0);
  for (const [, attrs, body] of icons) {
    const name = attrs.match(/\bdata-phosphor="([\w-]+)"/)?.[1];
    assert(name, `non-Phosphor RBAC icon: ${attrs}`);
    assert.equal(normalize(body), officialGeometry(name));
  }
  assert.match(script, /创建 Skill\$\{dockCaretIcon\}/);
  assert.doesNotMatch(styles, /rbac-skill-create-menu>summary::after/);
});

test('shared controls do not draw substitute interface icons in CSS', () => {
  const controls = read('../public/postman-ui/controls.css');
  const pipeline = read('../public/postman-ui/pipeline-responsive.css');
  const pages = read('../public/postman-ui/pages.css');
  assert.doesNotMatch(controls, /pm-task-tag-picker>summary::after/);
  assert.doesNotMatch(pipeline, /pm-pipeline-version-node summary::after|content:\s*['"]›['"]/);
  assert.doesNotMatch(pages, /info-filled\.svg/);
  assert.equal(fs.existsSync(new URL('../public/postman-ui/info-filled.svg', import.meta.url)), false);
});
