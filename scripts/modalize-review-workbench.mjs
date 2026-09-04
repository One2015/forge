import fs from 'node:fs';

const file = new URL('./templates/forge-base.html', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const open = '<script type="__bundler/template">';
const close = '\n</script>\n</body>\n</html>';
const start = source.indexOf(open);
const end = source.lastIndexOf(close);

if (start < 0 || end < 0 || end <= start) throw new Error('Forge template bundle not found');
let template = JSON.parse(source.slice(start + open.length, end).trim());

function replaceOnce(before, after, label) {
  const count = template.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  template = template.replace(before, after);
}

replaceOnce(
  `      <sc-if value="{{ review.focused }}" hint-placeholder-val="{{ false }}">
        <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;padding:11px 13px;border:1px solid #e8e2d9;background:#fff;border-radius:10px;flex-wrap:wrap">
          <button sc-camel-on-click="{{ review.closeFocus }}" style="border:0;background:transparent;color:#b1543a;font-size:13px;cursor:pointer;padding:0">← 返回审核队列</button>
          <div style="width:1px;height:14px;background:#e2dcd2"></div>
          <div style="font-size:13px;color:#6b645d">一次只处理一条。预览、审核标准与结论保持在同一工作台。</div>
        </div>
      </sc-if>`,
  `      <sc-if value="{{ review.focused }}" hint-placeholder-val="{{ false }}">
        <div sc-camel-on-click="{{ review.closeFocus }}" style="position:fixed;inset:0;z-index:94;background:rgba(34,31,28,.46);backdrop-filter:blur(2px)"></div>
      </sc-if>`,
  'replace focused banner with modal backdrop'
);

replaceOnce(
  '<div style="background:#fff;border:1px solid {{ it.cardBorder }};border-radius:12px;overflow:hidden">',
  '<div sc-camel-on-click="{{ it.stop }}" role="{{ it.dialogRole }}" aria-modal="{{ it.ariaModal }}" aria-label="{{ it.shortName }} 审核工作台" style="background:#fff;border:1px solid {{ it.cardBorder }};border-radius:14px;overflow:{{ it.modalOverflow }};position:{{ it.modalPosition }};inset:{{ it.modalInset }};z-index:{{ it.modalZ }};box-shadow:{{ it.modalShadow }};max-height:{{ it.modalMaxHeight }}">',
  'review card modal shell'
);

replaceOnce(
  '<div style="display:flex;justify-content:flex-end;min-height:34px;align-items:center;font-size:12px;color:#8a5a16">正在审核</div>',
  '<div style="display:flex;justify-content:flex-end;min-height:34px;align-items:center;gap:10px"><span style="font-size:12px;color:#8a5a16">正在审核</span><button sc-camel-on-click="{{ review.closeFocus }}" aria-label="关闭审核弹窗" style="width:30px;height:30px;border:1px solid #ddd6cb;background:#fff;border-radius:50%;font-size:15px;color:#6b645d;cursor:pointer">×</button></div>',
  'review modal close control'
);

replaceOnce(
  `            cardBg: st.reviewOpen === key ? '#fdf5f2' : '#fff',
            cardBorder: st.reviewOpen === key ? '#e8d5cd' : '#e8e2d9',`,
  `            cardBg: st.reviewOpen === key ? '#fdf5f2' : '#fff',
            cardBorder: st.reviewOpen === key ? '#e8d5cd' : '#e8e2d9',
            modalPosition: st.reviewOpen === key ? 'fixed' : 'relative',
            modalInset: st.reviewOpen === key ? '18px' : 'auto',
            modalZ: st.reviewOpen === key ? '96' : 'auto',
            modalOverflow: st.reviewOpen === key ? 'auto' : 'hidden',
            modalMaxHeight: st.reviewOpen === key ? 'calc(100vh - 36px)' : 'none',
            modalShadow: st.reviewOpen === key ? '0 26px 72px rgba(34,31,28,.26)' : 'none',
            dialogRole: st.reviewOpen === key ? 'dialog' : 'group',
            ariaModal: st.reviewOpen === key ? 'true' : 'false',`,
  'review modal presentation data'
);

replaceOnce(
  `    this._key = e => {
      if (this.state.view !== 'sheet') return;`,
  `    this._key = e => {
      if (this.state.view === 'review' && this.state.reviewOpen && e.key === 'Escape') {
        e.preventDefault();
        this.setState({ reviewOpen: null, reworkDrafts: {} });
        return;
      }
      if (this.state.view !== 'sheet') return;`,
  'escape closes review modal'
);

replaceOnce(
  '<div sc-camel-on-click="{{ passAsk.cancel }}" style="position:fixed;inset:0;background:rgba(34,31,28,.34);z-index:90;display:flex;align-items:center;justify-content:center;padding:24px">',
  '<div sc-camel-on-click="{{ passAsk.cancel }}" style="position:fixed;inset:0;background:rgba(34,31,28,.34);z-index:120;display:flex;align-items:center;justify-content:center;padding:24px">',
  'pass confirmation above review modal'
);

replaceOnce(
  '<div sc-camel-on-click="{{ reworkAsk.cancel }}" style="position:fixed;inset:0;background:rgba(34,31,28,.34);z-index:90;display:flex;align-items:center;justify-content:center;padding:24px">',
  '<div sc-camel-on-click="{{ reworkAsk.cancel }}" style="position:fixed;inset:0;background:rgba(34,31,28,.34);z-index:120;display:flex;align-items:center;justify-content:center;padding:24px">',
  'rework confirmation above review modal'
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Converted focused review workbench into a large modal');
