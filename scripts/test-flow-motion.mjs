import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { planListMotion } from './flow-motion-runtime.mjs';
import { updateFlowMotion } from './update-flow-motion.mjs';
const row = (key,y,visible=true) => ({key,x:0,y,visible});
test('sorting follows record identities instead of reused row positions', () => {
  const before=new Map([['a',row('a',0)],['b',row('b',70)]]);
  const plans=planListMotion(before,[row('b',0),row('a',70)]);
  assert.equal(plans.find(p=>p.key==='b').y,70);
  assert.equal(plans.find(p=>p.key==='a').y,-70);
  assert(plans.every(p=>p.opacity===1));
});
test('interrupting a reorder continues from the sampled visual position', () => {
  const sampled=new Map([['a',row('a',42)]]);
  const [plan]=planListMotion(sampled,[row('a',0)]);
  assert.equal(plan.y,42);
});
test('keyboard and page transitions suppress a second list animation', () => {
  for(const options of [{keyboard:true},{pageChanged:true}]) assert.deepEqual(planListMotion(new Map(),[row('a',0)],options),[]);
});
test('reduced motion fades state changes without any translation', () => {
  const plans=planListMotion(new Map([['a',row('a',0)]]),[row('a',70),row('b',140)],{reduce:true});
  assert.equal(plans.length,2); assert(plans.every(p=>p.x===0&&p.y===0&&p.duration===90));
});
test('large removals fade survivors locally; offscreen and unchanged rows do not animate', () => {
  const previous=new Map([['a',row('a',500)],['b',row('b',70)]]);
  const plans=planListMotion(previous,[row('a',0),row('b',70),row('c',900,false)]);
  assert.equal(plans.length,1); assert.equal(plans[0].key,'a'); assert.equal(plans[0].y,0); assert(plans[0].opacity<1);
});
test('large lists keep simultaneous animations bounded', () => {
  assert.equal(planListMotion(new Map(),Array.from({length:100},(_,i)=>row(String(i),i))).length,24);
});
test('flow migration is idempotent and keeps existing component syntax valid', () => {
  const source=fs.readFileSync(new URL('./templates/forge-base.html',import.meta.url),'utf8');
  assert.equal(updateFlowMotion(source),source);
  const t=JSON.parse(source.split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
  new Function(t.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
});
