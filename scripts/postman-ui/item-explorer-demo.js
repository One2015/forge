  // pm-item-explorer-demo:start
  pmDemoNodeConfig(name,kind) {
    if(kind==='REVIEW') return {title:'Web3D 产物审核（示例）',instructions:'检查交互、结构表达与移动端可用性。',review_targets:[name.includes('rework')?'build_repair':'build'],required_fields:['decision'],form:{decision:['approve','request_changes'],feedback:'textarea'}};
    if(kind==='AGENT'||kind==='LLM') return {model:'示例模型',prompt:'prompts/build_product.md',max_iterations:8,inherit_workspace:name.includes('repair'),output_directory:'dist'};
    return {fn:name,args:{},timeout_seconds:60};
  }

  pmItemExplorerDemo(id, runId) {
    if(id !== 'b3d81c4e77af4a5c9e2f1a6b8c0d3e5f' || runId !== '20260825-034505-c19f2a') return null;
    const prompt = '创建长城主题的可交互 Web3D 场景。\n\n要求：\n- 表现城墙、敌楼和山地地形。\n- 支持旋转、缩放与关键结构标注。\n- 同时适配桌面与移动端。\n- 输出页面入口与资源清单。\n\n此文本为界面演示用 mock Prompt，并非历史模型请求。';
    const dag=['task/FUNCTION','build/AGENT','human_review_initial/REVIEW','build_repair/AGENT','human_review_rework/REVIEW','review/FUNCTION'];
    const definitions=Object.fromEntries(dag.map(node=>{const [name,kind]=node.split('/');return [name,this.pmDemoNodeConfig(name,kind)];}));
    const nodes=Object.fromEntries(dag.map(node=>{
      const name=node.split('/')[0],done=name==='task',failed=name==='build';
      return [name,{config:definitions[name],status:done?'成功':failed?'失败':'未执行',attempts:done?[{number:1,status:'成功',duration:'0.2s',activation:1}]:failed?[{number:1,status:'失败',duration:'15m 00s',activation:1,error:{code:'GLB_EXPORT_TIMEOUT',message:'GLB 导出阶段超过 900 秒，场景面数超出导出预算。'}}]:[],result:failed?{status:'failed',error_code:'GLB_EXPORT_TIMEOUT',message:'GLB 导出阶段超时（900s），未产出可用产物。'}:done?{ok:true}:undefined}];
    }));
    return {demo:true,files:[
      {name:'REPORT.md',content:'# 长城 · 产物说明（Mock）\n\n此文件用于演示 Item 文件浏览。\n\n- 场景：城墙、敌楼、山体\n- 交互：旋转、缩放、结构标注\n- 本样例没有真实生成的 GLB 或网页文件。'},
      {name:'scene.json',content:JSON.stringify({demo:true,subject:'长城',structures:['城墙','敌楼','山体'],interactions:['orbit','zoom','annotations']},null,2)},
      {name:'prompts/build_product.md',content:prompt},
      {name:'pipeline/config.json',content:JSON.stringify({demo:true,nodes:definitions},null,2)},
    ],execution:{pipeline:{name:'web3d-gen-build-eval-v3',version:'v7',dag,nodeConfigs:definitions},nodes,
      prompts:[{role:'system',label:'System Prompt',node:'build',content:'你正在执行 Web3D 生成任务。根据输入构建场景并报告产物文件。\n\n这是界面演示用 Mock，并非历史模型请求。'},{role:'user',label:'User Prompt',node:'build',content:prompt}],
      events:[
        {time:'00:00',label:'读取输入',node:'task',detail:{item_id:id,source:'mock fixture'}},
                {time:'00:02',label:'开始生成',node:'build',detail:'示例：加载 Prompt，创建场景与交互。'},
        {time:'13:47',label:'开始导出 GLB',node:'build',detail:{status:'running',scene_faces:1864000}},
        {time:'15:02',label:'GLB 导出超时',node:'build',detail:{status:'failed',code:'GLB_EXPORT_TIMEOUT',timeout_seconds:900}},
      ]}};
  }
  // pm-item-explorer-demo:end
