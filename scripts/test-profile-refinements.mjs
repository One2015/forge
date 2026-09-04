import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildPostman} from './postman-ui/build.mjs';

const source=fs.readFileSync(new URL('./templates/forge-base.html',import.meta.url),'utf8');
const template=JSON.parse(buildPostman(source).split('<script type="__bundler/template">')[1].split('\n</script>')[0]);
const code=template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function component(props={}) {
  const context=vm.createContext({URL,URLSearchParams,TextEncoder,TextDecoder,Blob,setTimeout:()=>0,clearTimeout(){},
    window:{location:{search:''}},DCLogic:class{props={panelWidth:460,hasRuns:true,...props};setState(patch){Object.assign(this.state,patch);}}});
  vm.runInContext(code+';globalThis.c=new Component();',context);
  context.c.state.profileOpen=true;
  return context.c;
}
const fixture=(key,role)=>({key,name:'Task '+key,customer:'Client',target:1,entries:[],members:[{accountName:'一万',name:'一万',role}]});

test('related tasks omit ant200 without hiding its assigned Skills or association target',()=>{
  const c=component();
  c.state.deliveryOverrides={ant200:{skills:[{id:'bound-skill',name:'Existing Skill',command:'existing'}]}};
  const profile=c.buildProfileValues();
  assert(!profile.tasks.some(task=>task.key==='ant200'));
  assert(profile.targetSheets.some(sheet=>sheet.key==='ant200'));
  assert(profile.skills.some(skill=>skill.sheetKey==='ant200'));
  assert.equal(profile.taskCount,profile.tasks.length);
});

test('each related task displays the account role in that case and actions recheck membership',()=>{
  const c=component();
  c.state.deliverySheets=[fixture('owned','owner'),fixture('reviewed','reviewer-forge'),fixture('outsourced','reviewer-outsourcing'),
    {...fixture('unrelated','owner'),members:[{accountName:'other',role:'owner'}]}];
  const profile=c.buildProfileValues(),roles=new Map(profile.tasks.map(task=>[task.key,task.roleLabel]));
  assert.equal(roles.get('owned'),'Project Owner');
  assert.equal(roles.get('reviewed'),'Reviewer-Forge');
  assert.equal(roles.get('outsourced'),'Reviewer-Outsourcing');
  assert(!roles.has('unrelated'));
  const stale=profile.tasks.find(task=>task.key==='reviewed'),before=c.state.view;
  c.state.deliverySheets.find(sheet=>sheet.key==='reviewed').members=[];
  stale.open();
  assert.equal(c.state.view,before);
  c.props.currentRole='unknown';
  assert.equal(c.buildProfileValues().tasks.length,0);
});

test('project ownership includes related cases while Lead visibility alone does not imply participation',()=>{
  const owner=component({currentRole:'project-owner',ownedProjectIds:['owned-project']});
  owner.state.deliverySheets=[{...fixture('project-case','reviewer-forge'),members:[],projectIds:['owned-project']}];
  assert.equal(owner.buildProfileValues().tasks.find(task=>task.key==='project-case').roleLabel,'Project Owner');
  const lead=component({currentRole:'lead'});
  lead.state.deliverySheets=[{...fixture('other-case','owner'),members:[{accountName:'other',role:'owner'}]}];
  assert(lead.profileDeliveryTasks().some(task=>task.key==='other-case'));
  assert(!lead.buildProfileValues().tasks.some(task=>task.key==='other-case'));
});
