// pages/profile/profile.js — 个人中心（精简版）
const app = getApp();

Page({
  data: {
    userInfo: null,
    isAdmin: false,
  },

  onLoad() {
    const info = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (info) this.setData({ userInfo: info });
    this.setData({ isAdmin: app.globalData.isAdmin || false });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // isAdmin 依赖异步 openid，轮询等待
    const checkAdmin = () => {
      if (app.globalData.openid) {
        this.setData({ isAdmin: app.globalData.isAdmin || false });
      } else {
        setTimeout(checkAdmin, 500);
      }
    };
    checkAdmin();
  },

  // 选择头像
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    const current = this.data.userInfo || {};
    const updated = { ...current, avatarUrl };
    this._saveUserInfo(updated);
  },

  // 昵称输入
  onNicknameInput(e) {
    this._pendingNickname = e.detail.value;
  },

  // 昵称确认
  onNicknameBlur() {
    const nick = this._pendingNickname;
    if (!nick || !nick.trim()) return;
    const current = this.data.userInfo || {};
    const updated = { ...current, nickName: nick.trim() };
    this._saveUserInfo(updated);
  },

  // 保存用户信息
  _saveUserInfo(info) {
    app.globalData.userInfo = info;
    wx.setStorageSync('userInfo', info);
    this.setData({ userInfo: info });
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '钓鱼赛事助手 - 榜单记录与荣誉',
      path: '/pages/competition/competition',
    };
  },

  goAdmin() {
    // 管理员入口（这里可以添加管理功能）
    wx.showToast({ title: '管理员功能开发中', icon: 'none' });
  },
});
