// pages/permission/apply.js — 申请管理员权限 (ES5 兼容版)
var app = getApp();

Page({
  data: {
    nickname: '',
    reason: '',
    submitting: false,
    latestRequest: null, // 最近一次申请记录
    canSubmit: false,
  },

  onLoad: function() {
    // 尝试获取已保存的用户信息作为默认昵称
    var userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo && userInfo.nickName) {
      this.setData({ 
        nickname: userInfo.nickName,
        canSubmit: userInfo.nickName.trim().length > 0
      });
    }
  },

  onShow: function() {
    this.loadLatestRequest();
  },

  // 加载最近的申请记录
  loadLatestRequest: function() {
    var that = this;
    var db = wx.cloud.database();
    var openid = app.globalData.openid;
    
    if (!openid) {
      // 等待 openid 获取
      setTimeout(function() { that.loadLatestRequest(); }, 500);
      return;
    }

    db.collection('permission_requests')
      .where({ _openid: openid })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()
      .then(function(res) {
        if (res.data.length > 0) {
          var request = res.data[0];
          // 格式化时间
          request.createdAtText = that.formatTime(request.created_at);
          request.reviewedAtText = request.reviewed_at ? that.formatTime(request.reviewed_at) : '';
          that.setData({ latestRequest: request });
        }
      })
      .catch(function(err) {
        // 集合不存在时静默处理
        var errMsg = err.message || '';
        if (err.errCode === -502005 || errMsg.indexOf('not exist') !== -1) {
          console.log('permission_requests 集合尚未创建');
        } else {
          console.error('loadLatestRequest error:', err);
        }
      });
  },

  // 格式化时间
  formatTime: function(date) {
    if (!date) return '';
    var d = new Date(date);
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hour = String(d.getHours()).padStart(2, '0');
    var minute = String(d.getMinutes()).padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  },

  onNicknameInput: function(e) {
    var nickname = e.detail.value;
    this.setData({ 
      nickname: nickname,
      canSubmit: nickname.trim().length > 0
    });
  },

  onReasonInput: function(e) {
    this.setData({ reason: e.detail.value });
  },

  submitApply: function() {
    var that = this;
    var nickname = this.data.nickname;
    var reason = this.data.reason;
    var submitting = this.data.submitting;
    
    if (submitting) return;
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    var userInfo = app.globalData.userInfo || {};
    wx.cloud.callFunction({
      name: 'applyPermission',
      data: {
        nickname: nickname.trim(),
        avatar: userInfo.avatarUrl || '',
        reason: reason.trim()
      }
    })
    .then(function(res) {
      if (res.result && res.result.success) {
        wx.showToast({ title: '申请已提交', icon: 'success' });
        // 重新加载申请状态
        setTimeout(function() { that.loadLatestRequest(); }, 500);
      } else {
        var errorMsg = (res.result && res.result.error) ? res.result.error : '提交失败';
        wx.showToast({ title: errorMsg, icon: 'none' });
      }
    })
    .catch(function(err) {
      console.error('submitApply error:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    })
    .finally(function() {
      that.setData({ submitting: false });
    });
  },

  goBack: function() {
    wx.navigateBack();
  }
});
