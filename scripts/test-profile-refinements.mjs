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
  assert.equal(roles.get('outsourced'),'外部专家');
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

test('Skill field errors appear after submission and clear as corrected; invalid drafts never save',()=>{
  const c=component(),change=value=>({target:{value}});
  c.pmCreateProfileSkill();
  let profile=c.buildProfileValues(),row=profile.draftSkills[0];
  assert.equal(profile.draftSaveDisabled,false);
  assert.equal(profile.draftIssue,'');
  assert.equal(row.nameError,'');
  assert.equal(row.nameInvalid,'false');
  profile.saveSkills();
  profile=c.buildProfileValues();row=profile.draftSkills[0];
  assert.equal(c.personalProfileSkills().length,0);
  assert.equal(row.nameError,'请填写 Skill 名称。');
  assert.equal(row.nameInvalid,'true');
  assert.equal(row.nameDescribedBy,row.nameErrorId);
  assert.equal(profile.draftIssue,'','field errors are not duplicated at the bottom');
  row.onName(change('结构检查'));
  assert.equal(c.buildProfileValues().draftSkills[0].nameError,'');
  row.onCommand(change('structure'));
  row.onContent(change('检查主体结构是否完整。'));
  assert.equal(c.profileSkillDraftIssue(),'');
  c.saveProfileSkills();
  assert.equal(c.personalProfileSkills()[0].name,'结构检查');
  assert.equal(c.state.profileSkillDraft,null);
});

test('saving a Skill opens a dedicated preview and returns to a clean Skill list',()=>{
  const c=component(),change=value=>({target:{value}});
  c.pmCreateProfileSkill();
  let row=c.buildProfileValues().draftSkills[0];
  row.onName(change('结构检查'));row.onCommand(change('structure'));row.onDescription(change('检查模型结构。'));row.onContent(change('逐项检查主体结构和比例。'));
  c.saveProfileSkills();
  let profile=c.buildProfileValues();
  assert(!profile.hasDraft);assert(profile.hasSkillPreview);assert(!profile.showSkillList);
  assert.equal(profile.skillPreview.name,'结构检查');assert.equal(profile.skillPreview.commandLabel,'/structure');
  assert.equal(profile.skillPreview.description,'检查模型结构。');assert.equal(profile.skillPreview.content,'逐项检查主体结构和比例。');
  profile.backToSkillList();profile=c.buildProfileValues();
  assert(!profile.hasSkillPreview);assert(profile.showSkillList);assert.equal(profile.skills.length,1);
  const skills=template.slice(template.indexOf('<section id="forge-profile-skills"'),template.indexOf('<!-- forge-profile:end -->'));
  assert.match(skills,/<sc-if value="\{\{ profile\.hasSkillPreview \}\}">[\s\S]*返回 Skill 列表[\s\S]*<sc-if value="\{\{ profile\.showSkillList \}\}">/);
});

test('linked sheet list uses actual personal Skill bindings and respects task access',()=>{
  const c=component();
  const personal={id:'quality',owner:'一万',name:'质量检查',command:'quality',content:'检查质量',filename:'SKILL.md'};
  c.state.personalSkills=[personal];
  const bound={id:'bound',personalSkillId:'quality',owner:'一万'};
  c.state.deliveryOverrides={ant200:{skills:[bound,bound]}};
  c.state.deliverySheets=[
    {...fixture('linked','reviewer-forge'),skills:[{id:'copy',libraryKey:'personal:一万:quality'}]},
    {...fixture('unlinked','owner'),skills:[{...bound,owner:'other'}]},
    {...fixture('private','owner'),members:[{accountName:'other',role:'owner'}],skills:[bound]}
  ];
  c.editPersonalSkill(personal.id);
  let row=c.buildProfileValues().draftSkills[0];
  assert.deepEqual(Array.from(row.linkedSheets,s=>s.key).sort(),['ant200','linked']);
  assert(row.hasLinkedSheets);assert(!row.noLinkedSheets);
  c.state.deliverySheets.find(s=>s.key==='linked').members=[];
  assert.deepEqual(Array.from(c.buildProfileValues().draftSkills[0].linkedSheets,s=>s.key),['ant200']);
  c.pmCreateProfileSkill();
  row=c.buildProfileValues().draftSkills[0];
  assert(row.noLinkedSheets);assert.equal(row.linkedSheets.length,0);
  const form=template.slice(template.indexOf('class="forge-profile-skill-editor pm-profile-skill-form"'),template.indexOf('value="{{ profile.noSkills }}"'));
  assert(!form.includes('<select'));
});

test('duplicate commands report at the command field and stale editor callbacks are ignored',()=>{
  const c=component(),change=value=>({target:{value}});
  c.state.personalSkills=[{id:'existing',owner:'一万',name:'已有',command:'check',content:'指令'}];
  c.pmCreateProfileSkill();
  const row=c.buildProfileValues().draftSkills[0];
  row.onName(change('新 Skill'));row.onCommand(change('CHECK'));row.onContent(change('新指令'));
  c.saveProfileSkills();
  assert.match(c.buildProfileValues().draftSkills[0].commandError,/已存在/);
  assert.equal(c.personalProfileSkills().length,1);
  c.pmCreateProfileSkill();
  row.onName(change('过期修改'));
  assert.equal(c.buildProfileValues().draftSkills[0].name,'');
});
