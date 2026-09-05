  // delivery-drafts:start
  async deliveryDraftStorage(action, record = {}) {
    if (typeof indexedDB === 'undefined') throw new Error('当前浏览器不支持草稿存储，请保持页面打开或换用支持本地存储的浏览器。');
    const owner = record.owner || this.profileIdentity().accountName;
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('forge-delivery-drafts', 1);
      let abandoned = false;
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('drafts', { keyPath: ['owner', 'id'] });
        store.createIndex('owner', 'owner');
      };
      request.onsuccess = () => {
        if (abandoned) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => { abandoned = true; reject(new Error('草稿存储被其他页面占用，请关闭旧页面后重试。')); };
    });
    return new Promise((resolve, reject) => {
      let result, failure;
      const tx = db.transaction('drafts', ['put', 'delete'].includes(action) ? 'readwrite' : 'readonly');
      const store = tx.objectStore('drafts');
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(failure || tx.error || new Error('草稿保存失败，请重试。')); };
      if (action === 'list') {
        store.index('owner').getAll(owner).onsuccess = event => { result = event.target.result; };
        return;
      }
      store.get([owner, record.id]).onsuccess = event => {
        const previous = event.target.result;
        if (action === 'get') { result = previous; return; }
        if ((previous?.revision || 0) !== (record.revision || 0)) {
          failure = Object.assign(new Error('草稿已在其他页面更新或删除。可另存为新草稿，避免覆盖其他修改。'), { code: 'draft-conflict' });
          tx.abort(); return;
        }
        if (action === 'delete') { store.delete([owner, record.id]); return; }
        if (action !== 'put') { failure = new Error('无效的草稿操作。'); tx.abort(); return; }
        result = { schema: 1, owner, id: record.id, revision: (record.revision || 0) + 1, savedAt: Date.now(), data: record.data };
        store.put(result);
      };
    });
  }

  deliveryDraftPayload(editor) {
    // IndexedDB structured cloning preserves the original ZIP Blob/File, unlike JSON storage.
    const fields = ['name', 'customer', 'target', 'desc', 'logo', 'archive', 'entries', 'listText', 'listChanged', 'tags', 'skills', 'members',
      'tagName', 'tagColor', 'tagComposerOpen', 'tagManagerMode', 'skillDraft', 'skillUploads', 'skillMode', 'listError', 'logoError', 'skillError'];
    return structuredClone(Object.fromEntries(fields.map(key => [key, editor[key]])));
  }

  deliveryDraftRecordValid(record, owner) {
    const d = record?.data;
    return record?.schema === 1 && record.owner === owner && typeof record.id === 'string' && Number.isInteger(record.revision) && record.revision > 0 && Number.isFinite(record.savedAt) && d &&
      ['name', 'customer', 'target', 'desc', 'listText', 'tagName', 'tagColor'].every(key => typeof d[key] === 'string') &&
      ['entries', 'tags', 'skills', 'members', 'skillUploads'].every(key => Array.isArray(d[key]) && d[key].every(value => value && typeof value === 'object')) &&
      d.entries.length <= 500 && d.tags.length <= 20 && d.skills.length <= 12 && d.skillUploads.length <= 12 &&
      d.entries.every(e => ['key', 'source', 'name'].every(k => typeof e[k] === 'string')) &&
      d.tags.every(t => typeof t.name === 'string' && /^#[0-9a-f]{6}$/i.test(t.color)) &&
      d.members.every(m => typeof m.accountName === 'string' && typeof m.name === 'string' && typeof m.role === 'string') &&
      d.skills.concat(d.skillUploads).every(s => ['name', 'command', 'content'].every(k => typeof s[k] === 'string')) &&
      d.skillDraft && typeof d.skillDraft === 'object' &&
      (!d.logo || (typeof d.logo.name === 'string' && typeof d.logo.url === 'string' && /^(data:image\/(png|jpeg|webp);base64,|\/supplier-logos\/)/.test(d.logo.url))) &&
      (!d.archive || (typeof d.archive.name === 'string' && d.archive.file instanceof Blob && d.archive.file.size <= 20 * 1024 * 1024));
  }

  deliveryDraftError(error) {
    if (error?.name === 'QuotaExceededError') return '浏览器存储空间不足，草稿未保存。请清理不需要的草稿或移除大附件后重试；当前内容仍保留。';
    if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') return '浏览器限制了本地存储，草稿未保存。请允许网站存储后重试；当前内容仍保留。';
    return error?.message || '草稿保存失败，请重试；当前内容仍保留。';
  }

  async loadDeliveryDrafts() {
    const owner = this.profileIdentity().accountName, request = this._deliveryDraftRead = (this._deliveryDraftRead || 0) + 1;
    this.setState({ deliveryDraftsLoading: true, deliveryDraftsError: '', deliveryDraftOwner: owner });
    try {
      const records = await this.deliveryDraftStorage('list', { owner });
      if (this._deliveryDraftUnmounted || request !== this._deliveryDraftRead || owner !== this.profileIdentity().accountName) return;
      this.setState({ deliveryDrafts: records, deliveryDraftsLoading: false,
        deliveryDraftsExpanded: this.state.deliveryDraftsExpanded === undefined ? !!records.length : this.state.deliveryDraftsExpanded });
    } catch (error) {
      if (!this._deliveryDraftUnmounted && request === this._deliveryDraftRead && owner === this.profileIdentity().accountName)
        this.setState({ deliveryDraftsLoading: false, deliveryDraftsError: this.deliveryDraftError(error) });
    }
  }

  deliveryDraftSavedAt(time) {
    if (!Number.isFinite(time)) return '未知时间';
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(time));
  }

  cacheDeliveryDraft(record, remove = false) {
    this._deliveryDraftRead = (this._deliveryDraftRead || 0) + 1;
    const rows = (this.state.deliveryDrafts || []).filter(row => row.owner !== record.owner || row.id !== record.id);
    if (!remove) rows.push(record);
    this.setState({ deliveryDrafts: rows, deliveryDraftsLoading: false, deliveryDraftsError: '', deliveryDraftsNotice: '', deliveryDraftsExpanded: true });
  }

  async saveDeliveryDraft({ leave = false, asNew = false } = {}) {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.key || editor.draftSaving || !this.deliverySkillActorMatches(editor)) return false;
    if (editor.logoLoading || editor.listLoading || editor.skillLoading) {
      this.patchDeliveryEditor({ draftError: '文件正在读取，请等待完成后保存草稿。' }, editor.id); return false;
    }
    const owner = editor.memberActor, signature = this.deliveryDraftSignature(editor);
    const id = !asNew && editor.savedDraftId || 'draft-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
    const revision = asNew ? 0 : editor.draftRevision || 0;
    const destination = leave ? this.state.deliveryLeave : null;
    this.patchDeliveryEditor({ draftSaving: true, draftError: '', draftConflict: false }, editor.id);
    try {
      const record = await this.deliveryDraftStorage('put', { id, owner, revision, data: this.deliveryDraftPayload(editor) });
      if (this._deliveryDraftUnmounted || owner !== this.profileIdentity().accountName) return false;
      this.cacheDeliveryDraft(record);
      if (this.state.deliveryEditor?.id !== editor.id) return false;
      this.patchDeliveryEditor({ savedDraftId: id, draftRevision: record.revision, draftSavedAt: record.savedAt, draftBaseline: signature, draftSaving: false }, editor.id);
      if (destination && this.state.deliveryLeave === destination && !this.deliveryDraftDirty()) this.discardDeliveryDraft(editor.id);
      return true;
    } catch (error) {
      if (!this._deliveryDraftUnmounted && this.state.deliveryEditor?.id === editor.id)
        this.patchDeliveryEditor({ draftSaving: false, draftError: this.deliveryDraftError(error), draftConflict: error?.code === 'draft-conflict' }, editor.id);
      return false;
    } finally {
      if (!this._deliveryDraftUnmounted && this.state.deliveryEditor?.id === editor.id && this.state.deliveryEditor.draftSaving)
        this.patchDeliveryEditor({ draftSaving: false }, editor.id);
    }
  }

  async resumeDeliveryDraft(id, owner) {
    if (owner !== this.profileIdentity().accountName || this.state.deliveryEditor || this.state.deliveryDraftBusy) return;
    const view = this.state.view;
    this.setState({ deliveryDraftBusy: id, deliveryDraftsError: '' });
    try {
      const record = await this.deliveryDraftStorage('get', { id, owner });
      if (this._deliveryDraftUnmounted || owner !== this.profileIdentity().accountName || this.state.deliveryEditor || this.state.view !== view) return;
      if (!this.deliveryDraftRecordValid(record, owner)) throw new Error('此草稿已被删除或内容无法读取。请刷新草稿列表；原记录不会被覆盖。');
      this.openDeliveryEditor();
      const editor = Object.assign({}, this.state.deliveryEditor, this.deliveryDraftPayload(record.data), {
        savedDraftId: id, draftRevision: record.revision, draftSavedAt: record.savedAt, draftSaving: false, draftError: '', draftConflict: false,
        memberActor: owner, memberBaseline: this.deliveryMemberSignature(record.data.members)
      });
      editor.draftBaseline = this.deliveryDraftSignature(editor);
      this.setState({ deliveryEditor: editor });
    } catch (error) {
      if (!this._deliveryDraftUnmounted && owner === this.profileIdentity().accountName) this.setState({ deliveryDraftsError: this.deliveryDraftError(error) });
    } finally {
      if (!this._deliveryDraftUnmounted) this.setState({ deliveryDraftBusy: '' });
    }
  }

  async deleteDeliverySavedDraft(record) {
    if (record.owner !== this.profileIdentity().accountName || this.state.deliveryDraftDelete !== record.id || this.state.deliveryDraftBusy) return;
    this.setState({ deliveryDraftBusy: record.id, deliveryDraftsError: '' });
    try {
      await this.deliveryDraftStorage('delete', record);
      if (this._deliveryDraftUnmounted || record.owner !== this.profileIdentity().accountName) return;
      this.cacheDeliveryDraft(record, true);
      this.setState({ deliveryDraftDelete: '', deliveryDraftsNotice: '草稿已删除，无法恢复。' });
    } catch (error) {
      if (!this._deliveryDraftUnmounted && record.owner === this.profileIdentity().accountName) this.setState({ deliveryDraftsError: this.deliveryDraftError(error) });
    } finally {
      if (!this._deliveryDraftUnmounted) this.setState({ deliveryDraftBusy: '' });
    }
  }

  async clearCommittedDeliveryDraft(editor) {
    if (!editor.savedDraftId) return;
    const record = { id: editor.savedDraftId, owner: editor.memberActor, revision: editor.draftRevision };
    try {
      await this.deliveryDraftStorage('delete', record);
      if (!this._deliveryDraftUnmounted && record.owner === this.profileIdentity().accountName) this.cacheDeliveryDraft(record, true);
    } catch (_) {
      if (!this._deliveryDraftUnmounted && record.owner === this.profileIdentity().accountName)
        this.setState({ deliveryDraftsError: '数据单已创建，但原草稿未能移除。请确认后在草稿列表手动删除，避免重复创建。' });
    }
  }

  deliveryDraftControls() {
    const editor = this.state.deliveryEditor;
    if (!editor || editor.key) return { show: false };
    const dirty = this.deliveryDraftDirty(editor), busy = !!editor.draftSaving;
    return { show: true, busy, disabled: busy || editor.logoLoading || editor.listLoading || editor.skillLoading || !this.deliverySkillActorMatches(editor),
      label: busy ? '保存中…' : '保存草稿', error: editor.draftError || '', conflict: !!editor.draftConflict,
      status: busy ? '正在保存草稿…' : editor.draftSavedAt ? (dirty ? '有未保存的修改 · 上次保存 ' : '草稿已保存 · ') + this.deliveryDraftSavedAt(editor.draftSavedAt) : '尚未保存草稿',
      save: () => { if (this.state.deliveryEditor?.id === editor.id) return this.saveDeliveryDraft(); },
      saveCopy: () => { if (this.state.deliveryEditor?.id === editor.id) return this.saveDeliveryDraft({ asNew: true }); } };
  }

  deliveryDraftListValues() {
    const owner = this.profileIdentity().accountName;
    const rows = (this.state.deliveryDrafts || []).filter(row => row && row.owner === owner && typeof row.id === 'string').sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const busy = !!this.state.deliveryDraftBusy, loading = !!this.state.deliveryDraftsLoading;
    return { expanded: !!this.state.deliveryDraftsExpanded, loading, count: rows.length, empty: !loading && !rows.length,
      error: this.state.deliveryDraftsError || '', notice: this.state.deliveryDraftsNotice || '',
      toggle: () => { this.setState({ deliveryDraftsExpanded: !this.state.deliveryDraftsExpanded }); if (this.state.deliveryDraftsExpanded) this.loadDeliveryDrafts(); },
      reload: () => this.loadDeliveryDrafts(),
      rows: rows.map(row => ({ id: row.id, name: String(row.data?.name || '').trim() || '未命名数据单',
        meta: (String(row.data?.customer || '').trim() || '未填写客户') + ' · ' + (row.data?.entries?.length || 0) + ' 项清单 · ' + this.deliveryDraftSavedAt(row.savedAt) + ' 保存',
        disabled: busy, resumeLabel: '继续编辑 ' + (String(row.data?.name || '').trim() || '未命名数据单'),
        resume: () => this.resumeDeliveryDraft(row.id, owner), confirming: this.state.deliveryDraftDelete === row.id,
        askDelete: () => { if (!busy && owner === this.profileIdentity().accountName) this.setState({ deliveryDraftDelete: row.id, deliveryDraftsNotice: '' }); },
        cancelDelete: () => { if (!busy) this.setState({ deliveryDraftDelete: '' }); },
        delete: () => this.deleteDeliverySavedDraft(row) })) };
  }
  // delivery-drafts:end
