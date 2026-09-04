import fs from 'node:fs';
export function installItemPreviewPage(t) {
 const start=t.indexOf('<!-- sheet-preview-navigation:start -->'), end=t.indexOf('<!-- sheet-preview-navigation:end -->',start);
 if(start<0||end<start)throw Error('Preview navigation boundary changed');
 t=t.slice(0,start)+t.slice(end+'<!-- sheet-preview-navigation:end -->'.length);
 const closeStart=t.indexOf('<button type="button" class="forge-sheet-close"'), closeEnd=t.indexOf('</button>',closeStart);
 if(closeStart<0||closeEnd<closeStart)throw Error('Preview close button changed');
 t=t.slice(0,closeStart)+`<header class="pm-item-page-header">
 <button type="button" class="pm-item-back" sc-camel-on-click="{{ sheet.closePick }}" aria-label="返回交付清单">← <span>返回交付清单</span></button>
 <div class="pm-item-page-title"><div data-pm-artifact-toolbar></div></div>
 <p class="pm-item-shortcuts" aria-label="快捷键说明"><span><kbd>↑</kbd> 上一项</span><span><kbd>↓</kbd> 下一项</span><span><kbd>Esc</kbd> 关闭</span></p>
 <div class="pm-item-original" data-pm-artifact-link></div>
 </header>`+t.slice(closeEnd+'</button>'.length);
 t=t.replace('class="forge-sheet-overlay"','class="forge-sheet-overlay pm-item-page-overlay"').replace('class="forge-sheet-dialog"','class="forge-sheet-dialog pm-item-page"');
 t=t.replace('  // artifact-preview:start',fs.readFileSync(new URL('item-preview-mock.js',import.meta.url),'utf8')+'\n  // artifact-preview:start');
 t=t.replace('const manifest = this.props.artifacts?.[itemId]?.[runId] || run?.artifactsByItem?.[itemId];','const manifest = this.props.artifacts?.[itemId]?.[runId] || run?.artifactsByItem?.[itemId] || this.pmDeliveryArtifactMock(itemId, runId); // pm-delivery-preview-fallback');
 return t;
}
