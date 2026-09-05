import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const methods=fs.readFileSync(new URL('./postman-ui/branch-item-search.js',import.meta.url),'utf8');
function picker(){
 const context=vm.createContext({setTimeout:()=>0});
 vm.runInContext(`class Picker {
  state={branchAsk:{attachmentKey:'draft-1'},pipe:'pipe-a',ds:'dataset-a',item:'id-0'};
  dataSets=[
   {name:'dataset-a',items:Array.from({length:1000},(_,i)=>['id-'+i,'','','',i===999?'天坛':'Landmark '+i])},
   {name:'dataset-b',items:[['id-b','','','','Branch B Item']]}
  ];
  pipelines=[{name:'pipe-a',version:'v1',datasets:[['dataset-a']]},{name:'pipe-b',version:'v2',datasets:[['dataset-b']]}];
  runs=[
   {id:'run-alpha',pipe:'pipe-a',dsName:'dataset-a',itemIds:['id-0']},
   {id:'run-special-999',pipe:'pipe-a',dsName:'dataset-a',itemIds:['id-999']},
   {id:'run-beta',pipe:'pipe-b',dsName:'dataset-b',itemIds:['id-b']}
  ];
  setState(patch){Object.assign(this.state,patch)}
  itemTitle(value){return value}
  pipeData(){return this.pipelines}
  dsData(){return this.dataSets}
  runsData(){return this.runs}
  branchFormValues(){
   const pipe=this.pipelines.find(value=>value.name===this.state.pipe);
   const datasets=pipe?this.dataSets.filter(value=>pipe.datasets.some(entry=>entry[0]===value.name)):[];
   const ds=datasets.find(value=>value.name===this.state.ds);
   const items=(ds?.items||[]).map(item=>({value:item[0],label:item[4]+' · '+item[0],selected:item[0]===this.state.item}));
   return {open:true,pipe:this.state.pipe,ds:this.state.ds,item:this.state.item,
    pipelines:this.pipelines.map(value=>({value:value.name,label:value.name+' '+value.version,selected:value.name===this.state.pipe})),
    datasets:datasets.map(value=>({value:value.name,label:value.name,selected:value.name===this.state.ds})),items,
    dsDisabled:!pipe,itemDisabled:!ds,
    onPipe:event=>{if(event.target.value!==this.state.pipe)this.setState({pipe:event.target.value,ds:'',item:''})},
    onDs:event=>{if(event.target.value!==this.state.ds)this.setState({ds:event.target.value,item:''})},
    onItem:event=>this.setState({item:event.target.value})};
  }
  ${methods}
 };globalThis.picker=new Picker();`,context);
 return context.picker;
}
const input=value=>({target:{value}});
const key=value=>({key:value,preventDefault(){},stopPropagation(){}});

test('all three branch controls are single-select pickers whose collapsed state only shows the selection',()=>{
 const p=picker(), values=p.pmBranchValues();
 assert.equal(values.pipelinePicker.valueLabel,'pipe-a v1');
 assert.equal(values.datasetPicker.valueLabel,'dataset-a');
 assert.equal(values.itemPicker.valueLabel,'Landmark 0 · id-0');
 assert.equal(values.pipelinePicker.open,false);
 values.pipelinePicker.toggle();
 assert.equal(p.pmBranchValues().pipelinePicker.open,true);
 p.pmBranchValues().pipelinePicker.searchInput(input('run-beta'));
 const results=p.pmBranchValues().pipelinePicker.results;
 assert.equal(results.length,1); assert.equal(results[0].value,'pipe-b');
 results[0].pick();
 const changed=p.pmBranchValues();
 assert.equal(p.state.pipe,'pipe-b'); assert.equal(p.state.ds,''); assert.equal(p.state.item,'');
 assert.equal(changed.datasetPicker.valueLabel,'未选'); assert.equal(changed.itemPicker.valueLabel,'未选');
 assert.equal(changed.itemPicker.disabled,true);
});

test('Pipeline and dataset search resolve names, Item IDs, and Run IDs',()=>{
 const p=picker();
 p.pmBranchValues().pipelinePicker.toggle();
 p.pmBranchValues().pipelinePicker.searchInput(input('ID-999'));
 assert.deepEqual(Array.from(p.pmBranchValues().pipelinePicker.results,result=>result.value),['pipe-a']);
 p.pmBranchValues().pipelinePicker.searchInput(input('RUN-BETA'));
 assert.deepEqual(Array.from(p.pmBranchValues().pipelinePicker.results,result=>result.value),['pipe-b']);
 p.setState({pmBranchPicker:null});
 p.pmBranchValues().datasetPicker.toggle();
 p.pmBranchValues().datasetPicker.searchInput(input('天坛'));
 assert.deepEqual(Array.from(p.pmBranchValues().datasetPicker.results,result=>result.value),['dataset-a']);
 p.pmBranchValues().datasetPicker.searchInput(input('run-special-999'));
 assert.deepEqual(Array.from(p.pmBranchValues().datasetPicker.results,result=>result.value),['dataset-a']);
});

test('Item search caps rendering, filters by Item or Run ID, and supports keyboard selection',()=>{
 const p=picker();
 p.pmBranchValues().itemPicker.toggle();
 assert.equal(p.pmBranchValues().itemPicker.results.length,20);
 assert.match(p.pmBranchValues().itemPicker.hint,/1000/);
 p.pmBranchValues().itemPicker.searchInput(input('run-special-999'));
 assert.deepEqual(Array.from(p.pmBranchValues().itemPicker.results,result=>result.value),['id-999']);
 p.pmBranchValues().itemPicker.searchKey(key('Enter'));
 assert.equal(p.state.item,'id-999'); assert.equal(p.pmBranchValues().itemPicker.open,false);
 p.pmBranchValues().itemPicker.toggle();
 p.pmBranchValues().itemPicker.searchInput(input('missing'));
 assert.equal(p.pmBranchValues().itemPicker.results.length,0);
 p.pmBranchValues().itemPicker.searchKey(key('Enter'));
 assert.equal(p.state.item,'id-999');
});

test('changing a Dataset clears Item and a new draft does not reuse open picker state',()=>{
 const p=picker();
 p.pmBranchValues().pipelinePicker.toggle();
 p.pmBranchValues().pipelinePicker.searchInput(input('query'));
 p.setState({branchAsk:{attachmentKey:'draft-2'}});
 assert.equal(p.pmBranchValues().pipelinePicker.query,'');
 p.setState({pipe:'pipe-b',ds:'dataset-b',item:'id-b',pmBranchPicker:null});
 p.pmBranchValues().datasetPicker.toggle();
 p.pmBranchValues().datasetPicker.results[0].pick();
 assert.equal(p.state.item,'id-b','re-selecting the same Dataset keeps the Item');
 p.setState({pipe:'pipe-a',ds:'dataset-a',item:'id-0',pmBranchPicker:null});
 p.pmBranchValues().datasetPicker.toggle();
 p.pmBranchValues().datasetPicker.searchKey(key('Escape'));
 assert.equal(p.pmBranchValues().datasetPicker.open,false);
});
