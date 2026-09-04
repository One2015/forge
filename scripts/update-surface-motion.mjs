import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
export function updateSurfaceMotion(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  if (start < 0 || end < 0) throw new Error('Missing Forge template');
  let t = JSON.parse(source.slice(start + opening.length, end).trim());
  const once = (before, after) => {
    if (t.split(before).length !== 2) throw new Error('Expected one surface anchor: ' + before.slice(0, 110));
    t = t.replace(before, () => after);
  };
  if (!t.includes('// surface-motion:start')) {
    once('  componentDidMount() {', read('surface-motion-methods.js') + '\n  componentDidMount() {');
    once('    return {\n      datasetResize:', '    return this.withSurfaceMotion({\n      datasetResize:');
    once('      startDrag: e => { e.preventDefault(); this.setState({ drag: true }); }\n    };', '      startDrag: e => { e.preventDefault(); this.setState({ drag: true }); }\n    });');
  } else t = t.replace(/  \/\/ surface-motion:start[\s\S]*?  \/\/ surface-motion:end/, () => read('surface-motion-methods.js'));
  if (t.includes('/* surface-motion:start */')) t = t.replace(/\/\* surface-motion:start \*\/[\s\S]*?\/\* surface-motion:end \*\//, () => read('surface-motion.css'));
  else once('</style>', read('surface-motion.css') + '\n</style>');
  if (!t.includes('/forge-surface-motion.js')) once('<script src="/forge-artifact-preview.js" defer></script>', '<script src="/forge-artifact-preview.js" defer></script>\n<script src="/forge-surface-motion.js" defer></script>');
  // Every declarative overlay keeps a visual snapshot until its exit completes.
  for (const [key, path, condition, handler] of [
    ['pipeCopy','pipeCopy','pipeCopy.open','pipeCopy.cancel'], ['newPipe','newPipe','newPipe.open','newPipe.close'],
    ['passAsk','passAsk','passAsk.open','passAsk.cancel'], ['stopAsk','stopAsk','stopAsk.open','stopAsk.cancel'],
    ['cancelAsk','cancelAsk','cancelAsk.open','cancelAsk.cancel'], ['sheetDetail','sheet','sheet.hasPick','sheet.closePick'],
    ['sheetPass','sheet.pick','sheet.pick.passConfirmOpen','sheet.pick.cancelPass'], ['zoom','zoomMotion','zoomOpen','closeZoom']
  ]) {
    if (t.includes('data-motion-key="' + key + '"')) continue;
    const pattern = new RegExp('<sc-if value="\\{\\{ ' + condition.replaceAll('.', '\\.') + ' \\}\\}"([^>]*)>\\s*<div([^>]*sc-camel-on-click="\\{\\{ ' + handler.replaceAll('.', '\\.') + ' \\}\\}"[^>]*)>\\s*<div([^>]*)>');
    if (!pattern.test(t)) throw new Error('Missing overlay: ' + key);
    const addClass = (attrs, cls) => attrs.includes('class="') ? attrs + ' data-' + cls.replace('forge-', '') + '="true"' : ' class="' + cls + '"' + attrs;
    t = t.replace(pattern, (_, conditionAttrs, attrs, inner) => '<sc-if value="{{ ' + path + '.motionPresent }}"' + conditionAttrs + '>\n<div' + addClass(attrs, 'forge-motion-overlay') + ' data-motion-key="' + key + '" data-motion-open="{{ ' + path + '.motionOpen }}">\n<div' + addClass(inner, 'forge-motion-dialog') + '>');
  }
  // Native dialogs retain showModal(), Escape, focus containment and top-layer behavior.
  for (const [cls, key, path] of [['forge-branch-dialog','branch','branch'],['forge-delivery-editor','deliveryEditor','deliveryEditor'],['forge-delivery-skill-detail','skillDetail','deliveryEditor.detail'],['forge-delivery-leave-dialog','deliveryLeave','deliveryLeave']]) {
    const regex = new RegExp('<dialog([^>]*class="' + cls + '[^>]*)>');
    t = t.replace(regex, (whole, attrs) => whole.includes('data-motion-native') ? whole : '<dialog' + attrs + ' data-motion-native="true" data-motion-key="' + key + '" data-motion-open="{{ ' + path + '.motionOpen }}">');
  }
  // These checks also run after a source template has been rebuilt.
  t = t.replace('<sc-if value="{{ deliveryEditor.motionPresent }}" hint-placeholder-val="{{ false }}"><dialog', '<sc-if value="{{ deliveryEditor.modal }}" hint-placeholder-val="{{ false }}"><dialog');
  for (const [key,path,condition,origin] of [['deliverySort','delivery','sortOpen','top right'],['pipelineDataset','pe','dsOpen','top left'],['datasetVersion','ds','versionsOpen','top left']]) {
    if (t.includes('data-motion-menu="' + key + '"')) continue;
    const pattern = new RegExp('<sc-if value="\\{\\{ ' + path + '\\.' + condition + ' \\}\\}"([^>]*)>\\s*<div style="([^"]*)">');
    if (!pattern.test(t)) throw new Error('Missing menu: ' + key);
    t = t.replace(pattern, (_,attrs,style) => '<sc-if value="{{ true }}"' + attrs + '>\n<div class="forge-motion-menu" data-motion-menu="' + key + '" data-motion-open="{{ ' + path + '.' + condition + ' }}" style="--forge-menu-origin:' + origin + ';' + style + '">');
  }
  // Bind selection semantically instead of inspecting computed theme colors.
  for (const list of ['pipeFilters','delivery.cats','sheet.filters','runs.filters','importTabs','review.owners']) {
    const pattern = new RegExp('<div([^>]*)>\\s*<sc-for list="\\{\\{ ' + list.replaceAll('.', '\\.') + ' \\}\\}" as="([^"]+)"([^>]*)>\\s*<div([^>]*)>([\\s\\S]*?)</div>');
    const match = t.match(pattern);
    if (match && !match[1].includes('data-forge-segmented')) t = t.replace(pattern, (_,parent,item,loop,attrs,content) => '<div data-forge-segmented="pill" role="group"' + parent + '>\n<sc-for list="{{ ' + list + ' }}" as="' + item + '"' + loop + '>\n<button type="button" data-motion-selected="{{ ' + item + '.motionSelected }}" aria-pressed="{{ ' + item + '.motionSelected }}"' + attrs.replace('style="','style="font-family:inherit;border:0;text-align:inherit;') + '>' + content + '</button>');
  }
  // A hidden bold label reserves intrinsic width without changing the visible text weight.
  for (const list of ['pipeFilters','delivery.cats','sheet.filters','runs.filters','importTabs','review.owners']) {
    const pattern = new RegExp('(<sc-for list="\\{\\{ ' + list.replaceAll('.', '\\.') + ' \\}\\}" as="([^"]+)"[^>]*>\\s*<button)([^>]*)(>)');
    t = t.replace(pattern, (whole, start, item, attrs, end) => {
      let next = attrs.includes('data-motion-label=') ? attrs : ' data-motion-label="{{ ' + item + '.label }}"' + attrs;
      // The visible and width-reserving labels must share one grid cell. Legacy
      // inline flex styles make the hidden label a second item (and double width).
      // Leave the separately owned Geist controls and their content slots intact.
      if (attrs.includes('data-motion-selected=')) next = next.replace(/style="([^"]*)"/, (_, style) => 'style="' + style.split(';').filter(rule => !/^(?:display|align-items|gap|text-align)\s*:/.test(rule.trim())).join(';') + '"');
      return start + next + end;
    });
  }
  for (const cls of ['forge-profile-switcher','forge-delivery-editor-tabs','forge-task-link-modes']) {
    const regex = new RegExp('<(div|nav)([^>]*class="' + cls + '"[^>]*)>','g');
    t = t.replace(regex, (whole,tag,attrs) => whole.includes('data-forge-segmented') ? whole : '<' + tag + attrs + ' data-forge-segmented="underline">');
  }
  if (!t.includes('data-motion-selected="{{ s.motionSelected }}"')) {
    once('<div style="display:flex;align-items:center;gap:4px">\n      <sc-for list="{{ subNav }}"', '<div data-forge-segmented="underline" style="display:flex;align-items:center;gap:4px">\n      <sc-for list="{{ subNav }}"');
    once('<div sc-camel-on-click="{{ s.pick }}" style="padding:5px 11px;', '<button type="button" data-motion-selected="{{ s.motionSelected }}" aria-pressed="{{ s.motionSelected }}" sc-camel-on-click="{{ s.pick }}" style="font-family:inherit;background:none;border:0;padding:5px 11px;');
    once('white-space:nowrap">{{ s.label }}</div>\n      </sc-for>', 'white-space:nowrap">{{ s.label }}</button>\n      </sc-for>');
  }
  t = t.replace('class="forge-motion-overlay forge-sheet-overlay"', 'class="forge-sheet-overlay" data-motion-overlay="true"');
  t = t.replace('class="forge-motion-dialog forge-sheet-dialog"', 'class="forge-sheet-dialog" data-motion-dialog="true"');
  t = t.replace(/<(div|nav) data-forge-segmented="underline"([^>]*class="forge-(?:profile-switcher|delivery-editor-tabs|task-link-modes)"[^>]*)>/g, '<$1$2 data-forge-segmented="underline">');
  new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0,start + opening.length) + '\n' + JSON.stringify(t).replaceAll('</script>','<\\u002Fscript>') + closing;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../public/forge.html',import.meta.url);
  const source = fs.readFileSync(file,'utf8'), updated = updateSurfaceMotion(source);
  if (source !== updated) fs.writeFileSync(file,updated);
  fs.copyFileSync(new URL('./surface-motion-runtime.js',import.meta.url),new URL('../public/forge-surface-motion.js',import.meta.url));
  console.log('Updated dialog, segmented control, cover and menu motion.');
}
