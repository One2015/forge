/// <reference types="vite/client" />
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createPortal } from 'react-dom';
import type { ModelViewerElement } from '@google/model-viewer';
import { normalizeArtifacts, fileSize } from './artifact-data.mjs';
import { checkboxMark } from './checkbox-mark.mjs';
import cube from '../../assets/phosphor/regular/cube.svg?raw';
import list from '../../assets/phosphor/regular/list.svg?raw';
import picture from '../../assets/phosphor/regular/image.svg?raw';
import reset from '../../assets/phosphor/regular/arrow-clockwise.svg?raw';
import plus from '../../assets/phosphor/regular/plus.svg?raw';
import minus from '../../assets/phosphor/regular/minus.svg?raw';
import download from '../../assets/phosphor/regular/download-simple.svg?raw';

type Artifact = { id: string; name: string; url: string; size: number | null; kind: string; content?: string };
type Config = { itemId: string; runId: string; name: string; is3D: boolean; files: unknown[]; request?: { mode: string; serial: number } };
const Icon = ({ svg }: { svg: string }) => <span className="forge-artifact-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
let viewerPromise: Promise<void> | undefined;
function loadViewer() {
  if (customElements.get('model-viewer')) return Promise.resolve();
  if (!viewerPromise) viewerPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/forge-model-viewer.js';
    const timer = window.setTimeout(() => { script.remove(); viewerPromise = undefined; reject(new Error('timeout')); }, 20000);
    script.onload = () => { clearTimeout(timer); if (customElements.get('model-viewer')) resolve(); else { viewerPromise = undefined; reject(new Error('unavailable')); } };
    script.onerror = () => { clearTimeout(timer); script.remove(); viewerPromise = undefined; reject(new Error('load')); };
    document.head.append(script);
  });
  return viewerPromise;
}

function PreviewSkeleton({ loading, label, children }: { loading: boolean; label: string; children?: React.ReactNode }) {
  return <div className="pm-loading-skeleton" aria-hidden={!loading}>
    <div className="pm-preview-skeleton-shapes" aria-hidden="true"><span className="pm-skeleton-block pm-preview-skeleton-image"/><span className="pm-skeleton-block pm-skeleton-medium"/><span className="pm-skeleton-block"/><span className="pm-skeleton-block pm-skeleton-short"/></div>
    <div className="pm-preview-loading-label" role={loading ? 'status' : undefined}><strong>{label}</strong>{children}</div>
  </div>;
}

