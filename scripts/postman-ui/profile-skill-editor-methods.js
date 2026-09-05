  // pm-profile-skill-editor:start
  pmProfileRelatedTasks(tasks,work) {
    const identity=this.profileIdentity();
    return tasks.filter(task=>task.key!=='ant200').flatMap(task=>{
      const sheet=this.deliverySheet(task.key),member=this.deliverySheetMembers(sheet).find(value=>value.accountName===identity.accountName);
      const relatedWork=work.filter(value=>value.assignee===identity.accountName && (value.itemIds || []).some(id=>task.itemIds.includes(id)));
      const ownsProject=identity.key==='project-owner' && ((sheet?.projectIds || []).some(id=>identity.ownedProjects.includes(id)) || work.some(value=>identity.ownedProjects.includes(value.projectId) && (value.itemIds || []).some(id=>task.itemIds.includes(id))));
      const isOwner=member?.role==='owner' || (!Array.isArray(sheet?.members) && (sheet?.createdBy || sheet?.ownerAccount)===identity.accountName);
      let roleLabel='';
      if(isOwner)roleLabel='Project Owner';
      else if(member)roleLabel=this.deliveryMemberRoles().find(role=>role.key===member.role)?.label || '成员';
      else if(ownsProject)roleLabel='Project Owner';
      else if(relatedWork.some(value=>value.kind==='review'))roleLabel=identity.key==='outsourcing'?'Reviewer-Outsourcing':'Reviewer-Forge';
      else if(relatedWork.length)roleLabel='任务发起人';
      return roleLabel?[{...task,roleLabel}]:[];
    });
  }
  pmPositionProfileSkillMenu(event) {
    if(typeof document==='undefined')return;
    const menu=document.getElementById('pm-profile-skill-create-menu'),trigger=event.currentTarget;
    if(!menu || !trigger)return;
    const rect=trigger.getBoundingClientRect(),width=Math.min(240,window.innerWidth-24),height=134;
    const below=rect.bottom+6,top=below+height<=window.innerHeight-12?below:rect.top-height-6;
    menu.style.width=width+'px';
    menu.style.left=Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12))+'px';
    menu.style.top=Math.max(12,top)+'px';
  }
  pmCloseProfileSkillMenu() {
    if(typeof document==='undefined')return;
    const menu=document.getElementById('pm-profile-skill-create-menu');
    if(menu?.matches(':popover-open'))menu.hidePopover();
  }
  pmPickProfileSkillFile() {
    if(this.state.profileSkillDraft?.loading || this.personalProfileSkills().length>=12)return;
    this.pmCloseProfileSkillMenu();
    if(typeof document!=='undefined')document.getElementById('pm-profile-skill-file')?.click();
  }
  pmCreateProfileSkill() {
    if(this.state.profileSkillDraft?.loading || this.personalProfileSkills().length>=12)return;
    this.pmCloseProfileSkillMenu();
    const owner=this.profileIdentity().accountName,id='profile-skills-'+(this._deliverySequence=(this._deliverySequence || 0)+1);
    this.setState({profileTab:'skills',profileSkillNotice:'',profileSkillPreview:null,profileSkillDraft:{id,owner,skills:[{id:'personal-'+Date.now()+'-'+this._deliverySequence,name:'',command:'',description:'',content:'',filename:'SKILL.md'}],loading:false,error:'',targetSheet:''}});
  }
  pmProfileSkillFields(skill,draft) {
    const update=(field,event)=>{
      const current=this.state.profileSkillDraft;
      if(!current || current.id!==draft.id || current.owner!==this.profileIdentity().accountName || current.loading)return;
      this.patchProfileSkillDraft({skills:current.skills.map(row=>row.id===skill.id?{...row,[field]:event.target.value}:row),error:''});
    };
    const errors=draft.submitted?this.pmProfileSkillErrors(skill,draft):{};
    const ids={},prefix='pm-profile-skill-'+encodeURIComponent(skill.id);
    for(const field of ['name','command','description','content']) {
      ids[field+'Id']=prefix+'-'+field;
      ids[field+'ErrorId']=prefix+'-'+field+'-error';
      ids[field+'Error']=errors[field] || '';
      ids[field+'Invalid']=errors[field]?'true':'false';
      ids[field+'DescribedBy']=errors[field]?ids[field+'ErrorId']:'';
    }
    const linkedSheets=this.profileDeliveryTasks().filter(task=>(this.deliverySheet(task.key)?.skills || []).some(bound=>
      (bound.personalSkillId===skill.id && bound.owner===draft.owner) || bound.libraryKey==='personal:'+draft.owner+':'+skill.id
    )).map(task=>({key:task.key,title:task.title}));
    return {...ids,descriptionLabel:skill.filename+' 的描述',contentLabel:skill.filename+' 的指令',
      commandHintId:prefix+'-command-hint',commandDescribedBy:[prefix+'-command-hint',ids.commandDescribedBy].filter(Boolean).join(' '),
      linkedSheets,hasLinkedSheets:!!linkedSheets.length,noLinkedSheets:!linkedSheets.length,showLinkedSheets:!!draft.editId,
      onName:event=>update('name',event),onCommand:event=>update('command',event),
      onDescription:event=>update('description',event),onContent:event=>update('content',event)};
  }
  pmProfileSkillErrors(skill,draft) {
    const errors={},name=String(skill.name || '').trim(),command=this.skillCommand(skill.command);
    if(!name)errors.name='请填写 Skill 名称。';
    else if(name.length>80)errors.name='Skill 名称不能超过 80 字。';
    if(!this.validSkillCommand(command))errors.command='调用名须为 1–60 字，可用中英文、数字、空格、短横线和下划线。';
    else {
      const others=this.personalProfileSkills().filter(value=>value.id!==draft.editId).concat(draft.skills.filter(value=>value.id!==skill.id));
      if(others.some(value=>this.skillCommand(value.command).toLowerCase()===command.toLowerCase()))errors.command='此调用名已存在，请换一个调用名。';
    }
    if(!String(skill.content || '').trim())errors.content='请填写 Skill 指令。';
    else if(String(skill.content).includes('\0') || new TextEncoder().encode(skill.content).length>512*1024)errors.content='指令须为文本，且不能超过 512 KB。';
    if(String(skill.description || '').length>300)errors.description='描述不能超过 300 字。';
    return errors;
  }
  pmProfileSkillFormIssue(draft,issue) {
    if(!draft?.submitted || !issue)return '';
    return draft.skills.some(skill=>Object.keys(this.pmProfileSkillErrors(skill,draft)).length)?'':issue;
  }
  saveProfileSkills() {
    const draft=this.state.profileSkillDraft;
    if(!draft || draft.loading || draft.owner!==this.profileIdentity().accountName)return;
    this.patchProfileSkillDraft({submitted:true});
    if(this.profileSkillDraftIssue()) {
      setTimeout(()=>{
        if(typeof document==='undefined' || this.state.profileSkillDraft?.id!==draft.id || this.profileIdentity().accountName!==draft.owner)return;
        document.querySelector('.pm-profile-skill-form [aria-invalid="true"]')?.focus();
      },0);
      return;
    }
    this.pmLegacySaveProfileSkills();
    if(this.state.profileSkillDraft)return;
    // Keep the author's reusable library definition current; existing orders retain their saved snapshots.
    const mine=this.personalProfileSkills(),changed=new Set(draft.skills.map(skill=>skill.id));
    const createdPlatformSkills=(this.state.createdPlatformSkills || []).map(skill=>{
      const updated=mine.find(row=>changed.has(row.id) && row.owner===skill.owner && row.id===skill.id);
      return updated?{...skill,name:updated.name,command:updated.command,description:updated.description,content:updated.content,size:updated.size}:skill;
    });
    this.setState({createdPlatformSkills,profileSkillNotice:'',profileSkillPreview:{id:draft.skills[0].id,owner:draft.owner}});
  }
  // pm-profile-skill-editor:end
