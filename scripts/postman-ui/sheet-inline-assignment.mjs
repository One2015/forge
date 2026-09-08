import fs from 'node:fs';
export const sheetInlineCopy = [
 ["      const v = this.statusOf('item', delMap[k] || 'pending');", "      const v = k === 'failed' ? this.statusOf('run', 'failed') : this.statusOf('item', delMap[k] || 'pending');"],
 ['        count: rows.length + \' / \' + d.target + \' 个子项\',', `        statusFilter: sf,
        statusOptions: [...new Set(rows0.map(row => row[3]))].map(value => ({ value, label: delPalSafe(value)[3] })),
        onStatusFilter: event => this.setState({ sheetFilter: event.target.value }),
        count: rows.length + ' / ' + d.target + ' 个子项',`],
 ['      this._sheetIds = rows.map(r => r[2]);','      this._sheetIds = rows.map(r => r[2]);\n      const inlineAssignments = this.pmSheetAssignments(d); // pm-sheet-inline-values'],
 ['            name: r[0], path: r[1], id: r[2], state, fg, border, dot,','            name: r[0], path: r[1], id: r[2], state, fg, border, dot, ...inlineAssignments.get(r[2]),'],
 // Existing sheets can be assigned incrementally from either surface.
 ["      if (!group.reviewer) return '请为「' + group.name + '」分配 Reviewer，可选择自己或 Lead。';", "      if (!group.reviewer && editor.key) continue;\n      if (!group.reviewer) return '请为「' + group.name + '」分配 Reviewer，可选择自己或 Lead。';"]
];
export function installSheetInlineAssignment(t) {
 for(const [from,to] of sheetInlineCopy) {
  if(!t.includes(from))throw Error('Sheet inline anchor changed: '+from);
  t=t.replace(from,()=>to);
 }
 const start=t.indexOf('<div class="pm-sheet-columns"');
 const end=t.indexOf('          <sc-if value="{{ sheet.empty }}"',start);
 if(start<0||end<0)throw Error('Sheet table boundaries changed');
 t=t.slice(0,start)+fs.readFileSync(new URL('sheet-inline-assignment.html',import.meta.url),'utf8')+t.slice(end);
 return t.replace('  tagForeground(hex) {',fs.readFileSync(new URL('sheet-inline-assignment-methods.js',import.meta.url),'utf8')+'  tagForeground(hex) {');
}
