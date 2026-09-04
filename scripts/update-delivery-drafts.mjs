import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { updateDeliverySkillWorkspace } from './update-delivery-skill-workspace.mjs';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();

export function updateDeliveryDrafts(source) {
  source = updateDeliverySkillWorkspace(source);
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const replace = (pattern, text) => {
    if (!pattern.test(template)) throw new Error('Missing delivery drafts anchor: ' + pattern);
    template = template.replace(pattern, () => text);
  };
  if (template.includes('// delivery-drafts:start')) replace(/  \/\/ delivery-drafts:start[\s\S]*?  \/\/ delivery-drafts:end/, read('delivery-drafts.js'));
  else replace(/  \/\/ delivery-create-page:start/, read('delivery-drafts.js') + '\n\n  // delivery-create-page:start');
  if (template.includes('/* delivery-drafts:start */')) replace(/\/\* delivery-drafts:start \*\/[\s\S]*?\/\* delivery-drafts:end \*\//, read('delivery-drafts.css'));
  else replace(/\/\* delivery-workflows:end \*\//, '/* delivery-workflows:end */\n' + read('delivery-drafts.css'));
  if (template.includes('<!-- delivery-drafts:start -->')) replace(/<!-- delivery-drafts:start -->[\s\S]*?<!-- delivery-drafts:end -->/, read('delivery-drafts.html'));
  else replace(/(      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">\s*<div data-forge-segmented="pill" role="group"[^]*?list="{{ delivery.cats }}")/, read('delivery-drafts.html') + '\n\n' + template.match(/(      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">\s*<div data-forge-segmented="pill" role="group"[^]*?list="{{ delivery.cats }}")/)?.[0]);
  if (!template.includes('deliveryDrafts: this.deliveryDraftListValues()')) replace(/      deliveryLeave: this.deliveryLeaveValues\(\),/, '      deliveryLeave: this.deliveryLeaveValues(),\n      deliveryDrafts: this.deliveryDraftListValues(),');
  if (!template.includes('    this.loadDeliveryDrafts();\n    this.mountPanelMotion();')) replace(/  componentDidMount\(\) \{/, '  componentDidMount() {\n    this._deliveryDraftUnmounted = false;\n    this.loadDeliveryDrafts();');
  if (!template.includes('    this._deliveryDraftUnmounted = true;')) replace(/  componentWillUnmount\(\) \{/, '  componentWillUnmount() {\n    this._deliveryDraftUnmounted = true;');
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html', import.meta.url), source = fs.readFileSync(file, 'utf8');
  const result = updateDeliveryDrafts(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Added persistent local delivery drafts');
}