function Model({ file }: { file: Artifact }) {
  const holder = React.useRef<HTMLDivElement>(null);
  const viewer = React.useRef<ModelViewerElement | null>(null);
  const [status, setStatus] = React.useState('loading');
  const [progress, setProgress] = React.useState(0);
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    let timedOut = false;
    let model: ModelViewerElement | undefined;
    setStatus('loading'); setProgress(0);
    const timer = window.setTimeout(() => {
      if (alive) { timedOut = true; setStatus('error'); model?.remove(); viewer.current = null; }
    }, 45000);
    loadViewer().then(() => {
      if (!alive || timedOut || !holder.current) return;
      model = document.createElement('model-viewer') as ModelViewerElement;
      model.setAttribute('src', file.url);
      model.setAttribute('alt', file.name + '，拖拽旋转，滚轮或双指缩放');
      model.setAttribute('camera-controls', '');
      model.setAttribute('touch-action', 'none');
      model.setAttribute('interaction-prompt', 'none');
      model.setAttribute('disable-tap', '');
      model.setAttribute('camera-orbit', '30deg 75deg 105%');
      model.setAttribute('min-camera-orbit', 'auto 0deg auto');
      model.setAttribute('max-camera-orbit', 'auto 180deg auto');
      model.setAttribute('interpolation-decay', '0');
      model.setAttribute('loading', 'eager');
      model.setAttribute('shadow-intensity', '0.6');
      model.addEventListener('load', () => { if (alive && !timedOut) { clearTimeout(timer); model?.jumpCameraToGoal(); setStatus('ready'); } });
      model.addEventListener('error', () => { if (alive) { timedOut = true; clearTimeout(timer); model?.remove(); viewer.current = null; setStatus('error'); } });
      model.addEventListener('progress', event => { if (alive && !timedOut) setProgress(Math.round(((event as unknown as CustomEvent).detail?.totalProgress || 0) * 100)); });
      viewer.current = model;
      holder.current.append(model);
    }).catch(() => { if (alive) { clearTimeout(timer); setStatus('error'); } });
    return () => { alive = false; clearTimeout(timer); model?.remove(); viewer.current = null; };
  }, [file.url, attempt]);
  const resetCamera = () => {
    const model = viewer.current;
    if (!model) return;
    model.cameraOrbit = '30deg 75deg 105%'; model.cameraTarget = 'auto auto auto'; model.fieldOfView = 'auto';
    model.jumpCameraToGoal();
  };
  return <div className="forge-artifact-model pm-loading pm-preview-loading" data-loading={status === 'loading'} aria-busy={status === 'loading'}>
    <div className="forge-artifact-model-canvas pm-loading-content" ref={holder} aria-hidden={status !== 'ready'} inert={status !== 'ready'} />
    <PreviewSkeleton loading={status === 'loading'} label="正在加载 3D 模型"><progress className="forge-artifact-progress" aria-label="模型加载进度" max={100} value={progress || undefined}/><span>{progress >= 100 ? '正在准备画面…' : progress > 0 ? progress + '%' : '正在准备查看器…'}</span><p>仍可切换文件列表；加载失败后可重试。</p></PreviewSkeleton>
    {status === 'error' && <div className="forge-artifact-message" role="status"><Icon svg={cube}/><strong>模型暂时无法预览</strong><p>请检查文件、网络或浏览器的 WebGL 支持，也可以切换到文件列表下载。</p><button type="button" onClick={() => setAttempt(value => value + 1)}>重新加载</button></div>}
    <div className="forge-artifact-camera" role="group" aria-label="3D 视角控制">
      <button type="button" disabled={status !== 'ready'} title="放大" aria-label="放大模型" onClick={() => viewer.current?.zoom(1)}><Icon svg={plus}/></button>
      <button type="button" disabled={status !== 'ready'} title="缩小" aria-label="缩小模型" onClick={() => viewer.current?.zoom(-1)}><Icon svg={minus}/></button>
      <button type="button" disabled={status !== 'ready'} title="重置视角" aria-label="重置视角" onClick={resetCamera}><Icon svg={reset}/></button>
    </div>
    {status === 'ready' && <div className="forge-artifact-gesture">拖拽旋转 · 滚轮 / 双指缩放 · 右键平移</div>}
  </div>;
}

function Media({ file }: { file: Artifact }) {
  const [status, setStatus] = React.useState('loading');
  const [attempt, setAttempt] = React.useState(0);
  const generation = React.useRef(0);
  const timer = React.useRef<number | undefined>(undefined);
  const settled = React.useRef(false);
  React.useLayoutEffect(() => {
    if (file.kind !== 'image' && file.kind !== 'web') return;
    const token = ++generation.current;
    settled.current = false;
    setStatus('loading');
    timer.current = window.setTimeout(() => { if (token === generation.current) { settled.current = true; generation.current++; setStatus('error'); } }, 30000);
    return () => { settled.current = true; generation.current++; clearTimeout(timer.current); };
  }, [file.url, file.kind, attempt]);
  const finish = (next: string) => { if (settled.current) return; settled.current = true; clearTimeout(timer.current); setStatus(next); };
  if (file.content !== undefined) return <pre className="pm-artifact-text">{file.content}</pre>;
  if (file.kind === 'model') return <Model file={file}/>;
  if (status === 'error') return <div className="forge-artifact-message" role="status"><strong>预览加载失败或超时</strong><p>请检查网络后重试，也可切换文件列表下载。</p><button type="button" onClick={() => { setStatus('loading'); setAttempt(value => value + 1); }}>重新加载</button></div>;
  // Untrusted generated pages get an opaque origin. Never grant same-origin,
  // top navigation, popups, camera or microphone permissions.
  if (file.kind === 'image' || file.kind === 'web') return <div className="forge-artifact-media pm-loading pm-preview-loading" data-loading={status === 'loading'} aria-busy={status === 'loading'}>
    <div className="pm-loading-content" aria-hidden={status === 'loading'} inert={status === 'loading'}>{file.kind === 'image' ? <img key={attempt} className="forge-artifact-image" src={file.url} alt={file.name} onLoad={() => finish('ready')} onError={() => finish('error')}/> : <iframe key={attempt} className="forge-artifact-web" src={file.url} title={file.name} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => finish('ready')} onError={() => finish('error')}/>}</div>
    <PreviewSkeleton loading={status === 'loading'} label={file.kind === 'image' ? '正在加载图片' : '正在打开页面'}><p>你可以随时切换文件列表。</p></PreviewSkeleton>
  </div>;
  return <div className="forge-artifact-message"><Icon svg={list}/><strong>此文件不支持在线预览</strong><p>请从文件列表下载查看。</p></div>;
}

