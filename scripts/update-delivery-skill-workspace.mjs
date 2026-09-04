import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderDeliveryEditor } from './render-delivery-editor.mjs';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const icons = text => text.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});

export function updateDeliverySkillWorkspace(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const replace = (pattern, replacement) => {
    if (!pattern.test(template)) throw new Error('Missing Skill workspace anchor: ' + pattern);
    template = template.replace(pattern, () => replacement);
  };
  const block = read('delivery-skill-workspace.js');
  const wizard = read('delivery-wizard.js');
  const reviewAssignments = read('delivery-review-assignments.js');
  if (template.includes('// delivery-review-assignments:start')) replace(/  \/\/ delivery-review-assignments:start[\s\S]*?  \/\/ delivery-review-assignments:end/, reviewAssignments);
  else replace(/  \/\/ delivery-workflows:start/, reviewAssignments + '\n\n  // delivery-workflows:start');
  if (template.includes('// delivery-wizard:start')) replace(/  \/\/ delivery-wizard:start[\s\S]*?  \/\/ delivery-wizard:end/, wizard);
  else replace(/  \/\/ delivery-workflows:start/, wizard + '\n\n  // delivery-workflows:start');
  if (template.includes('// delivery-skill-workspace:start')) replace(/  \/\/ delivery-skill-workspace:start[\s\S]*?  \/\/ delivery-skill-workspace:end/, block);
  else replace(/  \/\/ delivery-skill-library:start/, block + '\n\n  // delivery-skill-library:start');
  replace(/  \/\/ delivery-skill-library:start[\s\S]*?  \/\/ delivery-skill-library:end/, read('delivery-skill-library.js'));
  const page = read('delivery-create-page.js');
  if (template.includes('// delivery-create-page:start')) replace(/  \/\/ delivery-create-page:start[\s\S]*?  \/\/ delivery-create-page:end/, page);
  else replace(/  \/\/ delivery-workflows:start/, page + '\n\n  // delivery-workflows:start');
  for (const [file, names] of [
    ['task-link-methods.js', ['taskLinkSource', 'deliveryLinkState', 'sheetRows']],
    ['delivery-methods.js', ['deliveryData', 'resolveSheetLines', 'openDeliveryEditor', 'closeDeliveryEditor', 'setDeliveryList', 'uploadDeliveryList', 'uploadDeliverySkills', 'setDeliveryTagComposer', 'addDeliveryTag', 'deliveryEditorIssue', 'saveDeliveryEditor', 'deliveryEditorValues', 'deliverySheetExtras', 'boundReviewSkills', 'downloadReviewSkill', 'reviewSkillValues']],
    ['profile-methods.js', ['profileSkills', 'saveProfileSkills']]
  ]) for (const name of names) {
    const pattern = new RegExp('  (?:async )?' + name + '\\([^]*?(?=\\n  (?:async )?\\w+\\(|\\n  // [\\w-]+:end)');
    const method = read(file).match(pattern)?.[0];
    if (!method) throw new Error('Missing method ' + name);
    if (name === 'setDeliveryTagComposer' && !pattern.test(template)) replace(/  addDeliveryTag\(\)/, method + '\n  addDeliveryTag()');
    else if (name === 'downloadReviewSkill' && !pattern.test(template)) replace(/  patchSkillSession\(/, method + '\n  patchSkillSession(');
    else replace(pattern, method);
  }
  replace(/<!-- delivery-editor:start -->[\s\S]*?<!-- delivery-editor:end -->/, icons(renderDeliveryEditor(read('delivery-editor.html'))));
  for (const [marker, prefix] of [['review', 'it.skills.'], ['sheet', 'sheet.pick.skills.']]) {
    replace(new RegExp('<!-- ' + marker + '-skill-session:start -->[\\s\\S]*?<!-- ' + marker + '-skill-session:end -->'),
      '<!-- ' + marker + '-skill-session:start -->\n' + icons(read('review-skills.html').replaceAll('skillView.', prefix)) + '\n<!-- ' + marker + '-skill-session:end -->');
  }
  template = template.replace("['delivery', 'sheet'].indexOf(view)", "['delivery', 'sheet', 'delivery-create'].indexOf(view)");
  template = template.replace("['review', 'delivery', 'sheet', 'itemlife', 'overview', 'pipeedit']", "['review', 'delivery', 'sheet', 'delivery-create', 'itemlife', 'overview', 'pipeedit']");
  if (!template.includes('deliveryLeave: this.deliveryLeaveValues()')) replace(/      deliveryEditor: this.deliveryEditorValues\(\),/, '      deliveryEditor: this.deliveryEditorValues(),\n      deliveryLeave: this.deliveryLeaveValues(),');
  if (!template.includes('    this.unmountDeliveryDraftGuard();\n    this.unmountSidebarInteractions();')) replace(/    this.unmountSidebarInteractions\(\);/, '    this.unmountDeliveryDraftGuard();\n    this.unmountSidebarInteractions();');
  if (!template.includes('if (this.handleDeliveryEditorKey(e)) return;')) replace(/      if \(this.state.deliveryEditor\) \{\n        if \(\(e.ctrlKey \|\| e.metaKey\)[^\n]+\n        return;\n      \}/, '      if (this.handleDeliveryEditorKey(e)) return;');
  template = template.replace("const backLabel = ret.origin === 'notification'", "const backLabel = ret.origin === 'delivery' ? '返回交付' : ret.origin === 'notification'");
  replace(/\/\* delivery-workflows:start \*\/[\s\S]*?\/\* delivery-workflows:end \*\//, read('delivery-workflows.css'));
  replace(/  \/\/ delivery-members:start[\s\S]*?  \/\/ delivery-members:end/, read('delivery-members.js'));
  if (template.includes('/* delivery-wizard:start */')) replace(/\/\* delivery-wizard:start \*\/[\s\S]*?\/\* delivery-wizard:end \*\//, read('delivery-wizard.css'));
  else replace(/<\/style>/, read('delivery-wizard.css') + '\n</style>');
  replace(/<!-- delivery-sheet-extras:start -->[\s\S]*?<!-- delivery-sheet-extras:end -->/, icons(read('delivery-sheet-extras.html')));
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateDeliverySkillWorkspace(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated delivery Skill workspace and personal sync');
}
