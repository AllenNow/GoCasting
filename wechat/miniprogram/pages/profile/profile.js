// pages/profile/profile.js — 个人中心
const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: {
      totalCatches: 0,
      totalSpecies: 0,
      totalWeight_g: 0,
      releasedCount: 0,
      topSpecies: '—',
      thisYear: 0,
    },
    recentCatches: [],
    badges: [],           // 已解锁成就徽章
    loading: true,
    // 图表数据
    monthlyData: [],      // 月度趋势
    maxMonthCount: 1,
    speciesData: [],      // 鱼种分布
  },

  onLoad() {
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  // 获取用户信息（微信头像/昵称）
  getUserProfile() {
    wx.getUserProfile({
      desc: '展示在个人主页',
      success: (res) => {
        this.setData({ userInfo: res.userInfo });
        app.globalData.userInfo = res.userInfo;
      },
    });
  },

  // 加载统计数据
  async loadStats() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;

      // 获取全部渔获（最多 1000 条）
      const res = await db.collection('catch_logs')
        .orderBy('date', 'desc')
        .limit(100)
        .get();

      const catches = res.data;
      const thisYear = new Date().getFullYear();

      // 统计
      let totalWeight = 0;
      let released = 0;
      const speciesSet = new Set();
      const speciesCount = {};
      let yearCount = 0;

      catches.forEach(c => {
        if (c.weight_g) totalWeight += c.weight_g;
        if (c.released) released++;
        if (c.species) {
          speciesSet.add(c.species);
          speciesCount[c.species] = (speciesCount[c.species] || 0) + 1;
        }
        if (c.date && c.date.startsWith(String(thisYear))) yearCount++;
      });

      const topSpecies = Object.keys(speciesCount).sort(
        (a, b) => speciesCount[b] - speciesCount[a]
      )[0] || '—';

      // 计算成就徽章
      const badges = this._calcBadges(catches.length, speciesSet.size, released, totalWeight);

      // 月度趋势（近6个月）
      const monthlyData = this._buildMonthlyData(catches);
      const maxMonthCount = Math.max(...monthlyData.map(m => m.count), 1);

      // 鱼种分布 Top 5
      const speciesData = this._buildSpeciesData(speciesCount);

      this.setData({
        stats: {
          totalCatches: catches.length,
          totalSpecies: speciesSet.size,
          totalWeight_g: totalWeight,
          releasedCount: released,
          topSpecies,
          thisYear: yearCount,
        },
        recentCatches: catches.slice(0, 3),
        badges,
        monthlyData,
        maxMonthCount,
        speciesData,
        loading: false,
      });
    } catch (err) {
      console.error('加载统计失败', err);
      this.setData({ loading: false });
    }
  },

  // 格式化总重量显示
  formatTotalWeight(g) {
    if (!g) return '0 g';
    return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;
  },

  // 分享小程序（生成分享卡片）
  onShareAppMessage() {
    const { stats } = this.data;
    return {
      title: `我在 GoCasting 记录了 ${stats.totalCatches} 次渔获，最爱钓 ${stats.topSpecies}！`,
      path: '/pages/index/index',
      imageUrl: '', // 可填云存储分享图 URL
    };
  },

  onShareTimeline() {
    const { stats } = this.data;
    return {
      title: `GoCasting 钓鱼助手 | 已记录 ${stats.totalCatches} 次渔获`,
      query: '',
      imageUrl: '',
    };
  },

  // 跳转到记录页
  goRecord() {
    wx.navigateTo({ url: '/pages/catch-log/catch-log' });
  },

  goGoScore() {
    wx.navigateTo({ url: '/pages/go-score/go-score' });
  },

  goSpecies() {
    wx.navigateTo({ url: '/pages/species/species' });
  },

  // 跳转到首页渔获列表
  goAllCatches() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // ========== 图表数据计算 ==========
  _buildMonthlyData(catches) {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, label: `${d.getMonth() + 1}月`, count: 0 });
    }
    catches.forEach(c => {
      if (!c.date) return;
      const key = c.date.slice(0, 7);
      const m = months.find(m => m.month === key);
      if (m) m.count++;
    });
    return months;
  },

  _buildSpeciesData(speciesCount) {
    const COLORS = ['#1a7f5a','#52a875','#f0a500','#4a90d9','#e85555'];
    const total = Object.values(speciesCount).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(speciesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], i) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
        color: COLORS[i % COLORS.length],
      }));
  },

  // ========== 成就徽章计算 ==========
  // 根据数据解锁对应徽章，返回已解锁数组
  _calcBadges(total, species, released, weight_g) {
    const ALL_BADGES = [
      { id: 'first_catch',  icon: '🎣', name: '第一尾',    desc: '记录第一次渔获',     unlock: total >= 1 },
      { id: 'catch_5',      icon: '🐟', name: '渔获5尾',   desc: '累计记录5次渔获',    unlock: total >= 5 },
      { id: 'catch_20',     icon: '🐠', name: '渔获达人',  desc: '累计记录20次渔获',   unlock: total >= 20 },
      { id: 'catch_50',     icon: '🏆', name: '远投高手',  desc: '累计记录50次渔获',   unlock: total >= 50 },
      { id: 'catch_100',    icon: '👑', name: '海钓传奇',  desc: '累计记录100次渔获',  unlock: total >= 100 },
      { id: 'species_3',    icon: '🦈', name: '多鱼种',    desc: '钓到3种以上鱼种',    unlock: species >= 3 },
      { id: 'species_5',    icon: '🌊', name: '鱼种收集家', desc: '钓到5种以上鱼种',   unlock: species >= 5 },
      { id: 'species_10',   icon: '🗺️', name: '百鱼图',    desc: '钓到10种以上鱼种',   unlock: species >= 10 },
      { id: 'release_1',    icon: '💚', name: '护鱼使者',  desc: '放流第一条鱼',       unlock: released >= 1 },
      { id: 'release_10',   icon: '🌿', name: '放流卫士',  desc: '累计放流10条鱼',     unlock: released >= 10 },
      { id: 'weight_1kg',   icon: '⚖️', name: '千克级',    desc: '单次钓获超过1kg',    unlock: weight_g >= 1000 },
      { id: 'weight_5kg',   icon: '💪', name: '大物猎手',  desc: '累计钓获超5kg',      unlock: weight_g >= 5000 },
      { id: 'weight_10kg',  icon: '🎖️', name: '重量级',    desc: '累计钓获超10kg',     unlock: weight_g >= 10000 },
    ];
    // 返回已解锁 + 最多3个未解锁（显示努力目标）
    const unlocked = ALL_BADGES.filter(b => b.unlock);
    const locked   = ALL_BADGES.filter(b => !b.unlock).slice(0, 3).map(b => ({ ...b, locked: true }));
    return [...unlocked, ...locked];
  },
});
