  // pm-delivery-browser:start
  pmDeliveryFolderCoverUpload(event, key) {
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if (input) input.value = '';
    if (!file || !this.deliverySheet(key)) return;
    const errors = Object.assign({}, this.state.deliveryFolderCoverErrors || {});
    const fail = message => { errors[key] = message; this.setState({ deliveryFolderCoverErrors: errors }); };
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      fail('请选择 PNG、JPG 或 WebP 图片，文件不超过 5 MB。');
      return;
    }
    delete errors[key];
    const request = Date.now() + ':' + Math.random();
    this._deliveryFolderCoverRequests = Object.assign({}, this._deliveryFolderCoverRequests || {}, { [key]: request });
    this.setState({ deliveryFolderCoverErrors: errors });
    const reader = new FileReader();
    reader.onerror = () => {
      if (this._deliveryFolderCoverRequests && this._deliveryFolderCoverRequests[key] === request) fail('无法读取封面图片，请重试。');
    };
    reader.onload = () => {
      if (!this._deliveryFolderCoverRequests || this._deliveryFolderCoverRequests[key] !== request || !this.deliverySheet(key)) return;
      const covers = Object.assign({}, this.state.deliveryFolderCovers || {}, { [key]: { name: file.name, url: String(reader.result) } });
      const nextErrors = Object.assign({}, this.state.deliveryFolderCoverErrors || {});
      delete nextErrors[key];
      this.setState({ deliveryFolderCovers: covers, deliveryFolderCoverErrors: nextErrors });
    };
    reader.readAsDataURL(file);
  }
  // pm-delivery-browser:end

  deliveryTableValues(delivery) {
    const st = this.state;
    const all = delivery.customers.flatMap(c => c.sheets.map(d => ({...d, customer:c.name, logo:c.logo, hasLogo:c.hasLogo})));
    const selected = st.deliveryColumnFilters || {};
    const definitions = [['customer','客户'],['creatorLabel','创建人'],['badge','状态']];
    const patch = change => this.setState(change);
    const filters = Object.fromEntries(definitions.map(([key,label]) => [key, {
      label, selected:selected[key] || '', active:!!selected[key], open:st.deliveryFilterMenu?.key===key,
      left:st.deliveryFilterMenu?.left||0, top:st.deliveryFilterMenu?.top||0,
      toggle:e=>{const rect=e.currentTarget.getBoundingClientRect();patch({deliveryFilterMenu:st.deliveryFilterMenu?.key===key?null:{key,left:Math.min(rect.left,window.innerWidth-190),top:rect.bottom+6}})},
      close:()=>patch({deliveryFilterMenu:null}),
      options:[{value:'',label:'全部'+label}, ...Array.from(new Set(all.map(r=>r[key]))).map(value=>({value,label:value}))].map(o=>({...o,selected:(selected[key]||'')===o.value,pick:()=>patch({deliveryColumnFilters:{...selected,[key]:o.value},deliveryFilterMenu:null})})),
      change:e=>patch({deliveryColumnFilters:{...selected,[key]:e.target.value}})
    }]));
    const sortKey = st.deliveryColumnSort || '';
    const descending = st.deliveryColumnDirection === 'descending';
    const keys = ['name','dateLabel','targetCount','linkedCount','reviewCount','passedCount','progress'];
    const sorts = Object.fromEntries(keys.map(key=>[key,{
      direction:sortKey===key ? (descending?'descending':'ascending') : 'none',
      toggle:()=>patch({deliveryColumnSort:key,deliveryColumnDirection:sortKey===key&&!descending?'descending':'ascending'})
    }]));
    const rows = all.filter(r=>definitions.every(([key])=>!selected[key]||r[key]===selected[key]));
    const value = (r,key)=> key==='progress' ? r.passedCount/Math.max(1,r.targetCount) : r[key];
    if (sortKey) rows.sort((a,b)=>{
      const av=value(a,sortKey),bv=value(b,sortKey);
      const result=typeof av==='number' ? av-bv : String(av).localeCompare(String(bv),'zh-CN');
      return result*(descending?-1:1);
    });
    return {rows,filters,sorts,empty:!rows.length,hasFilters:Object.values(selected).some(Boolean),
      reset:()=>patch({deliveryColumnFilters:{},deliveryColumnSort:'',deliveryColumnDirection:'',deliveryQuery:'',delCat:'all',delStatus:'all'})};
  }
