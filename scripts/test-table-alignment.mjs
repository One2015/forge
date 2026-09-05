import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { buildPostman } from './postman-ui/build.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('all data-table headers and values use the same left alignment', () => {
  const runs = read('../public/postman-ui/run-records.css');
  const responsive = read('../public/postman-ui/global-responsive.css');
  const review = read('../public/postman-ui/review-queue.css');
  const billing = read('./templates/billing.css');
  const wizard = read('./templates/delivery-wizard.css');
  const model = read('./templates/model-status.css');
  const pages = read('../public/postman-ui/pages.css');

  assert.match(runs, /\.rr-number\{text-align:left/);
  assert.doesNotMatch(responsive, /\.rr-person\{[^}]*text-align:right/);
  assert.doesNotMatch(responsive, /\.rr-row>\.rr-number[^}]*justify-content:flex-end/);
  assert.match(review, /\.pq-table-head>\[role=columnheader\]\{text-align:left\}/);
  assert.doesNotMatch(responsive, /\.pq-round\{[^}]*text-align:right/);
  assert.match(billing, /\.forge-billing-table :is\([^}]+\)\{padding:[^}]*text-align:left/);
  assert.match(billing, /\.forge-billing-thead button\{[^}]*justify-content:flex-start/);
  assert.match(billing, /\.forge-billing-share\{[^}]*margin:5px auto 0 0/);
  assert.match(wizard, /\.forge-wizard-table-row \[role="cell"\]:nth-child\(2\)\{text-align:left\}/);
  assert.doesNotMatch(model, /\.forge-model-table[^}]*text-align:right/);
  assert.match(pages, /\.forge-postman \.forge-model-routes-table \[role="row"\]\{grid-template-columns:104px 120px 150px 132px 90px 100px 130px 130px 90px 130px 170px\}/);
  assert.match(pages, /\.forge-postman \.forge-model-routes-table\{min-width:1470px\}/);
  assert.match(pages, /forge-model-comparison-table\) \[role="row"\]>\*\{text-align:left\}/);
});

test('the generated UI keeps the complete semantic table inventory', () => {
  const source = read('./templates/forge-base.html');
  const built = buildPostman(source);
  const template = JSON.parse(built.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
  const labels = [...template.matchAll(/<[^>]+role="table"[^>]*>/g)].map(match => match[0].match(/aria-label="([^"]+)"/)?.[1] || 'comparison');
  for (const label of ['审核任务列表', '运行记录表格', '同步条目预览', 'Item 审核分配', '实际生产模型线路', '单个专家团队交付情况']) {
    assert(labels.includes(label), label);
  }
  assert(labels.some(label => label.includes('费用明细')));
});
