import './button-guards.mjs';
import './import-motion.mjs';
// The legacy template has clickable divs. Preserve its click callbacks and add
// keyboard parity without duplicating any business logic or changing text.
const processed=new WeakSet();
function enhance(){
 for(const a of document.querySelectorAll('a[data-forge-route]')){
  const u=new URL(a.href,location.href);
  if(u.origin!==location.origin||u.pathname==='/forge-postman.html')continue;
  a.href='/forge-postman.html?route='+encodeURIComponent(u.pathname+u.search)+u.hash;
 }
 for(const el of document.querySelectorAll('[data-pm-click=true]')){
  if(processed.has(el))continue;processed.add(el);
  if(!el.matches('div,span')||el.closest('svg')||el.matches('[data-motion-overlay],[data-motion-dialog]')||el.querySelector('button,input,select,textarea,a,[data-pm-click]'))continue;
  if(el.getAttribute('sc-camel-on-click')?.includes('stop'))continue;
  if(!el.hasAttribute('role'))el.setAttribute('role','button');
  if(!el.hasAttribute('tabindex'))el.tabIndex=0;
  el.addEventListener('keydown',e=>{if(e.target!==el||!['Enter',' '].includes(e.key))return;e.preventDefault();el.click();});
 }
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance();});}).observe(document.documentElement,{childList:true,subtree:true});
enhance();
// Full-screen Item workspaces advertise these keys in their toolbar. Keep the
// visible hints and actual behavior wired to the same native controls.
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 if(!['ArrowUp','ArrowDown','Escape'].includes(event.key))return;
 if(event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 const overlay=document.querySelector('.pm-item-page-overlay[data-motion-open=true]');
 const control=overlay?.querySelector(`.pm-item-shortcuts [aria-keyshortcuts="${event.key}"]`);
 if(!control||control.disabled||control.getAttribute('aria-disabled')==='true')return;
 event.preventDefault();control.click();
});

// Native details provide accessible disclosure semantics. Add light-dismiss so
// task Tag pickers close when the user continues elsewhere on the page.
document.addEventListener('click',event=>{
 for(const picker of document.querySelectorAll('details.pm-task-tag-picker[open]')){
  if(!picker.contains(event.target))picker.removeAttribute('open');
 }
});
