// Classify existing navigation without changing routes, selection state or callbacks.
export function installTabs(t) {
 const primary = new Set(['forge-billing-tabs']);
 const secondary = new Set(['rr-status-tabs','fg-segmented','forge-billing-segment','forge-wizard-categories','forge-wizard-modes']);
 return t.replace(/<(nav|div)\b[^>]*>/g, tag => {
   const classes = (tag.match(/\bclass="([^"]*)"/)?.[1] || '').split(/\s+/);
   // The embedded artifact viewer owns its separate preview/files switch.
   if(classes.includes('forge-artifact-switch'))return tag;
   const kind = tag.match(/\bdata-forge-segmented="([^"]+)"/)?.[1];
   const level = kind === 'underline' || classes.some(c=>primary.has(c)) ? 'primary'
     : kind === 'pill' || classes.some(c=>secondary.has(c)) ? 'secondary' : '';
   return level ? tag.replace(/>$/, ' data-pm-tabs="'+level+'">') : tag;
 });
}
