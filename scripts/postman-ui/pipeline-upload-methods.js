  pmParsePipelineUpload(text,filename) {
    let parsed;
    try {
      parsed=/\.json$/i.test(filename)?JSON.parse(text):ForgePipelineYaml.load(text,{schema:ForgePipelineYaml.CORE_SCHEMA,maxDepth:50,maxTotalMergeKeys:1000});
    } catch(error) {
      const at=error.mark?'（第 '+(error.mark.line+1)+' 行）':'';
      throw Error('配置文件格式有误'+at+'，请检查 YAML / JSON 语法。');
    }
    // Clone a bounded JSON-compatible tree before normalizing YAML aliases.
    const ancestors=new Set();let remaining=50000;
    const clone=(value,depth=0)=>{
      if(--remaining<0 || depth>50)throw Error('配置内容过于复杂，请减少嵌套或重复引用。');
      if(value===null || ['string','boolean'].includes(typeof value))return value;
      if(typeof value==='number' && Number.isFinite(value))return value;
      if(!value || typeof value!=='object')throw Error('配置需使用 JSON 兼容的数据类型。');
      if(ancestors.has(value))throw Error('配置不能包含循环引用。');
      ancestors.add(value);
      const result=Array.isArray(value)?value.map(v=>clone(v,depth+1)):Object.fromEntries(Object.entries(value).map(([key,v])=>[key,clone(v,depth+1)]));
      ancestors.delete(value);return result;
    };
    const root=clone(parsed),object=value=>!!value && typeof value==='object' && !Array.isArray(value);
    if(!object(root))throw Error('配置文件需包含 nodes 节点列表。');
    let source=root.nodes;
    if(source===undefined && Array.isArray(root.dag))source=root.dag.map(value=>{
      if(typeof value!=='string' || !/^[^/]+\/[^/]+$/.test(value))throw Error('dag 节点需采用 name/TYPE 格式。');
      const [name,type]=value.split('/');return {name,type,config:root.nodeConfigs?.[name] ?? {},enabled:root.enabledNodes?.[name] ?? true};
    });
    if(object(source))source=Object.entries(source).map(([name,node])=>{
      if(!object(node))throw Error('节点 '+name+' 需为配置对象。');
      if(node.name!==undefined && node.name!==name)throw Error('节点名称与 nodes 中的键不一致：'+name+'。');
      return {...node,name};
    });
    if(!Array.isArray(source) || !source.length || source.length>500)throw Error('nodes 需包含 1–500 个节点，可使用列表或名称映射。');
    const names=new Set();
    const nodes=source.map((node,index)=>{
      if(!object(node))throw Error('第 '+(index+1)+' 个节点需为配置对象。');
      const name=node.name ?? node.id,type=node.type ?? node.kind,on=node.enabled ?? node.on ?? true;
      if(typeof name!=='string' || !/^[a-zA-Z_][\w.-]{0,99}$/.test(name) || names.has(name))throw Error('节点名称需唯一，以字母或下划线开头，最多 100 字符。');
      if(typeof type!=='string' || !['FUNCTION','AGENT','LLM','REVIEW'].includes(type.toUpperCase()))throw Error('节点 '+name+' 的 type 需为 FUNCTION、AGENT、LLM 或 REVIEW。');
      if(typeof on!=='boolean')throw Error('节点 '+name+' 的 enabled 需为 true 或 false。');
      if(node.config!==undefined && !object(node.config))throw Error('节点 '+name+' 的 config 需为对象。');
      const config=Object.fromEntries(Object.entries(node).filter(([key])=>!['name','id','type','kind','enabled','on','config'].includes(key)));
      for(const [key,value] of Object.entries(node.config || {})){
        if(Object.hasOwn(config,key))throw Error('节点 '+name+' 的配置项 '+key+' 重复，请统一放入 config。');
        Object.defineProperty(config,key,{value,enumerable:true,writable:true,configurable:true});
      }
      names.add(name);return {id:index,name,kind:type.toUpperCase(),on,config:JSON.stringify(config,null,2)};
    });
    if(!nodes.some(node=>node.on))throw Error('至少需要启用一个节点。');
    if(root.description!==undefined && (typeof root.description!=='string' || root.description.length>2000))throw Error('说明需为不超过 2000 字的文本。');
    // Ownership, identity and version belong to the existing Pipeline, not the file.
    const pipelineOptions=Object.fromEntries(Object.entries(root).filter(([key])=>!['name','id','owner','version','versions','displayName','description','history','nodes','dag','nodeConfigs','enabledNodes'].includes(key)));
    return {nodes,nextId:nodes.length,pipelineOptions,...(root.description===undefined?{}:{description:root.description})};
  }
  async pmUploadPipeline(file,key,actor,session) {
    if(!this.pmPipelineDraftAllowed(key,actor) || this.state.pmPipelineEditor.session!==session)return;
    const request=(this._pmPipelineUploadRequest || 0)+1;this._pmPipelineUploadRequest=request;
    const current=()=>this.pmPipelineDraftAllowed(key,actor) && this.state.pmPipelineEditor.session===session && this._pmPipelineUploadRequest===request;
    const fail=error=>{if(current())this.setState({pmPipelineEditor:{...this.state.pmPipelineEditor,uploading:false,error}});};
    if(!/\.(ya?ml|json)$/i.test(file.name))return fail('请选择 .yaml、.yml 或 .json 文件。');
    if(!file.size || file.size>5*1024*1024)return fail('请选择非空配置文件，大小不超过 5 MiB。');
    this.setState({pmPipelineEditor:{...this.state.pmPipelineEditor,uploading:true,error:''}});
    let text;
    try{text=await file.text();}catch{return fail('文件读取失败，请重新选择。');}
    if(!current())return;
    try {
      const imported=this.pmParsePipelineUpload(text,file.name);
      this.setState({pmPipelineEditor:{...this.state.pmPipelineEditor,...imported,uploadName:file.name,uploading:false,error:''}});
    } catch(error) {fail(error.message);}
  }
  pmDownloadPipelineExample() {
    const text='description: 更新生成与审核流程\nnodes:\n  - name: prepare\n    type: FUNCTION\n    enabled: true\n    config:\n      fn: prep_task\n  - name: build\n    type: AGENT\n    enabled: true\n    config:\n      model: your-model\n      max_iterations: 8\n';
    const url=URL.createObjectURL(new Blob([text],{type:'application/yaml;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='pipeline-example.yaml';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
