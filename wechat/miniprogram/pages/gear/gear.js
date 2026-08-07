// pages/gear/gear.js — 装备参考数据库浏览 + 筛选
const app = getApp();

const REEL_BRANDS = ['全部', 'Shimano', 'Daiwa', 'Penn'];
const ROD_BRANDS  = ['全部', 'Shimano', 'Daiwa', 'Penn', 'St. Croix'];
const PRICE_TIERS = [
  { label: '全部价位', value: 0 },
  { label: '入门',     value: 1 },
  { label: '中端',     value: 2 },
  { label: '高端',     value: 3 },
];

Page({
  data: {
    activeTab:   'reel',
    reels:       [],
    reelFiltered:[],
    reelBrandIdx: 0,
    reelPriceIdx: 0,
    reelKeyword: '',
    rods:        [],
    rodFiltered: [],
    rodBrandIdx:  0,
    rodPriceIdx:  0,
    rodKeyword:  '',
    reelBrands: REEL_BRANDS,
    rodBrands:  ROD_BRANDS,
    priceTiers: PRICE_TIERS,
    seeded: false,    // 默认未初始化，loadReels 后若有数据则设 true
    loading: false,
  },

  onLoad() {
    this.loadReels();
    this.loadRods();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  onPullDownRefresh() {
    Promise.all([this.loadReels(), this.loadRods()])
      .finally(() => wx.stopPullDownRefresh());
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  // ──────────────────────────────────────────
  // 渔轮
  // ──────────────────────────────────────────
  async loadReels() {
    try {
      const db = app.globalData.db;
      const res = await db.collection('reels_reference').limit(100).get();
      const seeded = res.data.length > 0;
      this.setData({ reels: res.data, seeded });
      this.filterReels();
    } catch (err) {
      console.error('加载渔轮失败', err);
      this.setData({ seeded: false });
    }
  },

  onReelBrandChange(e) {
    this.setData({ reelBrandIdx: Number(e.detail.value) });
    this.filterReels();
  },
  onReelPriceChange(e) {
    this.setData({ reelPriceIdx: Number(e.detail.value) });
    this.filterReels();
  },
  onReelKeyword(e) {
    this.setData({ reelKeyword: e.detail.value });
    this.filterReels();
  },
  filterReels() {
    const { reels, reelBrandIdx, reelPriceIdx, reelKeyword } = this.data;
    const brand = REEL_BRANDS[reelBrandIdx];
    const tier  = PRICE_TIERS[reelPriceIdx].value;
    const kw    = reelKeyword.toLowerCase();
    const filtered = reels.filter(r => {
      if (brand !== '全部' && r.brand !== brand) return false;
      if (tier  !== 0      && r.price_tier !== tier)  return false;
      if (kw && !`${r.brand} ${r.model}`.toLowerCase().includes(kw)) return false;
      return true;
    });
    this.setData({ reelFiltered: filtered });
  },

  // ──────────────────────────────────────────
  // 渔竿
  // ──────────────────────────────────────────
  async loadRods() {
    try {
      const db = app.globalData.db;
      const res = await db.collection('rods_reference').limit(100).get();
      this.setData({ rods: res.data });
      this.filterRods();
    } catch (err) {
      console.error('加载渔竿失败', err);
    }
  },

  onRodBrandChange(e) {
    this.setData({ rodBrandIdx: Number(e.detail.value) });
    this.filterRods();
  },
  onRodPriceChange(e) {
    this.setData({ rodPriceIdx: Number(e.detail.value) });
    this.filterRods();
  },
  onRodKeyword(e) {
    this.setData({ rodKeyword: e.detail.value });
    this.filterRods();
  },
  filterRods() {
    const { rods, rodBrandIdx, rodPriceIdx, rodKeyword } = this.data;
    const brand = ROD_BRANDS[rodBrandIdx];
    const tier  = PRICE_TIERS[rodPriceIdx].value;
    const kw    = rodKeyword.toLowerCase();
    const filtered = rods.filter(r => {
      if (brand !== '全部' && r.brand !== brand) return false;
      if (tier  !== 0      && r.price_tier !== tier)  return false;
      if (kw && !`${r.brand} ${r.model}`.toLowerCase().includes(kw)) return false;
      return true;
    });
    this.setData({ rodFiltered: filtered });
  },

  // ──────────────────────────────────────────
  // 初始化参考数据（调云函数写入）
  // ──────────────────────────────────────────
  async seedData() {
    wx.showLoading({ title: '初始化数据…', mask: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'seedReferenceData' });
      if (res.result && res.result.success) {
        wx.showToast({
          title: `✅ ${res.result.reelCount}款轮 · ${res.result.rodCount}款竿`,
          icon: 'none', duration: 3000,
        });
        this.loadReels();
        this.loadRods();
      } else {
        throw new Error(res.result.error || 'unknown');
      }
    } catch (err) {
      console.error('seedData error', err);
      wx.showToast({ title: '初始化失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },
});
