// pages/admin/admin.js — 管理员后台首页
const app = getApp();

Page({
  data: {
    spotCount: 0,
  },

  onLoad() {
    // 非管理员检查：先看缓存，openid 异步回来后再二次检查
    if (app.globalData.isAdmin === false && app.globalData.openid) {
      // openid 已获取，确认不是管理员
      wx.showToast({ title: '无权限', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    // openid 还未获取（异步中），延迟检查
    if (!app.globalData.openid) {
      setTimeout(() => {
        if (!app.globalData.isAdmin) {
          wx.showToast({ title: '无权限', icon: 'error' });
          wx.navigateBack();
        } else {
          this.loadStats();
        }
      }, 1500);
      return;
    }
    this.loadStats();
  },

  async loadStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'addOfficialSpot',
        data: { action: 'list' },
      });
      if (res.result.success) {
        const active = (res.result.data || []).filter(s => s.status === 'active');
        this.setData({ spotCount: active.length });
      }
    } catch (e) {
      console.warn('加载统计失败', e);
    }
  },

  goSpotList() {
    wx.navigateTo({ url: '/pages/admin/spot-list' });
  },
});
