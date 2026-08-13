// pages/admin/user-manage.js — 用户管理（通过 adminGetUsers 云函数绕过权限）
const app = getApp();

Page({
  data: {
    users: [],
    loading: true,
    total: 0,
    page: 1,
    pageSize: 50,
    hasMore: false,
  },

  onLoad() {
    if (!app.globalData.isAdmin) { wx.navigateBack(); return; }
    this.loadUsers();
  },

  onShow() { this.loadUsers(); },

  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.loadUsers().finally(() => wx.stopPullDownRefresh());
  },

  async loadUsers() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminGetUsers',
        data: {
          action: 'list',
          page: this.data.page,
          pageSize: this.data.pageSize,
        },
      });

      if (!res.result.success) {
        throw new Error(res.result.error || '加载失败');
      }

      const { users, total } = res.result;
      this.setData({
        users: users.map(u => ({
          ...u,
          // 格式化注册时间
          createdStr: u.created_at
            ? new Date(u.created_at).toLocaleDateString('zh-CN')
            : '未知',
        })),
        total,
        hasMore: users.length === this.data.pageSize,
        loading: false,
      });
    } catch (e) {
      console.error('加载用户列表失败', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败：' + String(e), icon: 'none' });
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
          const r = await wx.cloud.callFunction({
            name: 'adminGetUsers',
            data: { action: 'ban', userId: id, banned: !banned },
          });
          if (!r.result.success) throw new Error(r.result.error);
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
