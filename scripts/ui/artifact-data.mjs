export function safeArtifactUrl(value, origin = 'https://forge.invalid') {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020\\]/.test(value)) return '';
  try {
    const url = new URL(value, origin);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return value;
  } catch { return ''; }
}

export function artifactKind(name) {
  const extension = String(name).split(/[?#]/)[0].split('.').pop().toLowerCase();
  if (['glb', 'gltf'].includes(extension)) return 'model';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'].includes(extension)) return 'image';
  if (['html', 'htm'].includes(extension)) return 'web';
  return 'file';
}

export function normalizeArtifacts(files, origin) {
  if (!Array.isArray(files)) return [];
  return files.filter(file => file && typeof file.name === 'string' && file.name.trim()).map((file, index) => ({
    id: String(index), name: file.name.trim(), url: safeArtifactUrl(file.url, origin),
    size: Number.isFinite(file.size) && file.size >= 0 ? file.size : null,
    kind: artifactKind(file.name),
    content: typeof file.content === 'string' ? file.content : undefined
  }));
}

export function fileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '大小未知';
  if (bytes < 1024) return bytes + ' B';
  return bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
