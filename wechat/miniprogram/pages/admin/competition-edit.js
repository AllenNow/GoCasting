// pages/admin/competition-edit.js — 管理员：新建 / 编辑比赛基本信息 (ES5 兼容版)
var app = getApp();

Page({
  data: {
    authorized: false,
    isEdit: false,
    editId: null,
    saving: false,

    form: {
      name: '',
      date: '',
      location: '',
      description: '',
      status: 'upcoming',
    },

    statusOptions: ['即将开始', '进行中', '已结束'],
    statusValues:  ['upcoming', 'ongoing', 'finished'],
    statusIndex: 0,
  },

  onLoad: function(options) {
    var that = this;
    this._checkAccess(options.id, function() {
      that.setData({ authorized: true });
      that._initPage(options);
    });
  },

  // 仅管理员可创建/编辑比赛
  _checkAccess: function(id, onAllowed) {
    var deny = function() {
      wx.showModal({
        title: '无权限',
        content: '仅管理员可创建或编辑榜单',
        showCancel: false,
        confirmText: '知道了',
        success: function() {
          wx.navigateBack({
            fail: function() {
              wx.switchTab({ url: '/pages/competition/competition' });
            }
          });
        }
      });
    };

    if (id) {
      wx.cloud.callFunction({
        name: 'updateCompetition',
        data: { action: 'checkPermission', competitionId: id }
      }).then(function(res) {
        var result = res.result || {};
        if (result.success && result.canEdit) onAllowed();
        else deny();
      }).catch(deny);
    } else {
      wx.cloud.callFunction({ name: 'checkPermission' })
        .then(function(res) {
          var result = res.result || {};
          if (result.success && result.permissions && result.permissions.canCreateCompetition) onAllowed();
          else deny();
        }).catch(deny);
    }
  },

  _initPage: function(options) {
    // 默认日期为今天
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var today = now.getFullYear() + '-' + month + '-' + day;
    this.setData({ 'form.date': today });

    if (options.id) {
      this.setData({ isEdit: true, editId: options.id });
      wx.setNavigationBarTitle({ title: '编辑榜单' });
      this.loadCompetition(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新建榜单' });
    }
  },

  loadCompetition: function(id) {
    var that = this;
    wx.showLoading({ title: '加载中…' });
    
    app.globalData.db.collection('competitions').doc(id).get()
      .then(function(res) {
        var data = res.data;
        var statusValues = ['upcoming', 'ongoing', 'finished'];
        var statusIndex = statusValues.indexOf(data.status);
        if (statusIndex < 0) statusIndex = 0;
        
        that.setData({
          statusIndex: statusIndex,
          form: {
            name: data.name || '',
            date: data.date || '',
            location: data.location || '',
            description: data.description || '',
            status: data.status || 'upcoming',
          },
        });
      })
      .catch(function(err) {
        console.error('加载比赛信息失败', err);
        wx.showToast({ title: '加载失败', icon: 'error' });
      })
      .finally(function() {
        wx.hideLoading();
      });
  },

  onInput: function(e) {
    var field = e.currentTarget.dataset.field;
    var obj = {};
    obj['form.' + field] = e.detail.value;
    this.setData(obj);
  },

  onDateChange: function(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  onStatusChange: function(e) {
    var idx = Number(e.detail.value);
    var statusValues = ['upcoming', 'ongoing', 'finished'];
    this.setData({
      statusIndex: idx,
      'form.status': statusValues[idx],
    });
  },

  save: function() {
    var that = this;
    if (this.data.saving) return;

    var form = this.data.form;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入榜单名称', icon: 'none' }); 
      return;
    }
    if (!form.date) {
      wx.showToast({ title: '请选择榜单日期', icon: 'none' }); 
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…' });

    var record = {
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      description: form.description.trim(),
      status: form.status,
    };

    wx.cloud.callFunction({
      name: 'updateCompetition',
      data: {
        action: this.data.isEdit ? 'update' : 'create',
        competitionId: this.data.editId,
        competition: record,
      },
    }).then(function(res) {
      var result = res.result || {};
      if (!result.success) {
        wx.showToast({ title: result.error || '保存失败', icon: 'none' });
        return;
      }
      if (that.data.isEdit) {
        wx.showToast({ title: '已更新', icon: 'success' });
        setTimeout(function() { wx.navigateBack(); }, 1000);
      } else {
        wx.showToast({ title: '已创建', icon: 'success' });
        setTimeout(function() {
          wx.redirectTo({ url: '/pages/competition/competition-detail?id=' + result.id });
        }, 800);
      }
    }).catch(function(err) {
      console.error('保存比赛失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    }).finally(function() {
      wx.hideLoading();
      that.setData({ saving: false });
    });
  },
});
