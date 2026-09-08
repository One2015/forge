  externalReviewSource() {
    if(Array.isArray(this.props.externalReviewItems))return this.props.externalReviewItems;
    return [{id:'external-demo-turbine',itemId:'b3d81c4e77af4a5c9e2f1a6b8c0d3e5f',runId:'20260825-034505-c19f2a',name:'燃气轮机交互展示',expert:'示例外部专家',batch:'Web3D 专家交付 · 演示批次',version:'v1',round:1,submittedAt:'2026-09-07T08:00:00Z',requirements:'核对结构与说明准确性、交互完整性、文件可打开性和移动端可用性。'}];
  }
  externalReviewRecords() {
    if(!this._externalReviewLoaded){
      this._externalReviewLoaded=true;
      try{this._externalReviewSaved=JSON.parse(localStorage.getItem('forge-external-qa-v1')||'{}');}catch{this._externalReviewSaved={};}
    }
    return this.state.externalReviewRecords || this._externalReviewSaved || {};
  }
  externalReviewSave(records) {
    this._externalReviewSaved=records;
    this.setState({externalReviewRecords:records});
    try{localStorage.setItem('forge-external-qa-v1',JSON.stringify(records));}catch{}
  }
  externalReviewValues() {
    const st=this.state,records=this.externalReviewRecords(),demo=!Array.isArray(this.props.externalReviewItems);
    const source=this.externalReviewSource();
    const rows=source.map(item=>{
      const round=Math.max(1,Number(item.round)||1),key=item.id+':'+(item.version||'v1')+':'+round;
      const record=records[key];
      return {...item,key,round,version:item.version||'v1',record,status:record?.decision||'pending'};
    });
    const pending=rows.filter(row=>row.status==='pending').length, rework=rows.filter(row=>row.status==='rework').length,passed=rows.filter(row=>row.status==='pass').length,rejected=rows.filter(row=>row.status==='reject').length;
    const phase=st.externalReviewPhase||'pending', query=String(st.externalReviewQuery||'').toLowerCase();
    const visible=rows.filter(row=>(phase==='all'||phase==='done'&&row.status!=='pending'||row.status===phase)&&(!query||[row.name,row.itemId,row.expert,row.batch].join(' ').toLowerCase().includes(query)));
    const selectPhase=value=>this.setState({externalReviewPhase:value,externalReviewOpen:'',externalReviewError:''});
    const selected=rows.find(row=>row.key===st.externalReviewOpen);
    const selectionIndex=visible.findIndex(row=>row.key===selected?.key);
    const openItem=row=>{if(!row)return;this.setState({externalReviewOpen:row.key,externalReviewChoice:'',externalReviewNote:'',externalReviewError:''});if(typeof document!=='undefined')setTimeout(()=>document.getElementById('external-detail-back')?.focus(),0);};
    const labels={pending:'待质检',pass:'通过',rework:'要求返修',reject:'不通过'};
    const history=selected?Object.entries(records).filter(([key])=>key.startsWith(selected.id+':')).map(([key,value])=>({key,...value,label:labels[value.decision]})).sort((a,b)=>b.at-a.at):[];
    const chosen=st.externalReviewChoice||'',note=String(st.externalReviewNote||'');
    const submitDecision=decision=>{
      const current=this.externalReviewRecords();
      if(!selected||current[selected.key])return;
      if(!['pass','rework','reject'].includes(decision)){this.setState({externalReviewError:'请选择审核结论。'});return;}
      if(decision!=='pass'&&!note.trim()){this.setState({externalReviewError:'请填写具体问题和修改要求。'});return;}
      this.externalReviewSave({...current,[selected.key]:{decision,note:note.trim(),reviewer:this.props.currentUser||'一万',at:Date.now(),time:new Date().toLocaleString('zh-CN'),version:selected.version,round:selected.round}});
      this.setState({externalReviewPhase:'done',externalReviewError:'',externalReviewChoice:'',externalReviewNote:''});
    };
    const submit=()=>submitDecision(chosen);
    const requestDecision=decision=>{if(!selected||selected.record)return;this.setState({externalReviewChoice:decision,externalReviewError:''});if(typeof document!=='undefined')setTimeout(()=>document.getElementById('external-review-note')?.focus(),0);};
    return {demo,pending,rework,passed,rejected,passRate:passed+rework+rejected?Math.round(passed/(passed+rework+rejected)*100)+'%':'—',
      internal:st.reviewAudience!=='external',external:st.reviewAudience==='external',
      audienceKey:event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const external=event.key==='End'||event.key!=='Home'&&st.reviewAudience!=='external';
        this.setState({reviewAudience:external?'external':'internal',reviewOpen:null});
        if(typeof document!=='undefined')setTimeout(()=>document.getElementById(external?'review-tab-external':'review-tab-internal')?.focus(),0);
      },
      showInternal:()=>this.setState({reviewAudience:'internal',reviewOpen:null}),showExternal:()=>this.setState({reviewAudience:'external',reviewOpen:null}),
      phases:[['pending','待质检'],['done','已质检'],['rework','待返修'],['all','全部']].map(([id,label])=>({id,label,selected:phase===id,pick:()=>selectPhase(id)})),
      metrics:[['待质检',pending,'pending'],['已通过',passed,'pass'],['不通过',rejected,'reject']].map(([label,value,id])=>({label,value,pick:()=>selectPhase(id)})),
      query:st.externalReviewQuery||'',onQuery:e=>this.setState({externalReviewQuery:e.target.value}),empty:!visible.length,
      rows:visible.map(row=>({...row,tone:row.status==='pass'?'success':row.status==='reject'?'danger':row.status==='rework'?'warning':'neutral',initial:Array.from(row.expert||'外')[0],timeLabel:Number.isFinite(Date.parse(row.submittedAt))?new Date(row.submittedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'待确认',actionLabel:row.status==='pending'?'开始质检':'查看结果',statusLabel:labels[row.status],expanded:row.key===st.externalReviewOpen,open:()=>openItem(row)})),
      positionLabel:selectionIndex>=0?'第 '+(selectionIndex+1)+' 项，共 '+visible.length+' 项':'',
      cannotPrevious:selectionIndex<=0,cannotNext:selectionIndex<0||selectionIndex>=visible.length-1,
      previous:()=>{if(selectionIndex>0)openItem(visible[selectionIndex-1]);},next:()=>{if(selectionIndex>=0&&selectionIndex<visible.length-1)openItem(visible[selectionIndex+1]);},
      hasSelection:!!selected,selected:selected?{...selected,statusLabel:labels[selected.status],pending:selected.status==='pending',requirements:selected.requirements||'按交付要求检查结果、文件和交互。',artifactConfig:this.artifactPreviewData(selected.itemId,selected.runId,selected.name,true),result:labels[selected.record?.decision]||'',note:selected.record?.note||'无补充意见',reviewer:selected.record?.reviewer||'',time:selected.record?.time||''}:{},
      history,hasHistory:history.length>0,choices:[['pass','通过','质检通过，允许进入后续交付。'],['rework','要求返修','记录问题，等待专家修订后重新提交。'],['reject','不通过','当前版本不予验收。']].map(([id,label,description])=>({id,label,description,selected:chosen===id,pick:()=>this.setState({externalReviewChoice:id,externalReviewError:''})})),
      showDecisionSection:chosen==='rework'||chosen==='reject'||history.length>0,showFeedback:!!selected&&selected.status==='pending'&&(chosen==='rework'||chosen==='reject'),
      approve:()=>submitDecision('pass'),requestRework:()=>requestDecision('rework'),requestReject:()=>requestDecision('reject'),cancelDecision:()=>this.setState({externalReviewChoice:'',externalReviewNote:'',externalReviewError:''}),decisionTitle:chosen==='reject'?'不通过说明':'返修说明',submitLabel:chosen==='reject'?'提交不通过':'提交返修',
      note,onNote:e=>this.setState({externalReviewNote:e.target.value}),requiresNote:chosen==='rework'||chosen==='reject',canSubmit:!!selected&&!selected.record&&!!chosen&&(chosen==='pass'||!!note.trim()),submit,error:st.externalReviewError||'',hasError:!!st.externalReviewError,
      detailKey:event=>{
        const close=()=>{this.setState({externalReviewOpen:'',externalReviewError:''});if(typeof document!=='undefined')setTimeout(()=>document.getElementById('external-item-'+selected?.id)?.focus(),0);};
        if(event.key==='Escape'){event.preventDefault();close();}
        if(event.key==='Tab'&&typeof document!=='undefined'){
          const root=document.querySelector('.eq-detail-overlay');
          const controls=Array.from(root?.querySelectorAll('button:not([disabled]),input,select,textarea,a[href],[tabindex="0"]')||[]).filter(node=>node.getClientRects().length);
          const first=controls[0],last=controls[controls.length-1];
          if(first&&((event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last))){event.preventDefault();(event.shiftKey?last:first).focus();}
        }
      },
      close:()=>{this.setState({externalReviewOpen:'',externalReviewError:''});if(typeof document!=='undefined')setTimeout(()=>document.getElementById('external-item-'+selected?.id)?.focus(),0);}};
  }
