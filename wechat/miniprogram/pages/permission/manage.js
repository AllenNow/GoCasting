// pages/permission/manage.js — 权限管理（超管专用）(ES5 兼容版)
var app = getApp();

Page({
  data: {
    activeTab: 'pending', // 'pending' | 'admins'
    pendingRequests: [],
    competitionAdmins: [],
    superAdmins: [],
    loading: false,
    rejectReason: '',
    showRejectModal: false,
    currentRejectId: null,
  },

  onLoad: function() {
    this._checkSuperAdmin();
  },

  onShow: function() {
    if (this._superAdmin) this.loadData();
  },

  // 仅超级管理员可进入权限管理页
  _checkSuperAdmin: function() {
    var that = this;
    wx.cloud.callFunction({ name: 'checkPermission' })
      .then(function(res) {
        var result = res.result || {};
        if (result.success && result.role === 'super_admin') {
          that._superAdmin = true;
          that.loadData();
        } else {
          that._denyAccess();
        }
      })
      .catch(function() {
        that._denyAccess();
      });
  },

  _denyAccess: function() {
    wx.showModal({
      title: '无权限',
      content: '仅超级管理员可管理权限',
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
  },

  // 切换 Tab
  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 加载数据
  loadData: function() {
    var that = this;
    this.setData({ loading: true });
    
    Promise.all([
      this.loadPendingRequestsPromise(),
      this.loadAdminListPromise()
    ])
    .catch(function(err) {
      console.error('loadData error:', err);
    })
    .finally(function() {
      that.setData({ loading: false });
    });
  },

  // 加载待审核申请（返回 Promise）
  loadPendingRequestsPromise: function() {
    var that = this;
    return wx.cloud.callFunction({
      name: 'manageAdmin',
      data: { action: 'getPendingRequests' }
    })
    .then(function(res) {
      if (res.result && res.result.success) {
        var requests = res.result.requests.map(function(item) {
          return {
            _id: item._id,
            _openid: item._openid,
            nickname: item.nickname,
            avatar: item.avatar,
            reason: item.reason,
            status: item.status,
            created_at: item.created_at,
            createdAtText: that.formatTime(item.created_at)
          };
        });
        that.setData({ pendingRequests: requests });
      }
    })
    .catch(function(err) {
      console.error('loadPendingRequests error:', err);
    });
  },

  // 加载管理员列表（返回 Promise）
  loadAdminListPromise: function() {
    var that = this;
    return wx.cloud.callFunction({
      name: 'manageAdmin',
      data: { action: 'getList' }
    })
    .then(function(res) {
      if (res.result && res.result.success) {
        that.setData({
          superAdmins: res.result.superAdmins,
          competitionAdmins: res.result.competitionAdmins
        });
      }
    })
    .catch(function(err) {
      console.error('loadAdminList error:', err);
    });
  },

  // 格式化时间
  formatTime: function(date) {
    if (!date) return '';
    var d = new Date(date);
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hour = String(d.getHours()).padStart(2, '0');
    var minute = String(d.getMinutes()).padStart(2, '0');
    return month + '-' + day + ' ' + hour + ':' + minute;
  },

  // 通过申请
  approveRequest: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认通过',
      content: '确定通过该用户的管理员申请？',
      confirmText: '通过',
      confirmColor: '#1a7f5a',
      success: function(result) {
        if (!result.confirm) return;

        wx.showLoading({ title: '处理中...' });

        wx.cloud.callFunction({
          name: 'reviewPermission',
          data: {
            requestId: id,
            action: 'approve'
          }
        })
        .then(function(res) {
          wx.hideLoading();

          if (res.result && res.result.success) {
            wx.showToast({ title: '已通过', icon: 'success' });
            that.loadData();
          } else {
            var errorMsg = (res.result && res.result.error) ? res.result.error : '操作失败';
            wx.showToast({ title: errorMsg, icon: 'none' });
          }
        })
        .catch(function(err) {
          wx.hideLoading();
          console.error('approveRequest error:', err);
          wx.showToast({ title: '操作失败', icon: 'none' });
        });
      }
    });
  },

  // 显示拒绝弹窗
  showRejectDialog: function(e) {
    var id = e.currentTarget.dataset.id;
    this.setData({
      showRejectModal: true,
      currentRejectId: id,
      rejectReason: ''
    });
  },

  // 关闭拒绝弹窗
  closeRejectModal: function() {
    this.setData({
      showRejectModal: false,
      currentRejectId: null,
      rejectReason: ''
    });
  },

  // 输入拒绝原因
  onRejectReasonInput: function(e) {
    this.setData({ rejectReason: e.detail.value });
  },

  // 确认拒绝
  confirmReject: function() {
    var that = this;
    var currentRejectId = this.data.currentRejectId;
    var rejectReason = this.data.rejectReason;
    
    wx.showLoading({ title: '处理中...' });

    wx.cloud.callFunction({
      name: 'reviewPermission',
      data: {
        requestId: currentRejectId,
        action: 'reject',
        rejectReason: rejectReason.trim()
      }
    })
    .then(function(res) {
      wx.hideLoading();

      if (res.result && res.result.success) {
        wx.showToast({ title: '已拒绝', icon: 'success' });
        that.closeRejectModal();
        that.loadData();
      } else {
        var errorMsg = (res.result && res.result.error) ? res.result.error : '操作失败';
        wx.showToast({ title: errorMsg, icon: 'none' });
      }
    })
    .catch(function(err) {
      wx.hideLoading();
      console.error('confirmReject error:', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  // 移除管理员
  removeAdmin: function(e) {
    var that = this;
    var openid = e.currentTarget.dataset.openid;
    var note = e.currentTarget.dataset.note;

    wx.showModal({
      title: '确认移除',
      content: '确定移除「' + note + '」的管理员权限？',
      confirmText: '移除',
      confirmColor: '#f44336',
      success: function(result) {
        if (!result.confirm) return;

        wx.showLoading({ title: '处理中...' });

        wx.cloud.callFunction({
          name: 'manageAdmin',
          data: {
            action: 'remove',
            targetOpenid: openid
          }
        })
        .then(function(res) {
          wx.hideLoading();

          if (res.result && res.result.success) {
            wx.showToast({ title: '已移除', icon: 'success' });
            that.loadAdminListPromise();
          } else {
            var errorMsg = (res.result && res.result.error) ? res.result.error : '操作失败';
            wx.showToast({ title: errorMsg, icon: 'none' });
          }
        })
        .catch(function(err) {
          wx.hideLoading();
          console.error('removeAdmin error:', err);
          wx.showToast({ title: '操作失败', icon: 'none' });
        });
      }
    });
  },

  // 编辑备注
  editNote: function(e) {
    var that = this;
    var openid = e.currentTarget.dataset.openid;
    var note = e.currentTarget.dataset.note;
    
    wx.showModal({
      title: '修改备注',
      editable: true,
      placeholderText: '请输入备注名称',
      content: note === '未备注' ? '' : note,
      confirmText: '保存',
      success: function(result) {
        if (!result.confirm) return;

        wx.showLoading({ title: '保存中...' });

        wx.cloud.callFunction({
          name: 'manageAdmin',
          data: {
            action: 'updateNote',
            targetOpenid: openid,
            note: result.content
          }
        })
        .then(function(res) {
          wx.hideLoading();

          if (res.result && res.result.success) {
            wx.showToast({ title: '已保存', icon: 'success' });
            that.loadAdminListPromise();
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        })
        .catch(function(err) {
          wx.hideLoading();
          console.error('editNote error:', err);
        });
      }
    });
  },

  // 阻止冒泡
  stopPropagation: function() {}
});
