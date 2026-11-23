// pages/profile/profile.js — 个人中心 (ES5 兼容版)
var app = getApp();
var goScoreService = require('../../utils/goScoreService');

Page({
  data: {
    userInfo: null,
    role: 'viewer', // 'super_admin' | 'competition_admin' | 'viewer'
    permissions: {},
    pendingCount: 0, // 待审核申请数量（超管可见）
    isAdmin: false, // 兼容旧逻辑
    todayScore: '--',
    scoreColor: '#1a7f5a',
    scoreReady: false,
    scoreSub: '点击查看详情',
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
    this.loadTodayScore();
  },

  // 今日出钓指数：与首页、评分页共用同一服务与缓存
  loadTodayScore: function() {
    var that = this;
    goScoreService.getTodayScore().then(function(r) {
      if (!r) return;
      var d = new Date(r.updatedAt || Date.now());
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      that.setData({
        todayScore: r.score,
        scoreColor: r.level.color,
        scoreReady: true,
        scoreSub: r.level.short + ' · 更新于 ' + hh + ':' + mm,
      });
    }).catch(function() {
      that.setData({ scoreSub: '点击查看详情' });
    });
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
      title: 'GoCasting - 潮汐天气与钓鱼榜单',
      path: '/pages/competition/competition',
    };
  },

  // 工具首页
  goTools: function() {
    wx.navigateTo({ url: '/pages/index/index' });
  },

  // 今天适不适合出钓
  goGoScore: function() {
    wx.navigateTo({ url: '/pages/go-score/go-score' });
  },

  // 鱼种图鉴
  goSpecies: function() {
    wx.navigateTo({ url: '/pages/species/species' });
  },

  // 隐私政策
  goPrivacyPolicy: function() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  // 权限管理（超管专用）
  goPermissionManage: function() {
    wx.navigateTo({ url: '/pages/permission/manage' });
  },

  // API 用量与费用（超管专用）
  goApiUsage: function() {
    wx.navigateTo({ url: '/pages/admin/api-usage' });
  },

  // 获取角色显示文本
  getRoleName: function(role) {
    var names = {
      'super_admin': '超级管理员',
      'competition_admin': '榜单管理员',
      'viewer': '普通用户'
    };
    return names[role] || '普通用户';
  }
});
