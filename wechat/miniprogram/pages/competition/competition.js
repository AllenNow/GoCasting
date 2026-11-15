// pages/competition/competition.js — 比赛列表
const app = getApp();

const STATUS_MAP = {
  upcoming: { label: '即将开始', color: '#4a90d9' },
  ongoing:  { label: '进行中',   color: '#1a7f5a' },
  finished: { label: '已结束',   color: '#999999' },
};

Page({
  data: {
    competitions: [],   // 原始数据
    filtered: [],       // 筛选后展示
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

  onLoad() {
    this.setData({ isAdmin: app.globalData.isAdmin || false });
    this.loadCompetitions();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // isAdmin 依赖异步 openid，轮询等待
    const checkAdmin = () => {
      if (app.globalData.openid) {
        this.setData({ isAdmin: app.globalData.isAdmin || false });
      } else {
        setTimeout(checkAdmin, 500);
      }
    };
    checkAdmin();
    this.loadCompetitions();
  },

  async loadCompetitions() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const res = await db.collection('competitions')
        .orderBy('date', 'desc')
        .limit(50)
        .get();

      const competitions = res.data.map(c => ({
        ...c,
        statusLabel: STATUS_MAP[c.status]?.label || c.status,
        statusColor: STATUS_MAP[c.status]?.color || '#999',
        entryCount: (c.entries || []).length,
      }));

      this.setData({ competitions });
      this._applyFilter();
    } catch (err) {
      // 集合尚未创建时静默处理，只展示空状态
      if (err.errCode === -502005 || (err.message || '').includes('not exist')) {
        console.warn('competitions 集合尚未创建，请在云开发控制台新建');
      } else {
        console.error('加载比赛列表失败', err);
        wx.showToast({ title: '加载失败', icon: 'error' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  _applyFilter() {
    const { competitions, filterStatus } = this.data;
    const filtered = filterStatus === 'all'
      ? competitions
      : competitions.filter(c => c.status === filterStatus);
    this.setData({ filtered });
  },

  onFilterTap(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status });
    this._applyFilter();
  },

  onCompetitionTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/competition/competition-detail?id=${id}` });
  },

  addCompetition() {
    wx.navigateTo({ url: '/pages/admin/competition-edit' });
  },

  onPullDownRefresh() {
    this.loadCompetitions().then(() => wx.stopPullDownRefresh());
  },
});
