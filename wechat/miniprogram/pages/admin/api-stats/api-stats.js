// pages/admin/api-stats/api-stats.js — 第三方 API 用量统计
// 4个 Tab：总览 / 按接口 / 按用户 / 失败记录
const app = getApp();

// API 分组中文名
const API_GROUP_LABEL = {
  amap:        '高德地图',
  open_meteo:  'Open-Meteo',
};
// 接口名中文映射
const API_NAME_LABEL = {
  regeo:             '逆地理编码',
  weather_live:      '实况天气',
  weather_forecast:  '3天预报',
  marine:            '海洋/潮汐',
};

function groupLabel(g) { return API_GROUP_LABEL[g] || g; }
function nameLabel(n)  { return API_NAME_LABEL[n]  || n; }

// 格式化 calledAt（云数据库 serverDate 返回 Date 对象或 ISO 字符串）
function fmtTime(raw) {
  if (!raw) return '—';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d)) return String(raw);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

Page({
  data: {
    loading: false,
    activeTab: 'overview',   // overview | byApi | byUser | fail

    // ── Tab1：总览 ──────────────────────────────────────────
    overview: null,          // { total, totalSuccess, totalFail, avgLatencyMs, byApi[] }

    // ── Tab2：按接口（来自 overview.byApi，增加展示格式）──
    byApiList: [],

    // ── Tab3：按用户 ────────────────────────────────────────
    byUserList: [],          // Top 50 用户
    selectedUser: null,      // 当前展开查看详情的用户 openid
    userDetail: null,        // { summary, records[] }
    userDetailLoading: false,

    // ── Tab4：失败记录 ──────────────────────────────────────
    failLogs: [],

    // 30天趋势（byDate）
    dateSeriesLoaded: false,
    dateSeries: [],          // [{ dateKey, total, amap, open_meteo }]
    maxDayTotal: 1,          // 用于折线图高度比例计算
  },

  onLoad() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    this.loadOverview();
  },

  // ── Tab 切换 ───────────────────────────────────────────────
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab });

    if (tab === 'overview' && !this.data.overview) {
      this.loadOverview();
    } else if (tab === 'byUser' && !this.data.byUserList.length) {
      this.loadByUser();
    } else if (tab === 'fail' && !this.data.failLogs.length) {
      this.loadFailLogs();
    }
    // byApi 数据来自 overview，不需要单独加载
  },

  // ── 加载总览 ───────────────────────────────────────────────
  async loadOverview() {
    this.setData({ loading: true });
    try {
      const [overviewRes, dateRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getApiStats', data: { action: 'overview' } }),
        wx.cloud.callFunction({ name: 'getApiStats', data: { action: 'byDate'   } }),
      ]);

      if (overviewRes.result?.success) {
        const d = overviewRes.result.data;
        // 补全中文名
        const byApiList = (d.byApi || []).map(item => ({
          ...item,
          groupLabel: groupLabel(item.apiGroup),
          nameLabel:  nameLabel(item.apiName),
        }));
        // 整体成功率（预计算，避免 wxml 里调 toFixed）
        const overallSuccessRate = d.total > 0
          ? parseFloat((d.totalSuccess / d.total * 100).toFixed(1))
          : 0;
        this.setData({ overview: { ...d, overallSuccessRate }, byApiList });
      }

      if (dateRes.result?.success) {
        const { series } = dateRes.result.data;
        const maxDayTotal = Math.max(...series.map(s => s.total), 1);
        // 只取最近 14 天展示（避免过密）
        const slice14 = series.slice(-14).map(s => ({
          ...s,
          label: s.dateKey.slice(5),   // "08-14"
          heightPct: parseFloat(((s.total / maxDayTotal) * 100).toFixed(1)),
        }));
        this.setData({ dateSeries: slice14, maxDayTotal, dateSeriesLoaded: true });
      }
    } catch (e) {
      console.error('loadOverview error', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── 加载用户列表 ───────────────────────────────────────────
  async loadByUser() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getApiStats',
        data: { action: 'byUser' },
      });
      if (res.result?.success) {
        const byUserList = (res.result.data.byUser || []).map((u, idx) => ({
          ...u,
          rank: idx + 1,
          openidShort: u.openid.slice(-8),  // 只显示末8位
          successRate: u.total > 0
            ? parseFloat((u.success / u.total * 100).toFixed(1)) : 0,
          // 格式化最后调用时间
          lastCalledStr: fmtTime(u.lastCalledAt),
          // 接口明细文字
          apisSummary: (u.apis || []).slice(0, 3)
            .map(a => `${nameLabel(a.apiName)}×${a.count}`)
            .join(' · '),
        }));
        this.setData({ byUserList });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── 展开/收起 用户详情 ────────────────────────────────────
  async toggleUserDetail(e) {
    const openid = e.currentTarget.dataset.openid;
    // 点击同一个用户：收起
    if (this.data.selectedUser === openid) {
      this.setData({ selectedUser: null, userDetail: null });
      return;
    }
    this.setData({ selectedUser: openid, userDetailLoading: true, userDetail: null });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getApiStats',
        data: { action: 'userDetail', openid },
      });
      if (res.result?.success) {
        const d = res.result.data;
        // 格式化记录时间
        const records = (d.records || []).map(r => ({
          ...r,
          groupLabel:   groupLabel(r.apiGroup),
          nameLabel:    nameLabel(r.apiName),
          calledAtStr:  fmtTime(r.calledAt),
          latencyLabel: r.latencyMs ? `${r.latencyMs}ms` : '—',
        }));
        // 格式化摘要接口列表
        const apis = (d.summary?.apis || []).map(a => ({
          ...a,
          groupLabel: groupLabel(a.apiGroup),
          nameLabel:  nameLabel(a.apiName),
          failRate:   a.count > 0 ? parseFloat((a.fail / a.count * 100).toFixed(1)) : 0,
        }));
        this.setData({
          userDetail: { ...d, records, summary: { ...d.summary, apis } },
          userDetailLoading: false,
        });
      } else {
        wx.showToast({ title: '加载详情失败', icon: 'none' });
        this.setData({ userDetailLoading: false });
      }
    } catch (e) {
      wx.showToast({ title: '加载详情失败', icon: 'none' });
      this.setData({ userDetailLoading: false });
    }
  },

  // ── 加载失败记录 ──────────────────────────────────────────
  async loadFailLogs() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getApiStats',
        data: { action: 'failLogs' },
      });
      if (res.result?.success) {
        const failLogs = (res.result.data.records || []).map(r => ({
          ...r,
          groupLabel:  groupLabel(r.apiGroup),
          nameLabel:   nameLabel(r.apiName),
          calledAtStr: fmtTime(r.calledAt),
          openidShort: (r.openid || '').slice(-8),
          errorShort:  (r.error || '').slice(0, 60),
        }));
        this.setData({ failLogs });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // ── 下拉刷新 ─────────────────────────────────────────────
  onPullDownRefresh() {
    const { activeTab } = this.data;
    // 清空当前 tab 缓存
    this.setData({
      overview: null, byApiList: [],
      byUserList: [], selectedUser: null, userDetail: null,
      failLogs: [], dateSeriesLoaded: false,
    });
    if (activeTab === 'overview') this.loadOverview();
    else if (activeTab === 'byUser') this.loadByUser();
    else if (activeTab === 'fail') this.loadFailLogs();
    wx.stopPullDownRefresh();
  },
});
