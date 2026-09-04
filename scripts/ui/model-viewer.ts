import { ModelViewerElement } from '@google/model-viewer';
import { configureModelViewer } from './model-viewer-config.mjs';

// All rendering code and compression decoders are self-hosted. No CDN request
// is necessary to preview a user's model.
configureModelViewer(self, ModelViewerElement);
