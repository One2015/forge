  // delivery-wizard:start
  deliveryWizardStats(editor = this.state.deliveryEditor) {
    const rows = editor?.entries || [];
    const stats = { recognized: rows.length, valid: 0, duplicate: 0, invalid: 0, unmatched: 0 };
    rows.forEach(row => { const status = row.parseStatus || (row.itemId ? 'matched' : 'unmatched'); stats[status === 'matched' ? 'valid' : status]++; });
    stats.exceptions = stats.duplicate + stats.invalid + stats.unmatched;
    stats.difference = Number(editor?.target || 0) - stats.valid;
    return stats;
  }

  deliveryProductionTasks() {
    const localIds = new Set((this.state.submittedRuns || []).map(run => run.id));
    return this.runsData().map(run => {
      const dataset = this.dsData().find(ds => ds.name === run.dsName);
      // Use the same Run/Item identities as production. Never synthesize IDs or
      // resize a task's contents to match the delivery target.
      const meta = run.itemMeta?.length ? run.itemMeta : run.itemIds?.length
        ? run.itemIds.map(id => dataset?.items?.find(item => item[0] === id)).filter(Boolean)
        : localIds.has(run.id) ? [] : (dataset?.items || []).slice(0, run.n);
      const seen = new Set();
      const entries = meta.filter(item => item?.[0] && !seen.has(item[0]) && seen.add(item[0])).map(item => ({
        key: 'production-' + item[0], source: item[0], name: this.itemTitle(item[4] || item[0]), itemId: item[0], deliveryItemId: item[0],
        tagId: '', parseStatus: 'matched', parseDetail: item[0], sourceType: 'production', sourceRunId: run.id,
        sourcePipeline: run.pipe, sourceDataset: run.dsName, sourceRefs: [{ runId: run.id, itemId: item[0], pipeline: run.pipe, dataset: run.dsName }]
      }));
      return { id: run.id, name: run.subject || run.name, pipeline: run.pipe, dataset: run.dsName || '未关联数据集',
        demo: !localIds.has(run.id), entries, count: entries.length, disabled: !entries.length,
        status: ({ running: '运行中', success: '已完成', partial: '部分完成', failed: '运行失败' })[run.status] || '待运行' };
    });
  }

  syncDeliveryProductionTasks(taskIds, id = this.state.deliveryEditor?.id) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.id !== id || editor.listLoading) return;
    const tasks = this.deliveryProductionTasks(), requested = [...new Set(taskIds)];
    const missing = requested.some(key => !tasks.some(task => task.id === key && !task.disabled));
    const entries = [], seen = new Map(), excluded = new Set(editor.productionExcluded || []);
    tasks.filter(task => requested.includes(task.id)).forEach(task => task.entries.forEach(entry => {
      if (excluded.has(entry.itemId)) return;
      if (seen.has(entry.itemId)) { seen.get(entry.itemId).sourceRefs.push(...entry.sourceRefs); return; }
      const previous = editor.entries.find(row => row.itemId === entry.itemId);
      const row = Object.assign({}, entry, { tagId: previous?.tagId || '', sourceRefs: entry.sourceRefs.slice() });
      seen.set(row.itemId, row); entries.push(row);
    }));
    this.patchDeliveryEditor({ importMode: 'production', productionTaskIds: requested, archive: null, entries,
      listText: entries.map(entry => entry.source).join('\n'), listChanged: true, entryPage: 1, error: '',
      listError: missing ? '部分关联任务已不可用，请取消选择后重新关联。' : entries.length > 500 ? '关联条目超过 500 项，请减少任务或移除条目。' : '' }, id);
  }

  parseDeliveryWizardLines(lines, previous = []) {
    const sources = lines.map(line => String(line).trim()).filter(Boolean);
    if (sources.length > 500) throw new Error('最多导入 500 个条目，请拆分 List 后重试。');
    const catalog = this.sheetRows(null), seen = new Set(), occurrences = new Map();
    return sources.map((source, index) => {
      const text = source.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').normalize('NFC');
      const name = text.split('/').pop().replace(/\.[^.]+$/, '');
      const invalid = !text || text.length > 300 || /[\x00-\x1f\x7f]/.test(text) || /^(https?:|[\[{])/.test(text) || !/[\p{L}\p{N}]/u.test(text);
      const matches = invalid ? [] : catalog.filter(row => row[2].toLowerCase() === text.toLowerCase() || row[0] === text || row[0] === name);
      const match = matches.length === 1 ? matches[0] : null;
      const identity = match?.[2] || text.toLowerCase(), occurrence = occurrences.get(source) || 0;
      occurrences.set(source, occurrence + 1);
      const old = previous.filter(row => row.source === source)[occurrence];
      const parseStatus = invalid ? 'invalid' : seen.has(identity) ? 'duplicate' : match ? 'matched' : 'unmatched';
      if (!invalid) seen.add(identity);
      return { key: old?.key || 'list-' + (++this._deliverySequence) + '-' + index, source, name: match?.[0] || text,
        itemId: match?.[2] || '', deliveryItemId: match?.[2] || '', tagId: old?.tagId || '', parseStatus,
        parseDetail: invalid ? '每行一个名称或 Item ID，最多 300 字' : parseStatus === 'duplicate' ? '与前面的名称或 Item ID 重复' : matches.length > 1 ? '名称不唯一，请使用 Item ID' : !match ? '未在当前 Item 目录中找到，请核对名称或 ID' : match[2] };
    });
  }

  deliveryWizardBasicIssue(editor = this.state.deliveryEditor) {
    if (!editor?.name.trim()) return '请填写数据单名称。';
    if (editor.name.trim().length > 100) return '数据单名称不能超过 100 字。';
    if (!editor.customer.trim()) return '请填写客户 / 供应商。';
    if (editor.customer.trim().length > 80) return '客户 / 供应商不能超过 80 字。';
    if (!/^\d+$/.test(editor.target) || Number(editor.target) < 1 || Number(editor.target) > 500) return '目标数量须为 1–500 的整数，与有效 Item 数量一致。';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editor.deliveryDate || '') || Number.isNaN(Date.parse(editor.deliveryDate + 'T00:00:00Z'))) return '请选择有效的交付日期。';
    if (editor.logoLoading) return 'Logo 正在读取，请稍候。';
    return '';
  }

  deliveryWizardListIssue(editor = this.state.deliveryEditor) {
    if (editor.listLoading) return 'ZIP 正在解析，请稍候。';
    if (editor.listError) return editor.listError;
    const stats = this.deliveryWizardStats(editor);
    if (!stats.recognized) return editor.importMode === 'zip' ? '请上传 ZIP 后继续。' : '请选择要关联的生产任务，或切换到上传 ZIP。';
    if (editor.importMode === 'production' && editor.productionTaskIds?.length) {
      const available = new Set(this.deliveryProductionTasks().filter(task => !task.disabled).map(task => task.id));
      if (editor.productionTaskIds.some(id => !available.has(id))) return '关联任务已不可用，请重新选择生产任务。';
    }
    if (stats.difference) return '目标数量为 ' + (editor.target || '0') + '，当前识别到 ' + stats.valid + ' 个有效 Item，' + (stats.difference > 0 ? '还差 ' + stats.difference : '多出 ' + -stats.difference) + ' 项。';
    if (stats.exceptions) return '还有 ' + stats.exceptions + ' 个异常条目，请修改或删除后继续。';
    return '';
  }

  deliveryWizardEntryTagIds(editor = this.state.deliveryEditor, entry = null) {
    if (!editor) return [];
    const defaults = Array.isArray(editor.defaultTaskTagIds) ? editor.defaultTaskTagIds : editor.defaultTagId ? [editor.defaultTagId] : [];
    const ids = entry
      ? Array.isArray(entry.taskTagIds) ? entry.taskTagIds : entry.tagId === '__none__' ? [] : entry.tagId ? [entry.tagId] : defaults
      : defaults;
    return [...new Set(ids.filter(Boolean))];
  }

  deliveryWizardRulesIssue(editor = this.state.deliveryEditor) {
    if (editor.skillLoading) return 'Skill 文件正在读取，请稍候。';
    if (editor.tagName.trim() || editor.tagColor) return '请完成正在创建的 Tag，或取消编辑。';
    if (this.deliverySkillDraftDirty(editor) || editor.skillUploads?.length) return '请完成正在创建的 Skill，或清空未完成内容。';
    if (editor.skills.length > 12) return '最多选择 12 个 Skill。';
    const availableTagIds = new Set(editor.tags.map(tag => tag.id));
    const configuredTagIds = this.deliveryWizardEntryTagIds(editor).concat(editor.entries.flatMap(entry => this.deliveryWizardEntryTagIds(editor, entry)));
    if (configuredTagIds.some(tagId => !availableTagIds.has(tagId))) return '条目中有不可用的 Tag，请重新分配。';
    if (editor.tags.length) {
      const unassigned = editor.entries.filter(entry => !this.deliveryWizardEntryTagIds(editor, entry).length).length;
      if (unassigned) return '还有 ' + unassigned + ' 个 Item 未分配 Tag，请为每个 Item 至少选择一个 Tag。';
    }
    const commands = new Set();
    for (const skill of editor.skills) {
      const command = this.skillCommand(skill.command);
      if (!this.validSkillCommand(command)) return '请为每个 Skill 填写有效的调用名。';
      if (commands.has(command.toLowerCase())) return 'Skill 调用名不能重复。';
      commands.add(command.toLowerCase());
    }
    return this.deliverySkillSavePlan(editor).issue;
  }

  deliveryWizardProblems(editor = this.state.deliveryEditor) {
    if (!editor) return [];
    return [[1, '基础信息', this.deliveryWizardBasicIssue(editor)], [2, '同步条目', this.deliveryWizardListIssue(editor)],
      [3, '配置规则', this.deliveryWizardRulesIssue(editor)], [4, '成员与角色', this.deliveryMembersIssue()], [4, '审核分配', this.deliveryDatasetReviewIssue(editor)]]
      .filter(([, , issue]) => issue).map(([step, label, issue]) => ({ step, label, issue, edit: () => this.goDeliveryWizardStep(step, editor.id) }));
  }

  goDeliveryWizardStep(step, id = this.state.deliveryEditor?.id) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.key || editor.id !== id || ![1, 2, 3, 4].includes(step)) return;
    const current = editor.step || 1, reached = editor.reachedStep || 1;
    if (step > current) {
      const issue = this.deliveryWizardProblems(editor).find(problem => problem.step < step)?.issue;
      if (issue || step > reached + 1) { this.patchDeliveryEditor({ error: issue || '请先完成当前步骤。' }, id); return; }
    }
    this.closeDeliveryMemberPicker(id);
    const next = { step, reachedStep: Math.max(reached, step), tab: ['basic', 'list', 'skills', 'confirm'][step - 1], logoPickerOpen: false, error: '' };
    this.patchDeliveryEditor(next, id);
    setTimeout(() => {
      if (typeof document === 'undefined' || this.state.deliveryEditor?.id !== id) return;
      document.querySelector('.forge-delivery-wizard')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      document.getElementById('forge-wizard-step-title')?.focus({ preventScroll: true });
    }, 0);
  }

  setDeliveryImportMode(mode, id) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.id !== id || editor.listLoading || !['production', 'zip'].includes(mode) || mode === (editor.importMode || 'production')) return;
    const previousMode = editor.importMode || 'production';
    const modes = Object.assign({}, editor.importModes, { [previousMode]: { text: editor.listText, entries: editor.entries, archive: editor.archive, error: editor.listError } });
    const next = modes[mode] || { text: '', entries: [], archive: null, error: '' };
    this.patchDeliveryEditor({ importModes: modes, importMode: mode, listText: next.text, entries: next.entries, archive: next.archive, listError: next.error,
      listChanged: true, entryPage: 1, error: '' }, id);
  }

  removeDeliveryWizardEntry(key, id) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.id !== id || editor.listLoading) return;
    const remaining = editor.entries.filter(entry => entry.key !== key);
    const production = remaining.every(entry => entry.sourceType === 'production');
    const entries = production ? remaining : this.parseDeliveryWizardLines(remaining.map(entry => entry.source), remaining);
    const removed = editor.entries.find(entry => entry.key === key);
    this.patchDeliveryEditor({ entries, productionExcluded: production && removed ? [...new Set([...(editor.productionExcluded || []), removed.itemId])] : editor.productionExcluded,
      listText: entries.map(entry => entry.source).join('\n'), listChanged: true, error: '' }, id);
  }

  deliveryWizardValues() {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.key) return {};
    const id = editor.id, step = editor.step || 1, reached = editor.reachedStep || 1;
    const patch = value => { if (this.state.deliveryEditor?.id === id) this.patchDeliveryEditor(value, id); };
    const stats = this.deliveryWizardStats(editor), problems = this.deliveryWizardProblems(editor);
    const titles = ['基础信息', '关联条目', '配置规则', '确认创建'];
    const help = ['先确定本次交付的客户和目标，带 * 的字段为必填。', '关联 Pipeline × 数据集创建的生产任务，或上传 ZIP。', 'Tag 和 Skill 均为选填，可按需配置或跳过。', '核对配置并设置成员权限，确认后创建数据单。'];
    const issue = problems.find(problem => problem.step <= step)?.issue || '';
    const filtered = editor.entries.filter(entry => !editor.onlyExceptions || (entry.parseStatus || (entry.itemId ? 'matched' : 'unmatched')) !== 'matched');
    const pageSize = 8, pages = Math.max(1, Math.ceil(filtered.length / pageSize)), page = Math.max(1, Math.min(pages, editor.entryPage || 1));
    const defaultTag = editor.tags.find(tag => tag.id === editor.defaultTagId);
    const tagIds = new Set(editor.entries.map(entry => entry.tagId === '__none__' ? '' : entry.tagId || editor.defaultTagId).filter(Boolean));
    if (defaultTag) tagIds.add(defaultTag.id);
    const tagPreview = editor.tags.filter(tag => tagIds.has(tag.id)).map(tag => Object.assign({}, tag, { isDefault: tag.id === editor.defaultTagId, applied: editor.entries.filter(entry => entry.tagId !== '__none__' && (entry.tagId || editor.defaultTagId) === tag.id).length }));
    const skillPreview = editor.skills.map(skill => ({ name: skill.name, command: '/' + this.skillCommand(skill.command) }));
    const memberRoles = new Map(this.deliveryMemberRoles().map(role => [role.key, role.label]));
    const memberDirectory = new Map(this.deliveryMemberDirectory().map(person => [person.accountName, person]));
    const memberPreview = editor.members.map(member => {
      const person = memberDirectory.get(member.accountName), name = member.name || member.accountName;
      const detail = member.detail || person?.detail || '', external = member.role === 'reviewer-outsourcing' || member.external || person?.external;
      const teamName = member.teamName || person?.teamName || detail.replace(/^外部专家\s*[·-]\s*/, '');
      return { name, detail, teamName, role: ['owner', 'reviewer-forge', 'reviewer-outsourcing'].includes(member.role) ? member.role : 'unknown',
        roleLabel: memberRoles.get(member.role) || '待配置', summaryLabel: external ? '外部专家 · ' + (teamName || name) : name + (member.role === 'owner' ? ' (Owner)' : '') };
    });
    const availableTagIds = new Set(editor.tags.map(tag => tag.id));
    const assignedTagCount = editor.entries.filter(entry => this.deliveryWizardEntryTagIds(editor, entry).some(tagId => availableTagIds.has(tagId))).length;
    const productionTasks = this.deliveryProductionTasks(), taskQuery = (editor.productionQuery || '').trim().toLowerCase();
    const productionRows = productionTasks.filter(task => (!editor.productionPipeline || task.pipeline === editor.productionPipeline) && (!taskQuery || (task.name + ' ' + task.pipeline + ' ' + task.dataset + ' ' + task.id).toLowerCase().includes(taskQuery))).map(task => Object.assign({}, task, {
      selected: (editor.productionTaskIds || []).includes(task.id), toggle: () => { if (this.state.deliveryEditor?.id !== id) return; const selected = this.state.deliveryEditor.productionTaskIds || []; this.syncDeliveryProductionTasks(selected.includes(task.id) ? selected.filter(key => key !== task.id) : selected.concat(task.id), id); }
    }));
    const rows = filtered.slice((page - 1) * pageSize, page * pageSize).map(entry => {
      const status = entry.parseStatus || (entry.itemId ? 'matched' : 'unmatched');
      return Object.assign({}, entry, { status, label: ({ matched: '已匹配', unmatched: '未匹配', duplicate: '重复', invalid: '格式错误' })[status],
        detail: entry.parseDetail || entry.itemId || '未在 Item 目录中找到', tagLabel: '设置 ' + entry.name + ' 的 Tag', removeLabel: '删除条目 ' + entry.name,
        onTag: event => patch({ entries: this.state.deliveryEditor.entries.map(row => row.key === entry.key ? Object.assign({}, row, { tagId: event.target.value }) : row) }),
        remove: () => this.removeDeliveryWizardEntry(entry.key, id) });
    });
    return { step, title: titles[step - 1], help: help[step - 1], basic: step === 1, list: step === 2, rules: step === 3, confirm: step === 4, first: step === 1, notFirst: step > 1,
      issue, disabled: !!issue, action: step === 4 ? '创建数据单' : '下一步', progress: step * 25, progressLabel: '第 ' + step + ' / 4 步 · ' + titles[step - 1],
      next: () => { if (this.state.deliveryEditor?.id !== id) return; if (step === 4) this.saveDeliveryEditor(); else this.goDeliveryWizardStep(step + 1, id); },
      previous: () => this.goDeliveryWizardStep(step - 1, id),
      steps: titles.map((label, index) => {
        const position = index + 1, current = position === step;
        const complete = position < step && !problems.some(problem => problem.step <= position);
        const state = current ? 'current' : complete ? 'complete' : 'upcoming';
        return { label, number: position, current, complete, state, ariaCurrent: current ? 'step' : 'false',
          ariaLabel: '第 ' + position + ' 步，共 4 步：' + label + '，' + ({ current: '当前步骤', complete: '已完成', upcoming: '未开始' })[state],
          disabled: position > reached || (position > step && problems.some(problem => problem.step < position)), pick: () => this.goDeliveryWizardStep(position, id) };
      }),
      stats, hasEntries: !!editor.entries.length, noRows: !rows.length, rows, onlyExceptions: !!editor.onlyExceptions,
      onExceptions: event => patch({ onlyExceptions: event.target.checked, entryPage: 1 }),
      range: filtered.length ? ((page - 1) * pageSize + 1) + '–' + Math.min(page * pageSize, filtered.length) + ' / ' + filtered.length + ' 条' : '0 条',
      totalLabel: '共 ' + stats.recognized + ' 条 · 有效 ' + stats.valid + ' 条' + (stats.exceptions ? ' · 异常 ' + stats.exceptions + ' 条' : ''), exceptionSummary: [stats.duplicate && ('重复 ' + stats.duplicate), stats.invalid && ('格式错误 ' + stats.invalid), stats.unmatched && ('未匹配 ' + stats.unmatched)].filter(Boolean).join(' · '), hasExceptions: !!stats.exceptions, pageLabel: page + ' / ' + pages, paginated: pages > 1,
      previousDisabled: page === 1, nextDisabled: page === pages, previousPage: () => patch({ entryPage: page - 1 }), nextPage: () => patch({ entryPage: page + 1 }),
      production: editor.importMode !== 'zip', zip: editor.importMode === 'zip',
      useProduction: () => this.setDeliveryImportMode('production', id), useZip: () => this.setDeliveryImportMode('zip', id),
      productionRows, noProductionTasks: !productionRows.length, productionQuery: editor.productionQuery || '', productionPipeline: editor.productionPipeline || '',
      onProductionQuery: event => patch({ productionQuery: event.target.value }), onProductionPipeline: event => patch({ productionPipeline: event.target.value }),
      productionPipelines: [...new Set(productionTasks.map(task => task.pipeline))].map(name => ({ name })),
      productionCount: (editor.productionTaskIds || []).length, hasDemoTasks: productionTasks.some(task => task.demo),
      archiveSize: editor.archive ? (editor.archive.size / 1024).toLocaleString('zh-CN', { maximumFractionDigits: 1 }) + ' KB' : '',
      archiveStatus: editor.listLoading ? '正在解析' : editor.listError ? '解析失败' : '解析完成',
      syncProduction: () => this.syncDeliveryProductionTasks(this.state.deliveryEditor?.productionTaskIds || [], id),
      removeArchive: () => { if (!editor.listLoading) patch({ archive: null, entries: [], listText: '', listChanged: true, listError: '', entryPage: 1, error: '' }); },
      listIssue: this.deliveryWizardListIssue(editor), mismatch: !!stats.difference, hasTarget: !!Number(editor.target),
      differenceLabel: !Number(editor.target) ? '待填写目标' : stats.difference > 0 ? '还差 ' + stats.difference + ' 项' : stats.difference < 0 ? '多出 ' + -stats.difference + ' 项' : '数量一致',
      canUseCount: stats.valid > 0 && !!stats.difference, useValidCount: () => patch({ target: String(stats.valid), error: '' }),
      editInput: () => { if (typeof document !== 'undefined') document.getElementById(editor.importMode === 'zip' ? 'forge-wizard-zip' : 'forge-delivery-list')?.focus(); },
      defaultTagId: editor.defaultTagId || '', defaultTagName: defaultTag?.name || '未设置', defaultTagHelp: defaultTag ? '默认：' + defaultTag.name : '默认（无）', defaultTag, hasDefaultTag: !!defaultTag, tagPreview, hasTagPreview: !!tagPreview.length,
      skillPreview, hasSkillPreview: !!skillPreview.length, memberPreview, hasMemberPreview: !!memberPreview.length,
      onDefaultTag: event => patch({ defaultTagId: event.target.value }), tags: editor.tags,
      tagAssignmentCount: assignedTagCount, tagAssignmentComplete: assignedTagCount === editor.entries.length,
      tagAssignmentLabel: '已分配 ' + assignedTagCount + ' / ' + editor.entries.length + ' 个 Item',
      tagCount: tagIds.size, skillCount: editor.skills.length, memberCount: editor.members.length,
      validEmpty: stats.valid === 0, tagEmpty: tagIds.size === 0, skillEmpty: editor.skills.length === 0, memberEmpty: editor.members.length === 0,
      name: editor.name.trim() || '未填写', customer: editor.customer.trim() || '未填写', target: editor.target || '未填写', deliveryDate: editor.deliveryDate || '未填写',
      nameEmpty: !editor.name.trim(), customerEmpty: !editor.customer.trim(), targetEmpty: !editor.target, deliveryDateEmpty: !editor.deliveryDate,
      skillNames: editor.skills.map(skill => skill.name).join('、') || '未选择', desc: editor.desc.trim() || '未填写',
      hasLogo: !!editor.logo, logo: editor.logo?.url || '', noLogo: !editor.logo,
      problems, hasProblems: !!problems.length,
      editBasic: () => this.goDeliveryWizardStep(1, id), editList: () => this.goDeliveryWizardStep(2, id), editRules: () => this.goDeliveryWizardStep(3, id),
      skip: () => { if (this.state.deliveryEditor?.id !== id) return; patch({ defaultTagId: '', tags: [], entries: editor.entries.map(row => Object.assign({}, row, { tagId: '' })), skills: [], tagName: '', tagColor: '', tagComposerOpen: false, skillDraft: {}, skillUploads: [], skillMode: 'existing' }); this.goDeliveryWizardStep(4, id); },
      canSkip: !editor.skillLoading && !editor.tags.length && !editor.skills.length && !this.deliverySkillDraftDirty(editor) && !editor.skillUploads?.length,
      categories: [['all', '全部'], ['web', 'Web'], ['3d', '3D'], ['data', '数据质量'], ['other', '其他']].map(([key, label]) => ({ key, label, selected: (editor.skillCategory || 'all') === key, pick: () => patch({ skillCategory: key }) }))
    };
  }
  // delivery-wizard:end
