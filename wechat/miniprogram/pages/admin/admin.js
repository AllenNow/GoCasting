// pages/admin/admin.js — 管理员后台首页
const app = getApp();

Page({
  data: {
    spotCount: 0,
    pendingReviewCount: 0,
    loading: true,
  },

  onLoad() {
    this._checkAdminAndLoad();
  },

  onShow() {
    this.loadStats();
  },

  // 等待 openid 就位后再做权限检查（轮询，最多等 3 秒）
  _checkAdminAndLoad(retry = 0) {
    if (app.globalData.openid) {
      // openid 已获取，直接判断
      if (!app.globalData.isAdmin) {
        wx.showToast({ title: '无权限', icon: 'error' });
        setTimeout(() => wx.navigateBack(), 1000);
        return;
      }
      this.loadStats();
      return;
    }
    // openid 尚未就绪，最多重试 6 次（每次 500ms，共 3 秒）
    if (retry >= 6) {
      wx.showToast({ title: '登录超时，请重试', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    setTimeout(() => this._checkAdminAndLoad(retry + 1), 500);
  },

  async loadStats() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const [spotRes, pendingRes] = await Promise.all([
        // 官方钓点数量
        wx.cloud.callFunction({ name: 'addOfficialSpot', data: { action: 'list' } })
          .then(r => (r.result.data || []).filter(s => s.status === 'active').length)
          .catch(() => 0),
        // 待审核用户钓点数
        db.collection('fishing_spots')
          .where({ is_public: true, reviewed: db.command.or([
            db.command.exists(false),
            db.command.eq(false),
          ]) })
          .count()
          .then(r => r.total)
          .catch(() => 0),
      ]);
      this.setData({
        spotCount: spotRes,
        pendingReviewCount: pendingRes,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      console.warn('加载统计失败', e);
    }
  },

  goSpotList()   { wx.navigateTo({ url: '/pages/admin/spot-list' }); },
  goSpotReview() { wx.navigateTo({ url: '/pages/admin/spot-review' }); },
  goGearManage() { wx.navigateTo({ url: '/pages/admin/gear-manage' }); },
  goUserManage() { wx.navigateTo({ url: '/pages/admin/user-manage' }); },
  goDashboard()  { wx.navigateTo({ url: '/pages/admin/dashboard' }); },
  goApiStats()   { wx.navigateTo({ url: '/pages/admin/api-stats/api-stats' }); },
});
