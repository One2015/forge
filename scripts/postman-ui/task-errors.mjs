import fs from 'node:fs';
const read=n=>fs.readFileSync(new URL(n,import.meta.url),'utf8');
export function installTaskErrors(t){
 const replace=(a,b)=>{if(!t.includes(a))throw Error('Task errors anchor changed: '+a);t=t.replace(a,b);};
 replace('<!-- forge-runs:start -->',read('task-errors.html')+'\n<!-- forge-runs:start -->');
 replace('class Component extends DCLogic {',read('task-errors-data.js')+'\nclass Component extends DCLogic {\n'+read('task-errors-methods.js'));
 replace("      isRuns: view === 'runs'", "      isTaskErrors: view === 'task-errors',\n      taskErrors: view === 'task-errors' ? this.taskErrorsValues() : {},\n      isRuns: view === 'runs'");
 replace("        { label: '资源', key: 'resources' }", "        { label: '资源', key: 'resources' },\n        { label: '错误分析', key: 'task-errors' }");
 return t;
}
