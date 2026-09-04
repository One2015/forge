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
// Roving focus for the queue's two status tabs; native selects retain their
// built-in arrow-key behavior and submission/change semantics.
document.addEventListener('keydown',event=>{
 const current=event.target.closest?.('.pq-tabs [role=tab]');
 if(!current||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const tabs=[...current.parentElement.querySelectorAll('[role=tab]')];
 const index=tabs.indexOf(current);
 const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 event.preventDefault();tabs[next].focus();tabs[next].click();
});
// Keep the run overflow actions lightweight: dismiss on outside click or Escape.
document.addEventListener('click',event=>{
 for(const toggle of document.querySelectorAll('.rr-more[aria-expanded=true]')){
  if(!toggle.closest('.rr-menu-wrap').contains(event.target))toggle.click();
 }
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 for(const toggle of document.querySelectorAll('.rr-more[aria-expanded=true]')){event.preventDefault();toggle.click();toggle.focus();}
});