function FileWorkspace({ files }: { files: Artifact[] }) {
  const [selection, setSelection] = React.useState('');
  const [showDependencies, setShowDependencies] = React.useState(false);
  const selected = files.find(file=>file.id===selection);
  const visible = files.filter(file=>showDependencies || !/(^|\/)(node_modules|\.cache|\.git)(\/|$)/.test(file.name));
  const tree = (prefix: string): React.ReactNode => {
    const entries = new Map<string, Artifact | null>();
    visible.filter(file=>file.name.startsWith(prefix)).forEach(file=>{
      const rest=file.name.slice(prefix.length), part=rest.split('/')[0];
      entries.set(part,rest.includes('/') ? null : file);
    });
    return Array.from(entries,([name,file])=>file ? <button key={file.name} type="button" className="pm-artifact-file" aria-pressed={selection===file.id} title={file.name} onClick={()=>setSelection(file.id)}><span>{name}</span><small>{fileSize(file.size)}</small></button> : <details key={prefix+name} open><summary>{name}</summary><div>{tree(prefix+name+'/')}</div></details>);
  };
  return <div className="pm-artifact-workspace">
    <aside><header><strong>WORKSPACE</strong><span>{files.length} 个文件</span></header>{files.some(file=>/(^|\/)(node_modules|\.cache|\.git)(\/|$)/.test(file.name)) && <label className="pm-artifact-dependencies"><span className="pm-checkbox"><input type="checkbox" checked={showDependencies} onChange={event=>setShowDependencies(event.target.checked)}/><span className="pm-checkbox-visual" aria-hidden="true" dangerouslySetInnerHTML={{__html:checkboxMark}}/></span>显示依赖与缓存目录</label>}<nav aria-label="工作区文件目录">{tree('')}</nav></aside>
    <article>{selected ? <><header><code title={selected.name}>{selected.name}</code><span>{fileSize(selected.size)}</span>{selected.url && <a href={selected.url} download={selected.name.split('/').pop()} target="_blank" rel="noopener noreferrer">下载</a>}</header><div className="pm-artifact-file-preview"><Media key={selected.id} file={selected}/></div></> : <p className="pm-artifact-file-empty">选择左侧文件查看内容。</p>}</article>
  </div>;
}

