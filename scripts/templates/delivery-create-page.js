  // delivery-create-page:start
  setState(patch) {
    // All in-app destinations, including sidebar and notification links, share
    // this guard. Normal form updates and the explicit commit bypass it.
    const editor = this.state?.deliveryEditor;
    if (editor && !editor.key && patch && patch.view && patch.view !== this.state.view && patch.deliveryEditor !== null) {
      this.requestDeliveryLeave(patch);
      return;
    }
    return super.setState(patch);
  }

  deliveryDraftSignature(editor) {
    if (!editor) return '';
    return JSON.stringify({
      name: editor.name, customer: editor.customer, target: editor.target, deliveryDate: editor.deliveryDate, desc: editor.desc,
      logo: editor.logo, archive: editor.archive && [editor.archive.name, editor.archive.size],
      listText: editor.listText, entries: editor.entries, tags: editor.tags,
      tagName: editor.tagName, tagColor: editor.tagColor,
      members: this.deliveryMemberSignature(editor.members), skills: editor.skills, defaultTagId: editor.defaultTagId || '',
      datasetReviews: editor.datasetReviews || {},
      skillDraft: ['name', 'command', 'description', 'content'].map(key => editor.skillDraft?.[key] || ''), skillUploads: editor.skillUploads
    });
  }

  deliveryDraftDirty(editor = this.state.deliveryEditor) {
    return !!editor && (!!editor.draftSaving || !!editor.logoLoading || !!editor.listLoading || !!editor.skillLoading ||
      this.deliveryDraftSignature(editor) !== editor.draftBaseline);
  }

  mountDeliveryDraftGuard() {
    if (this._deliveryBeforeUnload || typeof window === 'undefined') return;
    this._deliveryBeforeUnload = event => {
      const editor = this.state.deliveryEditor;
      if (!editor || editor.key || !this.deliveryDraftDirty(editor)) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener?.('beforeunload', this._deliveryBeforeUnload);
  }

  unmountDeliveryDraftGuard() {
    if (typeof window !== 'undefined') window.removeEventListener?.('beforeunload', this._deliveryBeforeUnload);
    this._deliveryBeforeUnload = null;
  }

  requestDeliveryLeave(next = { view: 'delivery', sheetRow: null }, event) {
    event?.preventDefault(); event?.stopPropagation();
    const editor = this.state.deliveryEditor;
    if (!editor || editor.key) { this.closeDeliveryEditor(); return; }
    if (editor.draftSaving) return;
    // Creation is transient: once its draft is closed, Review Back must return
    // to the delivery list, never to a creation view with no editor mounted.
    if (next.reviewReturn?.view === 'delivery-create') next = Object.assign({}, next, {
      reviewReturn: Object.assign({}, next.reviewReturn, {
        origin: 'delivery', view: 'delivery', activeRun: null, sheetKey: null, sheetRow: null, scrollY: 0
      })
    });
    if (!this.deliveryDraftDirty(editor)) {
      this.closeDeliveryEditor(null, { restoreFocus: next.view === 'delivery' });
      this.setState(next);
      return;
    }
    if (this.state.deliveryLeave) return;
    if (typeof document !== 'undefined') this._deliveryLeaveTrigger = document.activeElement;
    this.closeDeliveryMemberPicker(editor.id);
    this.setState({ deliveryLeave: { editorId: editor.id, next } });
    setTimeout(() => {
      if (typeof document === 'undefined' || this.state.deliveryLeave?.editorId !== editor.id) return;
      const dialog = document.querySelector('.forge-delivery-leave-dialog');
      if (dialog && !dialog.open) dialog.showModal();
    }, 0);
  }

  keepDeliveryDraft(event) {
    event?.preventDefault(); event?.stopPropagation();
    if (typeof document !== 'undefined') document.querySelector('.forge-delivery-leave-dialog')?.close();
    this.setState({ deliveryLeave: null });
    if (this._deliveryLeaveTrigger?.isConnected) this._deliveryLeaveTrigger.focus({ preventScroll: true });
    this._deliveryLeaveTrigger = null;
  }

  discardDeliveryDraft(id) {
    const leave = this.state.deliveryLeave;
    if (!leave || leave.editorId !== id || this.state.deliveryEditor?.id !== id || this.state.deliveryEditor.draftSaving) return;
    this.closeDeliveryEditor(null, { restoreFocus: leave.next.view === 'delivery' });
    this.setState(leave.next);
    const deep = leave.next.deepReview;
    if (leave.next.view === 'review' && deep?.itemId && deep.runId) this.openReviewFocus(deep.runId + ':' + deep.itemId);
  }

  handleDeliveryEditorKey(event) {
    const editor = this.state.deliveryEditor;
    if (!editor) return false;
    // The native Skill popover owns Escape/Tab; do not trigger page shortcuts beneath it.
    if (typeof document !== 'undefined' && document.getElementById('forge-skill-create-menu')?.matches(':popover-open')) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') event.preventDefault();
      return true;
    }
    if (editor.skillDetailKey) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') event.preventDefault();
      return true;
    }
    // Native edit/confirmation dialogs and the member popover own Escape.
    if (this.state.deliveryLeave) return true;
    if (editor.logoPickerOpen && event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      this.patchDeliveryEditor({ logoPickerOpen: false }, editor.id);
      setTimeout(() => { if (typeof document !== 'undefined') document.getElementById('forge-customer-logo-trigger')?.focus({ preventScroll: true }); }, 0);
      return true;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.isComposing) {
      event.preventDefault(); if (editor.key) this.saveDeliveryEditor(); else this.deliveryWizardValues().next();
    } else if (!editor.key && event.key === 'Escape' && !editor.memberSearchOpen) {
      if (this.state.dlOpen || this.state.notifOpen) {
        event.preventDefault(); this.closeSidebarUtility();
      } else if (this.state.sidebarPeek) {
        event.preventDefault(); this._sidebarPeekSuppressed = true; this.endSidebarPeek(true);
        if (typeof document !== 'undefined') document.querySelector('.forge-sidebar-collapse')?.focus({ preventScroll: true });
      } else if (!this.state.sidebarCollapsed && window.matchMedia?.('(max-width:760px)').matches) {
        event.preventDefault(); this.closeSidebar();
      }
    }
    return true;
  }

  deliveryLeaveValues() {
    const leave = this.state.deliveryLeave;
    return { open: !!leave, keep: event => this.keepDeliveryDraft(event), discardDisabled: false,
      description: '离开会丢失本次尚未提交的内容。已经创建成功的 Skill 不受影响。',
      discard: () => this.discardDeliveryDraft(leave?.editorId) };
  }
  // delivery-create-page:end
