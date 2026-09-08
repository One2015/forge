import test from 'node:test';
import assert from 'node:assert/strict';
import {sortPipelineRows} from './postman-ui/pipeline-table-controls.mjs';
const rows=[{name:'a',lastH:24,runs:2,rate:90,cost:'$100'},{name:'b',lastH:2,runs:10,rate:60,cost:'$200'},{name:'c',lastH:5,runs:0,rate:0,cost:'$0'}];
test('each column sorts numeric values in both directions, missing metrics stay last',()=>{
 const expected={last:['a','c','b'],runs:['c','a','b'],rate:['b','a','c'],cost:['b','a','c']};
 for(const key of Object.keys(expected)){
  assert.deepEqual(sortPipelineRows(rows,key,'asc').map(p=>p.name),expected[key]);
  const desc=key==='rate'||key==='cost'?['a','b','c']:[...expected[key]].reverse();
  assert.deepEqual(sortPipelineRows(rows,key,'desc').map(p=>p.name),desc);
 }
 assert.deepEqual(rows.map(p=>p.name),['a','b','c']);
});
test('sorting preserves ties and an unsorted list',()=>{
 assert.equal(sortPipelineRows(rows,undefined,'asc'),rows);
 assert.deepEqual(sortPipelineRows([rows[0],{...rows[0],name:'d'}],'runs','desc').map(p=>p.name),['a','d']);
});
