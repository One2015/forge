  // pm-profile-skill-editor:start
  pmCreateProfileSkill() {
    if(this.state.profileSkillDraft?.loading || this.personalProfileSkills().length>=12)return;
    const owner=this.profileIdentity().accountName,id='profile-skills-'+(this._deliverySequence=(this._deliverySequence || 0)+1);
    this.setState({profileTab:'skills',profileSkillNotice:'',profileSkillDraft:{id,owner,skills:[{id:'personal-'+Date.now()+'-'+this._deliverySequence,name:'',command:'',description:'',content:'',filename:'SKILL.md'}],loading:false,error:'',targetSheet:''}});
  }
  pmProfileSkillFields(skill,draft) {
    const update=(field,event)=>{
      const current=this.state.profileSkillDraft;
      if(!current || current.id!==draft.id || current.owner!==this.profileIdentity().accountName || current.loading)return;
      this.patchProfileSkillDraft({skills:current.skills.map(row=>row.id===skill.id?{...row,[field]:event.target.value}:row),error:''});
    };
    return {descriptionLabel:skill.filename+' 的描述',contentLabel:skill.filename+' 的指令',
      onDescription:event=>update('description',event),onContent:event=>update('content',event)};
  }
  saveProfileSkills() {
    const draft=this.state.profileSkillDraft;
    if(!draft || this.profileSkillDraftIssue())return;
    this.pmLegacySaveProfileSkills();
    if(this.state.profileSkillDraft)return;
    // Keep the author's reusable library definition current; existing orders retain their saved snapshots.
    const mine=this.personalProfileSkills(),changed=new Set(draft.skills.map(skill=>skill.id));
    const createdPlatformSkills=(this.state.createdPlatformSkills || []).map(skill=>{
      const updated=mine.find(row=>changed.has(row.id) && row.owner===skill.owner && row.id===skill.id);
      return updated?{...skill,name:updated.name,command:updated.command,description:updated.description,content:updated.content,size:updated.size}:skill;
    });
    this.setState({createdPlatformSkills,profileSkillNotice:draft.editId?'Skill 已更新。':this.state.profileSkillNotice});
  }
  // pm-profile-skill-editor:end
