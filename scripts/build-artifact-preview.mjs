import fs from 'node:fs';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

for (const [entry, name, file] of [
  ['artifact-preview.tsx', 'ForgeArtifactPreview', 'forge-artifact-preview.js'],
  ['model-viewer.ts', 'ForgeModelViewer', 'forge-model-viewer.js']
]) await build({
  configFile: false, publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('../public', import.meta.url)), emptyOutDir: false, copyPublicDir: false,
    lib: { entry: fileURLToPath(new URL('./ui/' + entry, import.meta.url)), name, formats: ['iife'], fileName: () => file },
    minify: true
  }
});
for (const name of ['draco/gltf/draco_wasm_wrapper.js', 'draco/gltf/draco_decoder.wasm', 'draco/gltf/draco_decoder.js', 'basis/basis_transcoder.js', 'basis/basis_transcoder.wasm']) {
  const dest = new URL('../public/model-decoders/' + name.replace('draco/gltf/', 'draco/'), import.meta.url);
  fs.mkdirSync(new URL('.', dest), { recursive: true });
  fs.copyFileSync(new URL('../node_modules/three/examples/jsm/libs/' + name, import.meta.url), dest);
}
fs.mkdirSync(new URL('../public/model-decoders/licenses/', import.meta.url), { recursive: true });
fs.copyFileSync(new URL('../node_modules/@google/model-viewer/LICENSE', import.meta.url), new URL('../public/model-decoders/licenses/APACHE-2.0.txt', import.meta.url));
fs.copyFileSync(new URL('../node_modules/three/LICENSE', import.meta.url), new URL('../public/model-decoders/licenses/THREE-MIT.txt', import.meta.url));
