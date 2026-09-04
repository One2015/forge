export function configureModelViewer(scope, Viewer) {
  // LoadingMixin reads this global for EVERY new instance. Class statics alone
  // are overwritten by its constructor defaults, including the CDN paths.
  scope.ModelViewerElement = {
    dracoDecoderLocation: '/model-decoders/draco/',
    ktx2TranscoderLocation: '/model-decoders/basis/'
  };
  // Meshopt is already bundled by model-viewer. No extra script override.
  Viewer.modelCacheSize = 0;
}
