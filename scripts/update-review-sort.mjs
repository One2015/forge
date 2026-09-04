import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();

export function updateReviewSort(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const markup = read('review-sort.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
    const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
    const body = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
    return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
  });
  const legacy = /<div style="display:flex;align-items:center;gap:8px">\s*<div style="font-size:13px;color:var\(--forge-muted\);white-space:nowrap">排序<\/div>[\s\S]*?<\/sc-for>\s*<\/div>\s*<\/div>/;
  const pattern = template.includes('<!-- review-sort:start -->') ? /<!-- review-sort:start -->[\s\S]*?<!-- review-sort:end -->/ : legacy;
  if (!pattern.test(template)) throw new Error('Review sorting control not found');
  template = template.replace(pattern, () => markup);
  const css = read('review-sort.css');
  if (template.includes('/* review-sort:start */')) template = template.replace(/\/\* review-sort:start \*\/[\s\S]*?\/\* review-sort:end \*\//, () => css);
  else template = template.replace('/* review-queue-layout:end */', () => '/* review-queue-layout:end */\n' + css);
  if (!template.includes('// review-sort-values')) {
    const values = /        sorts: \[\['newest', '最新'\], \['oldest', '最旧'\]\]\.map\(x => \{[\s\S]*?\n        \}\),/;
    if (!values.test(template)) throw new Error('Review sort values not found');
    template = template.replace(values, () => `        // review-sort-values
        sortValue: sortKey,
        setSort: event => {
          const value = event.target.value;
          if (value === 'newest' || value === 'oldest') this.setState({ reviewSort: value });
        },
        sorts: [['newest', '最新'], ['oldest', '最旧']].map(([key, label]) => ({ key, label })),`);
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html', import.meta.url), source = fs.readFileSync(file, 'utf8');
  const result = updateReviewSort(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Review sorting now uses the compact delivery-style dropdown');
}
