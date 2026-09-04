import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderDeliveryEditor } from './render-delivery-editor.mjs';

const read = name => fs.readFileSync(new URL('./templates/' + name, import.meta.url), 'utf8').trimEnd();
const icons = text => text.replace(/\[\[icon:([\w-]+):(\d+)\]\]/g, (_, name, size) => {
  const svg = fs.readFileSync(new URL('../assets/phosphor/regular/' + name + '.svg', import.meta.url), 'utf8');
  const geometry = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/<([\w-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  return `<svg class="forge-icon" data-phosphor="${name}" width="${size}" height="${size}" sc-camel-view-box="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${geometry}</svg>`;
});

export function updateMemberPicker(source) {
  const opening = '<script type="__bundler/template">', closing = '\n</script>\n</body>\n</html>';
  const start = source.indexOf(opening), end = source.lastIndexOf(closing);
  let template = JSON.parse(source.slice(start + opening.length, end).trim());
  const replace = (pattern, value) => {
    const matches = typeof pattern === 'string' ? template.includes(pattern) : template.match(pattern);
    if (!matches) throw new Error('Missing member picker anchor: ' + pattern);
    template = template.replace(pattern, () => value);
  };
  replace(/  \/\/ delivery-members:start[\s\S]*?  \/\/ delivery-members:end/, read('delivery-members.js'));
  replace(/<!-- delivery-editor:start -->[\s\S]*?<!-- delivery-editor:end -->/, icons(renderDeliveryEditor(read('delivery-editor.html'))));
  replace(/\/\* delivery-workflows:start \*\/[\s\S]*?\/\* delivery-workflows:end \*\//, read('delivery-workflows.css'));
  // Only the editor lifecycle changed; do not replay older delivery migrations.
  for (const name of ['openDeliveryEditor', 'closeDeliveryEditor', 'deliveryEditorIssue', 'saveDeliveryEditor', 'deliveryEditorValues']) {
    const pattern = new RegExp('  ' + name + '\\([^]*?(?=\\n  (?:async )?\\w+\\(|\\n  // delivery-workflows:end)');
    const method = read('delivery-methods.js').match(pattern)?.[0];
    if (!method) throw new Error('Missing source method ' + name);
    replace(pattern, method);
  }
  if (!template.includes('    this.mountDeliveryMemberPicker();')) replace('    this.mountSidebarInteractions();', '    this.mountSidebarInteractions();\n    this.mountDeliveryMemberPicker();');
  if (!template.includes('    this.unmountDeliveryMemberPicker();')) replace('    this.unmountSidebarInteractions();', '    this.unmountSidebarInteractions();\n    this.unmountDeliveryMemberPicker();');
  for (const [label, name] of [['生产', 'tree-structure'], ['交付', 'folder-simple']]) {
    const pattern = new RegExp('(aria-label="' + label + '" title="' + label + '">)<svg[^]*?<\\/svg>');
    const prefix = template.match(pattern)?.[1];
    replace(pattern, prefix + icons(`[[icon:${name}:20]]`));
  }
  if (!template.includes('// delivery-member-notifications')) {
    replace('    const notifData = [', '    // delivery-member-notifications\n    const notifData = [...this.deliveryNotificationItems(),');
    replace("feishuNote: feishuOn ? '本轮修复有结果时，飞书会同步弹消息' : '已关闭 · 只在站内提醒'", "feishuNote: feishuOn ? '飞书未连接 · 当前仅演示同步偏好' : '已关闭 · 只在站内提醒'");
    replace("          pass: ['', '#3f6b45', '#5f9a63', '#f2f7f2']", "          assignment: ['', '#53594e', '#c9ccc4', '#f6f6f3'],\n          pass: ['', '#3f6b45', '#5f9a63', '#f2f7f2']");
    replace("isDone: n.kind === 'done', isFail:", "isAssignment: n.kind === 'assignment', isDone: n.kind === 'done', isFail:");
    replace("title: n.item + ' · 第 '", "title: n.kind === 'assignment' ? n.item + ' · 成员分配' : n.item + ' · 第 '");
    replace('          body: n.body,', "          body: n.body + (n.kind === 'assignment' ? '（本地演示；飞书未连接）' : ''),");
    replace("bg: read ? '#fff' : '#fdf5f2'", "bg: read ? '#fff' : (n.kind === 'assignment' ? '#f6f6f3' : '#fdf5f2')");
    replace("cta: n.kind === 'fail'", "cta: n.kind === 'assignment' ? '查看数据单' : n.kind === 'fail'");
    replace('          go: () => {\n            const reviewReturn = {', "          go: () => {\n            if (n.kind === 'assignment') { this.openDeliveryNotification(n.id); return; }\n            const reviewReturn = {");
    replace('<sc-if value="{{ n.isDone }}"', icons('<sc-if value="{{ n.isAssignment }}" hint-placeholder-val="{{ false }}">[[icon:folder-simple:16]]</sc-if>\n                    <sc-if value="{{ n.isDone }}"'));
  }
  if (template.includes('        const m = {};\n        notifData.forEach')) replace('        const m = {};\n        notifData.forEach', '        const m = Object.assign({}, this.state.notifRead);\n        notifData.forEach');
  const notification = template.match(/<sc-for list="{{ notif.items }}"[^]*?<\/sc-for>/)?.[0];
  if (notification?.includes('<div sc-camel-on-click="{{ n.go }}"')) {
    replace(notification, notification.replace('<div sc-camel-on-click="{{ n.go }}" style="', '<button type="button" aria-label="{{ n.cta }} · {{ n.title }}" sc-camel-on-click="{{ n.go }}" style="width:100%;text-align:left;font:inherit;border:0;').replace(/<\/div>(\s*<\/sc-for>)$/, '</button>$1'));
  }
  new Function(template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]);
  return source.slice(0, start + opening.length) + '\n' + JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>') + closing;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('./templates/forge-base.html', import.meta.url);
  const source = fs.readFileSync(file, 'utf8'), result = updateMemberPicker(source);
  if (result !== source) fs.writeFileSync(file, result);
  console.log('Updated compact member checklist, roles, local notifications and navigation icons');
}
