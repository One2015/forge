import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPostman} from './postman-ui/build.mjs';

const source=fs.readFileSync(new URL('./templates/forge-base.html',import.meta.url),'utf8');
const document=JSON.parse(buildPostman(source).split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const pageStart=document.indexOf('<div class="forge-page pm-page-pipelines"');
const pageEnd=document.indexOf('<sc-if value="{{ isPipeEdit }}"',pageStart);
const page=document.slice(pageStart,pageEnd);

test('Pipeline toolbar keeps search and create action together without the subtitle',()=>{
 assert(pageStart>=0&&pageEnd>pageStart);
 assert.doesNotMatch(page,/\{\{ pipeSubtitle \}\}/);
 assert.doesNotMatch(page,/list="\{\{ pipeFilters \}\}"/);
 const search=page.indexOf('sc-camel-on-change="{{ onPipeQuery }}"');
 const create=page.indexOf('sc-camel-on-click="{{ openNewPipe }}"');
 const list=page.indexOf('class="pm-pipelines-list"');
 assert(search>=0&&create>search&&create<list);
});

test('Pipeline status is filterable from the table header and visible in every row',()=>{
 assert.match(page,/class="pm-pipelines-status-filter" data-filter-active="\{\{ pipeFilterActive \}\}"/);
 assert.match(page,/select aria-label="筛选 Pipeline 状态" value="\{\{ pipeFilterValue \}\}" sc-camel-on-change="\{\{ onPipeFilter \}\}"/);
 assert.match(page,/<option value="active">活跃<\/option>[\s\S]*<option value="all">全部<\/option>[\s\S]*<option value="archived">废弃<\/option>/);
 assert.match(page,/class="pm-pipelines-metric pm-pipelines-status" data-label="状态"[\s\S]*data-state="archived">废弃<[\s\S]*data-state="active">活跃</);
 assert.match(document,/pipeFilterValue: \(\{ '活跃': 'active', '全部': 'all', '废弃': 'archived' \}\)\[st\.pipeFilter\] \|\| 'active'/);
 assert.match(document,/pipeFilter: \(\{ active: '活跃', all: '全部', archived: '废弃' \}\)\[e\.target\.value\] \|\| '活跃'/);
});
