import { itemPreviewHeader } from './item-preview-page.mjs';

export function installReviewPreviewPage(template) {
 const start = template.indexOf('<!-- review-workbench:start -->');
 const end = template.indexOf('<!-- review-workbench:end -->', start);
 if (start < 0 || end < start) throw Error('Review preview boundary changed');
 let page = template.slice(start, end);
 const header = /<header class="review-workbench-toolbar">[\s\S]*?<\/header>/;
 if (!header.test(page)) throw Error('Review preview toolbar changed');
 page = page.replace(header, itemPreviewHeader({
  backAction: 'review.closeFocus', backLabel: '返回审核队列', backClass: 'review-workbench-back',
  navigation: `<nav class="pm-item-shortcuts" aria-label="预览导航">
   <span class="forge-artifact-sr-only" aria-live="polite">{{ review.positionLabel }}</span>
   <button type="button" sc-camel-on-click="{{ review.previous }}" disabled="{{ review.cannotSwitch }}" aria-label="上一项" aria-keyshortcuts="ArrowUp"><kbd>↑</kbd> 上一项</button>
   <button type="button" sc-camel-on-click="{{ review.next }}" disabled="{{ review.cannotSwitch }}" aria-label="下一项" aria-keyshortcuts="ArrowDown"><kbd>↓</kbd> 下一项</button>
   <button type="button" sc-camel-on-click="{{ review.closeFocus }}" aria-label="关闭预览" aria-keyshortcuts="Escape"><kbd>Esc</kbd> 关闭</button>
  </nav>`
 }));
 page = page.replace('<h2>审核对象</h2>', '<h2 class="pm-review-item-title" aria-label="审核对象">{{ it.shortName }}</h2>');
 page = page.replace('          <dt>资产名称</dt><dd>{{ it.shortName }}</dd>\n', '');
 page = page.replace('          <dt>资产类型</dt>', '          <dt>Run ID</dt><dd>{{ it.runId }}</dd>\n          <dt>审核轮次</dt><dd>{{ it.round }}</dd>\n          <dt>资产类型</dt>');
 const itemLink = /<button type="button" class="review-workbench-item-link forge-item-id-link"[^>]*>[\s\S]*?<\/button>/;
 if (!itemLink.test(page)) throw Error('Review Item link changed');
 page = page.replace(itemLink, '<a class="review-workbench-item-link forge-item-id-link" href="{{ it.previewLifeHref }}" sc-camel-on-click="{{ it.openLife }}" title="{{ it.id }}"><span>{{ it.id }}</span></a>');
 page = page.replaceAll('<h2', '<h2 data-pm-no-permalink').replaceAll('<h3', '<h3 data-pm-no-permalink');
 return template.slice(0, start) + '<div class="pm-item-page pm-review-item-page">\n' + page + '</div>\n' + template.slice(end);
}
