import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { artifactKind, safeArtifactUrl, normalizeArtifacts, fileSize } from './ui/artifact-data.mjs';
import { updateArtifactPreview } from './update-artifact-preview.mjs';
import { configureModelViewer } from './ui/model-viewer-config.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const raw = read('../public/forge.html');
const template = JSON.parse(raw.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const ui = read('./ui/artifact-preview.tsx');
const css = read('./templates/artifact-preview.css');
function component(props = {}) {
  const context = vm.createContext({ URLSearchParams, window: { location: { search: '' } }, setTimeout: () => 0, clearTimeout() {},
    DCLogic: class { props = { panelWidth: 460, hasRuns: true, hasResources: true, ...props }; setState(patch) { Object.assign(this.state, patch); } } });
  vm.runInContext(code + ';globalThis.c = new Component();', context);
  return context.c;
}

test('artifact URLs reject executable, local filesystem and credential-bearing schemes', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'blob:https://forge/a', 'https://u:pass@host/model.glb', '//host/white space.glb', '\\evil.com/a', '']) assert.equal(safeArtifactUrl(url), '');
  for (const url of ['/models/scene.glb', 'https://assets.example/scene.glb?token=abc', 'textures/a%20b.png']) assert.equal(safeArtifactUrl(url), url);
});

test('file lists come only from provided files; missing URLs remain unavailable and sizes truthful', () => {
  assert.deepEqual(normalizeArtifacts(undefined), []);
  const files = normalizeArtifacts([{ name: 'scene.glb', url: '/models/scene.glb', size: 1024 }, { name: 'notes.txt' }, { name: 'x.html', url: 'javascript:evil()', size: '4 MB' }, null]);
  assert.equal(files.length, 3); assert.equal(files[0].kind, 'model'); assert.equal(files[1].url, ''); assert.equal(files[2].size, null);
  assert.equal(fileSize(0), '0 B'); assert.equal(fileSize(null), '大小未知'); assert.equal(fileSize(1024), '1.0 KB');
  assert.equal(artifactKind('MODEL.GLB'), 'model'); assert.equal(artifactKind('texture.webp'), 'image'); assert.equal(artifactKind('dist/index.html'), 'web'); assert.equal(artifactKind('x.svg'), 'image');
});

test('manifests are scoped to both Item and Run, with no synthetic preview endpoint fallback', () => {
  const c = component({ artifacts: { itemA: { run1: { files: [{ name: 'scene.glb', url: '/a.glb', size: 100 }] } } } });
  const get = (item, run) => JSON.parse(c.artifactPreviewData(item, run, 'A', true));
  assert.equal(get('itemA', 'run1').files[0].url, '/a.glb');
  assert.deepEqual(get('itemA', 'run2').files, []); assert.deepEqual(get('itemB', 'run1').files, []);
  assert.equal(get('itemA', 'run1').is3D, true);
  const id = '9f2a7c1b5e8d4036a1c4e7b209d6f8a3';
  c.setState({ view: 'sheet', sheetKey: 'ant200', sheetRow: id });
  const pick = c.renderVals().sheet.pick, config = JSON.parse(pick.artifactConfig);
  assert.equal(config.itemId, id); assert.equal(config.is3D, true); assert.deepEqual(config.files, []);
  assert.equal(config.runId, pick.fields.find(field => field.k === 'Run ID').v);
});

test('production preview omits demo and local file controls rather than disguising sample content as an artifact', () => {
  for (const removed of ['交互示例', '非本次产物', '返回产物', '打开本地模型', '仅本地查看', 'showDemo', 'openLocal', 'DEMO_MODEL', 'createObjectURL', 'type="file"']) assert(!ui.includes(removed), removed);
  assert(ui.includes('normalizeArtifacts(config.files, location.origin)'));
  assert(!ui.includes('暂无产物预览')); assert(!ui.includes('暂无产物文件'));
  for (const removed of ['forge-artifact-source-note', 'forge-artifact-local', 'forge-artifact-attribution']) assert(!css.includes(removed));
});

