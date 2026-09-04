/** Build-time native HTML primitives. DCLogic bindings are passed as attribute values.
 * content is trusted source markup, never user data. Runtime user text stays in {{ bindings }}.
 */
import fs from 'node:fs';
export const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const attrs = obj => Object.entries(obj).filter(([,v])=>v!==false && v!=null).map(([k,v])=>` ${k}="${escape(v===true ? '' : v)}"`).join('');
export function icon(name,size=16){
 const svg=fs.readFileSync(new URL('../../assets/phosphor/regular/'+name+'.svg',import.meta.url),'utf8');
 const body=svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g,'<$1$2></$1>');
 return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" viewBox="0 0 256 256" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
}
export function Button({content,variant='secondary',size='md',onClick,loading=false,disabled=false,attributes={}}){
 if(!['primary','secondary','tertiary','danger','link'].includes(variant)) throw Error('Unsupported Button variant');
 return `<button${attrs({type:'button',class:'fg-button','data-variant':variant,'data-size':size,'sc-camel-on-click':onClick,disabled,'aria-busy':loading?'true':null,'aria-disabled':loading?'true':null,...attributes})}><span class="fg-button-content">${content}</span><span class="fg-button-busy" aria-hidden="true">处理中…</span></button>`;
}
export function SearchInput({label,placeholder,value,onChange,attributes={}}){return `<div class="fg-search">${icon('magnifying-glass')}<input${attrs({class:'fg-input',type:'search','aria-label':label,placeholder,value,'sc-camel-on-change':onChange,...attributes})}></div>`;}
export function Checkbox({label,checked,onChange}){return `<label class="fg-checkbox-label"><input${attrs({type:'checkbox',checked,'sc-camel-on-change':onChange})}><span>${label}</span></label>`;}
export function SegmentedControl({label,content}){return `<div class="fg-segmented" role="group" aria-label="${escape(label)}">${content}</div>`;}
export function Panel({content,attributes={}}){return `<div${attrs({class:'fg-panel',...attributes})}>${content}</div>`;}
export function Badge({label,tone='neutral'}){return `<span class="fg-badge" data-tone="${escape(tone)}"><span class="fg-badge-dot" aria-hidden="true"></span>${label}</span>`;}
export function EmptyState({title,description,action}){return `<div class="fg-empty" role="status">${icon('tray',24)}<h2>${title}</h2><p>${description}</p>${action||''}</div>`;}
