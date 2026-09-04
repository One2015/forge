  // pm-sheet-review-history:start
  pmCleanReviewNote(note) {
    return String(note || '').replace(/^\s*(?:首轮|第[一二三四五六七八九十百\d]+轮)\s*[：:]\s*/, '');
  }
  pmSheetReferenceImages(images) {
    return (Array.isArray(images) ? images : []).filter(image => !image.loading && typeof image.url === 'string' && /^(?:https?:\/\/|blob:|\/(?!\/)|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(image.url))
      .map((image, i) => ({name: image.name || '参考图 ' + (i + 1), url: image.url}));
  }
  pmSheetReviewEvidence(itemId, runId, round) {
    const record = this.state.repairRuns?.[runId + ':' + itemId];
    // Older saved feedback has no round field; it belongs to the last rework
    // round for this exact Item/Run, never to every historical round.
    return record && (record.round ?? this.roundsOf(itemId)) === round ? record : null;
  }
  pmSheetReviewNote(itemId, runId, round, fallback) {
    return this.pmCleanReviewNote(this.pmSheetReviewEvidence(itemId, runId, round)?.note || fallback);
  }
  pmSheetReviewImages(itemId, runId, round) {
    return this.pmSheetReferenceImages(this.pmSheetReviewEvidence(itemId, runId, round)?.attachments);
  }
  // pm-sheet-review-history:end
