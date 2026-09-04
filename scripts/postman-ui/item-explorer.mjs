import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
export function installItemExplorer(t){
 t=t.replace('view: \'overview\', openPipe: null, editPipe: null, editSel: null,', "view: 'overview', openPipe: null, editPipe: null, editSel: null, pmPipelineView: false,");
 t=t.replace("(!parts[3] || parts[3] === 'edit')", "(!parts[3] || ['edit','view'].includes(parts[3]))");
 t=t.replace("patch.view = parts[3] ? 'pipeedit' : 'pipelines';", "patch.view = parts[3] ? 'pipeedit' : 'pipelines'; patch.pmPipelineView = parts[3] === 'view';");
 t=t.replace("enc(s.editPipe || 'missing') + '/edit'", "enc(s.editPipe || 'missing') + (s.pmPipelineView ? '/view' : '/edit')");
 t=t.replace("if (heading.closest('.forge-delivery-wizard')) continue;", "if (heading.closest('.forge-delivery-wizard') || heading.hasAttribute('data-pm-no-permalink')) continue;");
 t=t.replace('lifeItem: null, lifeRun: null, lifeDs: null, lifeFrom: null, lifeBranch: null,', "lifeItem: null, lifeRun: null, lifeDs: null, lifeFrom: null, lifeBranch: null, pmItemTab: 'history',");
 t=t.replace("patch.view = 'itemlife'; patch.lifeItem = parts[1];", "patch.view = 'itemlife'; patch.pmItemTab = oneOf(get('tab'), ['history','pipeline','files','prompt','trace'], 'history'); patch.lifeItem = parts[1];");
 t=t.replace("case 'itemlife': path = '/items/'", "case 'itemlife': set('tab', s.pmItemTab && s.pmItemTab !== 'history' ? s.pmItemTab : ''); path = '/items/'");
 const start=t.indexOf('<div class="forge-life-history"'), end=t.indexOf('  <sc-if value="{{ isReview }}"',start);
 if(start<0||end<0)throw Error('Item history boundaries changed');
 let body=t.slice(start,end);
 const close=body.lastIndexOf('    </div>');
 body='<sc-if value="{{ explorer.history }}">'+body.slice(0,close)+'</sc-if>\n'+body.slice(close);
 t=t.slice(0,start)+read('item-explorer.html')+body+t.slice(end);
 t=t.replace('  // artifact-preview:start',read('item-explorer-demo.js')+'\n'+read('item-explorer-methods.js')+'\n  // artifact-preview:start');
 t=t.replace('      life,','      life,\n      explorer: view === \'itemlife\' ? this.pmItemExplorerValues(life) : {}, // pm-item-explorer-values');
 // Enrich the existing editor inspector with the same version-scoped reader.
 t=t.replace('        hasSel: !!selNode,','        nodeDetail: selNode ? this.pmNodeDetails(p, selNode.name, null, true) : {}, // pm-node-config-values\n        hasSel: !!selNode,');
 t=t.replace('    let over = {}, res = {};', '    if (view === \'pipeedit\') pe = this.pmPipelineAccess(pe); // pm-pipeline-access-values\n    let over = {}, res = {};');
 const editorStart=t.indexOf('<div class="pm-pipeline-editor '), editorEnd=t.indexOf('<sc-if value="{{ isDatasets }}"',editorStart);
 let editor=t.slice(editorStart,editorEnd);
 editor=editor.replace('<div class="pm-pipeline-editor ', '<div data-pm-readonly="{{ pe.readOnly }}" class="pm-pipeline-editor ');
 editor=editor.replace('<div class="pm-pipeline-title"', '<span class="pm-pipeline-mode">{{ pe.modeLabel }}</span><div class="pm-pipeline-title"');
 for(const action of ['save','askDelete']) editor=editor.replace(new RegExp('(<button\\b[^>]*sc-camel-on-click="\\{\\{ pe\\.'+action+' \\}\\}"[^>]*>[\\s\\S]*?</button>)'), '<sc-if value="{{ pe.canEdit }}">$1</sc-if>');
 editor=editor.replace('<div class="pm-pipeline-config">','<sc-if value="{{ pe.canEdit }}"><div class="pm-pipeline-config">').replace('</div><div class="pm-pipeline-actions">','</div></sc-if><div class="pm-pipeline-actions">');
 t=t.slice(0,editorStart)+editor+t.slice(editorEnd);
 const fieldStart=t.indexOf('          <div style="flex:1 1 300px;min-width:240px;display:grid;',t.indexOf('<div class="pm-pipeline-inspector"'));
 if(fieldStart<0)throw Error('Pipeline inspector fields changed');
 const fieldEnd=t.indexOf('          </div>',t.indexOf('            </sc-for>',fieldStart))+'          </div>'.length;
 t=t.slice(0,fieldEnd)+`<section class="pm-node-config" aria-label="节点配置"><h3>节点配置</h3><sc-if value="{{ pe.nodeDetail.demo }}"><p class="pm-explorer-note">Mock 示例配置 · 当前原型未接入完整 Pipeline 配置。</p></sc-if><sc-for list="{{ pe.nodeDetail.configFields }}" as="field"><div class="pm-node-field"><span>{{ field.key }}</span><pre>{{ field.value }}</pre></div></sc-for><sc-if value="{{ pe.nodeDetail.noConfig }}"><p class="pm-explorer-note">该版本仅提供节点声明，未提供详细配置。</p><pre>{{ pe.nodeDetail.definition }}</pre></sc-if></section>`+t.slice(fieldEnd);
 return t;
}
