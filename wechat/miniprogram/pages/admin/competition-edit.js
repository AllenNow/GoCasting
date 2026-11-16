// pages/admin/competition-edit.js — 管理员：新建 / 编辑比赛基本信息 (ES5 兼容版)
var app = getApp();

Page({
  data: {
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
    // 默认日期为今天
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var today = now.getFullYear() + '-' + month + '-' + day;
    this.setData({ 'form.date': today });

    if (options.id) {
      this.setData({ isEdit: true, editId: options.id });
      wx.setNavigationBarTitle({ title: '编辑比赛' });
      this.loadCompetition(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新建比赛' });
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
      wx.showToast({ title: '请输入比赛名称', icon: 'none' }); 
      return;
    }
    if (!form.date) {
      wx.showToast({ title: '请选择比赛日期', icon: 'none' }); 
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…' });

    var db = app.globalData.db;
    var record = {
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      description: form.description.trim(),
      status: form.status,
      updated_at: db.serverDate(),
    };

    if (this.data.isEdit) {
      db.collection('competitions').doc(this.data.editId).update({ data: record })
        .then(function() {
          wx.showToast({ title: '已更新', icon: 'success' });
          setTimeout(function() { wx.navigateBack(); }, 1000);
        })
        .catch(function(err) {
          console.error('保存比赛失败', err);
          wx.showToast({ title: '保存失败，请重试', icon: 'error' });
        })
        .finally(function() {
          wx.hideLoading();
          that.setData({ saving: false });
        });
    } else {
      // 新建时带空 entries 数组和创建者信息
      record.entries = [];
      record.created_at = db.serverDate();
      record.created_by = app.globalData.openid || '';
      record.admins = [];
      
      db.collection('competitions').add({ data: record })
        .then(function(res) {
          wx.showToast({ title: '已创建', icon: 'success' });
          // 创建后跳转到详情页，让管理员直接录入选手成绩
          setTimeout(function() {
            wx.redirectTo({ url: '/pages/competition/competition-detail?id=' + res._id });
          }, 800);
        })
        .catch(function(err) {
          console.error('保存比赛失败', err);
          wx.showToast({ title: '保存失败，请重试', icon: 'error' });
        })
        .finally(function() {
          wx.hideLoading();
          that.setData({ saving: false });
        });
    }
  },
});
