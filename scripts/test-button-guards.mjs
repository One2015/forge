import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setButtonBusy,installButtonGuards} from '../public/postman-ui/button-guards.mjs';

test('loading guard suppresses repeated activation and restores previous availability',()=>{
 const data=new Map(),button={dataset:{},getAttribute:k=>data.get(k)||null,setAttribute:(k,v)=>data.set(k,v),removeAttribute:k=>data.delete(k)};
 setButtonBusy(button,true);setButtonBusy(button,true);assert.equal(data.get('aria-disabled'),'true');assert(!data.has('disabled'));
 let guard,prevented=false,stopped=false;installButtonGuards({addEventListener:(_,fn)=>guard=fn});
 guard({target:{closest:()=>button},preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});assert(prevented&&stopped);
 setButtonBusy(button,false);assert(!data.has('aria-disabled'));assert.equal(data.get('aria-busy'),'false');
 button.setAttribute('aria-disabled','true');setButtonBusy(button,true);setButtonBusy(button,false);assert.equal(data.get('aria-disabled'),'true');
});
