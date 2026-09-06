import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {installItemPipelineView} from './postman-ui/item-pipeline-view.mjs';

const source=fs.readFileSync(new URL('../public/forge-postman.html',import.meta.url),'utf8');
const opening='<script type="__bundler/template">',closing='\n</script>\n</body>\n</html>';
const template=JSON.parse(source.slice(source.indexOf(opening)+opening.length,source.lastIndexOf(closing)).trim());
const built=installItemPipelineView(template);
const css=fs.readFileSync(new URL('../public/postman-ui/item-pipeline-view.css',import.meta.url),'utf8');

test('Item Pipeline reuses colored node types and explicit execution states',()=>{
 assert.match(built,/class="pm-item-flow-node"/);
 assert.match(built,/data-node-kind="\{\{ node\.kind \}\}" data-node-state="\{\{ node\.statusKey \}\}"/);
 assert.match(built,/pmItemPipelineNodeStatus\(execution,index,nodeNames,runContext\)/);
 assert.match(built,/statusKey:'passed'/);
 assert.doesNotMatch(built,/>\{\{ node\.status \}\}<\/small>/);
 assert.match(css,/border-left:4px solid var\(--pm-node-accent\)/);
});

test('full Pipeline opens as a large dialog with selectable node details',()=>{
 assert.match(built,/aria-label="打开完整 Pipeline"/);
 assert.match(built,/data-phosphor="arrows-out-simple"/);
 assert.match(built,/class="pm-item-graph pm-item-pipeline-thumbnail"/);
 assert.match(built,/role="dialog" aria-modal="true" aria-labelledby="pm-full-pipeline-title"/);
 assert.match(built,/aria-label="节点具体信息"/);
 assert.match(built,/pipelineSummary/);
 assert.match(built,/pipelineCounts\.skipped/);
 assert.match(built,/aria-label="Pipeline 缩放"/);
 assert.match(built,/pipelineZoomLabel:pipelineZoom\+'%'/);
 assert.match(built,/zoomIn:\(\)=>update/);
 assert.match(built,/>执行尝试<\/h4>/);
 assert.match(built,/>执行结果<\/h4>/);
 assert.match(built,/openFullPipeline:\(\)=>update\(\{fullPipeline:true,node:/);
});

test('failed historical web3d-car run includes a complete versioned Pipeline snapshot',()=>{
 const demo=fs.readFileSync(new URL('./postman-ui/item-explorer-demo.js',import.meta.url),'utf8');
 assert.match(demo,/3a5588389c844037b7f85d62bb303bcf/);
 assert.match(demo,/20260824-163805-814774/);
 assert.match(demo,/name:'web3d-car',version:'v10',dag,nodeConfigs:definitions/);
 assert.match(demo,/GLB_EXPORT_TIMEOUT/);
 assert.match(demo,/build_product\/AGENT/);
 assert.match(demo,/review\/REVIEW/);
 assert.match(demo,/34a2c04af93d44908f4fe96f7845e183/);
 assert.match(demo,/20260824-215530-2c2f09/);
 assert.match(demo,/RUNTIME_HEALTHCHECK_FAILED/);
 assert.match(demo,/startsWith\('runtime\/'\)/);
});

test('failed nodes show a banner and a direct Forge alert-group action',()=>{
 assert.match(built,/class="pm-item-pipeline-alert"/);
 assert.match(built,/同步到 Forge 报警群/);
 assert.match(built,/pipelineAlerts:\{\.\.\.alertState,\[name\]:'sent'\}/);
 assert.match(built,/class="pm-item-node-failure"/);
});

test('installer remains idempotent and leaves valid component JavaScript',()=>{
 assert.equal(installItemPipelineView(built),built);
 const logic=built.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)?.[1];
 new Function(logic);
});
