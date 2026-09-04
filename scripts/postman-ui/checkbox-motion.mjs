import { checkboxVisual } from '../ui/checkbox-mark.mjs';

export function installCheckboxMotion(t) {
  const state = "check: n.on ? '✓' : '',";
  if (!t.includes(state)) throw Error('Pipeline checkbox state changed');
  t = t.replace(state, state + "\n            ariaChecked: n.on ? 'true' : 'false',");
  const visual = checkboxVisual.replace('viewBox=', 'sc-camel-view-box=').replace('pathLength=', 'sc-camel-path-length=');
  // Keep the original inputs verbatim: names, labels, disabled/checked bindings,
  // change callbacks and native form/keyboard behavior remain their owners.
  t = t.replace(/<input\b[^>]*\btype="checkbox"[^>]*>/g, input => '<span class="pm-checkbox">' + input + visual + '</span>');
  const pipeline = /(<div\b(?=[^>]*role="checkbox")(?=[^>]*sc-camel-on-click="{{ n.toggle }}")[^>]*>)<sc-if\b[^>]*>[\s\S]*?<\/sc-if>(<\/div>)/;
  if (!pipeline.test(t)) throw Error('Pipeline checkbox markup changed');
  return t.replace(pipeline, (_, opening, closing) => opening
    .replace('<div ', '<div class="pm-checkbox-custom" ')
    .replace('aria-checked="{{ n.check }}"', 'aria-checked="{{ n.ariaChecked }}"') + visual + closing);
}
