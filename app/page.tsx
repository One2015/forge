export default function Home() {
  return (
    <main className="site-shell">
      <iframe
        className="forge-frame"
        src="/forge.html"
        title="Forge 生产与审核 · IA 优化版"
      />
      <noscript>
        <a className="fallback-link" href="/forge.html">
          打开 Forge 生产与审核 · IA 优化版
        </a>
      </noscript>
    </main>
  );
}
