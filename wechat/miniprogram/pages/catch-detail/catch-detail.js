// pages/catch-detail/catch-detail.js — 渔获详情页（只读展示）
const app = getApp();

const TIDE_MAP = {
  rising: { label: '涨潮', icon: '🌊' },
  falling: { label: '退潮', icon: '↘️' },
  high: { label: '高潮', icon: '⬆️' },
  low: { label: '低潮', icon: '⬇️' },
};

Page({
  data: {
    record: null,
    loading: true,
    recordId: '',
    showShareCard: false,  // 分享卡片弹窗
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ recordId: options.id });
      this.loadRecord(options.id);
    }
  },

  // 返回详情页时重新加载（从编辑页 navigateBack 后数据可能已变）
  onShow() {
    if (this.data.recordId && !this.data.loading) {
      this.loadRecord(this.data.recordId);
    }
  },

  async loadRecord(id) {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const res = await db.collection('catch_logs').doc(id).get();
      const data = res.data;

      // 格式化展示数据
      data.weightDisplay = this._formatWeight(data.weight_g);
      data.tideDisplay = TIDE_MAP[data.tide_state] || null;
      data.dateDisplay = data.date + (data.time ? ' ' + data.time : '');

      this.setData({ record: data, loading: false });
    } catch (err) {
      console.error('加载渔获详情失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
      this.setData({ loading: false });
    }
  },

  // 预览照片
  onPhotoTap() {
    const url = this.data.record.photo_url;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
  },

  // 编辑
  onEdit() {
    wx.navigateTo({
      url: `/pages/catch-log/catch-log?id=${this.data.recordId}`,
    });
  },

  // 分享卡片：展示分享预览 modal
  onShare() {
    this.setData({ showShareCard: true });
  },

  // 关闭分享卡片
  closeShareCard() {
    this.setData({ showShareCard: false });
  },

  // 保存分享图到相册
  onSaveShareCard() {
    wx.showLoading({ title: '生成中…' });
    // 使用 canvas 截图保存分享卡（小程序 canvas 方案）
    const query = wx.createSelectorQuery().in(this);
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) {
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
        return;
      }
      // 截取分享卡片 DOM 为图片（使用 wx.canvasToTempFilePath）
      wx.canvasToTempFilePath({
        canvas: res[0].node,
        success: (r) => {
          wx.hideLoading();
          wx.saveImageToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
            fail: () => wx.showToast({ title: '需要相册权限', icon: 'none' }),
          });
        },
        fail: () => { wx.hideLoading(); wx.showToast({ title: '生成失败', icon: 'none' }); },
      });
    });
  },

  // 微信分享（onShareAppMessage 触发）
  onShareAppMessage() {
    const r = this.data.record;
    if (!r) return {};
    const weight = r.weightDisplay ? ` · ${r.weightDisplay}` : '';
    const loc    = r.location     ? ` · ${r.location}` : '';
    return {
      title: `我钓到了 ${r.species || '鱼'}${weight}${loc}！`,
      path:  `/pages/catch-detail/catch-detail?id=${this.data.recordId}`,
    };
  },

  // 删除
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除这条渔获记录吗？',
      confirmColor: '#e85555',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await app.globalData.db.collection('catch_logs').doc(this.data.recordId).remove();
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },

  _formatWeight(w) {
    if (!w) return null;
    return w >= 1000 ? (w / 1000).toFixed(1) + ' kg' : w + ' g';
  },
});
