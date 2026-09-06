  // pm-item-explorer-demo:start
  pmDemoNodeConfig(name,kind) {
    if(kind==='REVIEW') return {title:'Web3D 产物审核（示例）',instructions:'检查交互、结构表达与移动端可用性。',review_targets:[name.includes('rework')?'build_repair':'build'],required_fields:['decision'],form:{decision:['approve','request_changes'],feedback:'textarea'}};
    if(kind==='AGENT'||kind==='LLM') return {model:'示例模型',prompt:'prompts/build_product.md',max_iterations:8,inherit_workspace:name.includes('repair'),output_directory:'dist'};
    return {fn:name,args:{},timeout_seconds:60};
  }

  pmItemExplorerDemo(id, runId) {
    if(id === '3a5588389c844037b7f85d62bb303bcf' && runId === '20260824-163805-814774') {
      const prompt = '生成可分组、折叠并实时刷新的服务错误日志看板，输出桌面端可交互页面与 GLB 场景预览。';
      const dag = [
        'task/FUNCTION','prep_task/FUNCTION','ref_search/AGENT','normalize_inputs/FUNCTION','car_plan/LLM','blockout/AGENT',
        'reform_a/AGENT','reform_b/AGENT','dcc_block/AGENT','material_pass/AGENT','lighting/AGENT','camera/AGENT',
        'build_product/AGENT','runtime/AGENT','3d_export/AGENT','qa_geometry/FUNCTION','qa_runtime/FUNCTION','review/REVIEW'
      ];
      const definitions = Object.fromEntries(dag.map(node => {
        const [name, kind] = node.split('/');
        return [name, this.pmDemoNodeConfig(name, kind)];
      }));
      const failedAt = dag.findIndex(node => node.startsWith('build_product/'));
      const durations = ['0.2s','0.4s','12.8s','0.3s','8.2s','18.4s','11.6s','10.9s','22.1s','16.3s','8.7s','4.8s'];
      const nodes = Object.fromEntries(dag.map((node, index) => {
        const name = node.split('/')[0];
        const passed = index < failedAt;
        const failed = index === failedAt;
        return [name, {
          config: definitions[name],
          status: passed ? '成功' : failed ? '失败' : '未执行',
          duration: passed ? durations[index] : failed ? '4m 12s' : '—',
          attempts: passed
            ? [{number:1,status:'成功',duration:durations[index],activation:1}]
            : failed
              ? [{number:1,status:'失败',duration:'4m 12s',activation:1,error:{code:'GLB_EXPORT_TIMEOUT',message:'GLB 导出阶段超过 900 秒，场景面数超出导出预算。'}}]
              : [],
          result: passed
            ? {ok:true}
            : failed
              ? {status:'failed',error_code:'GLB_EXPORT_TIMEOUT',message:'GLB 导出阶段超时（900s），未产出可用产物。'}
              : undefined
        }];
      }));
      return {demo:true,files:[
        {name:'pipeline/web3d-car-v10.json',content:JSON.stringify({name:'web3d-car',version:'v10',dag,nodeConfigs:definitions},null,2)},
        {name:'prompts/build_product.md',content:prompt},
        {name:'logs/build_product.log',content:'GLB_EXPORT_TIMEOUT\nexport exceeded 900s\nno deliverable artifact produced'}
      ],execution:{pipeline:{name:'web3d-car',version:'v10',dag,nodeConfigs:definitions},nodes,
        prompts:[{role:'user',label:'Build Prompt',node:'build_product',content:prompt}],
        events:[
          {time:'00:00',label:'读取输入',node:'task',detail:{item_id:id,run_id:runId}},
          {time:'00:34',label:'完成参考检索',node:'ref_search',detail:{status:'success',references:6}},
          {time:'03:58',label:'开始导出 GLB',node:'build_product',detail:{status:'running',scene_faces:1842600}},
          {time:'04:12',label:'GLB 导出超时',node:'build_product',detail:{status:'failed',code:'GLB_EXPORT_TIMEOUT',timeout_seconds:900}}
        ]}};
    }
    if(id === '34a2c04af93d44908f4fe96f7845e183' && runId === '20260824-215530-2c2f09') {
      const prompt = '生成一套模块化厢式车内饰漫游场景，包含可切换布局、材质配置与交互热点，并输出可运行的 Web3D 预览。';
      const dag = [
        'task/FUNCTION','prep_task/FUNCTION','ref_search/AGENT','normalize_inputs/FUNCTION','car_plan/LLM','blockout/AGENT',
        'reform_a/AGENT','reform_b/AGENT','dcc_block/AGENT','material_pass/AGENT','lighting/AGENT','camera/AGENT',
        'build_product/AGENT','runtime/AGENT','3d_export/AGENT','qa_geometry/FUNCTION','qa_runtime/FUNCTION','review/REVIEW'
      ];
      const definitions = Object.fromEntries(dag.map(node => {
        const [name, kind] = node.split('/');
        return [name, this.pmDemoNodeConfig(name, kind)];
      }));
      const failedAt = dag.findIndex(node => node.startsWith('runtime/'));
      const passedCount = 10;
      const durations = ['0.2s','0.4s','11.6s','0.3s','7.8s','16.9s','10.4s','9.7s','20.8s','14.2s'];
      const nodes = Object.fromEntries(dag.map((node, index) => {
        const name = node.split('/')[0];
        const passed = index < passedCount;
        const skipped = index >= passedCount && index < failedAt;
        const failed = index === failedAt;
        return [name, {
          config: definitions[name],
          status: passed ? '成功' : skipped ? '跳过' : failed ? '失败' : '未执行',
          duration: passed ? durations[index] : failed ? '15m 75s' : '—',
          attempts: passed
            ? [{number:1,status:'成功',duration:durations[index],activation:1}]
            : failed
              ? [{number:1,status:'失败',duration:'15m 75s',activation:1,error:{code:'RUNTIME_HEALTHCHECK_FAILED',message:'运行时启动后未在 60 秒内通过健康检查，预览服务不可用。'}}]
              : [],
          result: passed
            ? {ok:true}
            : skipped
              ? {status:'skipped',message:'上游分支未选择该节点。'}
              : failed
                ? {status:'failed',error_code:'RUNTIME_HEALTHCHECK_FAILED',message:'运行时启动失败，未能提供可访问的 Web3D 预览。'}
                : undefined
        }];
      }));
      return {demo:true,files:[
        {name:'pipeline/web3d-car-v10.json',content:JSON.stringify({name:'web3d-car',version:'v10',dag,nodeConfigs:definitions},null,2)},
        {name:'prompts/runtime.md',content:prompt},
        {name:'logs/runtime.log',content:'RUNTIME_HEALTHCHECK_FAILED\nhealthcheck exceeded 60s\npreview service unavailable'}
      ],execution:{pipeline:{name:'web3d-car',version:'v10',dag,nodeConfigs:definitions},nodes,
        prompts:[{role:'user',label:'Runtime Prompt',node:'runtime',content:prompt}],
        events:[
          {time:'00:00',label:'读取输入',node:'task',detail:{item_id:id,run_id:runId}},
          {time:'02:16',label:'完成参考检索',node:'ref_search',detail:{status:'success',references:8}},
          {time:'14:15',label:'启动预览服务',node:'runtime',detail:{status:'running',port:4173}},
          {time:'15:15',label:'运行时健康检查失败',node:'runtime',detail:{status:'failed',code:'RUNTIME_HEALTHCHECK_FAILED',timeout_seconds:60}}
        ]}};
    }
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
