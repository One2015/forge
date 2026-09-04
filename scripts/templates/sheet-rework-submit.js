            // sheet-rework-confirmation:start
            cancelRework: e => {
              e?.stopPropagation();
              this.setFeedbackImages('sheet:' + r[2], [], '');
              this.setState({sheetReworkAsk: null, sheetReworkText: '', sheetReworkMode: null, sheetReworkVersionKey: null, sheetReworkConfirmAsk: null});
            },
            submitRework: e => {
              e?.stopPropagation();
              const note = String(this.state.sheetReworkText || '').trim();
              const feedback = this.feedbackView('sheet:' + r[2]);
              if (this.state.sheetReworkAsk !== r[2] || !note || feedback.loading) return;
              if (this.state.sheetReworkMode === 'append') {
                this.submitSheetAppend(d.key, r[2], 'append');
                return;
              }
              const current = this.sheetDetailActionValues(d.key, r[2]);
              if (this.state.sheetReworkMode !== 'review' || !current.canReviewCandidate ||
                  this.state.sheetReworkVersionKey && this.state.sheetReworkVersionKey !== current.reviewKey) return;
              this.setState({sheetReworkConfirmAsk: {itemId: r[2], reviewKey: current.reviewKey}});
            }
            // sheet-rework-confirmation:end
