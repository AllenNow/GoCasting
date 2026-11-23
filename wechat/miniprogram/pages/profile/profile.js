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
    stats: {
      totalCatches: 0,
      totalSpecies: 0,
      totalWeightKg: '0.0',
      releasedCount: 0,
      topSpecies: '—',
      thisYear: 0,
    },
    recentCatches: [],
    badges: [],
    statsLoading: true,
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
    this.loadStats();
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

  // 加载本人渔获统计（catch_logs 集合权限为仅创建者可读写）
  loadStats: function() {
    var that = this;
    var db = app.globalData.db;
    if (!db) {
      that.setData({ statsLoading: false });
      return;
    }

    db.collection('catch_logs')
      .orderBy('date', 'desc')
      .limit(1000)
      .get()
      .then(function(res) {
        var catches = res.data || [];
        var totalWeight = 0;
        var released = 0;
        var year = new Date().getFullYear();
        var speciesSet = {};
        var speciesCount = {};
        var yearCount = 0;

        catches.forEach(function(c) {
          if (c.weight_g) totalWeight += c.weight_g;
          if (c.released) released++;
          if (c.species) {
            speciesSet[c.species] = true;
            speciesCount[c.species] = (speciesCount[c.species] || 0) + 1;
          }
          if (c.date && c.date.indexOf(String(year)) === 0) yearCount++;
        });

        var topSpecies = '—';
        var topCount = 0;
        Object.keys(speciesCount).forEach(function(name) {
          if (speciesCount[name] > topCount) {
            topCount = speciesCount[name];
            topSpecies = name;
          }
        });

        var speciesTotal = Object.keys(speciesSet).length;
        that.setData({
          stats: {
            totalCatches: catches.length,
            totalSpecies: speciesTotal,
            totalWeightKg: (totalWeight / 1000).toFixed(1),
            releasedCount: released,
            topSpecies: topSpecies,
            thisYear: yearCount,
          },
          recentCatches: catches.slice(0, 3).map(function(c) {
            return {
              _id: c._id,
              species: c.species || '未知鱼种',
              date: c.date || '',
              weightKg: c.weight_g ? (c.weight_g / 1000).toFixed(1) : '',
              photo_url: c.photo_url || '',
            };
          }),
          badges: that._calcBadges(catches.length, speciesTotal, released, totalWeight),
          statsLoading: false,
        });
      })
      .catch(function(err) {
        console.warn('加载渔获统计失败', err);
        that.setData({ statsLoading: false });
      });
  },

  // 成就徽章（仅展示解锁项 + 3 个待解锁目标）
  _calcBadges: function(total, species, released, weightG) {
    var all = [
      { id: 'first_catch', icon: '🎣', name: '第一尾', desc: '记录第一次渔获', unlock: total >= 1 },
      { id: 'catch_5', icon: '🐟', name: '渔获5尾', desc: '累计记录5次渔获', unlock: total >= 5 },
      { id: 'catch_20', icon: '🐠', name: '渔获达人', desc: '累计记录20次渔获', unlock: total >= 20 },
      { id: 'catch_50', icon: '🏆', name: '远投高手', desc: '累计记录50次渔获', unlock: total >= 50 },
      { id: 'catch_100', icon: '👑', name: '海钓传奇', desc: '累计记录100次渔获', unlock: total >= 100 },
      { id: 'species_3', icon: '🦈', name: '多鱼种', desc: '钓到3种以上鱼种', unlock: species >= 3 },
      { id: 'species_5', icon: '🌊', name: '鱼种收集家', desc: '钓到5种以上鱼种', unlock: species >= 5 },
      { id: 'species_10', icon: '🗺️', name: '百鱼图', desc: '钓到10种以上鱼种', unlock: species >= 10 },
      { id: 'release_1', icon: '💚', name: '护鱼使者', desc: '放流第一条鱼', unlock: released >= 1 },
      { id: 'release_10', icon: '🌿', name: '放流卫士', desc: '累计放流10条鱼', unlock: released >= 10 },
      { id: 'weight_1kg', icon: '⚖️', name: '千克级', desc: '累计钓获超1kg', unlock: weightG >= 1000 },
      { id: 'weight_5kg', icon: '💪', name: '大物猎手', desc: '累计钓获超5kg', unlock: weightG >= 5000 },
      { id: 'weight_10kg', icon: '🎖️', name: '重量级', desc: '累计钓获超10kg', unlock: weightG >= 10000 },
    ];
    var unlocked = all.filter(function(b) { return b.unlock; });
    var locked = all.filter(function(b) { return !b.unlock; }).slice(0, 3).map(function(b) {
      return { id: b.id, icon: b.icon, name: b.name, desc: b.desc, locked: true };
    });
    return unlocked.concat(locked);
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
      title: 'GoCasting - 钓鱼记录与榜单',
      path: '/pages/competition/competition',
    };
  },

  // 我的渔获列表
  goAllCatches: function() {
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

  // 最近渔获详情
  goCatchDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/catch-detail/catch-detail?id=' + id });
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
