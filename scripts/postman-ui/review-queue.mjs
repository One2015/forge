import fs from 'node:fs';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
export function installReviewQueue(t) {
  const start = t.indexOf('<div class="forge-page pm-page-review"');
  const end = t.indexOf('<!-- geist-runs:start -->', start);
  if (start < 0 || end < start) throw Error('Review queue page boundary changed');
  const old = t.slice(start, end);
  let modal = old.slice(old.indexOf('<sc-if value="{{ review.isPending }}"'), old.indexOf('<sc-if value="{{ review.empty }}"'));
  const header = modal.indexOf('<div class="review-queue-card-header"');
  const content = modal.indexOf('<sc-if value="{{ it.expanded }}"', header);
  if (header < 0 || content < header) throw Error('Review workbench boundary changed');
  modal = modal.slice(0, header) + modal.slice(content);
  modal = modal.replace('value="{{ review.isPending }}"', 'value="{{ review.focused }}"');
  let page = read('review-queue.html').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
    const svg = fs.readFileSync(new URL('../../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
    return svg.replace(/<svg[^>]*>/, '<svg class="forge-icon" data-phosphor="' + name + '" width="' + size + '" height="' + size + '" viewBox="0 0 256 256" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">');
  });
  t = t.slice(0, start) + page + '\n' + modal + '\n</sc-if>\n\n' + t.slice(end);
  t = t.replace('class Component extends DCLogic {', 'class Component extends DCLogic {\n' + read('review-queue-methods.js'));
  t = t.replace('const mineRows = rows.filter(r => r.assignee === me);', 'const mineRows = rows.filter(r => (this.reviewQueueClaim(r) || r.assignee).toLowerCase() === me.toLowerCase()); // pm-review-queue-owner');
  const boundary = '\n    let done = {};';
  const pos = t.indexOf(boundary);
  const close = t.lastIndexOf('\n    }', pos);
  t = t.slice(0, close) + '\n      // pm-review-queue-values:start\n      review.queue = this.reviewQueueValues({ rows, records: byRun, review, recs, runOfItem, me });\n      // pm-review-queue-values:end\n' + t.slice(close);
  return t;
}
