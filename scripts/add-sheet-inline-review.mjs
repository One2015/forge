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
  `                  <sc-if value="{{ sheet.pick.hasRun }}" hint-placeholder-val="{{ true }}">
                    <button sc-camel-on-click="{{ sheet.pick.openRun }}" style="flex:1 1 130px;height:38px;border:1px solid #ddd6cb;background:#fff;border-radius:10px;font-size:13px;color:#3a352f;cursor:pointer" style-hover="border-color:#c1b8ab">{{ sheet.pick.runLabel }}</button>
                  </sc-if>
                  <sc-if value="{{ sheet.pick.needsReview }}" hint-placeholder-val="{{ false }}">
                    <button sc-camel-on-click="{{ sheet.pick.openReview }}" style="flex:1 1 130px;height:38px;border:none;background:#4f7a52;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#456b48">去审核</button>
                  </sc-if>`,
  `                  <sc-if value="{{ sheet.pick.hasRun }}" hint-placeholder-val="{{ false }}">
                    <button sc-camel-on-click="{{ sheet.pick.openRun }}" style="flex:1 1 130px;height:38px;border:1px solid #ddd6cb;background:#fff;border-radius:10px;font-size:13px;color:#3a352f;cursor:pointer" style-hover="border-color:#c1b8ab">{{ sheet.pick.runLabel }}</button>
                  </sc-if>
                  <sc-if value="{{ sheet.pick.needsReview }}" hint-placeholder-val="{{ false }}">
                    <button sc-camel-on-click="{{ sheet.pick.pass }}" style="flex:1 1 130px;height:38px;border:none;background:#4f7a52;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#456b48">通过审核</button>
                    <button sc-camel-on-click="{{ sheet.pick.rework }}" style="flex:1 1 130px;height:38px;border:1px solid #e0a58f;background:#fff;color:#9a402b;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer" style-hover="background:#fdf5f2">要求返工</button>
                  </sc-if>`,
  'replace navigation with inline review actions'
);

replaceOnce(
  `                </div>
              </div>
            </sc-if>
          </div>
        </div>
        </sc-if>
      </div>
    </div>
  </sc-if>

  <sc-if value="{{ isOverview }}" hint-placeholder-val="{{ false }}">`,
  `                </div>

                <sc-if value="{{ sheet.pick.passConfirmOpen }}" hint-placeholder-val="{{ false }}">
                  <div sc-camel-on-click="{{ sheet.pick.cancelPass }}" style="position:fixed;inset:0;z-index:110;background:rgba(34,31,28,.38);display:flex;align-items:center;justify-content:center;padding:24px">
                    <div sc-camel-on-click="{{ sheet.stopPick }}" style="width:min(520px,100%);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(34,31,28,.24);padding:26px clamp(20px,3vw,30px)">
                      <div style="font-size:17px;font-weight:600;color:#221f1c">确认通过这个 Item？</div>
                      <div style="margin-top:8px;font-size:13px;color:#6b645d;line-height:1.7">通过后，该候选版本将成为当前可交付版本，并进入「{{ sheet.name }}」。审核结论提交后不可撤销。</div>
                      <div style="margin-top:18px;border:1px solid #ece7df;background:#fcfbf9;border-radius:10px;padding:14px 15px;display:grid;grid-template-columns:78px minmax(0,1fr);gap:8px 12px">
                        <sc-for list="{{ sheet.pick.passFields }}" as="f" hint-placeholder-count="5">
                          <div style="font-size:11px;color:#9c948b">{{ f.k }}</div><div style="font-size:13px;color:#3a352f;overflow-wrap:anywhere">{{ f.v }}</div>
                        </sc-for>
                      </div>
                      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:9px">
                        <button sc-camel-on-click="{{ sheet.pick.cancelPass }}" style="height:38px;border:1px solid #ddd6cb;background:#fff;border-radius:10px;padding:0 18px;font-size:13px;color:#6b645d;cursor:pointer">返回检查</button>
                        <button sc-camel-on-click="{{ sheet.pick.confirmPass }}" style="height:38px;border:none;background:#4f7a52;color:#fff;border-radius:10px;padding:0 20px;font-size:13px;font-weight:600;cursor:pointer">确认通过</button>
                      </div>
                    </div>
                  </div>
                </sc-if>

                <sc-if value="{{ sheet.pick.reworkFormOpen }}" hint-placeholder-val="{{ false }}">
                  <div sc-camel-on-click="{{ sheet.pick.cancelRework }}" style="position:fixed;inset:0;z-index:110;background:rgba(34,31,28,.38);display:flex;align-items:center;justify-content:center;padding:24px">
                    <div sc-camel-on-click="{{ sheet.stopPick }}" style="width:min(560px,100%);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(34,31,28,.24);padding:26px clamp(20px,3vw,30px)">
                      <div style="font-size:17px;font-weight:600;color:#221f1c">要求返工</div>
                      <div style="margin-top:8px;font-size:13px;color:#6b645d;line-height:1.7">说明需要保留、修改和验收的内容。填写并提交本身即为确认，不再增加一次通用弹窗。</div>
                      <textarea sc-camel-on-change="{{ sheet.pick.onReworkText }}" value="{{ sheet.pick.reworkText }}" placeholder="例如：保留现有结构；降低琉璃瓦反射，增强斗拱层次；默认视角下需清晰可辨。" style="width:100%;box-sizing:border-box;margin-top:16px;min-height:112px;resize:vertical;border:1px solid #ddd6cb;border-radius:10px;padding:11px 13px;font-size:13px;color:#221f1c;line-height:1.65"></textarea>
                      <div style="margin-top:8px;font-size:12px;color:#9c948b">返工说明必填 · 提交后将创建修复任务</div>
                      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:9px">
                        <button sc-camel-on-click="{{ sheet.pick.cancelRework }}" style="height:38px;border:1px solid #ddd6cb;background:#fff;border-radius:10px;padding:0 18px;font-size:13px;color:#6b645d;cursor:pointer">取消</button>
                        <sc-if value="{{ sheet.pick.canSubmitRework }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ sheet.pick.submitRework }}" style="height:38px;border:none;background:#b1543a;color:#fff;border-radius:10px;padding:0 20px;font-size:13px;font-weight:600;cursor:pointer">提交返工</button></sc-if>
                        <sc-if value="{{ sheet.pick.cannotSubmitRework }}" hint-placeholder-val="{{ true }}"><button disabled style="height:38px;border:none;background:#d9d3ca;color:#fff;border-radius:10px;padding:0 20px;font-size:13px;font-weight:600;cursor:not-allowed">提交返工</button></sc-if>
                      </div>
                    </div>
                  </div>
                </sc-if>
              </div>
            </sc-if>
          </div>
        </div>
        </sc-if>
      </div>
    </div>
  </sc-if>

  <sc-if value="{{ isOverview }}" hint-placeholder-val="{{ false }}">`,
  'add sheet pass confirmation and rework form'
);

