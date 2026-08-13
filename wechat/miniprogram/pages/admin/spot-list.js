// pages/admin/spot-list.js — 官方钓点列表
const app = getApp();

Page({
  data: {
    allSpots: [],    // 全部数据（用于前端搜索）
    spots: [],       // 当前展示（搜索过滤后）
    keyword: '',
    loading: true,
  },

  onLoad() {
    if (!app.globalData.isAdmin) {
      wx.navigateBack(); return;
    }
  },

  onShow() {
    this.loadSpots();
  },

  onPullDownRefresh() {
    this.loadSpots().finally(() => wx.stopPullDownRefresh());
  },

  onSearch(e) {
    const kw = (e.detail.value || '').trim().toLowerCase();
    this.setData({
      keyword: kw,
      spots: kw
        ? this.data.allSpots.filter(s =>
            s.name.toLowerCase().includes(kw) ||
            (s.terrain && s.terrain.toLowerCase().includes(kw))
          )
        : this.data.allSpots,
    });
  },

  clearSearch() {
    this.setData({ keyword: '', spots: this.data.allSpots });
  },

  async loadSpots() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'addOfficialSpot',
        data: { action: 'list' },
      });
      const all = (res.result.data || []).filter(s => s.status !== 'deleted');

      // 封面图 cloud:// 转临时 URL
      const cloudIds = all
        .map(s => s.cover_image)
        .filter(url => url && url.startsWith('cloud://'));

      let urlMap = {};
      if (cloudIds.length > 0) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [...new Set(cloudIds)] });
          (urlRes.fileList || []).forEach(item => {
            if (item.tempFileURL) urlMap[item.fileID] = item.tempFileURL;
          });
        } catch (e) { /* 转换失败不影响列表展示 */ }
      }

      const spots = all.map(s => ({
        ...s,
        coordsStr: s.lat ? `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}` : '',
        cover_preview: (s.cover_image && urlMap[s.cover_image]) ? urlMap[s.cover_image] : (s.cover_image || ''),
      }));

      // 保存全量 + 应用当前搜索词过滤
      const kw = this.data.keyword.toLowerCase();
      const filtered = kw
        ? spots.filter(s => s.name.toLowerCase().includes(kw) || (s.terrain && s.terrain.toLowerCase().includes(kw)))
        : spots;
      this.setData({ allSpots: spots, spots: filtered, loading: false });
    } catch (e) {
      console.error('加载钓点列表失败', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/admin/spot-add' });
  },

  goEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin/spot-add?id=${id}` });
  },

  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const label = status === 'active' ? '下架' : '上架';
    wx.showModal({
      title: `确认${label}`,
      content: `确定将该钓点${label}吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '操作中…' });
        try {
          await wx.cloud.callFunction({
            name: 'addOfficialSpot',
            data: { action: 'toggleStatus', spotId: id },
          });
          wx.showToast({ title: `已${label}`, icon: 'success' });
          this.loadSpots();
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'error' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },
});
