import fs from 'node:fs';
import {renderPhosphorIcons} from './phosphor-icons.mjs';
export const profileSkillEditorCopy=[
 ["work = this.state.profileOpen ? this.profileTasks() : [], tasks = this.state.profileOpen ? this.profileDeliveryTasks(work) : [], skills =", "work = this.state.profileOpen ? this.profileTasks() : [], deliveryTasks = this.state.profileOpen ? this.profileDeliveryTasks(work) : [], tasks = this.pmProfileRelatedTasks(deliveryTasks,work), skills ="],
 ["taskHint: tasks.length + ' 份交付数据单 · 点击进入查看和审核'", "taskHint: tasks.length + ' 个相关任务 · 点击查看详情'"],
 ["emptyTaskHint: '暂无与你相关的交付数据单，分配后会显示在这里。'", "emptyTaskHint: '你创建、负责或参与的任务会显示在这里。'"],
 ["targetSheets: tasks.map(task => ({ key: task.key, label: task.title }))", "targetSheets: deliveryTasks.map(task => ({ key: task.key, label: task.title }))"],
 ['  saveProfileSkills() {','  pmLegacySaveProfileSkills() {'],
 ["      if (commands.has(command.toLowerCase())) return '个人 Skill 调用名重复，请修改后保存。';", "      const definitionIssue=this.deliverySkillDefinitionIssue(skill); if(definitionIssue)return definitionIssue;\n      if (commands.has(command.toLowerCase())) return '个人 Skill 调用名重复，请修改后保存。';"],
 ["command: this.skillCommand(skill.command), owner: draft.owner }));", "command: this.skillCommand(skill.command), size:new TextEncoder().encode(skill.content || '').length, owner: draft.owner }));"],
 ["action: skill.personal ? '命名 / 关联' : '查看数据单'", "action: skill.personal ? '编辑 Skill' : '查看数据单'"],
 ["(skill.personal ? '命名或关联 · ' : '查看数据单 · ')", "(skill.personal ? '编辑 Skill · ' : '查看数据单 · ')"],
 ["      uploadDisabled: !!draft?.loading || this.personalProfileSkills().length >= 12,", "      createSkill:()=>this.pmCreateProfileSkill(), positionSkillMenu:event=>this.pmPositionProfileSkillMenu(event), pickSkillFile:()=>this.pmPickProfileSkillFile(), uploadDisabled: !!draft?.loading || this.personalProfileSkills().length >= 12,"],
 ["draftError: draft?.error || '', draftIssue: issue,", "draftError: draft?.error || '', draftIssue: this.pmProfileSkillFormIssue(draft,issue),"],
 ["draftSaveDisabled: !!issue,", "draftSaveDisabled: !draft || !!draft.loading || !draft.skills.length,"],
 ["remove: () => this.patchProfileSkillDraft({ skills: this.state.profileSkillDraft.skills.filter(value => value.id !== skill.id) })", "remove: () => this.patchProfileSkillDraft({ skills: this.state.profileSkillDraft.skills.filter(value => value.id !== skill.id) }), ...this.pmProfileSkillFields(skill,draft)"]
];
export function installProfileSkillEditor(t){
 for(const [a,b] of profileSkillEditorCopy){if(!t.includes(a))throw Error('Profile Skill anchor changed: '+a);t=t.replace(a,()=>b);}
 t=t.replace('<div class="forge-profile-task-project">{{ task.customer }}</div>','');
 t=t.replace('<span>{{ task.meta }}</span>','<span class="pm-profile-task-id">{{ task.key }}</span><span class="pm-profile-task-role">{{ task.roleLabel }}</span>');
 t=t.replace('>任务列表 <span>{{ profile.taskCount }}</span>','>相关任务列表 <span>{{ profile.taskCount }}</span>');
 t=t.replace('id="forge-profile-tasks" aria-label="任务列表"','id="forge-profile-tasks" aria-label="相关任务列表"');
 t=t.replace('<h3>暂无交付数据单</h3>','<h3>暂无相关任务</h3>');
 t=t.replace('<p class="forge-profile-skill-help">支持 MD 或含 SKILL.md 的 ZIP；上传后可命名并关联数据单。个人最多 12 个。</p>','');
 t=t.replace(/<footer class="forge-profile-footer">\s*<p>本地演示 · 刷新后清空<\/p>\s*<\/footer>/,'');
 const toolbar=/<div class="forge-profile-skill-toolbar"><span>个人及数据单 Skill<\/span><label[\s\S]*?<\/label><\/div>/;
 if(!toolbar.test(t))throw Error('Profile Skill toolbar boundary changed');
 const renderIcons=renderPhosphorIcons;
 const menu=renderIcons(fs.readFileSync(new URL('profile-skill-create-menu.html',import.meta.url),'utf8'));
 t=t.replace(toolbar,()=>menu);
 t=t.replace('<sc-if value="{{ profile.notice }}" hint-placeholder-val="{{ false }}"><p class="forge-profile-skill-notice" role="status">{{ profile.notice }}</p></sc-if>',()=>'<sc-if value="{{ profile.notice }}" hint-placeholder-val="{{ false }}"><div class="pm-profile-skill-confirmation" role="status">'+renderIcons('[[icon:check-circle:20]]')+'<div><p>{{ profile.notice }}</p><small>可从下方打开 Skill，查看详情与关联数据单。</small></div></div></sc-if>');
 t=t.replace('<div class="forge-profile-empty"><h3>还没有 Skill</h3><p>点击「上传 Skill」添加并命名，无需先关联任务。</p></div>','<div class="forge-profile-empty pm-profile-skill-empty"><img src="/postman-ui/illustrations/skill-library-empty.png" width="156" height="156" alt="" /><h3>还没有 Skill</h3><p>点击「创建 Skill」，填写指令或上传文件。</p></div>');
 const start=t.indexOf('<div class="forge-profile-skill-editor" role="group" aria-label="命名和关联 Skill">');
 const end=t.indexOf('\n        </sc-if>\n        <sc-if value="{{ profile.noSkills }}"',start);
 if(start<0 || end<0)throw Error('Profile draft form boundary changed');
 const form=renderIcons(fs.readFileSync(new URL('profile-skill-form.html',import.meta.url),'utf8'));
 t=t.slice(0,start)+form+t.slice(end);
 const listStart=t.indexOf('<sc-if value="{{ profile.noSkills }}"',start);
 const listEnd=t.indexOf('</ul>',listStart)+5;
 if(listStart<0 || listEnd<5)throw Error('Profile Skill list boundary changed');
 const preview=renderIcons(fs.readFileSync(new URL('profile-skill-preview.html',import.meta.url),'utf8'));
 const list=t.slice(listStart,listEnd);
 t=t.slice(0,listStart)+preview+'\n        <sc-if value="{{ profile.showSkillList }}">\n        '+list+'\n        </sc-if>'+t.slice(listEnd);
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('profile-skill-editor-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
