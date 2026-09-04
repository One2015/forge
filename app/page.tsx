export default function Home() {
  return (
    <main className="site-shell">
      <iframe
        className="forge-frame"
        src="/forge-postman.html"
        title="Forge · Postman UI 优化版"
      />
      <noscript>
        <a className="fallback-link" href="/forge-postman.html">
          打开 Forge · Postman UI 优化版
        </a>
      </noscript>
    </main>
  );
}
