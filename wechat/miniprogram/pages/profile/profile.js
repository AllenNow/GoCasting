// pages/profile/profile.js — 个人中心 (ES5 兼容版)
var app = getApp();

Page({
  data: {
    userInfo: null,
    role: 'viewer', // 'super_admin' | 'competition_admin' | 'viewer'
    permissions: {},
    pendingCount: 0, // 待审核申请数量（超管可见）
    isAdmin: false, // 兼容旧逻辑
  },

  onLoad: function() {
    var info = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (info) this.setData({ userInfo: info });
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.checkPermission();
  },

  // 检查用户权限
  checkPermission: function() {
    var that = this;
    wx.cloud.callFunction({ name: 'checkPermission' })
      .then(function(res) {
        if (res.result) {
          var result = res.result;
          that.setData({
            role: result.role || 'viewer',
            permissions: result.permissions || {},
            pendingCount: result.pendingCount || 0,
            isAdmin: result.isAdmin || false
          });
          // 同步到 globalData
          app.globalData.isAdmin = result.isAdmin || false;
          app.globalData.role = result.role || 'viewer';
          app.globalData.permissions = result.permissions || {};
          if (result.isAdmin) {
            wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
          } else {
            wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
          }
        }
      })
      .catch(function(err) {
        console.error('checkPermission error:', err);
      });
  },

  // 选择头像
  onChooseAvatar: function(e) {
    var avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    var current = this.data.userInfo || {};
    var updated = {
      avatarUrl: avatarUrl,
      nickName: current.nickName || ''
    };
    this._saveUserInfo(updated);
  },

  // 昵称输入
  onNicknameInput: function(e) {
    this._pendingNickname = e.detail.value;
  },

  // 昵称确认
  onNicknameBlur: function() {
    var nick = this._pendingNickname;
    if (!nick || !nick.trim()) return;
    var current = this.data.userInfo || {};
    var updated = {
      avatarUrl: current.avatarUrl || '',
      nickName: nick.trim()
    };
    this._saveUserInfo(updated);
  },

  // 保存用户信息
  _saveUserInfo: function(info) {
    app.globalData.userInfo = info;
    wx.setStorageSync('userInfo', info);
    this.setData({ userInfo: info });
  },

  // 分享小程序
  onShareAppMessage: function() {
    return {
      title: '钓鱼赛事助手 - 榜单记录与荣誉',
      path: '/pages/competition/competition',
    };
  },

  // 权限管理（超管专用）
  goPermissionManage: function() {
    wx.navigateTo({ url: '/pages/permission/manage' });
  },

  // 获取角色显示文本
  getRoleName: function(role) {
    var names = {
      'super_admin': '超级管理员',
      'competition_admin': '赛事管理员',
      'viewer': '普通用户'
    };
    return names[role] || '普通用户';
  }
});
