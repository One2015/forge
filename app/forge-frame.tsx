'use client';

import { useEffect, useRef, useState } from 'react';

export default function ForgeFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // A cached iframe can finish before React attaches its load listener.
    const document = frame.current?.contentDocument;
    if (document?.readyState === 'complete' && document.querySelector('.forge-app-shell')) setReady(true);
  }, []);
  return (
    <main className="site-shell pm-loading" data-loading={!ready} aria-busy={!ready}>
      <div className="pm-loading-skeleton pm-shell-skeleton" aria-hidden="true">
        <div className="pm-shell-skeleton-header"><span className="pm-skeleton-block"/><span className="pm-skeleton-block"/></div>
        <div className="pm-shell-skeleton-nav">{Array.from({length:5},(_,i)=><span className="pm-skeleton-block pm-skeleton-medium" key={i}/>)}</div>
        <div className="pm-shell-skeleton-body">
          <div className="pm-skeleton-copy"><span className="pm-skeleton-block pm-skeleton-heading"/><span className="pm-skeleton-block pm-skeleton-short"/></div>
          <div className="pm-skeleton-metrics">{Array.from({length:3},(_,i)=><div key={i}><span className="pm-skeleton-block pm-skeleton-medium"/><span className="pm-skeleton-block pm-skeleton-value"/></div>)}</div>
          {Array.from({length:5},(_,i)=><div className="pm-skeleton-row" key={i}><span className="pm-skeleton-block pm-skeleton-medium"/><span className="pm-skeleton-block"/><span className="pm-skeleton-block pm-skeleton-medium"/></div>)}
        </div>
      </div>
      {!ready && <span className="pm-loading-sr" role="status">正在加载工作台…</span>}
      <iframe ref={frame} className="forge-frame pm-loading-content" src="/forge-postman.html" title="Forge · Postman UI 优化版" onLoad={()=>setReady(true)} aria-hidden={!ready} inert={!ready}/>
      <noscript><a className="fallback-link" href="/forge-postman.html">打开 Forge · Postman UI 优化版</a></noscript>
    </main>
  );
}
