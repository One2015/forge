import fs from 'node:fs';
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
 ["draftSkills: (draft?.skills || []).map(skill => Object.assign({}, skill, {", "draftSkills: (draft?.skills || []).map(skill => Object.assign({}, skill, { ...this.pmProfileSkillFields(skill,draft),"]
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
 const menu=fs.readFileSync(new URL('profile-skill-create-menu.html',import.meta.url),'utf8').replace(/\[\[icon:([\w-]+):(\d+)\]\]/g,(_,name,size)=>fs.readFileSync(new URL('../../assets/phosphor/regular/'+name+'.svg',import.meta.url),'utf8').replace(/<svg[^>]*>/,'<svg class="forge-icon" width="'+size+'" height="'+size+'" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true">'));
 t=t.replace(toolbar,()=>menu);
 t=t.replace('<div class="forge-profile-empty"><h3>还没有 Skill</h3><p>点击「上传 Skill」添加并命名，无需先关联任务。</p></div>','<div class="forge-profile-empty pm-profile-skill-empty"><img src="/postman-ui/illustrations/skill-library-empty.png" width="156" height="156" alt="" /><h3>还没有 Skill</h3><p>点击「创建 Skill」，填写指令或上传文件。</p></div>');
 t=t.replace('aria-label="命名和关联 Skill"','aria-label="编辑 Skill"');
 const field='<label class="forge-profile-skill-field"><span>关联到数据单';
 const index=t.indexOf(field),end=t.lastIndexOf('</div>\n            </sc-for>',index);
 if(end<0)throw Error('Profile draft form boundary changed');
 t=t.slice(0,end)+`<label class="forge-profile-skill-field"><span>描述</span><input aria-label="{{ draft.descriptionLabel }}" value="{{ draft.description }}" sc-camel-on-change="{{ draft.onDescription }}" maxlength="300" disabled="{{ profile.draftLoading }}" /></label>
                <label class="forge-profile-skill-field"><span>指令 *</span><textarea aria-label="{{ draft.contentLabel }}" value="{{ draft.content }}" sc-camel-on-input="{{ draft.onContent }}" disabled="{{ profile.draftLoading }}" required></textarea></label>
              `+t.slice(end);
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('profile-skill-editor-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
