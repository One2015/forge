  // pm-task-tags:start
  pmTaskTagIds(value,entry=null) {
    const defaults=Array.isArray(value?.defaultTaskTagIds)?value.defaultTaskTagIds:value?.defaultTagId?[value.defaultTagId]:[];
    let ids=entry?(Array.isArray(entry.taskTagIds)?entry.taskTagIds:entry.tagId==='__none__'?[]:entry.tagId?[entry.tagId]:defaults):defaults;
    return [...new Set(ids)].filter(id=>(value?.tags || []).some(tag=>tag.id===id)).slice(0,1);
  }
  pmTaskTagNames(value,entry=null) {
    return this.pmTaskTagIds(value,entry).map(id=>value.tags.find(tag=>tag.id===id).name).join('、') || '未设置';
  }
  pmTaskTagSummaryNames(value) {
    const ids=[...new Set((value?.entries || []).flatMap(entry=>this.pmTaskTagIds(value,entry)).concat(this.pmTaskTagIds(value)))];
    return ids.map(id=>value.tags.find(tag=>tag.id===id)?.name).filter(Boolean).join('、') || '未设置';
  }
  addDeliveryTag() {
    const editor=this.state.deliveryEditor;if(!editor)return;
    const ids=this.pmTaskTagIds(editor),before=editor.tags.length;
    this.pmLegacyAddDeliveryTag();
    const current=this.state.deliveryEditor;
    if(current?.id===editor.id && current.tags.length>before)this.patchDeliveryEditor({defaultTaskTagIds:ids,defaultTagId:ids[0] || '',tagNotice:current.tags.length>=20?'已达到 20 个 Tag 上限。':''},editor.id);
  }
  pmTaskTagPicker(value,entry=null,saved=false) {
    const ids=this.pmTaskTagIds(value,entry),actor=this.profileIdentity().accountName;
    const tags=(saved?this.pmSheetTaskTags(value):value?.tags || []).map(tag=>({...tag,fg:this.tagForeground(tag.color)}));
    const readonly=saved?!this.canManageDeliveryMembers(value):!this.deliveryMembersEditable(value) || !!value.listLoading;
    const longest=tags.reduce((max,tag)=>Math.max(max,[...String(tag.name || '')].reduce((size,char)=>size+(char.charCodeAt(0)>255?2:1),0)),0);
    const width=Math.min(280,Math.max(116,52+longest*7))+'px';
    const inputName='pm-task-tag-'+String(value?.id || value?.key || 'sheet')+'-'+String(entry?.key || entry?.itemId || 'default');
    return {label:entry?'设置 '+entry.name+' 的 task 状态':'设置 Tag',inputName,width,readonly,empty:!ids.length,noOptions:!tags.length,selected:tags.filter(tag=>ids.includes(tag.id)),
      options:tags.map(tag=>({...tag,checked:ids.includes(tag.id),toggle:event=>{
        if(!event.target.checked)return;
        if(saved)this.pmToggleSavedTaskTag(value.key,entry.itemId || entry.key,tag.id,true,actor);
        else this.pmToggleTaskTag(value.id,entry?.key || null,tag.id,true,actor);
      }}))};
  }
  pmToggleTaskTag(editorId,entryKey,tagId,checked,actor) {
    const editor=this.state.deliveryEditor;
    if(!editor || editor.id!==editorId || actor!==this.profileIdentity().accountName || !this.deliveryMembersEditable(editor) || editor.listLoading || !editor.tags.some(tag=>tag.id===tagId))return;
    const pool=editor.key?editor.entries:this.pmWizardCandidates(editor),entry=entryKey?pool.find(row=>row.key===entryKey):null;
    if(entryKey && !entry)return;
    const ids=checked?[tagId]:[];
    if(!entry){this.patchDeliveryEditor({defaultTaskTagIds:ids,defaultTagId:ids[0] || '',error:''},editorId);return;}
    const update=row=>row.key===entryKey?{...row,taskTagIds:ids,tagId:ids[0] || '__none__'}:row;
    this.patchDeliveryEditor({entries:editor.entries.map(update),pmWizardPool:editor.key?editor.pmWizardPool:pool.map(update),listChanged:true,reviewTouched:true,error:''},editorId);
  }
  pmSaveTaskTags(sheet,editor) {
    sheet.defaultTaskTagIds=this.pmTaskTagIds(editor);sheet.defaultTagId=sheet.defaultTaskTagIds[0] || '';
    sheet.entries=editor.entries.map(entry=>{const taskTagIds=this.pmTaskTagIds(editor,entry);return {...entry,taskTagIds,tagId:taskTagIds[0] || ''};});
    sheet.entryTags=Object.fromEntries(sheet.entries.filter(entry=>entry.itemId).map(entry=>[entry.itemId,entry.tagId]));
    if(sheet.datasetReviews)for(const entry of sheet.entries){const key='item:'+(entry.itemId || entry.key);if(sheet.datasetReviews[key])sheet.datasetReviews[key]={...sheet.datasetReviews[key],taskTagIds:entry.taskTagIds.slice()};}
  }
  deliveryDatasetReviewValues() {
    const base=this.pmLegacyDatasetReviewValues(),editor=this.state.deliveryEditor;if(!editor)return base;
    const filter=editor.taskTagFilter || '';
    const rows=base.rows.map(row=>{const entry=editor.entries.find(entry=>(entry.itemId || entry.key)===row.itemIds[0]);return {...row,taskTags:this.pmTaskTagPicker(editor,entry),taskTagIds:this.pmTaskTagIds(editor,entry)};}).filter(row=>!filter || row.taskTagIds.includes(filter));
    return {...base,rows,noMatches:base.hasRows && !rows.length,statusFilter:filter,statusOptions:editor.tags.map(tag=>({key:tag.id,label:tag.name})),onStatusFilter:event=>this.patchDeliveryEditor({taskTagFilter:event.target.value,reviewStatusFilter:''},editor.id)};
  }
  pmToggleSavedTaskTag(sheetKey,itemId,tagId,checked,actor) {
    const sheet=this.deliverySheet(sheetKey);
    if(!sheet || this.state.deliveryEditor || actor!==this.profileIdentity().accountName || !this.canManageDeliveryMembers(sheet))return;
    const entries=this.deliveryEntries(sheet),entry=entries.find(row=>(row.itemId || row.key)===itemId),tag=this.pmSheetTaskTags(sheet).find(tag=>tag.id===tagId);
    if(!entry || !tag || tag.disabled)return;
    const tags=(sheet.tags || []).slice();let id=tag.id;
    if(tag.suggested){if(!checked)return;id='task-tag-'+Date.now()+'-'+(++this._deliverySequence);tags.push({id,name:tag.name,color:tag.color});}
    const ids=checked?[id]:[];
    const key='item:'+itemId,review=sheet.datasetReviews?.[key];
    const patch={tags,entries:entries.map(row=>(row.itemId || row.key)===itemId?{...row,taskTagIds:ids,tagId:ids[0] || ''}:row),entryTags:{...sheet.entryTags,[itemId]:ids[0] || ''},...(review?{datasetReviews:{...sheet.datasetReviews,[key]:{...review,taskTagIds:ids}}}:{})};
    const custom=(this.state.deliverySheets || []).slice(),index=custom.findIndex(sheet=>sheet.key===sheetKey);
    if(index>=0){custom[index]={...custom[index],...patch};this.setState({deliverySheets:custom});}
    else this.setState({deliveryOverrides:{...this.state.deliveryOverrides,[sheetKey]:{...this.state.deliveryOverrides?.[sheetKey],...patch}}});
  }
  // pm-task-tags:end
