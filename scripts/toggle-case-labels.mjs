import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Scope this migration to the two marking callbacks. The broader historical
// generators also contain earlier layout and review logic; do not replay them.
export function toggleCaseLabels(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing bundled template');
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  for (const [id, kind, label, indent] of [['r[2]', 'kind', 'label', '                '], ['meta[0]', 'value', "(value === 'good' ? 'Good Case' : 'Bad Case')", '            ']]) {
    const previous = `${indent}this.setState({ sampleLabels: Object.assign({}, this.state.sampleLabels || {}, { [${id}]: ${kind} }) });`;
    const priorToggle = `${indent}const labels = Object.assign({}, this.state.sampleLabels || {});
${indent}if (labels[${id}] === ${kind}) delete labels[${id}];
${indent}else labels[${id}] = ${kind};
${indent}this.setState({ sampleLabels: labels });`;
    const next = `${indent}const labels = Object.assign({}, this.state.sampleLabels || {});
${indent}const removing = labels[${id}] === ${kind};
${indent}if (removing) delete labels[${id}];
${indent}else labels[${id}] = ${kind};
${indent}this.setState({ sampleLabels: labels, reviewToast: removing ? '已取消 ' + ${label} + ' 标注' : '已标注为 ' + ${label}, reviewToastAt: Date.now() });`;
    if (template.includes(next)) continue;
    const current = template.includes(priorToggle) ? priorToggle : previous;
    if (template.split(current).length !== 2) throw new Error('Case marking callback changed: ' + id);
    template = template.replace(current, () => next);
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = toggleCaseLabels(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Case marking toggles off when the selected option is clicked again');
}
