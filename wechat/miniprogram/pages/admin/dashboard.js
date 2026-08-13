// pages/admin/dashboard.js — 数据看板
const app = getApp();

Page({
  data: {
    loading: true,
    stats: {
      totalUsers: '—',
      totalCatches: '—',
      totalOfficialSpots: '—',
      totalUserSpots: '—',
      gearSeries: '—',
    },
    topSpecies: [],
    topSpots: [],
  },

  onLoad() {
    if (!app.globalData.isAdmin) { wx.navigateBack(); return; }
    this.loadStats();
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => wx.stopPullDownRefresh());
  },

  async loadStats() {
    this.setData({ loading: true });
    const db = app.globalData.db;

    try {
      // 并行查询各集合数量 + 用户总数（通过云函数）
      const [
        catchRes,
        officialRes,
        userSpotRes,
        gearRes,
        userCountRes,
      ] = await Promise.all([
        db.collection('catch_logs').count(),
        db.collection('official_spots').where({ status: 'active' }).count(),
        db.collection('fishing_spots').count(),
        db.collection('gear_series').count(),
        wx.cloud.callFunction({ name: 'adminGetUsers', data: { action: 'count' } })
          .then(r => r.result.success ? r.result.total : '—')
          .catch(() => '—'),
      ]);

      // 热门鱼种（取最近100条渔获统计）
      const catchData = await db.collection('catch_logs')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();

      const speciesCount = {};
      const spotCount = {};
      catchData.data.forEach(c => {
        if (c.species) speciesCount[c.species] = (speciesCount[c.species] || 0) + 1;
        if (c.location) spotCount[c.location] = (spotCount[c.location] || 0) + 1;
      });

      const topSpecies = Object.entries(speciesCount)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const topSpots = Object.entries(spotCount)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      this.setData({
        loading: false,
        stats: {
          totalCatches: catchRes.total,
          totalOfficialSpots: officialRes.total,
          totalUserSpots: userSpotRes.total,
          gearSeries: gearRes.total,
          totalUsers: userCountRes,
        },
        topSpecies,
        topSpots,
      });
    } catch (e) {
      console.error('加载看板失败', e);
      this.setData({ loading: false });
      wx.showToast({ title: '部分数据加载失败', icon: 'none' });
    }
  },
});
