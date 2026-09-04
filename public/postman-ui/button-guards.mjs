// Loading remains focusable. Block pointer and keyboard activations, including form submit clicks.
export function installButtonGuards(root=document){
 const guard=event=>{const button=event.target.closest?.('.fg-button[aria-disabled="true"]');if(button){event.preventDefault();event.stopImmediatePropagation();}};
 root.addEventListener('click',guard,true);
 return ()=>root.removeEventListener('click',guard,true);
}
export function setButtonBusy(button,busy){
 if((button.getAttribute('aria-busy')==='true')===busy)return;
 button.setAttribute('aria-busy',String(busy));
 if(busy){button.dataset.wasAriaDisabled=button.getAttribute('aria-disabled')||'';button.setAttribute('aria-disabled','true');}
 else {const previous=button.dataset.wasAriaDisabled;if(previous)button.setAttribute('aria-disabled',previous);else button.removeAttribute('aria-disabled');delete button.dataset.wasAriaDisabled;}
}
if(typeof document!=='undefined')installButtonGuards();
