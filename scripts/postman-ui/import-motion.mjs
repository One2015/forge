// Opt in only the occasional dataset-import mode switch. Business callbacks,
// form lifetimes and the surrounding dataset table remain owned by Forge.
export function installImportMotion(template) {
  const tabs = /<div\b[^>]*data-forge-segmented="pill"[^>]*>\s*(?=<sc-for list="{{ importTabs }}")/;
  const content = '<sc-if value="{{ importNeedsName }}"';
  const footer = '<div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">\n            <div style="flex:1;min-width:150px;font-size:12px;color:var(--forge-muted)">{{ importHint }}</div>';
  if (!tabs.test(template) || !template.includes(content) || !template.includes(footer)) {
    throw new Error('Dataset import motion anchors changed');
  }
  return template
    .replace(tabs, tag => tag.replace('<div ', '<div class="pm-import-modes" aria-label="导入方式" '))
    .replace(content, '<div class="pm-import-config" data-pm-import-bump="{{ importIsBump }}" data-pm-import-derive="{{ importFromDs }}">\n          ' + content)
    .replace(footer, '</div>\n          ' + footer);
}
