// Stable presentation hooks for the legacy run detail; no model or callback changes.
export function installGlobalResponsive(t) {
  const row = /<div\b[^>]*title="{{ it.rowTitle }}"[^>]*>/;
  if (!row.test(t)) throw Error('Run item responsive anchor changed');
  t = t.replace(row, tag => tag.includes('class="') ? tag.replace('class="', 'class="pm-run-item-row ') : tag.replace('<div ', '<div class="pm-run-item-row" '));
  const name = /<div\b[^>]*>{{ it.domain }}<\/div>/;
  if (!name.test(t)) throw Error('Run item name anchor changed');
  t = t.replace(name, tag => tag.replace('<div ', '<div class="pm-run-item-name" '));
  for (const [field, className] of [['ds.name','pm-dataset-title'],['it.style','pm-dataset-item-style']]) {
    const pattern = new RegExp('<div\\b[^>]*>{{ ' + field.replace('.', '\\.') + ' }}<\\/div>');
    if (!pattern.test(t)) throw Error('Dataset responsive anchor changed: ' + field);
    t = t.replace(pattern, tag => tag.replace('<div ', '<div class="' + className + '" '));
  }
  return t;
}
