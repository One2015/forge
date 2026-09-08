// Normalize presentation only; existing callbacks and sort state remain authoritative.
export function installSortIndicators(template) {
  const start = template.indexOf('<script type="text/x-dc"');
  if (start < 0) throw Error('Missing sort indicator markup boundary');
  let markup = template.slice(0, start);
  markup = markup.replace(/class="(pq-sort-icon|pm-pipe-sort-icons|pm-overview-delivery-sort-icons|forge-model-column-icons|forge-model-sort-icons)"/g,
    'class="$1 forge-sort-indicator"');
  markup = markup.replace(/<button\b([^>]*class="forge-outsourcing-sort-button"[^>]*)>([\s\S]*?)<\/button>/g, (button, attrs, content) => {
    const state = content.match(/\{\{ (outsourcingSuppliers\.\w+Sort)\.neutral \}\}/)?.[1];
    if (!state) throw Error('Missing supplier sort direction');
    const label = content.slice(0, content.indexOf('<sc-if'));
    return `<button${attrs}>${label}<span class="forge-sort-indicator" aria-hidden="true" data-ascending="{{ ${state}.ascending }}" data-descending="{{ ${state}.descending }}"></span></button>`;
  });
  markup = markup.replace('<span aria-hidden="true">{{ column.symbol }}</span>',
    '<span class="forge-sort-indicator" aria-hidden="true" data-direction="{{ column.state }}"></span>');
  return markup + template.slice(start);
}