test('preview mode controls show icons only while keeping native radio names and hover hints', () => {
  const fieldset = ui.slice(ui.indexOf('<fieldset className="forge-artifact-switch"'), ui.indexOf('</fieldset>'));
  assert(fieldset.includes("['preview', '预览', cube], ['files', '文件列表', list]"));
  assert(fieldset.includes('title={label}'));
  assert(fieldset.includes('type="radio"'));
  assert(fieldset.includes('aria-label={label}'));
  assert(fieldset.includes('checked={mode === value}'));
  assert(fieldset.includes('onChange={() => setMode(value)}'));
  assert(fieldset.includes('<Icon svg={svg}/>'));
  assert(!fieldset.includes('<span>{label}</span>'));
  assert(!fieldset.includes('files.length'));
  assert(!css.includes('forge-artifact-count'));
  assert.match(css, /\.forge-artifact-switch label\{[^}]*justify-content:center;width:32px;min-height:32px/);
  assert.match(css, /@media\(pointer:coarse\)\{[^\n]*\.forge-artifact-switch label[^\n]*width:44px;height:44px/);
  assert(css.includes('label:has(input:focus-visible)'));
});

test('empty canvas has no visible placeholder or file heading but retains accessible status and real file actions', () => {
  const content = ui.slice(ui.indexOf('<div className="forge-artifact-content">'), ui.indexOf('\nconst roots ='));
  assert(!content.includes('<Icon svg={config.is3D'));
  assert(!content.includes('forge-artifact-message'));
  assert(!content.includes('forge-artifact-files-heading'));
  assert(!content.includes(' 个文件'));
  assert.equal((content.match(/className="forge-artifact-sr-only" role="status"/g) || []).length, 2);
  assert(content.includes('<Media key={selected.url} file={selected}/>'));
  assert(content.includes('<ul aria-label="文件列表">'));
  assert(content.includes('files.map(file =>'));
  assert(content.includes('setSelection(file.id); setMode(\'preview\');'));
  assert(content.includes('download={file.name.split(\'/\').pop()}'));
  assert(!css.includes('forge-artifact-files-heading'));
  assert(ui.includes('重新加载'));
  assert(ui.includes('aria-busy={status === \'loading\'}'));
});

test('both preview surfaces share the view switch without changing right-panel actions or lower navigation', () => {
  assert.equal((template.match(/data-forge-artifact="{{/g) || []).length, 2);
  assert(template.includes('{{ sheet.pick.artifactConfig }}')); assert(template.includes('{{ it.artifactConfig }}'));
  assert(template.includes('<!-- sheet-preview-navigation:start -->'));
  assert(template.includes('通过审核')); assert(template.includes('要求返工'));
  assert(ui.includes('type="radio"')); assert(ui.includes('文件列表')); assert(ui.includes('data-checked={mode === value}'));
  assert(ui.includes("if (event.key !== 'Escape') event.stopPropagation()"));
  assert.equal(updateArtifactPreview(raw), raw);
});

test('real 3D rendering remains lazy, cancellable and fully user-controlled', () => {
  assert(ui.includes("script.src = '/forge-model-viewer.js'"));
  for (const attr of ["'camera-controls'", "'touch-action', 'none'", "'interpolation-decay', '0'", "'interaction-prompt', 'none'"]) assert(ui.includes(attr));
  assert(!ui.includes("setAttribute('auto-rotate'")); assert(!ui.includes("setAttribute('autoplay'"));
  assert(ui.includes('model?.remove()')); assert(ui.includes('timedOut'));
  assert(ui.includes("if (!alive || timedOut || !holder.current) return"));
  assert(ui.includes('sandbox="allow-scripts"')); assert(!ui.includes('allow-same-origin'));
  assert(css.includes('min-height:44px')); assert(css.includes(':focus-visible'));
  assert(css.includes('overflow-wrap:anywhere')); assert(css.includes('.review-workbench-preview>.forge-artifact-host{inset:0}'));
});

test('installed model-viewer constructor retains self-hosted decoder locations without a Meshopt script override', () => {
  const scope = {}, Viewer = {}, urls = {};
  configureModelViewer(scope, Viewer);
  const loading = read('../node_modules/@google/model-viewer/lib/features/loading.js');
  const start = loading.indexOf('const ModelViewerElement = self.ModelViewerElement || {}');
  const end = loading.indexOf('const lottieLoaderLocation', start);
  assert(start >= 0 && end > start);
  vm.runInNewContext(loading.slice(start, end), {
    self: scope, DEFAULT_DRACO_DECODER_LOCATION: 'CDN_DRACO', DEFAULT_KTX2_TRANSCODER_LOCATION: 'CDN_BASIS',
    CachingGLTFLoader: {
      setDRACODecoderLocation: value => { urls.draco = value; },
      setKTX2TranscoderLocation: value => { urls.basis = value; },
      setMeshoptDecoderLocation: value => { urls.meshopt = value; }
    }
  });
  assert.deepEqual(urls, { draco: '/model-decoders/draco/', basis: '/model-decoders/basis/' });
  assert.equal(Viewer.modelCacheSize, 0);
});

test('short portrait can scroll to decisions and short landscape restores independent two-pane scrolling', () => {
  assert(css.includes('@media(max-width:760px) and (max-height:640px){.forge-sheet-grid{display:block;overflow-y:auto}'));
  assert(css.includes('@media(min-width:600px) and (max-width:760px) and (max-height:640px)'));
  assert(css.includes('grid-template-rows:minmax(0,1fr) auto'));
  assert(css.includes('grid-row:1!important;overflow-y:auto!important'));
});
