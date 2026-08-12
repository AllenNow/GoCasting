// pages/admin/gear-manage.js — 装备系列管理
const app = getApp();

Page({
  data: {
    series: [],
    filteredSeries: [],
    loading: true,
    tab: 'reel',   // reel | rod
    keyword: '',
  },

  onLoad() {
    if (!app.globalData.isAdmin) { wx.navigateBack(); return; }
    this.loadSeries();
  },

  onShow() { this.loadSeries(); },

  onPullDownRefresh() {
    this.loadSeries().finally(() => wx.stopPullDownRefresh());
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({ tab, keyword: '' });
    this.loadSeries();
  },

  onSearch(e) {
    const kw = (e.detail.value || '').toLowerCase();
    this.setData({ keyword: kw });
    const filtered = this.data.series.filter(s =>
      !kw ||
      s.series_name.toLowerCase().includes(kw) ||
      (s.brand && s.brand.toLowerCase().includes(kw))
    );
    this.setData({ filteredSeries: filtered });
  },

  async loadSeries() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const res = await db.collection('gear_series')
        .where({ category: this.data.tab })
        .orderBy('sort_order', 'asc')
        .limit(100)
        .get();
      this.setData({ series: res.data, filteredSeries: res.data, loading: false, keyword: '' });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  goEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/admin/gear-edit?id=${id}` });
  },

  // 快速切换显示/隐藏（gear_series 没有 status 字段，加一个 hidden 布尔）
  async toggleHidden(e) {
    const { id, hidden } = e.currentTarget.dataset;
    const newHidden = !hidden;
    try {
      await app.globalData.db.collection('gear_series').doc(id).update({
        data: { hidden: newHidden },
      });
      wx.showToast({ title: newHidden ? '已隐藏' : '已显示', icon: 'success' });
      this.loadSeries();
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },
});
