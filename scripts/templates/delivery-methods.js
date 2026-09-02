  // delivery-workflows:start
  deliveryData() {
    const all = this.baseDeliveryData().flatMap(group => group.sheets.map(sheet => Object.assign({ customer: group.customer }, sheet, this.state.deliveryOverrides?.[sheet.key])));
    all.push(...(this.state.deliverySheets || []));
    const groups = [];
    all.forEach(original => {
      const sheet = Object.assign({}, original);
      if (Array.isArray(sheet.entries)) {
        const rows = this.sheetRows(sheet);
        sheet.linked = rows.length;
        sheet.ran = rows.filter(row => !!row[5]).length;
        sheet.passed = rows.filter(row => row[3] === 'passed').length;
        sheet.review = rows.filter(row => row[3] === 'review').length;
        sheet.failed = rows.filter(row => row[3] === 'failed').length;
      } else if (this.state.deliveryLinks?.[sheet.key]) {
        // Seed totals cover more records than the local fixtures. Apply only the
        // delta for the slots changed here; never replace the aggregate with 5 rows.
        const before = this.baseSheetRows(sheet), after = this.sheetRows(sheet);
        const measures = { linked: row => true, ran: row => !!row[5], passed: row => row[3] === 'passed', review: row => row[3] === 'review', failed: row => row[3] === 'failed' };
        for (const [key, predicate] of Object.entries(measures)) sheet[key] += after.filter(predicate).length - before.filter(predicate).length;
      }
      let group = groups.find(value => value.customer === sheet.customer);
      if (!group) { group = { customer: sheet.customer, sheets: [] }; groups.push(group); }
      group.sheets.push(sheet);
    });
    return groups;
  }

  deliverySheet(key) {
    return this.deliveryData().flatMap(group => group.sheets).find(sheet => sheet.key === key);
  }

  sheetEntryList(sheet) {
    if (Array.isArray(sheet.entries)) return sheet.entries.map(entry => Object.assign({}, entry));
    return this.baseSheetRows(sheet).map(row => ({ key: row[2], name: row[0], itemId: row[2], source: row[0], tagId: sheet.entryTags?.[row[2]] || '' }));
  }

  resolveSheetLines(lines, previous = []) {
    const catalog = this.sheetRows(null), seen = new Set(), entries = [];
    for (const source of lines) {
      const text = String(source || '').trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');
      if (!text) continue;
      if (text.length > 300) throw new Error('单条清单文字不能超过 300 字。');
      const identity = text.normalize('NFC').toLowerCase();
      if (seen.has(identity)) continue;
      seen.add(identity);
      if (entries.length >= 500) throw new Error('一次最多导入 500 个清单条目。');
      const name = text.split('/').pop().replace(/\.[^.]+$/, '');
      const matches = catalog.filter(row => row[2].toLowerCase() === identity || row[0] === text || row[0] === name);
      const match = matches.length === 1 ? matches[0] : null;
      const old = previous.find(entry => entry.source === text);
      entries.push({ key: old?.key || 'entry-' + entries.length + '-' + identity, source: text, name: match?.[0] || text, itemId: match?.[2] || '', tagId: old?.tagId || '',
        deliveryItemId: old?.deliveryItemId || match?.[2] || 'ITEM_' + Date.now().toString(36) + '_' + (this._deliverySequence = (this._deliverySequence || 0) + 1) });
    }
    return entries;
  }

  openDeliveryEditor(key = null) {
    const sheet = key ? this.deliverySheet(key) : null;
    if (key && !sheet) return;
    const entries = sheet ? this.deliveryEntries(sheet) : [];
    const identity = this.profileIdentity();
    const members = sheet ? this.deliverySheetMembers(sheet) : [{ accountName: identity.accountName, name: identity.name, role: 'owner' }];
    this.setState({ deliveryEditor: {
      id: 'editor-' + Date.now() + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1), key,
      tab: 'basic', name: sheet?.name || '', customer: sheet?.customer || '', desc: sheet?.desc || '', target: sheet ? String(sheet.target) : '',
      logo: sheet?.logo || null, archive: sheet?.archive || null, entries, listText: entries.map(entry => entry.source).join('\n'),
      listChanged: !sheet, tags: (sheet?.tags || []).map(tag => Object.assign({}, tag)),
      skills: (sheet?.skills || []).map(skill => Object.assign({}, skill)), skillQuery: '', skillNotice: '', tagName: '', tagColor: '#64748b',
      members, memberActor: identity.accountName, memberBaseline: this.deliveryMemberSignature(members), memberQuery: '', memberNotice: '',
      logoLoading: false, listLoading: false, skillLoading: false, logoError: '', listError: '', skillError: '', error: ''
    } });
    setTimeout(() => {
      if (typeof document === 'undefined' || !this.state.deliveryEditor) return;
      const dialog = document.querySelector('.forge-delivery-editor');
      if (dialog && !dialog.open) dialog.showModal();
    }, 0);
  }

  patchDeliveryEditor(patch, id = null) {
    const current = this.state.deliveryEditor;
    if (current && (!id || id === current.id)) this.setState({ deliveryEditor: Object.assign({}, current, patch) });
  }

  closeDeliveryEditor(event) {
    event?.preventDefault(); event?.stopPropagation();
    if (typeof document !== 'undefined') document.querySelector('.forge-delivery-editor')?.close();
    this.setState({ deliveryEditor: null });
  }

  setDeliveryList(text) {
    const editor = this.state.deliveryEditor;
    if (!editor) return;
    try {
      const entries = this.resolveSheetLines(text.split(/\r?\n/), editor.entries);
      this.patchDeliveryEditor({ listText: text, entries, listChanged: true, listError: '' });
    } catch (error) { this.patchDeliveryEditor({ listText: text, listChanged: true, listError: error.message }); }
  }

  zipDirectory(buffer) {
    const bytes = new Uint8Array(buffer), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 22 || bytes.length > 20 * 1024 * 1024) throw new Error('ZIP 文件须大于 0 且不超过 20 MB。');
    let end = -1;
    for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
      if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
    }
    if (end < 0) throw new Error('无法读取 ZIP 目录，请重新选择有效的 ZIP 文件。');
    const count = view.getUint16(end + 10, true), directory = view.getUint32(end + 16, true), length = view.getUint32(end + 12, true);
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || count === 65535 || directory === 0xffffffff) throw new Error('暂不支持分卷或 ZIP64，请使用普通 ZIP。');
    if (count > 1000 || directory + length > end) throw new Error('ZIP 目录无效或文件过多（最多 1000 个）。');
    let offset = directory, totalSize = 0;
    const entries = [];
    for (let index = 0; index < count; index++) {
      if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('ZIP 目录损坏。');
      const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
      const compressed = view.getUint32(offset + 20, true), size = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true), commentLength = view.getUint16(offset + 32, true);
      const next = offset + 46 + nameLength + extraLength + commentLength;
      if (next > directory + length || flags & 1) throw new Error('不支持加密或损坏的 ZIP。');
      const path = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      if (!path || path.length > 500 || /[\x00-\x1f\\]/.test(path) || path.startsWith('/') || /^[a-z]:/i.test(path) || path.split('/').includes('..')) throw new Error('ZIP 含有不安全的文件路径。');
      const mode = view.getUint32(offset + 38, true) >>> 16;
      if ((mode & 0xf000) === 0xa000) throw new Error('ZIP 不能包含符号链接。');
      const localOffset = view.getUint32(offset + 42, true);
      if (localOffset + 30 > directory || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('ZIP 文件记录无效。');
      const dataOffset = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
      if (dataOffset + compressed > directory) throw new Error('ZIP 文件数据不完整。');
      totalSize += size;
      if (totalSize > 100 * 1024 * 1024) throw new Error('ZIP 解压后总大小不能超过 100 MB。');
      if (!path.endsWith('/') && !path.split('/').some(part => part.startsWith('.')) && !path.startsWith('__MACOSX/')) entries.push({ path, flags, method, compressed, size, dataOffset });
      offset = next;
    }
    if (!entries.length) throw new Error('ZIP 中没有可用文件。');
    return entries;
  }

  async uploadDeliveryList(file) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.listLoading || !file) return;
    const id = editor.id;
    if (!/\.zip$/i.test(file.name) || !file.size || file.size > 20 * 1024 * 1024) { this.patchDeliveryEditor({ listError: '请选择不超过 20 MB 的 ZIP 文件。' }); return; }
    this.patchDeliveryEditor({ listLoading: true, listError: '' });
    try {
      const directory = this.zipDirectory(await file.arrayBuffer());
      const entries = this.resolveSheetLines(directory.map(entry => entry.path), editor.entries);
      this.patchDeliveryEditor({ entries, listText: entries.map(entry => entry.source).join('\n'), listChanged: true, archive: { name: file.name, size: file.size, file }, listLoading: false, listError: '' }, id);
    } catch (error) { this.patchDeliveryEditor({ listLoading: false, listError: error.message || 'ZIP 读取失败。' }, id); }
  }

  async uploadDeliveryLogo(file) {
    const editor = this.state.deliveryEditor;
    if (!editor || !file) return;
    const id = editor.id, request = this._deliveryLogoRequest = (this._deliveryLogoRequest || 0) + 1;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) { this.patchDeliveryEditor({ logoError: 'Logo 支持 PNG、JPG、WebP，且不超过 2 MB。', logoLoading: false }); return; }
    this.patchDeliveryEditor({ logoLoading: true, logoError: '' });
    try {
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('读取失败')); reader.onabort = () => reject(new Error('读取取消')); reader.readAsDataURL(file);
      });
      await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => image.naturalWidth && image.naturalWidth <= 8192 && image.naturalHeight <= 8192 ? resolve() : reject(new Error('图片尺寸无效')); image.onerror = () => reject(new Error('图片无效')); image.src = url; });
      if (request === this._deliveryLogoRequest) this.patchDeliveryEditor({ logo: { name: file.name, url }, logoLoading: false }, id);
    } catch (_) { if (request === this._deliveryLogoRequest) this.patchDeliveryEditor({ logoLoading: false, logoError: '无法读取 Logo，请选择有效图片。' }, id); }
  }

  skillCommand(value) {
    return String(value || '').replace(/^\/+/, '').trim().replace(/\s+/g, ' ');
  }

  validSkillCommand(value) {
    return value.length > 0 && value.length <= 60 && /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(value);
  }

  parseUploadedSkill(text, filename, sourceFile, allowRename = false) {
    if (!text.trim() || text.includes('\0') || new TextEncoder().encode(text).length > 512 * 1024) throw new Error('Skill 须为非空文本，且不超过 512 KB。');
    const front = text.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
    const field = key => (front.match(new RegExp('^' + key + ':\\s*(.+)$', 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '');
    const base = filename.split('/').pop().replace(/\.(md|markdown)$/i, '');
    const fallback = /^skill$/i.test(base) ? filename.split('/').slice(-2, -1)[0] || 'review-skill' : base;
    const command = this.skillCommand(field('name') || fallback);
    if (!allowRename && !this.validSkillCommand(command)) throw new Error('Skill 名称只支持中英文、数字、空格、短横线和下划线。');
    return { id: 'skill-' + Date.now() + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1), command, name: field('name') || fallback, description: field('description').slice(0, 300), content: text, filename, sourceFile, size: new TextEncoder().encode(text).length };
  }

  async zipSkillText(buffer, entry) {
    if (!entry.size || entry.size > 512 * 1024) throw new Error('单个 Skill 文档不能超过 512 KB。');
    let bytes = new Uint8Array(buffer, entry.dataOffset, entry.compressed);
    if (entry.method === 8) {
      let stream;
      try { stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); }
      catch (_) { throw new Error('此浏览器无法解压 Skill，请直接上传解压后的 .md 文件。'); }
      const reader = stream.getReader(), chunks = []; let total = 0;
      while (true) {
        const part = await reader.read(); if (part.done) break;
        total += part.value.length;
        if (total > 512 * 1024 || total > entry.size) { await reader.cancel(); throw new Error('Skill 解压大小超过限制。'); }
        chunks.push(part.value);
      }
      bytes = new Uint8Array(total); let position = 0; chunks.forEach(chunk => { bytes.set(chunk, position); position += chunk.length; });
    } else if (entry.method !== 0) throw new Error('Skill ZIP 仅支持常规存储或 Deflate 压缩。');
    if (bytes.length !== entry.size) throw new Error('Skill 文档大小校验失败。');
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  async uploadDeliverySkills(files) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.skillLoading) return;
    const id = editor.id, errors = [], additions = [], commands = new Set(editor.skills.map(skill => this.skillCommand(skill.command).toLowerCase()));
    this.patchDeliveryEditor({ skillLoading: true, skillError: '', skillNotice: '' });
    const accept = skill => {
      if (editor.skills.length + additions.length >= 12) throw new Error('最多绑定 12 个 Skill。');
      if (commands.has(skill.command.toLowerCase())) throw new Error('调用名 /' + skill.command + ' 重复，请重命名后上传。');
      commands.add(skill.command.toLowerCase()); additions.push(skill);
    };
    for (const file of Array.from(files || []).slice(0, 13)) {
      try {
        if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('文件为空或超过 20 MB。');
        if (/\.(md|markdown)$/i.test(file.name)) {
          if (file.size > 512 * 1024) throw new Error('单个 Skill 文档不能超过 512 KB。');
          accept(this.parseUploadedSkill(await file.text(), file.name, file.name));
        } else if (/\.zip$/i.test(file.name)) {
          const buffer = await file.arrayBuffer(), directory = this.zipDirectory(buffer);
          const skills = directory.filter(entry => /(^|\/)SKILL\.md$/i.test(entry.path));
          if (!skills.length) throw new Error('Skill ZIP 中需要包含 SKILL.md。');
          for (const entry of skills) {
            if (editor.skills.length + additions.length >= 12) { errors.push('最多绑定 12 个 Skill，其余未导入。'); break; }
            try { accept(this.parseUploadedSkill(await this.zipSkillText(buffer, entry), entry.path, file.name)); }
            catch (error) { errors.push(entry.path + '：' + error.message); }
          }
        } else throw new Error('请选择 .md 或包含 SKILL.md 的 ZIP 文件。');
      } catch (error) { errors.push(file.name + '：' + (error.message || '读取失败')); }
    }
    const current = this.state.deliveryEditor;
    if (current?.id === id) this.patchDeliveryEditor({ skills: current.skills.concat(additions), skillLoading: false, skillError: errors.join(' ') }, id);
  }

  tagForeground(hex) {
    const rgb = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    return (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#000000' : '#ffffff';
  }

  addDeliveryTag() {
    const editor = this.state.deliveryEditor, name = editor?.tagName.trim();
    if (!editor || !name || name.length > 30 || !/^#[0-9a-f]{6}$/i.test(editor.tagColor) || editor.tags.length >= 20 || editor.tags.some(tag => tag.name.toLowerCase() === name.toLowerCase())) return;
    const tag = { id: 'tag-' + Date.now() + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1), name, color: editor.tagColor };
    this.patchDeliveryEditor({ tags: editor.tags.concat(tag), tagName: '' });
  }

  deliveryEditorIssue() {
    const editor = this.state.deliveryEditor;
    if (!editor) return '';
    if (!editor.name.trim() || !editor.customer.trim()) return '请填写数据单名称和客户名。';
    if (!/^\d+$/.test(editor.target) || Number(editor.target) < 1 || Number(editor.target) > 100000) return '目标数量须为 1–100000 的整数。';
    if (editor.logoLoading || editor.listLoading || editor.skillLoading) return '文件正在读取，请稍候。';
    if (editor.listError) return editor.listError;
    const memberIssue = this.deliveryMembersIssue();
    if (memberIssue) return memberIssue;
    if (editor.skills.length > 12) return '最多绑定 12 个 Skill。';
    const commands = new Set();
    for (const skill of editor.skills) {
      const command = this.skillCommand(skill.command);
      if (!this.validSkillCommand(command)) return '请为每个 Skill 填写有效的调用名。';
      if (commands.has(command.toLowerCase())) return '同一数据单中的 Skill 调用名不能重复。';
      commands.add(command.toLowerCase());
    }
    return '';
  }

  saveDeliveryEditor() {
    const editor = this.state.deliveryEditor;
    if (!editor) return;
    const issue = this.deliveryEditorIssue();
    if (issue) { this.patchDeliveryEditor({ error: issue }); return; }
    const previous = editor.key ? this.deliverySheet(editor.key) : null;
    const key = editor.key || 'sheet-' + Date.now() + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1);
    const now = new Date(), date = now.toISOString().slice(0, 10);
    const sheet = Object.assign({}, previous || {}, {
      key, name: editor.name.trim(), customer: editor.customer.trim(), desc: editor.desc.trim(), target: Number(editor.target),
      createdBy: previous?.createdBy || (!previous ? (this.props.currentUser || '一万') : ''),
      logo: editor.logo, archive: editor.archive, tags: editor.tags.map(tag => Object.assign({}, tag)), skills: editor.skills.map(skill => Object.assign({}, skill, { command: this.skillCommand(skill.command) })),
      entryTags: Object.fromEntries(editor.entries.filter(entry => entry.itemId).map(entry => [entry.itemId, entry.tagId])),
      cat: previous?.cat || '自定义', created: previous?.created || date.replaceAll('-', '/') + ' 创建 · ' + (this.props.currentUser || '一万'), at: previous?.at || Number(date.replaceAll('-', ''))
    });
    if (!previous || this.deliveryMemberSignature(editor.members) !== editor.memberBaseline) sheet.members = editor.members.map(member => Object.assign({}, member));
    if (editor.listChanged || !previous || Array.isArray(previous.entries)) sheet.entries = editor.entries.map(entry => Object.assign({}, entry));
    const custom = (this.state.deliverySheets || []).slice();
    const index = custom.findIndex(value => value.key === key);
    if (!previous) custom.push(sheet); else if (index >= 0) custom[index] = sheet;
    this.closeDeliveryEditor();
    this.setState({ deliverySheets: custom, deliveryOverrides: previous && index < 0 ? Object.assign({}, this.state.deliveryOverrides, { [key]: sheet }) : this.state.deliveryOverrides,
      view: 'sheet', sheetKey: key, sheetRow: null, sheetQuery: '', sheetFilter: 'all', sheetTagFilter: '',
      reviewToast: previous ? '数据单已更新 · 本地演示' : '数据单已创建 · 本地演示', reviewToastAt: Date.now() });
  }

  deliveryEditorValues() {
    const editor = this.state.deliveryEditor;
    if (!editor) return { open: false, tabs: [], tags: [], skills: [], entries: [], palette: [], disabled: true };
    const patch = value => this.patchDeliveryEditor(value), issue = this.deliveryEditorIssue();
    const colors = ['#64748b', '#c44318', '#b45309', '#3e744a', '#0e7490', '#3753a0', '#7550a6', '#a43b6a'];
    const tagDuplicate = editor.tags.some(tag => tag.name.toLowerCase() === editor.tagName.trim().toLowerCase());
    const commandIssue = skill => {
      const command = this.skillCommand(skill.command);
      if (!this.validSkillCommand(command)) return '调用名需为 1–60 字，可用中英文、数字、空格、短横线或下划线。';
      if (editor.skills.some(other => other.id !== skill.id && this.skillCommand(other.command).toLowerCase() === command.toLowerCase())) return '调用名重复，请为此 Skill 设置不同的名称。';
      return '';
    };
    return Object.assign({}, editor, {
      open: true, title: editor.key ? '编辑数据单' : '创建数据单', saveLabel: editor.key ? '保存更改' : '创建数据单',
      basic: editor.tab === 'basic', list: editor.tab === 'list', skillTab: editor.tab === 'skills',
      membership: this.deliveryMembersValues(),
      tabs: [['basic', '基础信息'], ['list', 'List 与 Tag'], ['skills', '审核 Skill']].map(([key, label]) => ({ key, label, selected: editor.tab === key, pick: () => patch({ tab: key, error: '' }) })),
      onName: event => patch({ name: event.target.value, error: '' }), onCustomer: event => patch({ customer: event.target.value, error: '' }),
      onDesc: event => patch({ desc: event.target.value }), onTarget: event => patch({ target: event.target.value, error: '' }),
      logoUrl: editor.logo?.url || '', hasLogo: !!editor.logo, noLogo: !editor.logo,
      uploadLogo: event => { const file = event.target.files?.[0]; event.target.value = ''; this.uploadDeliveryLogo(file); },
      removeLogo: () => { this._deliveryLogoRequest = (this._deliveryLogoRequest || 0) + 1; patch({ logo: null, logoLoading: false, logoError: '' }); },
      hasArchive: !!editor.archive, archiveName: editor.archive?.name || '',
      uploadList: event => { const file = event.target.files?.[0]; event.target.value = ''; this.uploadDeliveryList(file); },
      removeArchive: () => patch({ archive: null }), onList: event => this.setDeliveryList(event.target.value),
      entryCount: editor.entries.length, entrySummary: editor.entries.length + ' 项 · ' + editor.entries.filter(entry => !!entry.itemId).length + ' 项已匹配 Item',
      hasEntries: editor.entries.length > 0,
      entries: editor.entries.map(entry => Object.assign({}, entry, { status: entry.itemId ? '已关联 Item' : '未关联', tags: editor.tags,
        tagLabel: '设置 ' + entry.name + ' 的 Tag', onTag: event => patch({ entries: this.state.deliveryEditor.entries.map(value => value.key === entry.key ? Object.assign({}, value, { tagId: event.target.value }) : value) }) })),
      tags: editor.tags.map(tag => Object.assign({}, tag, { fg: this.tagForeground(tag.color), removeLabel: '移除 Tag ' + tag.name,
        remove: () => patch({ tags: this.state.deliveryEditor.tags.filter(value => value.id !== tag.id), entries: this.state.deliveryEditor.entries.map(entry => entry.tagId === tag.id ? Object.assign({}, entry, { tagId: '' }) : entry) }) })),
      onTagName: event => patch({ tagName: event.target.value }), onTagColor: event => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) patch({ tagColor: event.target.value }); },
      palette: colors.map(color => ({ color, label: 'Tag 颜色 ' + color, selected: color === editor.tagColor, pick: () => patch({ tagColor: color }) })),
      tagDisabled: !editor.tagName.trim() || tagDuplicate || editor.tags.length >= 20, tagHint: tagDuplicate ? '已有同名 Tag。' : 'Tag 用于清单筛选，不改变审核结论。', addTag: () => this.addDeliveryTag(),
      uploadSkills: event => { const files = Array.from(event.target.files || []); event.target.value = ''; this.uploadDeliverySkills(files); },
      library: editor.tab === 'skills' ? this.deliverySkillLibraryValues() : { rows: [] },
      skillsFull: editor.skills.length >= 12 || editor.skillLoading, skillCount: editor.skills.length, noSkills: !editor.skills.length,
      skills: editor.skills.map(skill => Object.assign({}, skill, { meta: [skill.sourceLabel || '上传文件', skill.version ? 'v' + skill.version : '', skill.sourceFile || skill.filename || 'SKILL.md', Math.ceil((skill.size || new TextEncoder().encode(skill.content || '').length) / 1024) + ' KB'].filter(Boolean).join(' · '), commandLabel: skill.name + ' 的调用名', removeLabel: '移除 Skill ' + skill.name,
        commandIssue: commandIssue(skill), commandInvalid: !!commandIssue(skill), commandErrorId: commandIssue(skill) ? 'forge-skill-error-' + skill.id : '',
        onCommand: event => { if (!this.state.deliveryEditor?.skillLoading) patch({ skills: this.state.deliveryEditor.skills.map(value => value.id === skill.id ? Object.assign({}, value, { command: event.target.value.replace(/^\/+/, '') }) : value) }); },
        remove: () => this.removeDeliverySkill(skill.id) })),
      issue, disabled: !!issue, cancel: event => this.closeDeliveryEditor(event), save: () => this.saveDeliveryEditor(),
      backdrop: event => { if (event.target === event.currentTarget) this.closeDeliveryEditor(event); }
    });
  }

  deliverySheetExtras(sheet) {
    const entries = this.deliveryEntries(sheet), tags = sheet.tags || [], filter = this.state.sheetTagFilter || '';
    const shown = filter ? entries.filter(entry => entry.tagId === filter) : entries;
    return {
      hasLogo: !!sheet.logo, logo: sheet.logo?.url || '', logoAlt: sheet.customer + ' 品牌 Logo',
      visible: !!(sheet.entries || tags.length || sheet.skills?.length || sheet.archive || this.state.deliveryNewItems?.[sheet.key]?.length),
      count: entries.length, shownCount: shown.length, hasEntries: !!entries.length, emptyEntries: !entries.length,
      tags: tags.map(tag => Object.assign({}, tag, { fg: this.tagForeground(tag.color) })), filter, hasTags: !!tags.length,
      onFilter: event => this.setState({ sheetTagFilter: event.target.value }),
      entries: shown.map(entry => { const tag = tags.find(value => value.id === entry.tagId), link = this.state.deliveryLinks?.[sheet.key]?.[this.deliveryEntryId(entry)], resolved = link ? this.deliveryLinkState(sheet, entry) : null; return Object.assign({}, entry, { linked: !!entry.itemId || !!link, status: resolved ? (resolved.current ? '已关联最终版本' : resolved.candidate?.rejected ? '已关联候选 · 要求返工' : '已关联候选 · 待审核') : entry.itemId ? '已关联 Item' : '未关联', hasTag: !!tag, tagName: tag?.name || '', tagColor: tag?.color || '#64748b', tagFg: tag ? this.tagForeground(tag.color) : '#ffffff' }); }),
      hasArchive: !!sheet.archive, archiveName: sheet.archive?.name || '',
      downloadArchive: () => { if (typeof document === 'undefined' || !sheet.archive?.file) return; const url = URL.createObjectURL(sheet.archive.file), link = document.createElement('a'); link.href = url; link.download = sheet.archive.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); },
      skillCount: (sheet.skills || []).length, hasSkills: !!sheet.skills?.length,
      skills: (sheet.skills || []).map(skill => ({ command: '/' + skill.command, name: skill.name, description: skill.description })),
      edit: () => this.openDeliveryEditor(sheet.key)
    };
  }

  boundReviewSkills(context) {
    return this.deliveryData().flatMap(group => group.sheets).filter(sheet => (!context.sheetKey || sheet.key === context.sheetKey) && (this.sheetRows(sheet).some(row => row[2] === context.itemId) || Object.values(this.state.deliveryLinks?.[sheet.key] || {}).some(link => [link.current, link.candidate].filter(Boolean).some(version => version.source.itemId === context.itemId && version.source.runId === context.runId))))
      .flatMap(sheet => (sheet.skills || []).map(skill => Object.assign({}, skill, { bindingId: sheet.key + ':' + skill.id, sheetKey: sheet.key, sheetName: sheet.name })));
  }

  patchSkillSession(key, patch) {
    const sessions = this.state.skillSessions || {};
    this.setState({ skillSessions: Object.assign({}, sessions, { [key]: Object.assign({ text: '', selectedId: '', history: [], error: '' }, sessions[key], patch) }) });
  }

  reviewSkillSessionKey(context) {
    return (context.sheetKey || 'review') + ':' + context.runId + ':' + context.itemId;
  }

  invokeReviewSkill(context) {
    const key = this.reviewSkillSessionKey(context), session = this.state.skillSessions?.[key] || {}, text = String(session.text || '').trim();
    const skills = this.boundReviewSkills(context);
    const matches = skills.filter(skill => text.toLowerCase() === ('/' + skill.command).toLowerCase() || text.toLowerCase().startsWith(('/' + skill.command + ' ').toLowerCase())).sort((a, b) => b.command.length - a.command.length);
    const selected = matches.find(skill => skill.bindingId === session.selectedId) || (matches.length && (matches.length === 1 || matches[0].command.length > matches[1].command.length) ? matches[0] : null);
    if (!selected) { this.patchSkillSession(key, { error: matches.length > 1 ? '存在同名 Skill，请点击下方对应数据单的 Skill 后再调用。' : '请输入已绑定的 /Skill 调用名，或从下方选择。' }); return; }
    const entry = { id: 'invoke-' + Date.now() + '-' + (this._deliverySequence = (this._deliverySequence || 0) + 1), command: text, skillName: selected.name,
      sheetName: selected.sheetName, itemId: context.itemId, itemName: context.itemName, runId: context.runId, content: selected.content,
      args: text.slice(selected.command.length + 1).trim(), at: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), demo: true };
    this.patchSkillSession(key, { text: '', selectedId: '', error: '', history: (session.history || []).concat(entry).slice(-20) });
  }

  reviewSkillValues(context) {
    const key = this.reviewSkillSessionKey(context), session = this.state.skillSessions?.[key] || { text: '', selectedId: '', history: [], error: '' };
    const bound = this.boundReviewSkills(context), query = session.text.replace(/^\//, '').trim().toLowerCase();
    const choices = bound.filter(skill => !query || skill.command.toLowerCase().includes(query) || session.selectedId === skill.bindingId);
    const controlId = 'skill-command-' + (context.scope || 'review') + '-' + context.itemId.replace(/[^\w-]/g, '');
    return {
      available: !!bound.length, empty: !bound.length, count: bound.length, text: session.text, error: session.error, inputId: controlId,
      context: context.itemName + ' · ' + context.runId, disabled: !bound.length || !session.text.trim(),
      onText: event => this.patchSkillSession(key, { text: event.target.value, error: '' }),
      onKey: event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); this.invokeReviewSkill(context); } },
      invoke: () => this.invokeReviewSkill(context),
      skills: choices.map(skill => ({ command: '/' + skill.command, name: skill.name, source: skill.sheetName, selected: session.selectedId === skill.bindingId,
        pick: () => { this.patchSkillSession(key, { text: '/' + skill.command + ' ', selectedId: skill.bindingId, error: '' }); setTimeout(() => { if (typeof document !== 'undefined') document.getElementById(controlId)?.focus({ preventScroll: true }); }, 0); } })),
      history: (session.history || []).map(entry => Object.assign({}, entry, { context: entry.sheetName + ' · ' + entry.itemName + ' · ' + entry.runId, argsLabel: entry.args || '未附加参数' })),
      hasHistory: !!session.history?.length
    };
  }
  // delivery-workflows:end
