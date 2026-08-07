// pages/index/index.js — 渔获列表首页
const app = getApp();

Page({
  data: {
    catches: [],          // 渔获列表
    loading: true,
    stats: {
      total: 0,
      thisMonth: 0,
      topSpecies: '—',
    },
    today: '',            // 今日日期展示
  },

  onLoad() {
    const now = new Date();
    this.setData({
      today: `${now.getMonth() + 1}月${now.getDate()}日`,
    });
    this.loadCatches();
  },

  onShow() {
    // 同步自定义 tabBar 高亮状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // 每次切换回来刷新列表
    this.loadCatches();
  },

  // 从云数据库加载当前用户的渔获记录
  async loadCatches() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const res = await db.collection('catch_logs')
        .orderBy('date', 'desc')
        .limit(20)
        .get();

      const catches = res.data.map(c => ({
        ...c,
        weightKg: c.weight_g ? (c.weight_g / 1000).toFixed(1) : '',
      }));

      // 计算统计
      const now = new Date();
      const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const thisMonth = catches.filter(c => c.date && c.date.startsWith(thisMonthStr)).length;

      // 统计最多鱼种
      const speciesCount = {};
      catches.forEach(c => {
        if (c.species) speciesCount[c.species] = (speciesCount[c.species] || 0) + 1;
      });
      const topSpecies = Object.keys(speciesCount).sort((a, b) => speciesCount[b] - speciesCount[a])[0] || '—';

      this.setData({
        catches,
        loading: false,
        stats: {
          total: catches.length,
          thisMonth,
          topSpecies,
        },
      });
    } catch (err) {
      console.error('加载渔获失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  // 跳转到记录页
  goRecord() {
    wx.navigateTo({ url: '/pages/catch-log/catch-log' });
  },

  // 跳转到天气仪表板
  goWeather() {
    wx.navigateTo({ url: '/pages/weather/weather' });
  },

  goGoScore() {
    wx.navigateTo({ url: '/pages/go-score/go-score' });
  },

  goSpecies() {
    wx.navigateTo({ url: '/pages/species/species' });
  },

  goGear() {
    wx.switchTab({ url: '/pages/gear/gear' });
  },

  goMap() {
    wx.switchTab({ url: '/pages/spot-map/spot-map' });
  },

  // 点击渔获条目查看详情
  onCatchTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/catch-log/catch-log?id=${id}` });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCatches().then(() => wx.stopPullDownRefresh());
  },

  // 格式化体重显示
  formatWeight(w) {
    if (!w) return '';
    return w >= 1000 ? `${(w / 1000).toFixed(1)}kg` : `${w}g`;
  },
});
