// pages/admin/api-usage.js — 第三方 API 用量与费用（超管专用）
var app = getApp();

function pad2(n) {
  return String(n).padStart(2, '0');
}

function currentMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
}

function monthLabel(month) {
  return month.slice(0, 4) + '年' + Number(month.slice(5, 7)) + '月';
}

// 数字千分位
function fmtNum(v) {
  return String(v == null ? 0 : v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 费用展示：小于 0.01 元时保留 4 位，避免显示成 0.00
function fmtCost(v) {
  var n = Number(v || 0);
  if (n === 0) return '0.00';
  if (n < 0.01) return n.toFixed(4);
  return n.toFixed(2);
}

Page({
  data: {
    loading: false,
    month: currentMonth(),
    monthLabel: monthLabel(currentMonth()),
    collectionMissing: false,
    totals: {
      callsText: '0',
      successRate: 0,
      failed: 0,
      billedText: '0',
      apiCount: 0,
      costText: '0.00',
    },
    items: [],
    days: [],
  },

  onLoad: function() {
    this._checkSuperAdmin();
  },

  // 仅超级管理员可查看
  _checkSuperAdmin: function() {
    var that = this;
    wx.cloud.callFunction({ name: 'checkPermission' })
      .then(function(res) {
        var result = (res && res.result) || {};
        if (result.success && result.role === 'super_admin') {
          that.loadStats();
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
      content: '仅超级管理员可查看 API 用量与费用',
      showCancel: false,
      confirmText: '知道了',
      success: function() {
        wx.navigateBack({
          fail: function() {
            wx.switchTab({ url: '/pages/profile/profile' });
          }
        });
      }
    });
  },

  onMonthChange: function(e) {
    var v = e.detail.value;
    if (!/^\d{4}-\d{2}$/.test(v)) return;
    this.setData({ month: v, monthLabel: monthLabel(v) });
    this.loadStats();
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadStats(true);
    setTimeout(function() { wx.stopPullDownRefresh(); }, 600);
  },

  loadStats: function(silent) {
    var that = this;
    var isSilent = silent === true;
    if (this.data.loading) return;
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getApiUsageStats',
      data: { month: this.data.month },
    })
      .then(function(res) {
        var r = (res && res.result) || {};
        if (!r.success) {
          that.setData({ loading: false });
          if (r.error === '无权限') {
            that._denyAccess();
          } else if (!isSilent) {
            wx.showToast({ title: r.error || '加载失败', icon: 'none' });
          }
          return;
        }
        that._render(r);
      })
      .catch(function(err) {
        console.error('getApiUsageStats error:', err);
        that.setData({ loading: false });
        if (!isSilent) wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  _render: function(r) {
    var totals = r.totals || {};
    var items = (r.items || []).map(function(it) {
      return {
        key: it.key,
        label: it.label,
        callsText: fmtNum(it.calls),
        costText: '¥ ' + fmtCost(it.cost),
        unitText: it.unit > 0 ? ('¥' + it.unit + '/次') : '免费',
        successRate: it.successRate,
        avgLatencyText: it.avgLatency + 'ms',
        note: it.note,
      };
    });

    var days = r.days || [];
    var maxCalls = 0;
    days.forEach(function(d) { if (d.calls > maxCalls) maxCalls = d.calls; });
    var dayItems = days.map(function(d) {
      var h = maxCalls ? Math.round((d.calls / maxCalls) * 100) : 0;
      return {
        date: d.date,
        day: d.day,
        calls: d.calls,
        height: d.calls > 0 ? Math.max(h, 3) : 0,
      };
    });

    this.setData({
      loading: false,
      collectionMissing: !!r.collectionMissing,
      totals: {
        callsText: fmtNum(totals.calls || 0),
        successRate: totals.successRate || 0,
        failed: totals.failed || 0,
        billedText: fmtNum(totals.billed || 0),
        apiCount: totals.apiCount || 0,
        costText: fmtCost(totals.cost || 0),
      },
      items: items,
      days: dayItems,
    });
  },
});
