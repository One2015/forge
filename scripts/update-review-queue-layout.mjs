import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const copyPattern = /<!-- review-queue-card-copy:start -->[\s\S]*?<!-- review-queue-card-copy:end -->/;
const stylePattern = /\/\* review-queue-layout:start \*\/[\s\S]*?\/\* review-queue-layout:end \*\//;

// Only replace the identity/metadata column. Preserve runtime icons, actions,
// responsive hooks, business methods and every pending delivery-editor change.
export function updateReviewQueueLayout(source) {
  const open = '<script type="__bundler/template">', close = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(open), end = source.lastIndexOf(close);
  if (start < 0 || end < 0) throw new Error('Missing Forge template');
  let template = JSON.parse(source.slice(start + open.length, end).trim());
  const copy = read('review-queue-header.html').match(copyPattern)?.[0];
  if (!copy) throw new Error('Missing queue identity source');
  if (copyPattern.test(template)) template = template.replace(copyPattern, () => copy);
  else {
    const header = template.indexOf('<div class="review-queue-card-header"');
    const begin = template.indexOf('<div style="min-width:0;max-height:100%;overflow:hidden;display:flex;flex-direction:column;justify-content:center">', header);
    const finish = template.indexOf('<div class="forge-review-card-actions"', begin);
    if (header < 0 || begin < 0 || finish < 0 || finish > template.indexOf('<!-- review-workbench:start -->', header)) throw new Error('Queue identity boundaries changed');
    template = template.slice(0, begin) + copy + '\n  ' + template.slice(finish);
  }
  // Copy-only update, scoped to the pending queue action. Keep it.start intact.
  const pendingAction = /(<sc-if value="{{ it\.pending }}"[^>]*><button\b[^>]*sc-camel-on-click="{{ it\.start }}"[^>]*>)(?:开始审核|repair)(?=\s|<\/button>)/g;
  if ([...template.matchAll(pendingAction)].length !== 1) throw new Error('Pending review action changed');
  template = template.replace(pendingAction, '$1开始审核');
  const css = read('review-queue-layout.css');
  if (stylePattern.test(template)) template = template.replace(stylePattern, () => css);
  else template = template.replace('</style>', () => css + '\n</style>');
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + open.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + close;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateReviewQueueLayout(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated review queue identity and metadata order');
}
