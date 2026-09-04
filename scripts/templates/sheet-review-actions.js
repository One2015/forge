            pass: e => {
              e?.stopPropagation();
              const current = this.sheetDetailActionValues(d.key, r[2]);
              if (!current.canReviewCandidate) return;
              this.setState({sheetPassAsk: r[2], sheetPassVersionKey: current.reviewKey});
            },
            cancelPass: e => { e?.stopPropagation(); this.setState({sheetPassAsk: null, sheetPassVersionKey: null}); },
            confirmPass: e => {
              e?.stopPropagation();
              const current = this.sheetDetailActionValues(d.key, r[2]);
              const key = itemState.candidateVersion?.runId + ':' + (itemState.candidateVersion?.source?.itemId || r[2]);
              if (!current.canReviewCandidate || key !== current.reviewKey || this.state.sheetPassVersionKey && this.state.sheetPassVersionKey !== key) return;
              this.setState({sheetPassAsk: null, sheetPassVersionKey: null,
                reviewDecisions: {...this.state.reviewDecisions, [key]: 'pass'},
                reviewToast: '已通过，当前版本已进入可交付状态；上一版记录保留', reviewToastAt: Date.now()});
            },
            rework: e => {
              e?.stopPropagation();
              const current = this.sheetDetailActionValues(d.key, r[2]);
              if (!current.canReviewCandidate) return;
              this.openSheetFeedback(r[2], 'review');
              this.setState({sheetPassAsk: null, sheetPassVersionKey: null, sheetReworkConfirmAsk: null, sheetReworkVersionKey: current.reviewKey});
            },
            reworkConfirm: (() => {
              const ask = st.sheetReworkConfirmAsk;
              const note = String(st.sheetReworkText || '').trim();
              const feedback = this.feedbackView('sheet:' + r[2]);
              const current = this.sheetDetailActionValues(d.key, r[2]);
              const open = !!ask && ask.itemId === r[2] && st.sheetReworkAsk === r[2] && st.sheetReworkMode === 'review';
              return {
                open,
                stop: e => e?.stopPropagation(),
                cancel: e => {
                  e?.stopPropagation();
                  if (this.state.sheetReworkConfirmAsk?.itemId === r[2]) this.setState({sheetReworkConfirmAsk: null});
                },
                confirm: e => {
                  e?.stopPropagation();
                  this.submitSheetReviewRework(d.key, r[2], ask?.reviewKey);
                },
                cannotConfirm: !open || !note || feedback.loading || !current.canReviewCandidate || ask?.reviewKey !== current.reviewKey,
                fields: [
                  {k: 'Item', v: r[0]},
                  {k: '候选版本', v: itemState.candidateVersion?.label || '当前候选'},
                  {k: '审核轮次', v: '第 ' + (appended?.round || this.roundsOf(r[2]) + 1) + ' 轮'},
                  {k: '返工说明', v: note || '—'},
                  {k: '参考图片', v: feedback.images?.length ? feedback.images.length + ' 张' : '无'}
                ]
              };
            })(),
