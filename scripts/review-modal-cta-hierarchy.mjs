import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Forge template bundle not found');
}

let template = JSON.parse(source.slice(start + open.length, end).trim());

const swap = (label, before, after, expected = 1) => {
  const count = template.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`${label}: expected ${expected} match(es), found ${count}`);
  }
  template = template.replaceAll(before, after);
  console.log(`${label}: ${count} replacement(s)`);
};

// Same two review actions as the delivery Item modal, so the same hierarchy:
// 要求返工 is the primary CTA in the trailing slot, 通过 the secondary outline
// button in the leading slot.
swap(
  'review workbench CTA hierarchy',
  '<button sc-camel-on-click="{{ it.rework }}" style="height:36px;padding:0 14px;border:1px solid #eabaa8;background:#fff;border-radius:8px;font-size:13px;font-weight:600;color:#8f4029;cursor:pointer" style-hover="background:#fdf5f2">要求返工</button>\n                          <button sc-camel-on-click="{{ it.pass }}" style="height:36px;padding:0 16px;border:0;background:#4f7a52;color:#fff;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#456b48">通过</button>',
  '<button sc-camel-on-click="{{ it.pass }}" style="height:36px;padding:0 16px;border:1px solid #a7cfae;background:#fff;color:#3f6b45;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#f2f7f2">通过</button>\n                          <button sc-camel-on-click="{{ it.rework }}" style="height:36px;padding:0 14px;border:0;background:#b1543a;color:#fff;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#95452f">要求返工</button>',
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Review workbench CTAs match the Item modal');
