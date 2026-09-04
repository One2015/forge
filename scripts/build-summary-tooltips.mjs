import { build } from 'vite';
import { fileURLToPath } from 'node:url';

// Build one standalone enhancement for /forge.html and /forge. No iframe-only
// dependency on the React host, and no change to the legacy template compiler.
await build({
  configFile: false,
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('../public', import.meta.url)),
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: fileURLToPath(new URL('./ui/summary-tooltips.tsx', import.meta.url)),
      name: 'ForgeSummaryTooltips',
      formats: ['iife'],
      fileName: () => 'forge-summary-tooltips.js'
    },
    minify: true
  }
});