replaceOnce(
  `            openReview: e => { e.stopPropagation(); this.openReview((itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || '20260825-034505-c19f2a', { deepReview: { runId: (itemState.candidateVersion && itemState.candidateVersion.runId) || r[5], itemId: r[2] }, reviewOrigin: 'sheet', reviewSheetName: d.name, reviewSheetKey: d.key }); }`,
  `            passConfirmOpen: st.sheetPassAsk === r[2],
            reworkFormOpen: st.sheetReworkAsk === r[2],
            passFields: [
              { k: 'Item 名称', v: r[0] },
              { k: 'Item ID', v: r[2] },
              { k: '审核轮次', v: '第 ' + (this.roundsOf(r[2]) + 1) + ' 轮' },
              { k: 'Run ID', v: (itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || '—' },
              { k: '产物版本', v: (itemState.candidateVersion && itemState.candidateVersion.label) || '当前候选' }
            ],
            pass: e => { e.stopPropagation(); this.setState({ sheetPassAsk: r[2] }); },
            cancelPass: e => { if (e) e.stopPropagation(); this.setState({ sheetPassAsk: null }); },
            confirmPass: e => {
              if (e) e.stopPropagation();
              const key = ((itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || 'sheet') + ':' + r[2];
              this.setState({
                sheetPassAsk: null,
                reviewDecisions: Object.assign({}, st.reviewDecisions || {}, { [key]: 'pass' }),
                reviewToast: '已通过，当前版本已进入可交付状态',
                reviewToastAt: Date.now()
              });
            },
            rework: e => { e.stopPropagation(); this.setState({ sheetReworkAsk: r[2], sheetReworkText: '' }); },
            reworkText: st.sheetReworkAsk === r[2] ? (st.sheetReworkText || '') : '',
            onReworkText: e => this.setState({ sheetReworkText: e.target.value }),
            canSubmitRework: st.sheetReworkAsk === r[2] && !!String(st.sheetReworkText || '').trim(),
            cannotSubmitRework: st.sheetReworkAsk !== r[2] || !String(st.sheetReworkText || '').trim(),
            cancelRework: e => { if (e) e.stopPropagation(); this.setState({ sheetReworkAsk: null, sheetReworkText: '' }); },
            submitRework: e => {
              if (e) e.stopPropagation();
              const note = String(st.sheetReworkText || '').trim();
              if (!note) return;
              const key = ((itemState.candidateVersion && itemState.candidateVersion.runId) || r[5] || 'sheet') + ':' + r[2];
              this.setState({
                sheetReworkAsk: null, sheetReworkText: '',
                reviewDecisions: Object.assign({}, st.reviewDecisions || {}, { [key]: 'rework' }),
                reworkNotes: Object.assign({}, st.reworkNotes || {}, { [key]: note }),
                reworkSent: Object.assign({}, st.reworkSent || {}, { [key]: true }),
                repairRuns: Object.assign({}, st.repairRuns || {}, { [key]: { status: 'queued', createdAt: Date.now(), sourceRun: r[5] || null } }),
                reviewToast: '已提交返工，已创建修复任务',
                reviewToastAt: Date.now()
              });
            }`,
  'wire sheet inline review actions'
);

const encoded = JSON.stringify(template).replaceAll('</script>', '<\\u002Fscript>');
fs.writeFileSync(file, source.slice(0, start + open.length) + '\n' + encoded + close);
console.log('Added inline pass and rework flow to delivery Item modal');