function ArtifactPreview({ config, toolbarHost, linkHost }: { config: Config; toolbarHost?: Element | null; linkHost?: Element | null }) {
  const files = React.useMemo(() => normalizeArtifacts(config.files, location.origin) as Artifact[], [config.files]);
  const [mode, setMode] = React.useState('preview');
  const [selection, setSelection] = React.useState('');
  const inputId = React.useId();
  const selected = files.find(file => file.id === selection) || files.find(file => file.url && file.kind !== 'file') || files[0];
  React.useEffect(() => { setMode(config.request?.mode || 'preview'); }, [config.request?.mode, config.request?.serial]);
  const toolbar = <div className={toolbarHost ? 'pm-item-artifact-toolbar' : 'forge-artifact-toolbar'}>
      <fieldset className="forge-artifact-switch"><legend className="forge-artifact-sr-only">产物视图</legend>
        {[['preview', '预览', cube], ['files', '文件列表', list]].map(([value, label, svg]) => <label key={value} title={label} data-checked={mode === value}>
          <input type="radio" name={'artifact-view-' + inputId} aria-label={label} value={value} checked={mode === value} onChange={() => setMode(value)}/>
          {toolbarHost ? <span>{value === 'preview' ? '预览' : '文件'}</span> : <Icon svg={svg}/>}
        </label>)}
      </fieldset>
      {!toolbarHost && selected && <span className="forge-artifact-filename" title={selected.name}>{selected.name}</span>}
    </div>;
  return <section className="forge-artifact-preview" aria-label="产物查看器"
    onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}
    onKeyDown={event => { if (event.key !== 'Escape') event.stopPropagation(); }}>
    {toolbarHost ? createPortal(toolbar, toolbarHost) : toolbar}
    {linkHost && selected?.url && createPortal(<a href={selected.url} target="_blank" rel="noopener noreferrer">打开原始预览 ↗</a>, linkHost)}
    <div className="forge-artifact-content">
      {mode === 'preview' ? selected?.url ? <Media key={selected.url} file={selected}/> : <p className={toolbarHost ? 'forge-artifact-empty-state' : 'forge-artifact-sr-only'} role="status">当前版本没有可预览的文件。</p> : toolbarHost && files.length ? <FileWorkspace files={files}/> : <div className="forge-artifact-files">
        {!files.length ? <p className={toolbarHost ? 'forge-artifact-empty-state' : 'forge-artifact-sr-only'} role="status">当前版本没有可查看的文件。</p> : <ul aria-label="文件列表">{files.map(file => <li key={file.id}>
          <Icon svg={file.kind === 'model' ? cube : file.kind === 'image' ? picture : list}/>
          <div className="forge-artifact-file-name"><span title={file.name}>{file.name}</span><small>{fileSize(file.size)}</small></div>
          {file.url && file.kind !== 'file' && <button type="button" aria-label={'预览 ' + file.name} onClick={() => { setSelection(file.id); setMode('preview'); }}>预览</button>}
          {file.url ? <a href={file.url} download={file.name.split('/').pop()} target="_blank" rel="noopener noreferrer" title={'下载 ' + file.name} aria-label={'下载 ' + file.name}><Icon svg={download}/></a> : <span className="forge-artifact-unavailable">未接入</span>}
        </li>)}</ul>}
      </div>}
    </div>
  </section>;
}

const roots = new Map<HTMLElement, { root: Root; mount: HTMLDivElement; data: string; toolbarHost?: Element | null; linkHost?: Element | null }>();
function sync() {
  for (const [host, instance] of roots) if (!host.isConnected || !host.contains(instance.mount)) { instance.root.unmount(); roots.delete(host); }
  document.querySelectorAll<HTMLElement>('[data-forge-artifact]').forEach(host => {
    const data = host.getAttribute('data-forge-artifact') || '';
    if (!data || data.includes('{{')) return;
    let config: Config;
    try { config = JSON.parse(data); } catch { return; }
    if (!config.itemId || !Array.isArray(config.files)) return;
    let instance = roots.get(host);
    if (!instance) {
      const mount = document.createElement('div'); mount.className = 'forge-artifact-mount'; host.append(mount);
      instance = { root: createRoot(mount), mount, data: '' }; roots.set(host, instance);
    }
    const page = host.closest('.pm-item-page');
    const toolbarHost = page?.querySelector('[data-pm-artifact-toolbar]');
    const linkHost = page?.querySelector('[data-pm-artifact-link]');
    if (instance.data === data && instance.toolbarHost === toolbarHost && instance.linkHost === linkHost) return;
    instance.data = data;
    instance.toolbarHost = toolbarHost; instance.linkHost = linkHost;
    instance.root.render(<ArtifactPreview key={config.itemId + ':' + config.runId} config={config} toolbarHost={toolbarHost} linkHost={linkHost}/>);
    host.dataset.artifactEnhanced = 'true';
  });
}
let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return; scheduled = true;
  queueMicrotask(() => { scheduled = false; sync(); });
}).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-forge-artifact'] });
sync();
