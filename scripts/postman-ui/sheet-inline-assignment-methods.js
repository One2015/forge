  // pm-sheet-inline:start
  pmSheetTaskTags(sheet) {
    const tags = (sheet.tags || []).map(tag => ({...tag}));
    for (const [name,color] of [['repair','#397448'],['reroll','#586b9a']]) {
      if (!tags.some(tag=>tag.name.toLowerCase()===name)) tags.push({id:'__task_'+name,name,color,suggested:true,disabled:(sheet.tags || []).length>=20});
    }
    return tags;
  }

  pmSheetAssignments(sheet) {
    const members = this.deliverySheetMembers(sheet), entries = this.deliveryEntries(sheet);
    const reviews = new Map(this.deliveryReviewDatasets(sheet).map(group=>[group.key,group]));
    const ownerOptions = this.deliveryReviewerOptions({members});
    const tags = sheet.tags || [], taskTagOptions = this.pmSheetTaskTags(sheet);
    const actor = this.profileIdentity().accountName, assignmentReadonly = !this.canManageDeliveryMembers(sheet);
    return new Map(entries.map(entry => {
      const id = entry.itemId || entry.key, tagId = entry.tagId || sheet.entryTags?.[id] || '';
      return [id, {
        owner:reviews.get('item:'+id)?.reviewer || '', ownerName:ownerOptions.find(person=>person.accountName===reviews.get('item:'+id)?.reviewer)?.label || reviews.get('item:'+id)?.reviewer || '未分配', ownerOptions, assignmentReadonly,
        ownerLabel:'分配 '+entry.name+' 的负责人',taskTagLabel:'分配 '+entry.name+' 的 Task Tag',openLabel:'查看 '+entry.name+' 大图',
        taskTag:tagId, taskTagOptions, ...this.pmEntryTagStyle({tagId},{tags}),
        assignOwner:event=>this.pmAssignSheetItem(sheet.key,id,'owner',event.target.value,actor),
        assignTag:event=>this.pmAssignSheetItem(sheet.key,id,'tag',event.target.value,actor)
      }];
    }));
  }

  pmAssignSheetItem(sheetKey, itemId, field, value, actor) {
    const sheet = this.deliverySheet(sheetKey);
    if (!sheet || this.profileIdentity().accountName !== actor || !this.canManageDeliveryMembers(sheet) || this.state.deliveryEditor) return;
    const entries = this.deliveryEntries(sheet), entry = entries.find(row=>(row.itemId || row.key)===itemId);
    if (!entry) return;
    let patch;
    if (field === 'owner') {
      const members = this.deliverySheetMembers(sheet), options = this.deliveryReviewerOptions({members});
      const person = options.find(person=>person.accountName===value);
      if (value && !person) return;
      if (person && !members.some(member=>member.accountName===value)) {
        if (members.length >= 50) return;
        members.push({accountName:value,name:person.name,role:'reviewer-forge'});
      }
      const key = 'item:'+itemId, before = this.deliveryReviewDatasets(sheet).find(row=>row.key===key);
      if ((before?.reviewer || '') === value) return;
      const at = Date.now(), after = {reviewer:value,status:before?.status || 'pending',updatedBy:actor,updatedAt:at};
      patch = {members,reviewScope:'item',datasetReviews:{...sheet.datasetReviews,[key]:after},
        datasetReviewHistory:[...(sheet.datasetReviewHistory || []),{datasetKey:key,datasetName:entry.name,before:before ? {reviewer:before.reviewer,status:before.status} : null,after,actor,at}]};
    } else if (field === 'tag') {
      const tag = this.pmSheetTaskTags(sheet).find(tag=>tag.id===value);
      if (value && (!tag || tag.disabled)) return;
      let tags = (sheet.tags || []).slice(), id = value;
      if (tag?.suggested) {
        id = 'task-tag-'+Date.now()+'-'+(this._deliverySequence=(this._deliverySequence || 0)+1);
        tags.push({id,name:tag.name,color:tag.color});
      }
      patch = {tags,entryTags:{...sheet.entryTags,[itemId]:id}};
      if (Array.isArray(sheet.entries)) patch.entries=sheet.entries.map(row=>(row.itemId || row.key)===itemId ? {...row,tagId:id} : row);
    } else return;
    const custom = (this.state.deliverySheets || []).slice(), index = custom.findIndex(value=>value.key===sheetKey);
    if (index >= 0) {custom[index]={...custom[index],...patch};this.setState({deliverySheets:custom});}
    else this.setState({deliveryOverrides:{...this.state.deliveryOverrides,[sheetKey]:{...this.state.deliveryOverrides?.[sheetKey],...patch}}});
  }
  // pm-sheet-inline:end
