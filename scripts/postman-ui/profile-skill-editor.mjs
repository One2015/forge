import fs from 'node:fs';
export const profileSkillEditorCopy=[
 ['  saveProfileSkills() {','  pmLegacySaveProfileSkills() {'],
 ["      if (commands.has(command.toLowerCase())) return '个人 Skill 调用名重复，请修改后保存。';", "      const definitionIssue=this.deliverySkillDefinitionIssue(skill); if(definitionIssue)return definitionIssue;\n      if (commands.has(command.toLowerCase())) return '个人 Skill 调用名重复，请修改后保存。';"],
 ["command: this.skillCommand(skill.command), owner: draft.owner }));", "command: this.skillCommand(skill.command), size:new TextEncoder().encode(skill.content || '').length, owner: draft.owner }));"],
 ["action: skill.personal ? '命名 / 关联' : '查看数据单'", "action: skill.personal ? '编辑 Skill' : '查看数据单'"],
 ["(skill.personal ? '命名或关联 · ' : '查看数据单 · ')", "(skill.personal ? '编辑 Skill · ' : '查看数据单 · ')"],
 ["      uploadDisabled: !!draft?.loading || this.personalProfileSkills().length >= 12,", "      createSkill:()=>this.pmCreateProfileSkill(), uploadDisabled: !!draft?.loading || this.personalProfileSkills().length >= 12,"],
 ["draftSkills: (draft?.skills || []).map(skill => Object.assign({}, skill, {", "draftSkills: (draft?.skills || []).map(skill => Object.assign({}, skill, { ...this.pmProfileSkillFields(skill,draft),"]
];
export function installProfileSkillEditor(t){
 for(const [a,b] of profileSkillEditorCopy){if(!t.includes(a))throw Error('Profile Skill anchor changed: '+a);t=t.replace(a,()=>b);}
 t=t.replace('<div class="forge-profile-task-project">{{ task.customer }}</div>','');
 t=t.replace('<span>{{ task.meta }}</span>','<span>{{ task.key }}</span>');
 t=t.replace('<div class="forge-profile-skill-toolbar"><span>个人及数据单 Skill</span>', '<div class="forge-profile-skill-toolbar"><span>个人及数据单 Skill</span><button type="button" class="pm-profile-create-skill" disabled="{{ profile.uploadDisabled }}" sc-camel-on-click="{{ profile.createSkill }}">创建 Skill</button>');
 t=t.replace('点击「上传 Skill」添加并命名，无需先关联任务。','点击「创建 Skill」填写指令，或上传 Skill 文件。');
 t=t.replace('aria-label="命名和关联 Skill"','aria-label="编辑 Skill"');
 const field='<label class="forge-profile-skill-field"><span>关联到数据单';
 const index=t.indexOf(field),end=t.lastIndexOf('</div>\n            </sc-for>',index);
 if(end<0)throw Error('Profile draft form boundary changed');
 t=t.slice(0,end)+`<label class="forge-profile-skill-field"><span>描述</span><input aria-label="{{ draft.descriptionLabel }}" value="{{ draft.description }}" sc-camel-on-change="{{ draft.onDescription }}" maxlength="300" disabled="{{ profile.draftLoading }}" /></label>
                <label class="forge-profile-skill-field"><span>指令 *</span><textarea aria-label="{{ draft.contentLabel }}" value="{{ draft.content }}" sc-camel-on-input="{{ draft.onContent }}" disabled="{{ profile.draftLoading }}" required></textarea></label>
              `+t.slice(end);
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('profile-skill-editor-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
