import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { updateReviewCta } from './update-review-cta.mjs';
import { semanticMarkup } from './postman-ui/semantic-colors.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('./templates/forge-base.html');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const decode = value => JSON.parse(value.slice(value.indexOf(opening) + opening.length, value.lastIndexOf(closing)).trim());
const template = decode(source), css = read('./templates/review-cta.css');
const controls = /<button type="button" class="forge-review-cta\b[^>]*>[\s\S]*?<\/button>/g;

test('review, draft and Reroll entry CTAs have accurate labels and omit arrow icons', () => {
  const buttons = [...template.matchAll(controls)].map(match => match[0]);
  assert.equal(buttons.length, 4);
  for (const button of buttons) {
    assert.doesNotMatch(button, /<svg|\[\[icon:|style=|review-workbench-reject/);
    assert.match(button, /sc-camel-on-click="{{ it\.(?:start|reroll) }}"/);
  }
  assert(buttons[0].endsWith('>开始审核</button>'));
  assert(buttons[0].includes('aria-haspopup="dialog"'));
  assert(buttons[1].endsWith('>继续填写返工说明</button>'));
  assert(buttons[2].endsWith('>Reroll</button>'));
  assert(buttons[3].endsWith('>前往生产配置 Reroll</button>'));
});

test('entry colors and typography have consistent hover, press, focus, disabled and touch states', () => {
  assert(template.includes(css.trimEnd()));
  assert.match(css, /background:var\(--forge-accent-soft\);color:var\(--forge-accent\);font:500 13px\/20px var\(--forge-font\)/);
  assert.match(css, /:hover:not\(:disabled\)\{background:var\(--forge-selected-hover\);color:var\(--forge-accent-hover\)/);
  assert.match(css, /:active:not\(:disabled\)\{[^}]*border-color:var\(--forge-accent-hover\)/);
  assert.match(css, /:focus-visible\{outline:2px solid var\(--forge-accent\);outline-offset:2px/);
  assert.match(css, /:disabled\{background:var\(--forge-disabled-bg\);color:var\(--forge-disabled-text\)/);
  assert.match(css, /@media\(max-width:760px\),\(pointer:coarse\).*min-height:44px/);
  assert.doesNotMatch(css, /#[a-f\d]{3,8}\b/i, 'use existing semantic tokens, not one-off colors');
});

test('focused CTA migration preserves every method and all markup outside entry controls', () => {
  assert.equal(updateReviewCta(source), source);
  const legacy = template.replace(controls, button => button.replace(' class="forge-review-cta', ' style="color:#111" class="old-review-cta').replace('</button>', ' <svg data-phosphor="arrow-right"></svg></button>'))
    .replace(/\/\* review-cta:start \*\/[\s\S]*?\/\* review-cta:end \*\/\n?/, '');
  const fixture = source.slice(0, source.indexOf(opening) + opening.length) + '\n' + JSON.stringify(legacy).replaceAll('</script>', '<\\u002Fscript>') + closing;
  const migrated = updateReviewCta(fixture);
  // A missing CSS block is reinserted at the stylesheet tail; later feature blocks
  // need not move just to reproduce the original byte offset of this older block.
  const withoutCtaCss = value => decode(value).replace(/\/\* review-cta:start \*\/[\s\S]*?\/\* review-cta:end \*\/\n?/, '');
  assert.equal(withoutCtaCss(migrated), withoutCtaCss(source));
  assert.equal(updateReviewCta(migrated), migrated);
  const code = value => value.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  assert.equal(code(decode(migrated)), code(legacy));
});

test('review and Reroll share filled primary states, dimensions and mobile alignment', () => {
  const selector = '.forge-review-cta:is(.cta-repair,.cta-reroll)';
  assert(css.includes(selector + '{min-width:92px;min-height:36px;padding:7px 14px;background:var(--fg-action);border-color:var(--fg-action);color:var(--fg-on-action)}'));
  for (const [state, surface] of [['hover', 'hover'], ['active', 'pressed']]) {
    assert(css.includes(selector + ':' + state + ':not(:disabled){background:var(--fg-action-' + surface + ');border-color:var(--fg-action-' + surface + ');color:var(--fg-on-action)}'));
  }
  assert(css.includes(selector + ':disabled{background:var(--forge-disabled-bg);border-color:var(--forge-border);color:var(--forge-disabled-text)}'));
  assert(css.includes(selector + '{min-height:44px}'));
  assert(css.includes('justify-content:space-between!important;align-items:center!important'));
});

test('Postman never downgrades review or Reroll to the secondary tier', () => {
  for (const button of [...template.matchAll(controls)].map(match => match[0])) {
    const rendered = semanticMarkup(button);
    assert.match(rendered, /data-pm-primary="true"/);
    assert.doesNotMatch(rendered, /data-pm-secondary=/);
    assert.equal(semanticMarkup(rendered), rendered);
    assert.equal(rendered.match(/sc-camel-on-click="[^"]+"/)[0], button.match(/sc-camel-on-click="[^"]+"/)[0]);
  }
});
