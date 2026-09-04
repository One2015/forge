import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
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

// The review workbench is a queue card promoted to position:fixed, so its body kept
// the card's fixed row height and left a band of dead space under two short columns.
// Make the open card a flex column whose body fills the remaining height, with the
// same two-column split the delivery Item modal uses.
swap(
  'review card becomes a flex column when open',
  '<div sc-camel-on-click="{{ it.stop }}" role="{{ it.dialogRole }}" aria-modal="{{ it.ariaModal }}" aria-label="{{ it.shortName }} 审核工作台" style="background:#fff;border:1px solid {{ it.cardBorder }};border-radius:14px;overflow:{{ it.modalOverflow }};position:{{ it.modalPosition }};inset:{{ it.modalInset }};z-index:{{ it.modalZ }};box-shadow:{{ it.modalShadow }};max-height:{{ it.modalMaxHeight }}">',
  '<div sc-camel-on-click="{{ it.stop }}" role="{{ it.dialogRole }}" aria-modal="{{ it.ariaModal }}" aria-label="{{ it.shortName }} 审核工作台" style="background:#fff;border:1px solid {{ it.cardBorder }};border-radius:14px;overflow:{{ it.modalOverflow }};position:{{ it.modalPosition }};inset:{{ it.modalInset }};z-index:{{ it.modalZ }};box-shadow:{{ it.modalShadow }};max-height:{{ it.modalMaxHeight }};display:{{ it.modalDisplay }};flex-direction:column">',
);

swap(
  'card header stays a fixed-height band',
  '<div sc-camel-on-click="{{ it.toggle }}" style="display:grid;grid-template-columns:124px minmax(0,1fr) clamp(190px,20vw,220px);gap:clamp(12px,1.6vw,18px);align-items:center;height:122px;padding:14px 16px;cursor:pointer;background:{{ it.cardBg }}"',
  '<div sc-camel-on-click="{{ it.toggle }}" style="flex:none;display:grid;grid-template-columns:124px minmax(0,1fr) clamp(190px,20vw,220px);gap:clamp(12px,1.6vw,18px);align-items:center;height:122px;padding:14px 16px;cursor:pointer;background:{{ it.cardBg }}"',
);

swap(
  'workbench body fills the modal in two columns',
  '<div style="border-top:1px solid #f0ece5;background:#fcfbf9;padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:clamp(14px,2vw,20px);align-items:stretch;grid-auto-rows:{{ it.panelRow }}">',
  '<div style="flex:1;min-height:0;overflow:hidden;border-top:1px solid #f0ece5;background:#fcfbf9;padding:16px;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(340px,.8fr);grid-template-rows:minmax(0,1fr);gap:clamp(14px,2vw,20px);align-items:stretch">',
);

swap(
  'modal presentation data',
  "            modalOverflow: st.reviewOpen === key ? 'auto' : 'hidden',",
  "            modalOverflow: 'hidden',\n            modalDisplay: st.reviewOpen === key ? 'flex' : 'block',",
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Review workbench is now a full-height two-column modal');
