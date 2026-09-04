import fs from 'node:fs';
export const listAssociationCopy = [
 ['wizard: this.deliveryWizardValues(),', 'wizard: this.deliveryWizardValues(), association: this.pmListAssociation(),'],
 ['entries: editor.entries.map(entry => Object.assign({}, entry, {', 'entries: this.pmListEntries(editor).map(entry => Object.assign({}, entry, {'],
 ["this.patchDeliveryEditor({ entries, listText: entries.map(entry => entry.source).join('\\n'), listChanged: true, archive:", "this.patchDeliveryEditor({ importMode: 'zip', productionTaskIds: [], entries, listText: entries.map(entry => entry.source).join('\\n'), listChanged: true, archive:"]
];
export function installListAssociation(t) {
 for (const [from,to] of listAssociationCopy) {
  if (!t.includes(from)) throw Error('List association logic anchor changed: '+from);
  t=t.replace(from,()=>to);
 }
 const start=t.indexOf('        <section aria-label="List 清单与 Tag">');
 const end=t.indexOf('      <sc-if value="{{ deliveryEditor.reviewTab }}"',start);
 if(start<0||end<0)throw Error('List editor boundaries changed');
 const old=t.slice(start,end);
 const tags=old.slice(old.indexOf('          <section class="forge-delivery-tag-editor"'),old.indexOf('          <sc-if value="{{ deliveryEditor.hasEntries }}"'));
 const upload=old.match(/<label class="forge-delivery-file-button forge-delivery-list-upload"[\s\S]*?<\/label>/)[0];
 const markup=fs.readFileSync(new URL('list-association.html',import.meta.url),'utf8').replace('[[upload]]',upload).replace('[[tags]]',tags);
 t=t.slice(0,start)+markup+t.slice(end);
 const methods=fs.readFileSync(new URL('list-association-methods.js',import.meta.url),'utf8');
 return t.replace('  tagForeground(hex) {',methods+'  tagForeground(hex) {');
}
