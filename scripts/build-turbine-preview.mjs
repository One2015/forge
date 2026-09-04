import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

await build({
  configFile: false, publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('../public/postman-ui/demo/gas-turbine', import.meta.url)),
    emptyOutDir: false, copyPublicDir: false,
    lib: { entry: fileURLToPath(new URL('./ui/turbine-viewer.js', import.meta.url)), name: 'ForgeTurbineViewer', formats: ['iife'], fileName: () => 'viewer.js' },
    minify: true, chunkSizeWarningLimit: 1000
  }
});
// Keep this local demo self-contained inside the artifact's opaque-origin
// sandbox, where loading a separate localhost script may be blocked.
const directory = new URL('../public/postman-ui/demo/gas-turbine/', import.meta.url);
const script = fs.readFileSync(new URL('viewer.js', directory), 'utf8')
  .replace(/[ \t]+$/gm, '').replace(/^[ \t]+/gm, indent => indent.replaceAll('\t', '  '))
  .replaceAll('</script', '<\\/script');
fs.writeFileSync(new URL('viewer.js', directory), script);
const html = fs.readFileSync(new URL('./ui/turbine-preview.html', import.meta.url), 'utf8');
fs.writeFileSync(new URL('index.html', directory), html.replace('<script src="./viewer.js"></script>', () => '<script>' + script + '</script>'));
