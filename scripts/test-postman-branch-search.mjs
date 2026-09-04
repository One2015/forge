import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const methods=fs.readFileSync(new URL('./postman-ui/branch-item-search.js',import.meta.url),'utf8');
function picker(){
 const context=vm.createContext({setTimeout:()=>0});
 vm.runInContext(`class Picker {
  state={branchAsk:{attachmentKey:'draft-1'},item:'id-0',ds:'landmarks'};
  items=Array.from({length:1000},(_,i)=>({value:'id-'+i,label:(i===999?'天坛':'Landmark '+i)+' · id-'+i}));
  setState(patch){Object.assign(this.state,patch)}
  branchFormValues(){return {open:true,pipe:'pipe',ds:this.state.ds,item:this.state.item,items:this.items,itemDisabled:false,onItem:e=>this.setState({item:e.target.value})}}
  ${methods}
 };globalThis.picker=new Picker();`,context);
 return context.picker;
}
const input=value=>({target:{value}});
const key=value=>({key:value,preventDefault(){},stopPropagation(){}});
test('thousand-Item search caps rendering and finds both names and IDs before selection',()=>{
 const p=picker();p.pmBranchValues().searchFocus();
 assert.equal(p.pmBranchValues().searchResults.length,20);
 assert.match(p.pmBranchValues().searchHint,/1000/);
 p.pmBranchValues().searchInput(input('天坛'));
 assert.equal(p.state.item,'');
 assert.equal(p.pmBranchValues().searchResults.length,1);
 p.pmBranchValues().searchKey(key('Enter'));
 assert.equal(p.state.item,'id-999');assert.equal(p.pmBranchValues().searchOpen,false);
 p.pmBranchValues().searchInput(input('ID-123'));
 p.pmBranchValues().searchResults[0].pick();assert.equal(p.state.item,'id-123');
});
test('search handles no matches, keyboard navigation, and dataset/draft changes',()=>{
 const p=picker();p.pmBranchValues().searchInput(input('missing'));
 assert.equal(p.pmBranchValues().searchResults.length,0);
 p.pmBranchValues().searchKey(key('Enter'));assert.equal(p.state.item,'');
 p.pmBranchValues().searchInput(input(''));
 p.pmBranchValues().searchKey(key('ArrowDown'));
 p.pmBranchValues().searchKey(key('Enter'));assert.equal(p.state.item,'id-1');
 p.pmBranchValues().searchFocus();p.pmBranchValues().searchKey(key('Escape'));
 assert.equal(p.pmBranchValues().searchText,'Landmark 1 · id-1');
 p.pmBranchValues().searchInput(input('old-query'));
 p.setState({ds:'new-dataset',item:'id-2'});
 assert.equal(p.pmBranchValues().searchText,'Landmark 2 · id-2');assert.equal(p.pmBranchValues().searchOpen,false);
 p.pmBranchValues().searchInput(input('another-query'));
 p.setState({branchAsk:{attachmentKey:'draft-2'},item:'id-3'});
 assert.equal(p.pmBranchValues().searchText,'Landmark 3 · id-3');
});
