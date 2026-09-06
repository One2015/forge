import fs from 'node:fs';

const assetRoot = new URL('../../assets/phosphor/regular/', import.meta.url);
const supportedSizes = new Set([12, 14, 16, 20, 24]);
const tokenPattern = /\[\[icon:([\w-]+):(\d+)\]\]/g;
const geometryCache = new Map();

const geometry = name => {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid Phosphor icon name: ${name}`);
  if (geometryCache.has(name)) return geometryCache.get(name);
  const source = fs.readFileSync(new URL(`${name}.svg`, assetRoot), 'utf8');
  const body = source.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1];
  if (!body) throw new Error(`Missing Phosphor icon geometry: ${name}`);
  const normalized = body.replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  geometryCache.set(name, normalized);
  return normalized;
};

export function phosphorIcon(name, size = 16, { className = '' } = {}) {
  const resolvedSize = Number(size);
  if (!supportedSizes.has(resolvedSize)) {
    throw new Error(`Unsupported Phosphor icon size ${size}; use 12, 14, 16, 20, or 24`);
  }
  const classes = ['forge-icon', className].filter(Boolean).join(' ');
  return `<svg class="${classes}" data-phosphor="${name}" width="${resolvedSize}" height="${resolvedSize}" viewBox="0 0 256 256" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry(name)}</svg>`;
}

export function renderPhosphorIcons(markup) {
  const rendered = markup.replace(tokenPattern, (_, name, size) => phosphorIcon(name, Number(size)));
  if (/\[\[icon:[^\]]+\]\]/.test(rendered)) throw new Error('Invalid or unsupported Phosphor icon token');
  return rendered;
}

export const phosphorIconSizes = Object.freeze([...supportedSizes]);
