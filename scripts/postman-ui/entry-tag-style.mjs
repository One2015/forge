export const entryTagStyleCopy = [
  ["tags: editor.tags, taskTags: this.deliveryEntryTagPicker(editor, entry),\n        tagLabel:", "tags: editor.tags, taskTags: this.deliveryEntryTagPicker(editor, entry), ...this.pmEntryTagStyle(entry, editor),\n        tagLabel:"],
  ["return Object.assign({}, entry, { status, label:", "return Object.assign({}, entry, { ...this.pmEntryTagStyle(entry, editor, true), status, label:"]
];
export function installEntryTagStyle(t) {
  for (const [from,to] of entryTagStyleCopy) {
    if (!t.includes(from)) throw Error('Entry Tag style anchor changed');
    t=t.replace(from,()=>to);
  }
  t=t.replace('  tagForeground(hex) {',`  // pm-entry-tag-style:start
  pmEntryTagStyle(entry, editor, inherit = false) {
    const id = entry.tagId === '__none__' ? '' : entry.tagId || (inherit ? editor.defaultTagId : '');
    const tag = editor.tags.find(value => value.id === id);
    const color = tag && /^#[0-9a-f]{6}$/i.test(tag.color) ? tag.color : '#64748b';
    return { hasTagStyle: !!tag, tagBackground: tag ? color : 'transparent', tagForeground: tag ? this.tagForeground(color) : 'inherit' };
  }
  // pm-entry-tag-style:end
  tagForeground(hex) {`);
  t=t.replace(/<select(?=[^>]*sc-camel-on-change="\{\{ entry.onTag \}\}")/g,
    '<select class="pm-entry-tag-select" data-has-tag="{{ entry.hasTagStyle }}" style="--entry-tag-bg:{{ entry.tagBackground }};--entry-tag-fg:{{ entry.tagForeground }}"');
  return t;
}
