/// <reference types="vite/client" />
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as Tooltip from '@radix-ui/react-tooltip';
import info from '../../assets/phosphor/regular/info.svg?raw';

function SummaryTooltip({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger className="forge-summary-info" aria-label={label}
          onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(value => !value); }}>
          <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: info }} />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="forge-summary-tooltip" side="bottom" align="end" sideOffset={6} collisionPadding={12}>
            {description}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// DCLogic owns each native chart button. Radix owns only its tooltip island;
// controlled pointer/focus state avoids reparenting the live chart DOM.
function ChartTooltip({ host, description }: { host: HTMLElement; description: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  React.useEffect(() => {
    const button = host.closest('button');
    if (!button) return;
    const show = () => setOpen(true), hide = () => setOpen(false);
    button.addEventListener('pointerenter', show);
    button.addEventListener('pointerleave', hide);
    button.addEventListener('focus', show);
    button.addEventListener('blur', hide);
    button.addEventListener('click', hide);
    return () => {
      button.removeEventListener('pointerenter', show);
      button.removeEventListener('pointerleave', hide);
      button.removeEventListener('focus', show);
      button.removeEventListener('blur', hide);
      button.removeEventListener('click', hide);
    };
  }, [host]);
  React.useEffect(() => {
    const button = host.closest('button');
    if (open) button?.setAttribute('aria-describedby', id);
    else button?.removeAttribute('aria-describedby');
    return () => button?.removeAttribute('aria-describedby');
  }, [host, open, id]);
  return <Tooltip.Provider delayDuration={0}><Tooltip.Root open={open} onOpenChange={setOpen} disableHoverableContent>
    <Tooltip.Trigger asChild><span className="forge-billing-tooltip-anchor" aria-hidden="true" /></Tooltip.Trigger>
    <Tooltip.Portal><Tooltip.Content id={id} className="forge-billing-chart-tooltip" side="top" sideOffset={8} collisionPadding={12}>
      {description}
    </Tooltip.Content></Tooltip.Portal>
  </Tooltip.Root></Tooltip.Provider>;
}

// Small progressive-enhancement island: DCLogic retains ownership of its DOM
// and data. React owns only the injected mount, never the generated children.
const roots = new Map<HTMLElement, { root: Root; mount: HTMLSpanElement; key: string }>();
function sync() {
  for (const [host, mounted] of roots) {
    if (!host.isConnected || !host.contains(mounted.mount)) {
      mounted.root.unmount();
      roots.delete(host);
    }
  }
  document.querySelectorAll<HTMLElement>('[data-forge-tooltip], [data-forge-chart-tooltip]').forEach(host => {
    const chart = host.hasAttribute('data-forge-chart-tooltip');
    const description = host.getAttribute(chart ? 'data-forge-chart-tooltip' : 'data-forge-tooltip') || '';
    const label = host.getAttribute('data-tooltip-label') || '说明';
    if (!description || description.includes('{{')) return;
    let mounted = roots.get(host);
    if (!mounted) {
      const mount = document.createElement('span');
      host.append(mount);
      mounted = { root: createRoot(mount), mount, key: '' };
      roots.set(host, mounted);
    }
    const key = label + '\n' + description;
    if (mounted.key === key) return;
    mounted.key = key;
    mounted.root.render(chart ? <ChartTooltip host={host} description={description} /> : <SummaryTooltip label={label} description={description} />);
    host.dataset.enhanced = 'true';
  });
}
let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; sync(); });
});
observer.observe(document.documentElement, {
  subtree: true, childList: true, attributes: true,
  attributeFilter: ['data-forge-tooltip', 'data-tooltip-label', 'data-forge-chart-tooltip']
});
sync();
