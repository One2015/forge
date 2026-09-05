  // pm-delivery-browser:start
  pmDeliveryFolderCoverUpload(event, key) {
    const input = event && event.target;
    const file = input && input.files && input.files[0];
    if (input) input.value = '';
    if (!file || !this.deliverySheet(key)) return;
    const errors = Object.assign({}, this.state.deliveryFolderCoverErrors || {});
    const fail = message => { errors[key] = message; this.setState({ deliveryFolderCoverErrors: errors }); };
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      fail('请选择 PNG、JPG 或 WebP 图片，文件不超过 5 MB。');
      return;
    }
    delete errors[key];
    const request = Date.now() + ':' + Math.random();
    this._deliveryFolderCoverRequests = Object.assign({}, this._deliveryFolderCoverRequests || {}, { [key]: request });
    this.setState({ deliveryFolderCoverErrors: errors });
    const reader = new FileReader();
    reader.onerror = () => {
      if (this._deliveryFolderCoverRequests && this._deliveryFolderCoverRequests[key] === request) fail('无法读取封面图片，请重试。');
    };
    reader.onload = () => {
      if (!this._deliveryFolderCoverRequests || this._deliveryFolderCoverRequests[key] !== request || !this.deliverySheet(key)) return;
      const covers = Object.assign({}, this.state.deliveryFolderCovers || {}, { [key]: { name: file.name, url: String(reader.result) } });
      const nextErrors = Object.assign({}, this.state.deliveryFolderCoverErrors || {});
      delete nextErrors[key];
      this.setState({ deliveryFolderCovers: covers, deliveryFolderCoverErrors: nextErrors });
    };
    reader.readAsDataURL(file);
  }
  // pm-delivery-browser:end

