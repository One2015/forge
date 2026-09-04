import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { updateDeliveryCustomerHeading } from './update-delivery-customer-heading.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('../public/forge.html');
const template = JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const heading = read('./templates/delivery-customer-heading.html').trimEnd();
const css = read('./templates/delivery-workflows.css').trimEnd();

test('customer logos and names form one centered identity while metadata may wrap', () => {
  assert(template.includes(heading));
  assert(template.includes(css));
  assert.match(heading, /class="forge-delivery-customer-identity">\s*<sc-if value="{{ c.hasLogo }}"[^]*?<img[^]*?width="28" height="28"[^]*?<h2 class="forge-delivery-customer-name">{{ c.name }}<\/h2>\s*<\/div>\s*<p class="forge-delivery-customer-meta">{{ c.meta }}<\/p>/);
  assert.match(css, /\.forge-delivery-customer-heading\{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;/);
  assert.match(css, /\.forge-delivery-customer-identity\{display:flex;align-items:center;gap:10px;min-width:0;max-width:100%\}/);
  for (const role of ['name', 'meta']) assert.match(css, new RegExp('\\.forge-delivery-customer-' + role + '\\{[^}]*overflow-wrap:anywhere'));
  assert(!heading.includes('tabindex'));
});

test('customer heading updater is idempotent and preserves all other bundled content', () => {
  assert.equal(updateDeliveryCustomerHeading(source), source);
  const legacy = '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap">\n<sc-if value="{{ c.hasLogo }}"><img class="forge-delivery-customer-logo" /></sc-if>\n<div style="font-size:15px;font-weight:600">{{ c.name }}</div>\n<div style="font-size:13px;color:var(--forge-muted)">{{ c.meta }}</div>\n</div>';
  const oldTemplate = template.replace(heading, legacy);
  const start = source.indexOf('<script type="__bundler/template">') + '<script type="__bundler/template">'.length;
  const closing = '\n</script>\n</body>\n</html>';
  const oldSource = source.slice(0, start) + '\n' + JSON.stringify(oldTemplate).replaceAll('</script>', '<\\u002Fscript>') + closing;
  assert.equal(updateDeliveryCustomerHeading(oldSource), source);
  assert.throws(() => updateDeliveryCustomerHeading('<html></html>'), /Missing bundled template/);
});
