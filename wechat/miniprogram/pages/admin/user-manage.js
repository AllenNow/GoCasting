// pages/admin/user-manage.js — 用户管理
const app = getApp();

Page({
  data: {
    users: [],
    loading: true,
  },

  onLoad() {
    if (!app.globalData.isAdmin) { wx.navigateBack(); return; }
    this.loadUsers();
  },

  onShow() { this.loadUsers(); },

  onPullDownRefresh() {
    this.loadUsers().finally(() => wx.stopPullDownRefresh());
  },

  async loadUsers() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      // users 集合：仅创建者可读，管理员通过云函数绕过权限读取
      // 目前先尝试直接读（管理员身份），如无权限需另建云函数
      const res = await db.collection('users')
        .orderBy('updated_at', 'desc')
        .limit(50)
        .get();
      this.setData({ users: res.data, loading: false });
    } catch (e) {
      console.error('加载用户列表失败', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，需要云函数权限', icon: 'none' });
    }
  },

  async banUser(e) {
    const { id, banned } = e.currentTarget.dataset;
    const action = banned ? '解封' : '封禁';
    wx.showModal({
      title: `确认${action}`,
      content: `确定${action}该用户吗？`,
      confirmColor: banned ? '#1a7f5a' : '#e85555',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '操作中…' });
        try {
          await app.globalData.db.collection('users').doc(id).update({
            data: { banned: !banned, banned_at: app.globalData.db.serverDate() },
          });
          wx.showToast({ title: `已${action}`, icon: 'success' });
          this.loadUsers();
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'error' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },
});
