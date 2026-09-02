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
              this.setState({sheetReworkVersionKey: current.reviewKey});
            },
