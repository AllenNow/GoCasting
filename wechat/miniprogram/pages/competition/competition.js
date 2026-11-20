// pages/competition/competition.js — 比赛列表
var app = getApp();

var STATUS_MAP = {
  upcoming: { label: '即将开始', color: '#4a90d9' },
  ongoing:  { label: '进行中',   color: '#1a7f5a' },
  finished: { label: '已结束',   color: '#999999' },
};

Page({
  data: {
    competitions: [],
    filtered: [],
    loading: true,
    isAdmin: false,
    filterStatus: 'all',
    filters: [
      { label: '全部',     value: 'all' },
      { label: '进行中',   value: 'ongoing' },
      { label: '即将开始', value: 'upcoming' },
      { label: '已结束',   value: 'finished' },
    ],
  },

  onLoad: function() {
    // 默认关闭分享，仅管理员在权限校验通过后开启
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.loadCompetitions();
    this.checkPermission();
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this.checkPermission();
    this.loadCompetitions();
  },

  checkPermission: function() {
    var that = this;
    wx.cloud.callFunction({ name: 'checkPermission' }).then(function(res) {
      if (res.result) {
        var permissions = res.result.permissions || {};
        var isAdmin = res.result.isAdmin;
        that.setData({ 
          isAdmin: isAdmin || permissions.canCreateCompetition || false
        });
        app.globalData.isAdmin = isAdmin;
        app.globalData.permissions = res.result.permissions;
        if (isAdmin || permissions.canCreateCompetition) {
          wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
        } else {
          wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
        }
      }
    }).catch(function(err) {
      console.error('checkPermission error:', err);
    });
  },

  loadCompetitions: function() {
    var that = this;
    this.setData({ loading: true });
    
    var db = app.globalData.db;
    db.collection('competitions')
      .orderBy('date', 'desc')
      .limit(50)
      .get()
      .then(function(res) {
        var competitions = res.data.map(function(c) {
          var statusInfo = STATUS_MAP[c.status] || {};
          return {
            _id: c._id,
            name: c.name,
            date: c.date,
            location: c.location,
            description: c.description,
            status: c.status,
            entries: c.entries,
            statusLabel: statusInfo.label || c.status,
            statusColor: statusInfo.color || '#999',
            entryCount: (c.entries || []).length,
          };
        });

        that.setData({ competitions: competitions });
        that._applyFilter();
        that.setData({ loading: false });
      })
      .catch(function(err) {
        if (err.errCode === -502005 || (err.message || '').indexOf('not exist') >= 0) {
          console.warn('competitions 集合尚未创建，请在云开发控制台新建');
        } else {
          console.error('加载比赛列表失败', err);
          wx.showToast({ title: '加载失败', icon: 'error' });
        }
        that.setData({ loading: false });
      });
  },

  _applyFilter: function() {
    var competitions = this.data.competitions;
    var filterStatus = this.data.filterStatus;
    var filtered;
    
    if (filterStatus === 'all') {
      filtered = competitions;
    } else {
      filtered = competitions.filter(function(c) {
        return c.status === filterStatus;
      });
    }
    this.setData({ filtered: filtered });
  },

  onFilterTap: function(e) {
    var status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status });
    this._applyFilter();
  },

  onCompetitionTap: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/competition/competition-detail?id=' + id });
  },

  addCompetition: function() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '仅管理员可创建榜单', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/admin/competition-edit' });
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadCompetitions();
    setTimeout(function() {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  onShareAppMessage: function() {
    return {
      title: '钓鱼榜单 - 看看本期排名',
      path: '/pages/competition/competition',
    };
  },

  onShareTimeline: function() {
    return {
      title: '钓鱼榜单 - 看看本期排名',
    };
  },
});
