import fs from 'node:fs';

const file = new URL('../public/forge.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const start = source.indexOf(opening), end = source.lastIndexOf(closing);
if (start < 0 || end < 0) throw new Error('Missing bundled template');
let template = JSON.parse(source.slice(start + opening.length, end).trim());
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const icon = (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
};
const markup = value => value.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, icon);

if (template.includes('<!-- case-labels:start -->')) {
  template = template.replace(/<!-- case-labels:start -->[\s\S]*?<!-- case-labels:end -->/, () => markup(read('case-labels.html')));
} else {
  const labelIndex = template.indexOf('样本标注</div>');
  const blockStart = template.lastIndexOf('<div style="margin-top:13px;', labelIndex);
  const blockEnd = template.indexOf('<sc-if value="{{ sheet.pick.hasBranches }}"', labelIndex);
  if (labelIndex < 0 || blockStart < 0 || blockEnd < 0) throw new Error('Missing sample label section');
  template = template.slice(0, blockStart) + markup(read('case-labels.html')) + '\n\n                  ' + template.slice(blockEnd);
}

const dataStart = template.indexOf('            sampleTabs:');
const dataEnd = [
  template.indexOf('            canAppendRework:', dataStart),
  template.indexOf('            ...this.sheetDetailActionValues', dataStart)
].filter(index => index >= 0).sort((a, b) => a - b)[0] ?? -1;
if (dataStart < 0 || dataEnd < 0) throw new Error('Missing sample label data');
template = template.slice(0, dataStart) + `            sampleTabs: [['good', 'Good Case'], ['bad', 'Bad Case']].map(([kind, label]) => ({
              kind, label, good: kind === 'good', bad: kind === 'bad', selected: (st.sampleLabels || {})[r[2]] === kind,
              pick: e => {
                e.stopPropagation();
                const labels = Object.assign({}, this.state.sampleLabels || {});
                if (labels[r[2]] === kind) delete labels[r[2]];
                else labels[r[2]] = kind;
                this.setState({ sampleLabels: labels });
              }
            })),
` + template.slice(dataEnd);

// Update only the case controls in the workbench, preserving later workflow edits.
const reviewButtons = read('review-workbench.html').match(/<div class="review-workbench-case-options[^>]*>[\s\S]*?<\/div>/)?.[0];
if (!reviewButtons) throw new Error('Missing workbench case controls');
template = template.replace(/<div class="review-workbench-case-options[^>]*>[\s\S]*?<\/div>/, () => markup(reviewButtons));
template = template.replace(/\.review-workbench-case-options (?:button(?:\:hover)?|\.review-workbench-(?:good|bad)(?:\[data-selected="true"\])?)\{[^}]*\}\n?/g, '');
template = template.replace(/\/\* case-labels:start \*\/[\s\S]*?\/\* case-labels:end \*\/(?:\r?\n)?/, '');
template = template.replace('</style>', read('case-labels.css') + '\n</style>');
new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
const result = source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
if (result !== source) fs.writeFileSync(file, result);
console.log('Refined Good / Bad Case controls');
