import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { updateSheetPreviewNavigation } from './update-sheet-preview-navigation.mjs';

const source = fs.readFileSync(new URL('../public/forge.html', import.meta.url), 'utf8');
const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
const decode = input => JSON.parse(input.slice(input.indexOf(opening) + opening.length, input.lastIndexOf(closing)).trim());
const template = decode(source);
const code = input => input.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const markupPattern = /<!-- sheet-preview-navigation:start -->[\s\S]*?<!-- sheet-preview-navigation:end -->/;
const cssPattern = /\/\* sheet-preview-navigation:start \*\/[\s\S]*?\/\* sheet-preview-navigation:end \*\//;

test('preview has two named native buttons, one position label and no duplicate shortcut icons', () => {
  const markup = template.match(markupPattern)[0];
  assert.equal((markup.match(/<button type="button"/g) || []).length, 2);
  for (const [action, direction, label] of [['prev', 'Up', '上一项'], ['next', 'Down', '下一项']]) {
    assert(markup.includes(`sc-camel-on-click="{{ sheet.${action} }}"`));
    assert(markup.includes(`aria-keyshortcuts="Arrow${direction}"`));
    assert(markup.includes(`aria-label="${label}"`));
  }
  assert.equal((markup.match(/sheet\.posLabel/g) || []).length, 1);
  assert.equal((markup.match(/<svg /g) || []).length, 2);
  assert(markup.includes('aria-live="polite"'));
  assert(markup.includes('Esc 关闭'));
  assert(!markup.includes('键盘'));
});

test('previous/next and disabled state follow the filtered delivery list without changing review state', () => {
  const context = vm.createContext({ URLSearchParams, setTimeout: () => 0, clearTimeout() {}, window: { location: { search: '' } },
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true }; setState(patch) { this.state = { ...this.state, ...patch }; } } });
  vm.runInContext(code(template) + ';globalThis.c = new Component();', context);
  const c = context.c, click = { stopPropagation() {} };
  c.setState({ view: 'sheet', sheetKey: 'ant200', sheetFilter: 'all', sheetRow: '9f2a7c1b5e8d4036a1c4e7b209d6f8a3' });
  c.renderVals();
  const ids = Array.from(c._sheetIds), reviews = JSON.stringify(c.state.reviewDecisions);
  assert(ids.length > 2);
  c.setState({ sheetRow: ids[0] });
  let sheet = c.renderVals().sheet;
  assert.equal(sheet.cannotPrev, true); assert.equal(sheet.cannotNext, false);
  sheet.prev(click); assert.equal(c.state.sheetRow, ids[0]);
  sheet.next(click); assert.equal(c.state.sheetRow, ids[1]);
  sheet = c.renderVals().sheet;
  assert.equal(sheet.cannotPrev, false); assert.equal(sheet.cannotNext, false);
  assert.equal(sheet.posLabel, '2 / ' + ids.length);
  c.setState({ sheetRow: ids.at(-1) }); sheet = c.renderVals().sheet;
  assert.equal(sheet.cannotNext, true); sheet.next(click); assert.equal(c.state.sheetRow, ids.at(-1));
  c.setState({ sheetQuery: '9f2a7c1b5e8d4036a1c4e7b209d6f8a3', sheetRow: '9f2a7c1b5e8d4036a1c4e7b209d6f8a3' });
  sheet = c.renderVals().sheet;
  assert.equal(sheet.posLabel, '1 / 1'); assert(sheet.cannotPrev && sheet.cannotNext);
  sheet.closePick(click); assert.equal(c.state.sheetRow, null);
  assert.equal(JSON.stringify(c.state.reviewDecisions), reviews);
});

test('frosted controls keep high contrast, a non-blur fallback, focus and touch targets', () => {
  const css = fs.readFileSync(new URL('./templates/sheet-preview-navigation.css', import.meta.url), 'utf8').trimEnd();
  assert(template.includes(css));
  assert(css.includes('background:rgba(20,22,20,.9)'));
  assert(css.includes('background:rgba(20,22,20,.64)'));
  assert(css.includes('-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)'));
  assert(css.includes(':focus-visible{outline:2px solid #fff'));
  assert(css.includes('font-variant-numeric:tabular-nums'));
  assert(css.includes('@media(pointer:coarse){.forge-sheet-preview-control{width:44px;height:44px;min-height:44px}'));
  const luminance = rgb => rgb.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126,.7152,.0722][i], 0);
  // Lightest possible preview beneath the translucent scrim is the worst case.
  const scrim = [20,22,20].map(n => n * .64 + 255 * .36);
  const contrast = (luminance([245,247,244]) + .05) / (luminance(scrim) + .05);
  assert(contrast >= 4.5, 'Counter contrast on white preview: ' + contrast);
});

test('navigation patch is idempotent and does not alter other surfaces or action handlers', () => {
  assert.equal(updateSheetPreviewNavigation(source), source);
  const boundaryFields = /\n        cannotPrev: rows\.findIndex[^\n]+\n        cannotNext: [^\n]+/;
  const legacy = template.replace(markupPattern, '<div style="position:absolute;bottom:14px;left:16px;display:flex;align-items:center;gap:7px">\n                    <div sc-camel-on-click="{{ sheet.prev }}">{{ sheet.posLabel }}</div>\n                  </div>').replace(cssPattern, '').replace(boundaryFields, '');
  const fixture = source.slice(0, source.indexOf(opening) + opening.length) + '\n' + JSON.stringify(legacy).replaceAll('</script>', '<\\u002Fscript>') + closing;
  const migrated = decode(updateSheetPreviewNavigation(fixture));
  assert.equal(migrated.match(markupPattern)[0], template.match(markupPattern)[0]);
  assert.equal(code(migrated), code(template));
  for (const name of ['review-workbench', 'delivery-editor', 'task-link-dialog']) {
    const region = new RegExp('<!-- ' + name + ':start -->[\\s\\S]*?<!-- ' + name + ':end -->');
    assert.equal(migrated.match(region)?.[0], template.match(region)?.[0], name);
  }
});
