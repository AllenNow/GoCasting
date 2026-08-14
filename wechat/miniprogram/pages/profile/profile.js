// pages/profile/profile.js — 个人中心
const app = getApp();

Page({
  data: {
    userInfo: null,
    editingNickname: false,
    isAdmin: false,
    stats: {
      totalCatches: 0,
      totalSpecies: 0,
      totalWeight_g: 0,
      releasedCount: 0,
      topSpecies: '—',
      thisYear: 0,
    },
    recentCatches: [],
    badges: [],
    loading: true,
    monthlyData: [],
    maxMonthCount: 1,
    speciesData: [],
  },

  onLoad() {
    const info = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (info) this.setData({ userInfo: info });
    this.setData({ isAdmin: app.globalData.isAdmin || false });
    this.loadStats();
    this._lastLoadTime = Date.now();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // isAdmin 依赖异步 openid，用轮询确保刷新
    const checkAdmin = () => {
      if (app.globalData.openid) {
        this.setData({ isAdmin: app.globalData.isAdmin || false });
      } else {
        setTimeout(checkAdmin, 500);
      }
    };
    checkAdmin();

    if (Date.now() - (this._lastLoadTime || 0) > 60000) {
      this.loadStats();
      this._lastLoadTime = Date.now();
    }
  },

  // ──────────────────────────────────────────
  // 登录：选择头像（微信新规范 open-type="chooseAvatar"）
  // ──────────────────────────────────────────
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    const current = this.data.userInfo || {};
    const updated = { ...current, avatarUrl };
    this._saveUserInfo(updated);
  },

  // 昵称输入（type="nickname" 会弹出带微信昵称填充的键盘）
  onNicknameInput(e) {
    this._pendingNickname = e.detail.value;
  },

  // 昵称确认（失焦时保存）
  onNicknameBlur() {
    const nick = this._pendingNickname;
    if (!nick || !nick.trim()) {
      this.setData({ editingNickname: false });
      return;
    }
    const current = this.data.userInfo || {};
    const updated = { ...current, nickName: nick.trim() };
    this._saveUserInfo(updated);
    this.setData({ editingNickname: false });
  },

  startEditNickname() {
    this.setData({ editingNickname: true });
  },

  // 统一保存用户信息到 globalData + 本地缓存 + 云数据库 users 集合
  async _saveUserInfo(info) {
    app.globalData.userInfo = info;
    wx.setStorageSync('userInfo', info);
    this.setData({ userInfo: info });

    // 同步到云数据库 users 集合
    // 云 DB 权限规则设为"仅创建者可读写"，查询自动只返回当前用户的记录
    try {
      const db = app.globalData.db;
      const record = {
        nick_name: info.nickName || '',
        avatar_url: info.avatarUrl || '',
        updated_at: db.serverDate(),
      };
      const res = await db.collection('users').limit(1).get();
      if (res.data.length > 0) {
        // 已有记录，更新
        await db.collection('users').doc(res.data[0]._id).update({ data: record });
      } else {
        // 首次设置，新建（_openid 自动注入）
        await db.collection('users').add({ data: { ...record, created_at: db.serverDate() } });
      }
    } catch (e) {
      console.warn('用户信息同步到云数据库失败', e);
    }
  },

  // 加载统计数据
  async loadStats() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;

      // 获取全部渔获（云数据库前端单次最多1000条）
      const res = await db.collection('catch_logs')
        .orderBy('date', 'desc')
        .limit(1000)
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
          totalWeightKg: (totalWeight / 1000).toFixed(1),
          releasedCount: released,
          topSpecies,
          thisYear: yearCount,
        },
        recentCatches: catches.slice(0, 3).map(c => ({
          ...c,
          weightKg: c.weight_g ? (c.weight_g / 1000).toFixed(1) : '',
        })),
        badges,
        monthlyData,
        maxMonthCount,
        speciesData,
        loading: false,
      });
    } catch (err) {
      console.error('加载统计失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '数据加载失败', icon: 'none' });
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

  // 连点头像 5 次进入管理后台（隐藏入口，非管理员也能触发检查）
  _adminTapCount: 0,
  _adminTapTimer: null,

  onAvatarTap() {
    this._adminTapCount = (this._adminTapCount || 0) + 1;
    clearTimeout(this._adminTapTimer);
    if (this._adminTapCount >= 5) {
      this._adminTapCount = 0;
      if (app.globalData.isAdmin) {
        wx.navigateTo({ url: '/pages/admin/admin' });
      } else {
        wx.showToast({ title: '当前账号无管理权限', icon: 'none' });
      }
      return;
    }
    // 2秒内未达到5次则重置
    this._adminTapTimer = setTimeout(() => { this._adminTapCount = 0; }, 2000);
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  goGoScore() {
    wx.navigateTo({ url: '/pages/go-score/go-score' });
  },

  goSpecies() {
    wx.navigateTo({ url: '/pages/species/species' });
  },

  // 跳转到首页渔获列表
  goAllCatches() {
    wx.navigateTo({ url: '/pages/index/index' });
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
